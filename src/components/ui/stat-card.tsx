import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Cartao de indicador. A variacao so aparece quando ha base de comparacao —
 * "+0%" contra um mes sem dados seria mentira estatistica.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  tone = "neutral",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  delta?: { percent: number; label?: string } | null;
  tone?: "neutral" | "accent" | "success" | "warning";
  className?: string;
}) {
  const toneClass = {
    neutral: "text-[var(--text-muted)]",
    accent: "text-[var(--accent)]",
    success: "text-moss-500",
    warning: "text-clay-500",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        {Icon ? <Icon className={cn("size-4", toneClass)} /> : null}
      </div>

      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>

      <div className="mt-1 flex items-center gap-2">
        {delta ? (
          <span
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              delta.percent >= 0 ? "text-moss-600 dark:text-moss-400" : "text-rust-500",
            )}
          >
            {delta.percent >= 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {delta.percent >= 0 ? "+" : ""}
            {delta.percent}%{delta.label ? ` ${delta.label}` : ""}
          </span>
        ) : null}
        {hint ? <span className="text-xs text-[var(--text-muted)]">{hint}</span> : null}
      </div>
    </div>
  );
}
