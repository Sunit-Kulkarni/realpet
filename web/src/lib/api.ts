const BASE = process.env.NEXT_PUBLIC_WORKER_URL ?? "";

export async function adoptPet(data: { name: string; species: string; personality: string }): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/api/pets`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ id: string }>;
}

export async function fetchPet(id: string): Promise<{ pet: Pet; recentEvents: PetEvent[] }> {
  const res = await fetch(`${BASE}/api/pets/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ pet: Pet; recentEvents: PetEvent[] }>;
}

export async function sendAction(id: string, kind: "feed" | "play" | "chat"): Promise<{ ok: boolean; pet: Pet }> {
  const res = await fetch(`${BASE}/api/pets/${id}/actions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ ok: boolean; pet: Pet }>;
}

export interface Pet {
  id: string;
  name: string;
  species: "blob" | "cat" | "dragon";
  personality: "grumpy" | "anxious" | "theatrical" | "chill";
  hunger: number;
  happiness: number;
  created_at: string;
}

export async function listPets(): Promise<Pet[]> {
  const res = await fetch(`${BASE}/api/pets`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<Pet[]>;
}

export interface PetEvent {
  id: number;
  pet_id: string;
  kind: string;
  payload?: { text?: string };
  created_at: string;
}
