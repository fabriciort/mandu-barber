import { Bar, Block, LoadingShell, StatRowSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando o painel" className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Bar className="h-7 w-44 rounded" />
          <Bar className="h-4 w-64 rounded" />
        </div>
        <Bar className="h-11 w-40 rounded-[var(--radius-md)]" />
      </div>

      <StatRowSkeleton />

      <Block className="h-72 w-full" />
    </LoadingShell>
  );
}
