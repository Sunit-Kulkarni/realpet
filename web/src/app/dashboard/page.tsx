"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { listPets, type Pet } from "@/lib/api";
import { Y2KWindow } from "@/components/Y2KWindow";

const SPECIES_EMOJI: Record<string, string> = { blob: "🫧", cat: "🐱", dragon: "🐉" };
const PERSONALITY_LABEL: Record<string, string> = {
  chill: "😎 Chill", grumpy: "😤 Grumpy", anxious: "😰 Anxious", theatrical: "🎭 Theatrical",
};

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="stat-track" style={{ height: 10 }}>
      <div className="stat-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function PetCard({ pet }: { pet: Pet }) {
  const emoji = SPECIES_EMOJI[pet.species] ?? "🐾";
  const mood = pet.happiness < 30 || pet.hunger > 70;
  return (
    <Link href={`/pet/${pet.id}`} className="pet-card-link">
      <div className={`pet-card ${mood ? "pet-card-sad" : "pet-card-happy"}`}>
        <div className="pet-card-title">{emoji} {pet.name}</div>
        <div className="pet-card-sub">{PERSONALITY_LABEL[pet.personality] ?? pet.personality}</div>
        <div className="pet-card-stats">
          <div className="pet-card-stat-row">
            <span>🍖</span><MiniBar value={pet.hunger} color="#e05252" />
          </div>
          <div className="pet-card-stat-row">
            <span>😊</span><MiniBar value={pet.happiness} color="#52c85a" />
          </div>
        </div>
        <div className="pet-card-footer">Click to visit →</div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load() {
    try {
      const data = await listPets();
      setPets(data);
      setLastUpdated(new Date());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main>
      <Y2KWindow title="🌍 Pet Sanctuary — All Living Pets">
        <div style={{ marginBottom: 8, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span><strong>{pets.length}</strong> pet{pets.length !== 1 ? "s" : ""} living on the server right now</span>
          {lastUpdated && <span style={{ color: "#555" }}>Updated: {lastUpdated.toLocaleTimeString()} (auto-refreshes every 10s)</span>}
        </div>
        {pets.length === 0 ? (
          <p style={{ textAlign: "center", padding: 20, fontFamily: "Comic Sans MS, cursive" }}>
            No pets yet! <Link href="/" style={{ color: "#000080" }}>Adopt one →</Link>
          </p>
        ) : (
          <div className="pet-grid">
            {pets.map((pet) => <PetCard key={pet.id} pet={pet} />)}
          </div>
        )}
      </Y2KWindow>
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <Link href="/" className="y2k-button" style={{ display: "inline-block", textDecoration: "none", padding: "4px 16px" }}>
          ← Adopt a New Pet
        </Link>
      </div>
    </main>
  );
}
