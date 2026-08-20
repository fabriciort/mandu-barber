"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { filterPillClass } from "@/components/ui/filter-pill";

/**
 * Abas da conta.
 *
 * Usam a MESMA pilula dos filtros do resto do app — selecionado vira bloco
 * solido, o restante fica so com contorno. Antes tinham desenho proprio (caixa
 * cinza com uma aba levemente mais clara dentro), o que dava a impressao de
 * outro aplicativo dentro do aplicativo.
 *
 * A faixa rola na horizontal no celular e a aba ativa se centraliza sozinha:
 * senao, quem esta na ultima aba nunca ve onde esta.
 */
export function AccountTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const activeRef = React.useRef<HTMLAnchorElement>(null);

  React.useEffect(() => {
    const alvo = activeRef.current;
    const faixa = alvo?.closest("nav");
    if (!alvo || !faixa) return;

    // So rola se a aba ativa estiver mesmo fora de vista: nao ha por que
    // mexer na faixa quando a aba ja esta a mostra.
    const a = alvo.getBoundingClientRect();
    const f = faixa.getBoundingClientRect();
    const visivel = a.left >= f.left + 12 && a.right <= f.right - 12;
    if (visivel) return;

    alvo.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav
      className="fade-edges snap-row -mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      aria-label="Seções da conta"
    >
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
            className={filterPillClass(active)}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
