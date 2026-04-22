import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import type { Env, Pet } from "./types";
import { getPet, updatePetStats, appendEvent } from "./db";
import { generateThought } from "./ai";

type Params = { petId: string };

export class PetLifecycle extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { petId } = event.payload;

    // Run for ~48h (1440 ticks at 2min each)
    for (let i = 0; i < 1440; i++) {
      await step.sleep("tick-wait", "2 minutes");

      const pet = await step.do(`tick-${i}`, async (): Promise<Pet> => {
        const current = await getPet(this.env.NEON_DATABASE_URL, petId);
        if (!current) throw new Error("Pet not found");

        const hunger = Math.min(100, current.hunger + 5);
        const happiness = Math.max(0, current.happiness - 3);

        await updatePetStats(this.env.NEON_DATABASE_URL, petId, hunger, happiness);
        await appendEvent(this.env.NEON_DATABASE_URL, petId, "tick");

        const updated = { ...current, hunger, happiness };

        await fetch(`https://realpet-worker.sunitcloud.workers.dev/internal/do/${petId}/tick`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-internal-secret": this.env.DO_INTERNAL_SECRET,
          },
          body: JSON.stringify({ pet: updated }),
        });

        return updated;
      });

      if (pet.hunger > 70 || pet.happiness < 30 || Math.random() < 0.3) {
        await step.do(`think-${i}`, async () => {
          const thought = await generateThought(pet, this.env.AI);
          await appendEvent(this.env.NEON_DATABASE_URL, petId, "thought", { text: thought });

          await fetch(`https://realpet-worker.sunitcloud.workers.dev/internal/do/${petId}/thought`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-internal-secret": this.env.DO_INTERNAL_SECRET,
            },
            body: JSON.stringify({ text: thought, mood: { hunger: pet.hunger, happiness: pet.happiness } }),
          });
        });
      }
    }
  }
}
