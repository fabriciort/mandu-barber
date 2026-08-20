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
export function HeaderShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
        "glass sticky top-0 z-40 transition-[border-radius] duration-300",
        // Vidro SEMPRE, e nao so depois de rolar: o heroi da home agora comeca
        // no topo da tela e passa por baixo do cabecalho. Transparente ali, o
        // texto preto do menu cairia sobre a foto escura e sumiria.
        scrolled ? "rounded-b-[var(--radius-2xl)]" : "rounded-none",
        className,
      )}
    >
      {children}
    </header>
  );
}
