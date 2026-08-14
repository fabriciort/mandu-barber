import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Pilula de filtro — o mesmo desenho em toda a plataforma.
 *
 * Sem cor para marcar o filtro ativo, quem faz esse trabalho e a inversao:
 * o selecionado vira um bloco solido e os demais ficam so com contorno. E o
 * contraste maximo possivel entre "ligado" e "desligado", sem depender de
 * matiz — funciona no claro, no escuro e para quem nao distingue cores.
 */
export function filterPillClass(active: boolean, className?: string) {
  return cn(
    "pressable inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-medium",
    active
      ? "border-transparent bg-[var(--accent)] text-[var(--accent-contrast)]"
      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
    className,
  );
}

export function FilterPill({
  href,
  active,
  children,
  className,
  count,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  className?: string;
  /** Quantidade ao lado do rotulo, quando ajuda a decidir se vale clicar. */
  count?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={filterPillClass(active, className)}
    >
      {children}
      {typeof count === "number" ? (
        <span className={cn("tnum text-xs", active ? "opacity-70" : "text-[var(--text-muted)]")}>
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * Faixa de filtros: rola na horizontal no celular sem barra visivel e com as
 * bordas esmaecidas, indicando que ha mais opcoes fora da tela.
 */
export function FilterRow({
  children,
  className,
  label = "Filtros",
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "fade-edges snap-row -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
