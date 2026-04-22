import { DurableObject } from "cloudflare:workers";
import type { Env, Pet, ClientMsg, ServerMsg } from "./types";
import { getPet, updatePetStats, appendEvent, getRecentThoughts } from "./db";
import { generateThought } from "./ai";

const TICK_MS = 2 * 60 * 1000; // 2 minutes

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

        // Replay last 3 thoughts so the client sees them even if they missed the live broadcast
        const recentThoughts = await getRecentThoughts(this.env.NEON_DATABASE_URL, petId, 3);
        for (const t of recentThoughts.reverse()) {
          server.send(JSON.stringify({
            type: "thought",
            text: t.text,
            mood: { hunger: this.pet.hunger, happiness: this.pet.happiness },
            at: new Date(t.created_at).getTime(),
          } satisfies ServerMsg));
        }
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    // Start the alarm-based tick loop for a new pet
    if (url.pathname === "/start") {
      const petId = url.searchParams.get("petId");
      if (!petId) return new Response("Missing petId", { status: 400 });
      await this.startAlarm(petId);
      return new Response("ok");
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

  async alarm() {
    const petId = await this.ctx.storage.get<string>("petId");
    if (!petId) return;

    try {
      const pet = await getPet(this.env.NEON_DATABASE_URL, petId);
      if (!pet) return;

      const hunger = Math.min(100, pet.hunger + 5);
      const happiness = Math.max(0, pet.happiness - 3);

      await updatePetStats(this.env.NEON_DATABASE_URL, petId, hunger, happiness);
      await appendEvent(this.env.NEON_DATABASE_URL, petId, "tick");

      const updated = { ...pet, hunger, happiness };
      this.pet = updated;
      this.broadcast({ type: "state", pet: updated });
      this.broadcast({ type: "event", kind: "tick", at: Date.now() });

      if (hunger > 70 || happiness < 30 || Math.random() < 0.3) {
        try {
          const thought = await generateThought(updated, this.env.AI);
          await appendEvent(this.env.NEON_DATABASE_URL, petId, "thought", { text: thought });
          this.broadcast({ type: "thought", text: thought, mood: { hunger, happiness }, at: Date.now() });
        } catch { /* thought failure never stops the tick */ }
      }
    } catch (e) {
      console.error("alarm tick failed:", e);
    }

    // Always reschedule regardless of errors
    await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
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

  private async startAlarm(petId: string) {
    await this.ctx.storage.put("petId", petId);
    await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
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
