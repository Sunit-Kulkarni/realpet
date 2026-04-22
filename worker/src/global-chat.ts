import { DurableObject } from "cloudflare:workers";
import type { Env } from "./types";

interface ChatMsg {
  type: "chat";
  petId: string;
  petName: string;
  species: string;
  text: string;
  at: number;
}

export class GlobalChatRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const url = new URL(request.url);
    const petId = url.searchParams.get("petId") ?? "unknown";
    const petName = url.searchParams.get("petName") ?? "Unknown";
    const species = url.searchParams.get("species") ?? "blob";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [petId, petName, species]);

    // Announce arrival
    this.broadcast({
      type: "chat",
      petId,
      petName,
      species,
      text: `*${petName} entered the sanctuary*`,
      at: Date.now(),
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(message as string) as { type: string; text: string };
      if (msg.type !== "chat" || !msg.text?.trim()) return;

      const tags = this.ctx.getTags(ws);
      const [petId, petName, species] = tags;

      this.broadcast({
        type: "chat",
        petId,
        petName,
        species,
        text: msg.text.trim().slice(0, 200),
        at: Date.now(),
      });
    } catch { /* ignore */ }
  }

  async webSocketClose(ws: WebSocket) {
    const tags = this.ctx.getTags(ws);
    const [petId, petName, species] = tags;
    this.broadcast({
      type: "chat",
      petId,
      petName: petName ?? "Unknown",
      species: species ?? "blob",
      text: `*${petName ?? "Unknown"} left the sanctuary*`,
      at: Date.now(),
    });
    ws.close();
  }

  private broadcast(msg: ChatMsg) {
    const text = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      try { ws.send(text); } catch { /* ignore */ }
    }
  }
}
