"use client";

import * as React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Scissors,
  Settings,
  Star,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/cn";
import type { Role } from "@/lib/enums";
import { useArrastarSelecao } from "@/components/use-arrastar-selecao";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  roles: Role[];
  /** Aparece na barra inferior do mobile. */
  primary?: boolean;
};

const ITEMS: NavItem[] = [
  {
    href: "/painel",
    label: "Visão geral",
    short: "Início",
    icon: LayoutDashboard,
    roles: ["OWNER", "BARBER"],
    primary: true,
  },
  {
    href: "/painel/agenda",
    label: "Agenda",
    short: "Agenda",
    icon: CalendarRange,
    roles: ["OWNER", "BARBER"],
    primary: true,
  },
  {
    href: "/painel/agendamentos",
    label: "Agendamentos",
    short: "Lista",
    icon: ClipboardList,
    roles: ["OWNER", "BARBER"],
    primary: true,
  },
  {
    href: "/painel/clientes",
    label: "Clientes",
    short: "Clientes",
    icon: Users,
    roles: ["OWNER", "BARBER"],
    primary: true,
  },
  { href: "/painel/servicos", label: "Serviços", short: "Serviços", icon: Scissors, roles: ["OWNER"] },
  {
    href: "/painel/profissionais",
    label: "Profissionais",
    short: "Equipe",
    icon: UsersRound,
    roles: ["OWNER"],
  },
  { href: "/painel/planos", label: "Planos", short: "Planos", icon: CreditCard, roles: ["OWNER"] },
  {
    href: "/painel/assinaturas",
    label: "Assinaturas",
    short: "Assin.",
    icon: BarChart3,
    roles: ["OWNER"],
  },
  { href: "/painel/financeiro", label: "Financeiro", short: "Caixa", icon: Wallet, roles: ["OWNER"] },
  {
    href: "/painel/avaliacoes",
    label: "Avaliações",
    short: "Notas",
    icon: Star,
    roles: ["OWNER", "BARBER"],
  },
  {
    href: "/painel/configuracoes",
    label: "Configurações",
    short: "Ajustes",
    icon: Settings,
    roles: ["OWNER"],
  },
];

/** Mesma curva e mesma duracao da barra do site: o painel e a mesma casa. */
const DESLIZE = "duration-[400ms] ease-[var(--ease-out-quint)]";

export function PanelNav({
  role,
  className,
  variant = "side",
}: {
  role: Role;
  className?: string;
  variant?: "side" | "bottom";
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((item) => item.roles.includes(role));
  const visible = variant === "bottom" ? items.filter((item) => item.primary).slice(0, 5) : items;
  const activeIndex = visible.findIndex((item) => isActive(pathname, item.href));

  return (
    /* Os dois variantes existem na mesma pagina (a lateral so aparece no
       desktop, a barra so no celular). Com o mesmo aria-label, um leitor de
       tela anunciaria duas "Navegação do painel" e nao daria para distinguir
       uma da outra — por isso cada uma tem seu nome. */
    <nav className={className} aria-label={variant === "side" ? "Seções do painel" : "Navegação do painel"}>
      {variant === "side" ? (
        <SideList items={visible} activeIndex={activeIndex} />
      ) : (
        <BottomRow items={visible} activeIndex={activeIndex} />
      )}
    </nav>
  );
}

/**
 * Barra inferior do celular: a pilula do item atual DESLIZA ate o proximo, em
 * vez de sumir de um lugar e reaparecer em outro. E o mesmo indicador da
 * navegacao do site (Inicio / Planos / Conta) — o movimento conta de onde para
 * onde voce foi, e ficaria estranho se so a area do cliente tivesse isso.
 */
function BottomRow({ items, activeIndex }: { items: NavItem[]; activeIndex: number }) {
  const router = useRouter();
  const arrastar = useArrastarSelecao({
    quantidade: items.length,
    indiceAtivo: activeIndex,
    aoSoltar: (indice: number) => router.push(items[indice].href),
  });

  return (
    <div
      ref={arrastar.trilhoRef}
      className="relative grid min-w-0 flex-1 touch-pan-y"
      // O numero de destinos muda com o cargo (o barbeiro nao ve tudo que o
      // dono ve), entao a grade e a largura da pilula saem da contagem real.
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      {...arrastar.handlers}
    >
      {activeIndex >= 0 ? (
        <span
          className={cn(
            "glass-pill absolute inset-y-0 left-0 rounded-full",
            // Colado no dedo durante o arrasto; com mola so ao encaixar.
            arrastar.arrastando
              ? "transition-none"
              : arrastar.pressionado
                ? "transition-transform duration-200"
                : cn("transition-transform", DESLIZE),
          )}
          style={arrastar.estiloPilula}
          aria-hidden
        />
      ) : null}

      {items.map((item, index) => (
        <BottomLink
          key={item.href}
          item={item}
          active={index === arrastar.indiceVisual}
          atual={index === activeIndex}
        />
      ))}
    </div>
  );
}

function BottomLink({
  item,
  active,
  atual,
}: {
  item: NavItem;
  active: boolean;
  atual: boolean;
}) {
  return (
    <Link
      href={item.href}
      // A previa segue o dedo; o aria-current fica na rota ABERTA.
      aria-current={atual ? "page" : undefined}
      draggable={false}
      className="relative flex min-w-0 select-none flex-col items-center justify-center gap-1 rounded-full py-2.5 outline-offset-[-3px]"
    >
      <BottomContent item={item} active={active} />
    </Link>
  );
}

/** Separado porque useLinkStatus so enxerga o <Link> de dentro dele. */
function BottomContent({ item, active }: { item: NavItem; active: boolean }) {
  const { pending } = useLinkStatus();
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        active ? "text-[var(--text-inverse)]" : "text-[var(--text-primary)] opacity-70",
        pending && !active && "opacity-50",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
      <span className={cn("text-[10px] leading-none", active ? "font-semibold" : "font-medium")}>
        {item.short}
      </span>
      {pending ? <span className="sr-only">Carregando…</span> : null}
    </span>
  );
}

/**
 * Barra lateral do desktop: a mesma ideia virada de lado — a ficha do item
 * atual desliza de cima para baixo, levando junto o fio que marca a rota.
 *
 * Aqui a posicao e MEDIDA em vez de calculada por indice. Os itens tem alturas
 * iguais hoje, mas dependem da fonte carregada e de rotulos que podem crescer;
 * um `translateY(indice * 100%)` erra por alguns pixels a cada linha e o erro
 * se acumula ate o fim da lista.
 */
function SideList({ items, activeIndex }: { items: NavItem[]; activeIndex: number }) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const [ficha, setFicha] = React.useState<{ top: number; height: number } | null>(null);
  // A primeira medicao acontece depois da pintura: sem isto, a ficha entraria
  // deslizando do topo da lista toda vez que a pagina carrega.
  const [pronto, setPronto] = React.useState(false);

  React.useEffect(() => {
    const list = listRef.current;
    if (!list || activeIndex < 0) {
      setFicha(null);
      return;
    }

    // `:scope > li` e nao `children[i]`: a propria ficha e um filho do <ul>
    // assim que aparece, e passaria a deslocar o indice em um.
    const alvo = list.querySelectorAll(":scope > li")[activeIndex];
    if (!(alvo instanceof HTMLElement)) {
      setFicha(null);
      return;
    }

    const medir = () => setFicha({ top: alvo.offsetTop, height: alvo.offsetHeight });
    medir();
    // A fonte da interface chega depois do primeiro quadro e muda a altura das
    // linhas; sem observar, a ficha fica alguns pixels fora do lugar.
    const observer = new ResizeObserver(medir);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex, items.length]);

  React.useEffect(() => {
    if (ficha) setPronto(true);
  }, [ficha]);

  return (
    <ul ref={listRef} className="relative space-y-0.5">
      {ficha ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 rounded-[var(--radius-md)]",
            "bg-[var(--surface-raised)] shadow-[var(--shadow-sm)]",
            pronto && cn("transition-[transform,height]", DESLIZE),
          )}
          style={{ height: ficha.height, transform: `translateY(${ficha.top}px)` }}
          aria-hidden
        >
          {/* Marca a rota atual sem depender de cor. */}
          <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]" aria-hidden />
        </span>
      ) : null}

      {items.map((item, index) => (
        <li key={item.href}>
          <SideLink item={item} active={index === activeIndex} />
        </li>
      ))}
    </ul>
  );
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // Sem fundo proprio: quem pinta o item atual e a ficha que desliza por
        // tras. O hover continua no link porque so vale para os outros.
        "relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm transition-colors",
        active
          ? "font-medium text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]/60 hover:text-[var(--text-primary)]",
      )}
    >
      <SideContent item={item} active={active} />
    </Link>
  );
}

function SideContent({ item, active }: { item: NavItem; active: boolean }) {
  const { pending } = useLinkStatus();
  const Icon = item.icon;

  return (
    <>
      <Icon
        className={cn("size-[18px] shrink-0 transition-opacity", active ? "" : "opacity-60", pending && "opacity-40")}
      />
      {item.label}
      {pending ? <span className="sr-only">Carregando…</span> : null}
    </>
  );
}

/** "/painel" so casa exato; as demais cobrem suas subrotas. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/painel") return pathname === "/painel";
  return pathname === href || pathname.startsWith(`${href}/`);
}
