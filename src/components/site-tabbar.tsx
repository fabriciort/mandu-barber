"use client";

import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Sparkles, UserRound } from "lucide-react";

import { cn } from "@/lib/cn";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Casa tambem as subrotas (ex.: /minha-conta/plano acende a aba Conta). */
  match?: (pathname: string) => boolean;
};

/**
 * Barra de abas do celular.
 *
 * Um menu sanduiche esconde a navegacao atras de dois toques e de um gesto que
 * a pessoa precisa descobrir. A barra inferior deixa os quatro destinos sempre
 * visiveis, na altura do polegar, que e onde a mao ja esta. E o padrao que todo
 * aplicativo nativo usa — a familiaridade e metade da usabilidade.
 */
export function SiteTabBar({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { href: "/", label: "Início", icon: Home, match: (p) => p === "/" },
    { href: "/agendar", label: "Agendar", icon: CalendarDays },
    { href: "/planos", label: "Planos", icon: Sparkles },
    {
      href: authenticated ? "/minha-conta" : "/entrar",
      label: authenticated ? "Conta" : "Entrar",
      icon: UserRound,
      match: (p) => p.startsWith("/minha-conta") || p.startsWith("/entrar") || p.startsWith("/cadastro"),
    },
  ];

  // A barra nao aparece onde ela atrapalha: o assistente de agendamento tem a
  // propria barra fixa com o total, e duas barras empilhadas comem meia tela.
  if (pathname.startsWith("/agendar") || pathname.startsWith("/painel")) return null;

  return (
    <>
      {/* Espacador: sem ele a barra cobre o fim do conteudo da pagina. */}
      <div className="h-[4.5rem] md:hidden" aria-hidden />

      <nav
        className="sticky-bar fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-subtle)] pb-safe md:hidden"
        aria-label="Navegação principal"
      >
        <ul className="flex items-stretch">
          {tabs.map((tab) => {
            const active = tab.match ? tab.match(pathname) : pathname.startsWith(tab.href);
            return (
              <li key={tab.label} className="flex-1">
                <TabLink tab={tab} active={active} />
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon;

  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="group relative flex h-16 flex-col items-center justify-center gap-1 outline-offset-[-4px]"
    >
      <TabContent Icon={Icon} label={tab.label} active={active} />
    </Link>
  );
}

/**
 * Precisa ser um componente separado: useLinkStatus so enxerga o <Link> quando
 * chamado de dentro dele.
 */
function TabContent({
  Icon,
  label,
  active,
}: {
  Icon: Tab["icon"];
  label: string;
  active: boolean;
}) {
  // Rota dinamica demora o que o servidor demorar. Sem sinal nenhum, a pessoa
  // acha que o toque nao pegou e toca de novo.
  const { pending } = useLinkStatus();

  return (
    <>
      {/* Marca da aba ativa: risco no topo, do lado que o dedo nao cobre. */}
      <span
        className={cn(
          "absolute inset-x-5 top-0 h-0.5 rounded-full bg-[var(--accent)] transition-transform duration-300",
          active ? "scale-x-100" : "scale-x-0",
        )}
        aria-hidden
      />

      <span
        className={cn(
          "relative flex size-6 items-center justify-center transition-transform duration-200",
          "group-active:scale-90",
          active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
        )}
      >
        <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
        {pending ? (
          <span
            className="absolute -right-1.5 -top-1 size-1.5 animate-ping rounded-full bg-[var(--accent)]"
            aria-hidden
          />
        ) : null}
      </span>

      <span
        className={cn(
          "text-[11px] leading-none transition-colors",
          active
            ? "font-semibold text-[var(--text-primary)]"
            : "font-medium text-[var(--text-muted)]",
        )}
      >
        {label}
      </span>
      {pending ? <span className="sr-only">Carregando…</span> : null}
    </>
  );
}
