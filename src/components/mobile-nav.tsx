"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, LayoutDashboard, LogIn, Menu, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileNav({
  links,
  authenticated,
  isStaff,
}: {
  links: { href: string; label: string }[];
  authenticated: boolean;
  isStaff: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  // Trava o scroll do fundo enquanto o menu esta aberto.
  React.useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] md:hidden"
        aria-label="Abrir menu"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 animate-[var(--animate-fade-in)] bg-ink-950/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 animate-[var(--animate-fade-up)] rounded-b-2xl border-b border-[var(--border-strong)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lift)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text-muted)]">Menu</span>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                  aria-label="Fechar menu"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            <nav className="flex flex-col" aria-label="Navegação">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-medium transition-colors hover:bg-[var(--surface-muted)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 grid gap-2 border-t border-[var(--border-subtle)] pt-4">
              {isStaff ? (
                <Button asChild variant="secondary" block onClick={() => setOpen(false)}>
                  <Link href="/painel">
                    <LayoutDashboard className="size-4" />
                    Painel de gestão
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary" block onClick={() => setOpen(false)}>
                <Link href={authenticated ? "/minha-conta" : "/entrar"}>
                  {authenticated ? <UserRound className="size-4" /> : <LogIn className="size-4" />}
                  {authenticated ? "Minha conta" : "Entrar"}
                </Link>
              </Button>
              <Button asChild block onClick={() => setOpen(false)}>
                <Link href="/agendar">
                  <CalendarPlus className="size-4" />
                  Agendar horário
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
