import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getShopConfig, formatAddress } from "@/server/services/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // O endereco vem das configuracoes da loja: fixo no codigo, ele contradiz o
  // rodape do site assim que a barbearia muda de ponto.
  const shop = await getShopConfig();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,46%)]">
      <div className="flex flex-col px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/"
              className="pressable flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="size-4" />
              Início
            </Link>
          </div>
        </div>

        <main id="conteudo" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-[var(--animate-rise)]">{children}</div>
        </main>

        <p className="text-center text-2xs text-[var(--text-muted)] sm:text-left">
          {shop.name}
          {shop.addressLine ? ` · ${formatAddress(shop)}` : ""}
        </p>
      </div>

      {/* Painel de marca: some no mobile para nao roubar espaco do formulario.
          No monocromatico o peso vem do bloco invertido inteiro, nao de um
          degrade colorido — e a mesma peca funciona nos dois temas. */}
      <aside className="grain relative hidden overflow-hidden bg-[var(--surface-inverse)] text-[var(--text-inverse)] lg:block">
        {/* Malha de linhas finas: textura sem cor, como papel pautado. */}
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, currentColor 0 1px, transparent 1px 44px), repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 44px)",
          }}
          aria-hidden
        />
        {/* Vinheta que puxa o olho para a citacao no rodape do painel. A mesma
            sombra precisa de forca diferente em cada tema: sobre o painel preto
            ela aprofunda; sobre o painel branco, um valor alto sujaria tudo. */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "radial-gradient(120% 90% at 20% 0%, transparent 30%, rgb(0 0 0 / 0.45) 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(120% 90% at 20% 0%, transparent 40%, rgb(0 0 0 / 0.08) 100%)",
          }}
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-between p-12">
          <span className="text-2xs uppercase tracking-[0.32em] opacity-60">
            Desde 2016 · São Paulo
          </span>

          <blockquote className="max-w-md">
            <p className="font-display text-[2.6rem] leading-[1.1]">
              &ldquo;Cliente bom não é o que aparece. É o que volta — e a gente lembra do corte
              dele.&rdquo;
            </p>
            <footer className="mt-7 flex items-center gap-3 text-sm opacity-70">
              <span className="h-px w-8 bg-current" aria-hidden />
              Ricardo Mandu, fundador
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
