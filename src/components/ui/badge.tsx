import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/cn";

/**
 * Etiqueta de status.
 *
 * Sem cor para carregar significado, o status vira FORMA. Cada tom tem uma
 * silhueta propria, entao da para distinguir de relance, no monocromatico,
 * impresso e por quem nao diferencia cores:
 *
 *   solid    preenchido, contraste maximo   -> acontecendo / confirmado
 *   outline  contorno firme                 -> combinado, ainda no futuro
 *   muted    preenchimento sutil, sem borda -> encerrado, sem acao pendente
 *   dashed   contorno tracejado             -> algo saiu do previsto
 *   strike   riscado e apagado              -> anulado
 *
 * Os tons "on-*" sao os mesmos, mas para uso DENTRO de um bloco invertido: ali
 * --accent tem a mesma cor do fundo e a etiqueta normal sumiria.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors",
  {
    variants: {
      tone: {
        solid: "bg-[var(--accent)] text-[var(--accent-contrast)]",
        outline: "border border-[var(--border-strong)] text-[var(--text-primary)]",
        muted: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
        dashed: "border border-dashed border-[var(--text-muted)] text-[var(--text-primary)]",
        strike: "bg-[var(--surface-muted)] text-[var(--text-muted)] line-through decoration-1",
        "on-solid": "bg-[var(--surface)] text-[var(--text-primary)]",
        "on-outline": "border border-current/40 text-current",
        "on-dashed": "border border-dashed border-current/50 text-current",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px] leading-4",
        md: "px-2.5 py-1 text-xs leading-4",
      },
    },
    defaultVariants: { tone: "outline", size: "md" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({
  className,
  tone,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />;
}

/**
 * Marcador compacto para listas densas, onde nao cabe uma etiqueta inteira.
 * Mesma logica: a forma diz o status.
 */
export function StatusDot({ tone = "outline", className }: { tone?: BadgeTone; className?: string }) {
  const shape: Record<BadgeTone, string> = {
    solid: "bg-[var(--accent)]",
    outline: "border-2 border-[var(--text-primary)]",
    muted: "bg-[var(--text-muted)]",
    dashed: "border-2 border-dashed border-[var(--text-primary)]",
    strike: "bg-[var(--border-strong)]",
    "on-solid": "bg-current",
    "on-outline": "border-2 border-current",
    "on-dashed": "border-2 border-dashed border-current",
  };

  return (
    <span
      className={cn("inline-block size-2.5 shrink-0 rounded-full", shape[tone], className)}
      aria-hidden
    />
  );
}

/** Ponto que pulsa — usado apenas no atendimento em andamento. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}

export { badgeVariants };
