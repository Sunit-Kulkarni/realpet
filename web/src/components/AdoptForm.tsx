"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { adoptPet } from "@/lib/api";
import { Y2KWindow } from "./Y2KWindow";

export function AdoptForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("blob");
  const [personality, setPersonality] = useState("chill");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { id } = await adoptPet({ name: name.trim(), species, personality });
      router.push(`/pet/${id}`);
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <Y2KWindow title="🐾 Adopt a RealPet™ Today!" className="adopt-window">
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>Pet Name:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter name..."
            maxLength={20}
            required
            className="y2k-input"
          />
        </div>

        <div className="form-row">
          <label>Species:</label>
          <select value={species} onChange={(e) => setSpecies(e.target.value)} className="y2k-select">
            <option value="blob">🫧 Blob</option>
            <option value="cat">🐱 Cat</option>
            <option value="dragon">🐉 Dragon</option>
          </select>
        </div>

        <div className="form-row">
          <label>Personality:</label>
          <select value={personality} onChange={(e) => setPersonality(e.target.value)} className="y2k-select">
            <option value="chill">😎 Chill</option>
            <option value="grumpy">😤 Grumpy</option>
            <option value="anxious">😰 Anxious</option>
            <option value="theatrical">🎭 Theatrical</option>
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button type="submit" disabled={loading} className="y2k-button adopt-btn">
          {loading ? "Creating..." : "✨ ADOPT NOW ✨"}
        </button>
      </form>
    </Y2KWindow>
  );
}
