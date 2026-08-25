"use client";

import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarPlus, Home, Sparkles, UserRound } from "lucide-react";

import { cn } from "@/lib/cn";
import { Veu } from "@/components/veu";
import { useArrastarSelecao } from "@/components/use-arrastar-selecao";

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
  const router = useRouter();

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

  const arrastar = useArrastarSelecao({
    quantidade: tabs.length,
    indiceAtivo: activeIndex,
    aoSoltar: (indice: number) => router.push(tabs[indice].href),
  });

  // Some onde atrapalha: o assistente de agendamento tem a propria barra com o
  // total, e duas camadas flutuantes empilhadas comem meia tela.
  if (pathname.startsWith("/agendar") || pathname.startsWith("/painel")) return null;

  return (
    <>
      {/* Espacador: a barra flutua, mas o fim do conteudo precisa caber acima dela. */}
      <div className="h-[5.5rem] md:hidden" aria-hidden />

      {/* Veu: o conteudo que passa AO LADO das pilulas continua nitido e deixa
          a faixa poluida. Antes era um degrade da cor da pagina, que apagava o
          que passava por baixo; agora e desfoque progressivo — a pagina segue
          visivel ali, so que fora de foco, e a camada continua parecendo que
          flutua sobre ela em vez de esconde-la. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-32 md:hidden" aria-hidden>
        <Veu para="cima" tinta="var(--veu-tinta)" />
      </div>

      {/* justify-between + capsula flexivel: assim a capsula comeca na margem
          esquerda e o botao termina na direita, exatamente onde a pilula do logo
          comeca e o circulo do menu termina la em cima. As quatro pecas se
          alinham pelas mesmas duas linhas verticais. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-2.5 px-4 pb-3 pb-safe md:hidden">
        <nav
          className="glass pointer-events-auto min-w-0 flex-1 rounded-full p-1.5"
          aria-label="Navegação principal"
        >
          {/* touch-pan-y: o gesto horizontal e nosso (arrastar a selecao), o
              vertical continua sendo do navegador (rolar a pagina). Sem isso,
              comecar a rolar com o dedo em cima da barra travava a rolagem. */}
          <div
            ref={arrastar.trilhoRef}
            className="relative grid touch-pan-y grid-cols-3"
            {...arrastar.handlers}
          >
            {/* Indicador que desliza de uma aba para a outra, em vez de piscar
                num lugar novo — o movimento conta de onde para onde voce foi.
                Durante o arrasto ele acompanha o dedo 1:1, entao a transicao
                sai do caminho: com ela ligada a pilula fica sempre alguns
                quadros atras do dedo e o gesto perde o "colado na mao". */}
            {activeIndex >= 0 ? (
              <span
                className={cn(
                  "glass-pill absolute inset-y-0 left-0 rounded-full",
                  // Sem transicao durante o arrasto: a pilula tem de estar
                  // exatamente onde o dedo esta, nao alguns quadros atras.
                  arrastar.arrastando
                    ? "transition-none"
                    : arrastar.pressionado
                      ? "transition-transform duration-200"
                      : "transition-transform duration-[400ms] ease-[var(--ease-out-quint)]",
                )}
                style={arrastar.estiloPilula}
                aria-hidden
              />
            ) : null}

            {tabs.map((tab, index) => (
              <TabLink
                key={tab.label}
                tab={tab}
                // A previa segue o dedo; o aria-current continua na pagina que
                // esta ABERTA, senao um leitor de tela anuncia uma troca que
                // ainda nao aconteceu.
                active={index === arrastar.indiceVisual}
                atual={index === activeIndex}
              />
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

function TabLink({ tab, active, atual }: { tab: Tab; active: boolean; atual: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={atual ? "page" : undefined}
      // O arrasto acontece no trilho; o link nao pode roubar o gesto para virar
      // o "arrastar link" nativo do navegador.
      draggable={false}
      className="relative flex h-[3.25rem] min-w-0 select-none flex-col items-center justify-center gap-0.5 rounded-full outline-offset-[-3px]"
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
