import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Estado vazio que explica e oferece saida. Nunca "nenhum resultado" seco —
 * o usuario precisa saber por que esta vazio e o que fazer a seguir.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-[var(--surface-muted)]">
          <Icon className="size-5 text-[var(--text-muted)]" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-medium text-[var(--text-primary)]">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
