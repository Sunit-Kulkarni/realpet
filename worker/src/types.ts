export interface Pet {
  id: string;
  name: string;
  species: "blob" | "cat" | "dragon";
  personality: "grumpy" | "anxious" | "theatrical" | "chill";
  hunger: number;
  happiness: number;
  created_at: string;
}

export interface PetEvent {
  id: number;
  pet_id: string;
  kind: "fed" | "played" | "thought" | "tick" | "chat";
  payload?: Record<string, unknown>;
  created_at: string;
}

// WS server → client
export type ServerMsg =
  | { type: "state"; pet: Pet }
  | { type: "thought"; text: string; mood: { hunger: number; happiness: number }; at: number }
  | { type: "event"; kind: string; at: number };

// WS client → server
export type ClientMsg =
  | { type: "action"; kind: "feed" | "play" | "chat"; payload?: unknown }
  | { type: "ping" };

export interface Env {
  PET_ROOM: DurableObjectNamespace;
  GLOBAL_CHAT: DurableObjectNamespace;
  PET_LIFECYCLE: Workflow;
  AI: Ai;
  NEON_DATABASE_URL: string;
  DO_INTERNAL_SECRET: string;
}
