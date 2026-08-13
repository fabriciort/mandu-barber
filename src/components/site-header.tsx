import Link from "next/link";
import { CalendarPlus, LayoutDashboard, LogIn, UserRound } from "lucide-react";

import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNav } from "@/components/mobile-nav";
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
    <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--surface)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Navegação principal">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
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
                className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] py-1 pl-1 pr-3 transition-colors hover:border-[var(--border-strong)]"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden text-sm font-medium sm:inline">{firstName(user.name)}</span>
              </Link>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/entrar">
                <LogIn className="size-4" />
                Entrar
              </Link>
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
          />
        </div>
      </div>
    </header>
  );
}

export function AccountLink() {
  return (
    <Link href="/minha-conta" className="flex items-center gap-2 text-sm">
      <UserRound className="size-4" />
      Minha conta
    </Link>
  );
}
