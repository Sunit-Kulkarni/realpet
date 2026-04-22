import { DurableObject } from "cloudflare:workers";
import type { Env, Pet, ClientMsg, ServerMsg } from "./types";
import { getPet, updatePetStats, appendEvent } from "./db";

export class PetRoom extends DurableObject<Env> {
  private pet: Pet | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      const petId = url.searchParams.get("petId");
      if (!petId) return new Response("Missing petId", { status: 400 });

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      this.ctx.acceptWebSocket(server, [petId]);

      if (!this.pet) {
        this.pet = await getPet(this.env.NEON_DATABASE_URL, petId);
      }
      if (this.pet) {
        server.send(JSON.stringify({ type: "state", pet: this.pet } satisfies ServerMsg));
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === "/internal/tick") {
      if (request.headers.get("x-internal-secret") !== this.env.DO_INTERNAL_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
      const body = await request.json<{ pet: Pet }>();
      this.pet = body.pet;
      this.broadcast({ type: "state", pet: this.pet });
      this.broadcast({ type: "event", kind: "tick", at: Date.now() });
      return new Response("ok");
    }

    if (url.pathname === "/internal/thought") {
      if (request.headers.get("x-internal-secret") !== this.env.DO_INTERNAL_SECRET) {
        return new Response("Forbidden", { status: 403 });
      }
      const body = await request.json<{ text: string; mood: { hunger: number; happiness: number } }>();
      this.broadcast({ type: "thought", text: body.text, mood: body.mood, at: Date.now() });
      return new Response("ok");
    }

    if (url.pathname === "/action") {
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
      const body = await request.json<{ kind: "feed" | "play" | "chat"; petId: string; payload?: unknown }>();
      await this.handleAction(body.kind, body.petId);
      return Response.json({ ok: true, pet: this.pet });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(message as string) as ClientMsg;
      const tags = this.ctx.getTags(ws);
      const petId = tags[0];

      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (msg.type === "action") {
        await this.handleAction(msg.kind, petId);
      }
    } catch {
      // ignore bad messages
    }
  }

  async webSocketClose(ws: WebSocket) {
    ws.close();
  }

  private async handleAction(kind: "feed" | "play" | "chat", petId: string) {
    if (!this.pet) {
      this.pet = await getPet(this.env.NEON_DATABASE_URL, petId);
    }
    if (!this.pet) return;

    if (kind === "feed") {
      this.pet.hunger = Math.max(0, this.pet.hunger - 20);
      this.pet.happiness = Math.min(100, this.pet.happiness + 5);
    } else if (kind === "play") {
      this.pet.happiness = Math.min(100, this.pet.happiness + 20);
      this.pet.hunger = Math.min(100, this.pet.hunger + 5);
    }

    await updatePetStats(this.env.NEON_DATABASE_URL, petId, this.pet.hunger, this.pet.happiness);
    await appendEvent(this.env.NEON_DATABASE_URL, petId, kind);

    this.broadcast({ type: "state", pet: this.pet });
    this.broadcast({ type: "event", kind, at: Date.now() });
  }

  private broadcast(msg: ServerMsg) {
    const text = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(text); } catch { /* ignore closed */ }
    }
  }
}
