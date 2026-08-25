import Link from "next/link";

import { BrandMark } from "@/components/brand";
import { cn } from "@/lib/cn";
import { Veu } from "@/components/veu";

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

      {/* Veu. Sem ele o conteudo rola por tras da pilula e colide com ela: o
          texto aparece inteiro no vao entre a pilula e o circulo, e cortado
          atras dos dois.
          
          Era um degrade da cor da pagina, e isso APAGAVA o que passava por
          baixo — a foto da galeria, na home, virava um borrao esbranquicado.
          Agora e desfoque progressivo: o que passa continua visivel, so que
          fora de foco. A tinta e fraca, so o suficiente para o texto da barra
          nao competir com o que esta atras.
          
          Fica em z-20 e quem tem fundo proprio de tela cheia se declara acima
          dele (ver o heroi em page.tsx). */}
      <div className="cromo-veu pointer-events-none fixed inset-x-0 top-0 z-20 h-28 md:hidden" aria-hidden>
        <Veu para="baixo" tinta="var(--veu-tinta)" />
      </div>

      <div
        className={cn(
          "fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2.5 px-4 pt-3 md:hidden",
          className,
        )}
      >
        <Link
          href="/"
          aria-label="mr. mandu — início"
          className="glass cromo-flutuante flex h-[3.25rem] items-center gap-2 rounded-full pl-4 pr-3.5 active:scale-95"
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
        "glass cromo-flutuante flex size-[3.25rem] shrink-0 items-center justify-center rounded-full",
        "active:scale-90",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
