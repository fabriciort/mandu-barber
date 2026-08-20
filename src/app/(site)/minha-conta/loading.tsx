import { Bar, Block, CardListSkeleton, LoadingShell } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando sua conta" className="space-y-8">
      {/* Bloco do proximo horario */}
      <div>
        <Bar className="h-3 w-32 rounded-full" />
        <Block className="mt-4 h-48 w-full rounded-[var(--radius-2xl)]" />
      </div>

      <div>
        <Bar className="h-3 w-28 rounded-full" />
        <div className="mt-4">
          <CardListSkeleton rows={3} />
        </div>
      </div>
    </LoadingShell>
  );
}
