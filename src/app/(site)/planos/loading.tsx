import { Bar, Block, LoadingShell } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <LoadingShell
      label="Carregando os planos"
      className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-20"
    >
      <div className="mx-auto max-w-2xl">
        <Bar className="mx-auto h-3 w-24 rounded-full" />
        {/* Duas barras, e nao um bloco alto: no celular o titulo quebra em duas
            linhas, entao o esqueleto tambem quebra. */}
        <Bar className="mx-auto mt-6 h-10 w-full rounded-lg" />
        <Bar className="mx-auto mt-2.5 h-10 w-4/5 rounded-lg" />
        <Bar className="mx-auto mt-6 h-4 w-11/12 rounded" />
        <Bar className="mx-auto mt-2 h-4 w-3/4 rounded" />
      </div>

      {/* No celular so o primeiro cartao cabe na tela; os outros dois entram
          esmaecidos, sugerindo que ha mais abaixo sem encher de cinza. */}
      <div className="mt-14 grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Block
            key={index}
            className="h-[440px] w-full lg:h-[520px]"
            style={{ opacity: 1 - index * 0.3 }}
          />
        ))}
      </div>
    </LoadingShell>
  );
}
