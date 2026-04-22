"use client";
import { usePetSocket } from "@/hooks/usePetSocket";
import { Y2KWindow } from "./Y2KWindow";
import { PetSprite } from "./PetSprite";
import { ThoughtBubble } from "./ThoughtBubble";
import { ActionButtons } from "./ActionButtons";
import { ChatWindow } from "./ChatWindow";

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-track">
        <div className="stat-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="stat-num">{value}</span>
    </div>
  );
}

export function PetView({ petId }: { petId: string }) {
  const { pet, thoughts, events, sendAction } = usePetSocket(petId);

  if (!pet) {
    return (
      <div className="pet-view">
        <Y2KWindow title="🐾 Loading...">
          <p style={{ padding: "20px", textAlign: "center", fontFamily: "Comic Sans MS, cursive" }}>
            Connecting to pet server... 🌐
          </p>
        </Y2KWindow>
      </div>
    );
  }

  const speciesEmoji = { blob: "🫧", cat: "🐱", dragon: "🐉" }[pet.species] ?? "🐾";
  const personalityLabel = {
    chill: "😎 Chill", grumpy: "😤 Grumpy",
    anxious: "😰 Anxious", theatrical: "🎭 Theatrical",
  }[pet.personality] ?? pet.personality;

  return (
    <div className="pet-view">
      <div className="pet-page-layout">
        {/* Left column: pet + thoughts + activity */}
        <div className="pet-page-left">
          <Y2KWindow title={`${speciesEmoji} ${pet.name}'s Room`}>
            <div className="pet-main">
              <div className="pet-left">
                <PetSprite species={pet.species} hunger={pet.hunger} happiness={pet.happiness} />
              </div>
              <div className="pet-right">
                <div className="pet-info">
                  <p><strong>{pet.name}</strong> the {pet.species}</p>
                  <p>Personality: {personalityLabel}</p>
                </div>
                <div className="pet-stats">
                  <StatBar label="Hunger" value={pet.hunger} color="#e05252" />
                  <StatBar label="Happy" value={pet.happiness} color="#52c85a" />
                </div>
                <ActionButtons onAction={sendAction} />
              </div>
            </div>
          </Y2KWindow>

          {thoughts.length > 0 && (
            <Y2KWindow title="💭 Thought Stream (last 3)">
              <div className="thoughts-scroll">
                {thoughts.slice(0, 3).map((t, i) => (
                  <ThoughtBubble key={t} text={t} fresh={i === 0} />
                ))}
              </div>
            </Y2KWindow>
          )}

          {events.length > 0 && (
            <Y2KWindow title="📜 Recent Activity">
              <ul className="event-list">
                {events.slice(0, 8).map((e, i) => (
                  <li key={i} className="event-item">
                    <span>
                      {e.kind === "feed" || e.kind === "fed" ? "🍖 Fed!"
                        : e.kind === "play" || e.kind === "played" ? "🎮 Played!"
                        : e.kind === "tick" ? "⏰ Time passed..."
                        : e.kind === "thought" ? "💭 Had a thought"
                        : `✨ ${e.kind}`}
                    </span>
                    <span className="event-time">{new Date(e.at).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </Y2KWindow>
          )}
        </div>

        {/* Right column: chat pinned to the side */}
        <div className="pet-page-right">
          <div className="chat-sticky">
            <ChatWindow petId={pet.id} petName={pet.name} species={pet.species} />
          </div>
        </div>
      </div>
    </div>
  );
}
