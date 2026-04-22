import { neon } from "@neondatabase/serverless";
import type { Pet, PetEvent } from "./types";

export function getDb(url: string) {
  return neon(url);
}

export async function getPet(url: string, id: string): Promise<Pet | null> {
  const sql = getDb(url);
  const rows = await sql`SELECT * FROM pets WHERE id = ${id} LIMIT 1`;
  return (rows[0] as Pet) ?? null;
}

export async function createPet(
  url: string,
  data: { name: string; species: string; personality: string }
): Promise<Pet> {
  const sql = getDb(url);
  const rows = await sql`
    INSERT INTO pets (name, species, personality)
    VALUES (${data.name}, ${data.species}, ${data.personality})
    RETURNING *
  `;
  return rows[0] as Pet;
}

export async function updatePetStats(
  url: string,
  id: string,
  hunger: number,
  happiness: number
): Promise<void> {
  const sql = getDb(url);
  await sql`UPDATE pets SET hunger = ${hunger}, happiness = ${happiness} WHERE id = ${id}`;
}

export async function appendEvent(
  url: string,
  petId: string,
  kind: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const sql = getDb(url);
  await sql`
    INSERT INTO events (pet_id, kind, payload)
    VALUES (${petId}, ${kind}, ${payload ? JSON.stringify(payload) : null})
  `;
}

export async function getRecentEvents(url: string, petId: string, limit = 20): Promise<PetEvent[]> {
  const sql = getDb(url);
  const rows = await sql`
    SELECT * FROM events WHERE pet_id = ${petId} ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows as PetEvent[];
}

export async function getRecentThoughts(url: string, petId: string, limit = 3): Promise<{ text: string; created_at: string }[]> {
  const sql = getDb(url);
  const rows = await sql`
    SELECT payload, created_at FROM events
    WHERE pet_id = ${petId} AND kind = 'thought' AND payload IS NOT NULL
    ORDER BY created_at DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({ text: (r.payload as { text: string }).text, created_at: r.created_at as string }));
}

export async function listPets(url: string): Promise<Pet[]> {
  const sql = getDb(url);
  const rows = await sql`SELECT * FROM pets ORDER BY created_at DESC LIMIT 50`;
  return rows as Pet[];
}
