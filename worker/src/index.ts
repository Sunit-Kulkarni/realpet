import type { Env } from "./types";
import { PetRoom } from "./pet-room";
import { PetLifecycle } from "./pet-workflow";
import { GlobalChatRoom } from "./global-chat";
import { createPet, getPet, getRecentEvents, listPets } from "./db";
import { generateThought } from "./ai";

export { PetRoom, PetLifecycle, GlobalChatRoom };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function cors(res: Response): Response {
  const r = new Response(res.body, res);
  Object.entries(CORS).forEach(([k, v]) => r.headers.set(k, v));
  return r;
}

function json(data: unknown, status = 200): Response {
  return cors(Response.json(data, { status, headers: CORS }));
}

function err(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Internal routing to DO
    const internalMatch = path.match(/^\/internal\/do\/([^/]+)\/(tick|thought)$/);
    if (internalMatch) {
      if (request.headers.get("x-internal-secret") !== env.DO_INTERNAL_SECRET) {
        return err("Forbidden", 403);
      }
      const petId = internalMatch[1];
      const action = internalMatch[2];
      const id = env.PET_ROOM.idFromName(petId);
      const stub = env.PET_ROOM.get(id);
      const doReq = new Request(`https://do/internal/${action}`, {
        method: "POST",
        headers: request.headers,
        body: request.body,
      });
      return cors(await stub.fetch(doReq));
    }

    // GET /api/pets — list all pets
    if (path === "/api/pets" && request.method === "GET") {
      try {
        const pets = await listPets(env.NEON_DATABASE_URL);
        return json(pets);
      } catch (e) {
        return err(String(e), 500);
      }
    }

    // POST /api/pets
    if (path === "/api/pets" && request.method === "POST") {
      try {
        const body = await request.json<{ name: string; species: string; personality: string }>();
        const pet = await createPet(env.NEON_DATABASE_URL, body);

        try {
          await env.PET_LIFECYCLE.create({ id: pet.id, params: { petId: pet.id } });
        } catch (e) {
          console.error("Workflow start failed:", e);
        }

        return json({ id: pet.id });
      } catch (e) {
        return err(String(e), 500);
      }
    }

    // GET /api/pets/:id
    const petMatch = path.match(/^\/api\/pets\/([^/]+)$/);
    if (petMatch && request.method === "GET") {
      const petId = petMatch[1];
      try {
        const [pet, recentEvents] = await Promise.all([
          getPet(env.NEON_DATABASE_URL, petId),
          getRecentEvents(env.NEON_DATABASE_URL, petId),
        ]);
        if (!pet) return err("Pet not found", 404);
        return json({ pet, recentEvents });
      } catch (e) {
        return err(String(e), 500);
      }
    }

    // POST /api/pets/:id/actions
    const actionMatch = path.match(/^\/api\/pets\/([^/]+)\/actions$/);
    if (actionMatch && request.method === "POST") {
      const petId = actionMatch[1];
      try {
        const body = await request.json<{ kind: "feed" | "play" | "chat"; payload?: unknown }>();
        const id = env.PET_ROOM.idFromName(petId);
        const stub = env.PET_ROOM.get(id);
        const doReq = new Request("https://do/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: body.kind, petId, payload: body.payload }),
        });
        const res = await stub.fetch(doReq);
        return cors(res);
      } catch (e) {
        return err(String(e), 500);
      }
    }

    // GET /api/pets/:id/ws — WebSocket upgrade
    const wsMatch = path.match(/^\/api\/pets\/([^/]+)\/ws$/);
    if (wsMatch) {
      const petId = wsMatch[1];
      const id = env.PET_ROOM.idFromName(petId);
      const stub = env.PET_ROOM.get(id);
      const wsReq = new Request(`https://do/ws?petId=${petId}`, {
        method: "GET",
        headers: request.headers,
      });
      return stub.fetch(wsReq);
    }

    // GET /api/chat/ws — Global chat WebSocket
    if (path === "/api/chat/ws") {
      const petId = url.searchParams.get("petId") ?? "unknown";
      const petName = url.searchParams.get("petName") ?? "Unknown";
      const species = url.searchParams.get("species") ?? "blob";
      const id = env.GLOBAL_CHAT.idFromName("global");
      const stub = env.GLOBAL_CHAT.get(id);
      const wsReq = new Request(
        `https://do/ws?petId=${encodeURIComponent(petId)}&petName=${encodeURIComponent(petName)}&species=${encodeURIComponent(species)}`,
        { method: "GET", headers: request.headers }
      );
      return stub.fetch(wsReq);
    }

    // Debug routes
    if (path === "/debug/pets") {
      const pets = await listPets(env.NEON_DATABASE_URL);
      return json(pets);
    }

    if (path === "/debug/think") {
      const thought = await generateThought(
        { name: "Zorp", species: "blob", personality: "theatrical", hunger: 75, happiness: 20 },
        env.AI
      );
      return json({ thought });
    }

    return json({ ok: true, message: "RealPet Worker v1" });
  },
} satisfies ExportedHandler<Env>;
