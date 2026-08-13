import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              <ArrowLeft className="size-4" />
              Início
            </Link>
          </div>
        </div>

        <main id="conteudo" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      {/* Painel de marca: some no mobile para nao roubar espaco do formulario. */}
      <aside className="grain relative hidden overflow-hidden bg-ink-950 lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(65% 55% at 25% 15%, rgba(201,139,58,0.3) 0%, transparent 60%), radial-gradient(50% 45% at 85% 90%, rgba(201,111,74,0.22) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-end p-12 text-ink-100">
          <blockquote className="max-w-md">
            <p className="font-[family-name:var(--font-display)] text-3xl leading-snug">
              &quot;Cliente bom não é o que aparece. É o que volta — e a gente lembra do corte dele.&quot;
            </p>
            <footer className="mt-6 text-sm text-ink-400">
              Ricardo Mandu, fundador da Mandu Barber
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
