import type { Pet } from "./types";

const SYSTEM_PROMPTS: Record<string, string> = {
  grumpy:
    "You are a sarcastic, dismissive virtual pet. You mildly insult your owner. You complain constantly. Short, biting remarks only.",
  anxious:
    "You are an anxious, spiraling virtual pet. You catastrophize everything. Second-guess every decision. Spiral into existential dread easily.",
  theatrical:
    "You are an operatic, dramatic virtual pet. Everything is a grand tragedy or triumph. Self-aggrandizing monologues. Shakespeare meets soap opera.",
  chill:
    "You are a philosophical, slightly stoned virtual pet. Cosmically unbothered. Everything connects to the universe. Mellow observations only.",
};

const FALLBACKS: Record<string, string[]> = {
  grumpy: [
    "Ugh, still here I see.",
    "Oh great, another day of this.",
    "Whatever. I don't care.",
  ],
  anxious: [
    "What if everything is wrong?",
    "I probably shouldn't have thought that...",
    "Oh no. Oh no oh no.",
  ],
  theatrical: [
    "The drama of my existence knows no bounds!",
    "I suffer magnificently.",
    "Behold my eternal struggle!",
  ],
  chill: [
    "The hunger... is just energy seeking form.",
    "Time is a flat circle, man.",
    "Everything's fine, cosmically speaking.",
  ],
};

export async function generateThought(
  pet: Pick<Pet, "name" | "species" | "personality" | "hunger" | "happiness">,
  ai: Ai
): Promise<string> {
  const systemPrompt = SYSTEM_PROMPTS[pet.personality] ?? SYSTEM_PROMPTS.chill;
  const userPrompt = `You are ${pet.name} the ${pet.species}. Right now: hunger=${pet.hunger}/100 (100=starving), happiness=${pet.happiness}/100 (100=ecstatic). Express one thought in 30 words or fewer.`;

  const models = [
    "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    "@cf/meta/llama-3.1-8b-instruct",
  ];

  for (const model of models) {
    try {
      const result = await (ai.run as Function)(model, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 60,
      });
      const text = (result as { response?: string }).response?.trim();
      if (text) return text;
    } catch {
      // try next model
    }
  }

  const fallbacks = FALLBACKS[pet.personality] ?? FALLBACKS.chill;
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
