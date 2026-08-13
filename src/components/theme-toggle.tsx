"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * Alterna claro/escuro e guarda a escolha. O estado inicial vem do script no
 * <head>, entao aqui so espelhamos o que ja esta aplicado no documento.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("mandu-theme", next ? "dark" : "light");
    } catch {
      // modo privado sem storage: a preferencia vale so para esta navegacao
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        className,
      )}
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
    >
      {mounted && dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
