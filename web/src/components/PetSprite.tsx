"use client";

const FRAMES: Record<string, [string, string]> = {
  blob:   ["( •‿•)", "( •ω•)"],
  cat:    ["(=^•ω•^=)", "(=^-ω-^=)"],
  dragon: ["(｀∀´)凸", "(>▽<)凸"],
};

export function PetSprite({ species, hunger, happiness }: { species: string; hunger: number; happiness: number }) {
  const [a, b] = FRAMES[species] ?? FRAMES.blob;
  const mood = happiness < 30 || hunger > 70 ? "mood-sad" : "mood-happy";

  return (
    <div className={mood}>
      <div className="pet-sprite-container">
        <div className="pet-ascii">
          <span className="frame-a">{a}</span>
          <span className="frame-b">{b}</span>
        </div>
      </div>
    </div>
  );
}
