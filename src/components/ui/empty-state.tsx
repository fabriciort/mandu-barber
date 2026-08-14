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
        // Borda tracejada: no monocromatico e ela que diz "aqui ainda nao tem
        // conteudo" sem precisar de um cinza especial de fundo.
        "flex flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[var(--border-strong)] px-6 py-14 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="relative flex size-12 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)] text-[var(--text-muted)]">
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="space-y-1.5">
        <p className="text-balance font-medium text-[var(--text-primary)]">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-pretty text-sm leading-relaxed text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
