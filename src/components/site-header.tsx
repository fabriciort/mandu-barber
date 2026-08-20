import Link from "next/link";
import { CalendarPlus, LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { HeaderShell } from "@/components/header-shell";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getCurrentUser } from "@/server/auth/session";
import { firstName } from "@/lib/format";

const LINKS = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/planos", label: "Planos" },
  { href: "/#visita", label: "Onde estamos" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <HeaderShell>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-6">
        <Logo />

        <nav className="ml-6 hidden items-center gap-0.5 md:flex" aria-label="Seções do site">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="pressable rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />

          {user ? (
            <>
              {user.role !== "CLIENT" ? (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link href="/painel">
                    <LayoutDashboard className="size-4" />
                    Painel
                  </Link>
                </Button>
              ) : null}
              <Link
                href="/minha-conta"
                className="pressable flex items-center gap-2 rounded-full border border-[var(--border-subtle)] py-1 pl-1 pr-1 hover:border-[var(--border-strong)] sm:pr-3"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden text-sm font-medium sm:inline">
                  {firstName(user.name)}
                </span>
              </Link>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/entrar">Entrar</Link>
            </Button>
          )}

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/agendar">
              <CalendarPlus className="size-4" />
              Agendar
            </Link>
          </Button>

          <MobileNav
            links={LINKS}
            authenticated={Boolean(user)}
            isStaff={Boolean(user && user.role !== "CLIENT")}
            userName={user?.name ?? null}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
