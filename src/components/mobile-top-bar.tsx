import Link from "next/link";

import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/cn";

/**
 * Barra superior do celular — o espelho da barra de baixo.
 *
 *   [ mr. mandu ▮ ]                 ( ☰ )
 *
 * Mesma altura, mesma margem lateral e mesmo material da capsula de baixo,
 * entao as duas se alinham verticalmente nas pontas da tela. O logo mora numa
 * pilula estreita e a acao da direita num circulo, exatamente como o par
 * "capsula + botao" do rodape.
 *
 * Flutua: o conteudo passa por baixo e aparece desfocado atraves do vidro.
 */
export function MobileTopBar({
  action,
  className,
}: {
  /** O que vai no circulo da direita (menu, tema...). */
  action: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      {/* Espacador: a barra flutua, entao o conteudo precisa comecar abaixo. */}
      <div className="h-[4.25rem] md:hidden" aria-hidden />

      {/* Veu, igual ao da barra de baixo. Sem ele o conteudo rolava por tras da
          pilula e colidia com ela: o texto aparecia inteiro no vao entre a
          pilula e o circulo, e cortado atras dos dois.
          
          Ele e pintado com a cor da PAGINA, entao serve para conteudo comum.
          Sobre uma faixa escura de tela cheia — o heroi da home — ele viraria
          uma nevoa branca no tema claro; por isso fica em z-20, e quem tem
          fundo proprio se declara acima dele (ver o heroi em page.tsx). */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-[var(--surface)] via-[var(--surface)]/70 to-transparent md:hidden"
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2.5 px-4 pt-3 md:hidden",
          className,
        )}
      >
        <Link
          href="/"
          aria-label="mr. mandu — início"
          className="glass flex h-[3.25rem] items-center gap-2 rounded-full pl-4 pr-3.5 text-[var(--text-primary)] transition-transform duration-200 active:scale-95"
        >
          <span className="font-display text-[1.05rem] leading-none tracking-[-0.02em]">
            mr. mandu
          </span>
          <BrandMark className="h-7" />
        </Link>

        {action}
      </div>
    </>
  );
}

/** Circulo de vidro — a mesma silhueta do botao de agendar la embaixo. */
export function GlassCircleButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "glass flex size-[3.25rem] shrink-0 items-center justify-center rounded-full",
        "text-[var(--text-primary)] transition-transform duration-200 active:scale-90",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
