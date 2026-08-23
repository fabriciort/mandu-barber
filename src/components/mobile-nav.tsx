"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, LayoutDashboard, LogIn, Menu, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

/**
 * Menu do celular como folha que desce do topo.
 *
 * Detalhes que fazem parecer nativo: trava a rolagem do fundo, fecha no Esc,
 * fecha ao trocar de rota (senao o menu fica aberto sobre a tela nova), devolve
 * o foco ao botao ao fechar e respeita a area segura do aparelho.
 */
export function MobileNav({
  links,
  authenticated,
  isStaff,
  userName,
}: {
  links: { href: string; label: string }[];
  authenticated: boolean;
  isStaff: boolean;
  userName?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Fecha ao navegar: sem isso o painel sobrevive a troca de rota.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);

    // O foco entra no painel para quem usa teclado ou leitor de tela.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      {/* Circulo de vidro, do mesmo tamanho e no mesmo alinhamento do botao de
          agendar la embaixo: as duas pontas da tela conversam. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="glass flex size-[3.25rem] shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] transition-transform duration-200 active:scale-90 md:hidden"
        aria-label="Abrir menu"
        aria-expanded={open}
      >
        <Menu className="size-[22px]" strokeWidth={2} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 animate-[var(--animate-fade)] bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            tabIndex={-1}
          />

          <div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="glass absolute inset-x-0 top-0 animate-[var(--animate-rise)] rounded-b-[var(--radius-2xl)] border-b border-[var(--border-default)] shadow-[var(--shadow-xl)] focus:outline-none"
          >
            <div className="flex h-16 items-center justify-between px-5">
              {authenticated && userName ? (
                <span className="flex items-center gap-2.5">
                  <Avatar name={userName} size="sm" />
                  <span className="text-sm font-medium">{userName.split(" ")[0]}</span>
                </span>
              ) : (
                <span className="text-sm font-medium text-[var(--text-muted)]">Menu</span>
              )}

              <span className="flex items-center gap-1">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="pressable inline-flex size-10 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-muted)]"
                  aria-label="Fechar menu"
                >
                  <X className="size-5" />
                </button>
              </span>
            </div>

            <nav className="stagger border-t border-[var(--border-subtle)] px-3 py-2" aria-label="Navegação">
              {links.map((link, index) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ "--i": index } as React.CSSProperties}
                  className={cn(
                    "pressable flex items-center rounded-[var(--radius-md)] px-3 py-3.5 text-[15px] font-medium",
                    "hover:bg-[var(--surface-muted)]",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="grid gap-2 border-t border-[var(--border-subtle)] p-4 pb-safe">
              {isStaff ? (
                <Button asChild variant="secondary" block size="lg">
                  <Link href="/painel">
                    <LayoutDashboard className="size-[18px]" />
                    Painel de gestão
                  </Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary" block size="lg">
                <Link href={authenticated ? "/minha-conta" : "/entrar"}>
                  {authenticated ? (
                    <UserRound className="size-[18px]" />
                  ) : (
                    <LogIn className="size-[18px]" />
                  )}
                  {authenticated ? "Minha conta" : "Entrar"}
                </Link>
              </Button>
              <Button asChild block size="lg">
                <Link href="/agendar">
                  <CalendarPlus className="size-[18px]" />
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
