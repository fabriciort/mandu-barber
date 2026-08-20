"use client";

import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, Home, Sparkles, UserRound } from "lucide-react";

import { cn } from "@/lib/cn";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  match: (pathname: string) => boolean;
};

/**
 * Navegacao do celular como camada de vidro flutuante.
 *
 * Duas pecas separadas, de proposito:
 *
 *   [ Inicio  Planos  Conta ]   ( + )
 *
 * A capsula guarda os destinos; o circulo isolado guarda a ACAO — agendar,
 * que e o que a barbearia quer que aconteca. Misturar os dois numa fileira de
 * quatro iguais faz a acao principal virar mais um item de menu.
 *
 * Flutua com margem em vez de colar na borda: o conteudo passa POR BAIXO e
 * aparece desfocado atraves do vidro, o que deixa claro que existe mais
 * pagina ali embaixo — coisa que uma barra opaca colada na borda esconde.
 */
export function SiteTabBar({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  const tabs: Tab[] = [
    { href: "/", label: "Início", icon: Home, match: (p) => p === "/" },
    { href: "/planos", label: "Planos", icon: Sparkles, match: (p) => p.startsWith("/planos") },
    {
      href: authenticated ? "/minha-conta" : "/entrar",
      label: authenticated ? "Conta" : "Entrar",
      icon: UserRound,
      match: (p) =>
        p.startsWith("/minha-conta") || p.startsWith("/entrar") || p.startsWith("/cadastro"),
    },
  ];

  const activeIndex = tabs.findIndex((tab) => tab.match(pathname));

  // Some onde atrapalha: o assistente de agendamento tem a propria barra com o
  // total, e duas camadas flutuantes empilhadas comem meia tela.
  if (pathname.startsWith("/agendar") || pathname.startsWith("/painel")) return null;

  return (
    <>
      {/* Espacador: a barra flutua, mas o fim do conteudo precisa caber acima dela. */}
      <div className="h-[5.5rem] md:hidden" aria-hidden />

      {/* Veu: o conteudo que passa AO LADO das pilulas continua nitido e deixa
          a faixa poluida. Um degrade fraco acalma essa area sem tapar nada —
          se fosse opaco, a camada deixaria de flutuar. */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-[var(--surface)] via-[var(--surface)]/55 to-transparent md:hidden"
        aria-hidden
      />

      {/* justify-between + capsula flexivel: assim a capsula comeca na margem
          esquerda e o botao termina na direita, exatamente onde a pilula do logo
          comeca e o circulo do menu termina la em cima. As quatro pecas se
          alinham pelas mesmas duas linhas verticais. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2.5 px-4 pb-3 pb-safe md:hidden">
        <nav
          className="glass pointer-events-auto min-w-0 flex-1 rounded-full p-1.5"
          aria-label="Navegação principal"
        >
          <div className="relative grid grid-cols-3">
            {/* Indicador que desliza de uma aba para a outra, em vez de piscar
                num lugar novo — o movimento conta de onde para onde voce foi. */}
            {activeIndex >= 0 ? (
              <span
                className="glass-pill absolute inset-y-0 left-0 w-1/3 rounded-full transition-transform duration-[400ms] ease-[var(--ease-out-quint)]"
                style={{ transform: `translateX(${activeIndex * 100}%)` }}
                aria-hidden
              />
            ) : null}

            {tabs.map((tab, index) => (
              <TabLink key={tab.label} tab={tab} active={index === activeIndex} />
            ))}
          </div>
        </nav>

        <Link
          href="/agendar"
          aria-label="Agendar horário"
          className={cn(
            "pointer-events-auto flex size-[3.25rem] shrink-0 items-center justify-center rounded-full",
            "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-glass)]",
            // O anel na cor da pagina e o que salva o botao quando o conteudo
            // atras tem a mesma cor dele: sobre o cartao preto, um circulo
            // preto simplesmente desaparecia e sobrava o icone solto no ar.
            "ring-[3px] ring-[var(--surface)]",
            "transition-transform duration-200 active:scale-90",
          )}
        >
          <ActionIcon />
        </Link>
      </div>
    </>
  );
}

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className="relative flex h-[3.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-full outline-offset-[-3px]"
    >
      <TabContent tab={tab} active={active} />
    </Link>
  );
}

/** Separado porque useLinkStatus so enxerga o <Link> de dentro dele. */
function TabContent({ tab, active }: { tab: Tab; active: boolean }) {
  const { pending } = useLinkStatus();
  const Icon = tab.icon;

  return (
    <span
      className={cn(
        "flex flex-col items-center gap-0.5 transition-all duration-300",
        active ? "text-[var(--text-inverse)]" : "text-[var(--text-primary)] opacity-70",
        pending && !active && "opacity-50",
      )}
    >
      <Icon className="size-[19px]" strokeWidth={active ? 2.3 : 1.8} />
      <span className={cn("text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
        {tab.label}
      </span>
      {pending ? <span className="sr-only">Carregando…</span> : null}
    </span>
  );
}

/** Icone da acao, com o mesmo aviso de carregamento das abas. */
function ActionIcon() {
  const { pending } = useLinkStatus();
  return (
    <>
      <CalendarPlus
        className={cn("size-[22px] transition-opacity", pending && "opacity-50")}
        strokeWidth={2}
      />
      {pending ? <span className="sr-only">Carregando…</span> : null}
    </>
  );
}
