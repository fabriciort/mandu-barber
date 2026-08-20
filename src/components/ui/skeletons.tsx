import { cn } from "@/lib/cn";

/**
 * Esqueletos de carregamento.
 *
 * Todas as rotas deste app sao dinamicas: nada e pre-renderizado, entao entre
 * o toque e a tela nova existe uma ida ao servidor. Sem esqueleto, o celular
 * fica congelado na pagina anterior e a pessoa acha que o toque nao pegou.
 *
 * Cada esqueleto imita o ESQUELETO REAL da tela que vai chegar — mesma altura,
 * mesmo numero de blocos, mesma coluna. Retangulo generico no lugar errado e
 * pior que esqueleto nenhum: a tela pula quando o conteudo entra.
 */
export function Bar({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4", className)} aria-hidden />;
}

export function Block({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("skeleton rounded-[var(--radius-xl)]", className)} style={style} aria-hidden />
  );
}

/** Casca comum: avisa leitor de tela uma vez e esconde o resto. */
export function LoadingShell({
  children,
  label = "Carregando",
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Lista de cartoes — agendamentos, clientes, avaliacoes. */
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-start gap-4 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-4"
          style={{ opacity: 1 - index * 0.14 }}
        >
          <Block className="size-16 shrink-0 rounded-[var(--radius-md)]" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Bar className="w-24 rounded-full" />
            <Bar className="h-5 w-2/3 rounded" />
            <Bar className="w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Faixa de indicadores do painel. */
export function StatRowSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] p-5"
        >
          <Bar className="h-3 w-24 rounded-full" />
          <Bar className="mt-3 h-8 w-28 rounded" />
          <Bar className="mt-2.5 h-3 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
