import { PetView } from "@/components/PetView";

export default async function PetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main>
      <PetView petId={id} />
    </main>
  );
}
