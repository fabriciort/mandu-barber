"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

/**
 * Abas da conta.
 *
 * A aba ativa nao e marcada por cor, e sim por um indicador que desliza de uma
 * para a outra (view transition do proprio navegador via layout compartilhado).
 * No celular a faixa rola na horizontal e a aba ativa se centraliza sozinha —
 * senao, quem esta na ultima aba nunca ve onde esta.
 */
export function AccountTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const activeRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav
      className="fade-edges snap-row mt-7 -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      aria-label="Seções da conta"
    >
      <span className="flex gap-1 rounded-[var(--radius-lg)] bg-[var(--surface-muted)] p-1">
        {tabs.map((tab) => {
          // A aba "Resumo" so fica ativa na rota exata; as demais cobrem subrotas.
          const active =
            tab.href === "/minha-conta" ? pathname === tab.href : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "pressable whitespace-nowrap rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium",
                active
                  ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </span>
    </nav>
  );
}
