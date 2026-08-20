import { Bar, Block, LoadingShell } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingShell label="Carregando o agendamento" className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Bar className="h-9 w-56 rounded" />
      <Bar className="mt-3 h-4 w-72 rounded" />

      {/* Trilha de passos */}
      <div className="mt-8 flex items-center gap-2">
        <Bar className="h-3 w-20 rounded-full" />
        <Bar className="h-1 flex-1 rounded-full" />
      </div>

      {/* Cardapio de servicos */}
      <Bar className="mt-8 h-4 w-20 rounded-full" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((index) => (
          <Block key={index} className="h-[104px] w-full" />
        ))}
      </div>
    </LoadingShell>
  );
}
