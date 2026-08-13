"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";

export function AccountTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="mt-6 flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)]"
      aria-label="Secoes da conta"
    >
      {tabs.map((tab) => {
        // A aba "Resumo" so fica ativa na rota exata; as demais cobrem subrotas.
        const active =
          tab.href === "/minha-conta"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-[var(--accent)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
