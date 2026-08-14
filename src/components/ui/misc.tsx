import * as React from "react";

import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton rounded-lg", className)} {...props} />;
}

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-[var(--border-subtle)]", className)} {...props} />;
}

/** Cabecalho padrão de página interna: titulo, apoio e ações. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-[1.75rem] font-semibold leading-none tracking-[var(--tracking-tight)]">
          {title}
        </h1>
        {description ? (
          <p className="text-pretty text-sm text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Rotulo curto acima de um valor — usado em fichas e resumos. */
export function DataItem({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="text-2xs uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

/**
 * Titulo de secao com fio: o filete horizontal ocupa o espaco vazio entre o
 * rotulo e a acao. Sem cor para separar blocos, e a regra tipografica que
 * organiza a pagina — e ela funciona igual nos dois temas.
 */
export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center gap-4", className)}>
      <h2 className="shrink-0 text-2xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {children}
      </h2>
      <span className="h-px flex-1 bg-[var(--border-subtle)]" aria-hidden />
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
