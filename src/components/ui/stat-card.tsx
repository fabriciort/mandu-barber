import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Cartao de indicador.
 *
 * O numero e o heroi: fica grande, com numeral tabular para as colunas
 * alinharem entre cartoes. A variacao so aparece quando ha base de comparacao
 * — "+0%" contra um mes sem dados seria mentira estatistica. Sem cor, a
 * direcao vem da seta e do sinal.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  emphasis = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  delta?: { percent: number; label?: string } | null;
  /** Inverte o cartao — reservado para o indicador principal da tela. */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group rounded-[var(--radius-lg)] border p-4 transition-colors sm:p-5",
        emphasis
          ? "border-transparent bg-[var(--surface-inverse)] text-[var(--text-inverse)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-default)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-2xs font-medium uppercase tracking-[0.12em]",
            emphasis ? "text-[var(--text-inverse)]/55" : "text-[var(--text-muted)]",
          )}
        >
          {label}
        </p>
        {Icon ? (
          <Icon
            className={cn(
              "size-4 shrink-0",
              emphasis ? "text-[var(--text-inverse)]/40" : "text-[var(--text-muted)]",
            )}
          />
        ) : null}
      </div>

      <p className="tnum mt-3 text-2xl font-semibold tracking-[var(--tracking-tight)] sm:text-[1.75rem]">
        {value}
      </p>

      {delta || hint ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {delta ? (
            <span
              className={cn(
                "tnum inline-flex items-center gap-1 text-xs font-medium",
                emphasis ? "text-[var(--text-inverse)]" : "text-[var(--text-primary)]",
              )}
            >
              {delta.percent >= 0 ? (
                <TrendingUp className="size-3.5" aria-hidden />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden />
              )}
              {delta.percent >= 0 ? "+" : ""}
              {delta.percent}%{delta.label ? ` ${delta.label}` : ""}
            </span>
          ) : null}
          {hint ? (
            <span
              className={cn(
                "text-xs",
                emphasis ? "text-[var(--text-inverse)]/50" : "text-[var(--text-muted)]",
              )}
            >
              {hint}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
