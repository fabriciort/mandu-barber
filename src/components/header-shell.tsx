"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Casca do cabecalho, sensivel a rolagem.
 *
 * No topo o header e transparente e sem borda, para o hero ocupar a tela
 * inteira. Assim que a pagina rola, ele ganha fundo, desfoque e uma linha —
 * separando-se do conteudo que passa por baixo. E uma transicao de estado, nao
 * um enfeite: sem ela, o texto do conteudo cruzaria o do menu.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-[var(--border-subtle)] bg-[var(--surface)]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      {children}
    </header>
  );
}
