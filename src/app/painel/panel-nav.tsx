"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <nav className={className} aria-label="Navegação do painel">
      {variant === "side" ? (
        <ul className="space-y-0.5">
          {visible.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "pressable relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm",
                    active
                      ? "bg-[var(--surface-raised)] font-medium text-[var(--text-primary)] shadow-[var(--shadow-sm)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]/60 hover:text-[var(--text-primary)]",
                  )}
                >
                  {/* Marca a rota atual sem depender de cor. */}
                  {active ? (
                    <span
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[var(--accent)]"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className={cn("size-[18px] shrink-0", active ? "" : "opacity-60")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        visible.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              // Mesma pilula da navegacao do site: o painel e a mesma casa, nao
              // pode parecer outro aplicativo.
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-full py-2.5 text-[10px] font-medium",
                "transition-all duration-300 active:scale-95",
                active
                  ? "glass-pill font-semibold"
                  : "text-[var(--text-primary)] opacity-70",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
              {item.short}
            </Link>
          );
        })
      )}
    </nav>
  );
}

/** "/painel" so casa exato; as demais cobrem suas subrotas. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/painel") return pathname === "/painel";
  return pathname === href || pathname.startsWith(`${href}/`);
}
