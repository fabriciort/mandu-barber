import Link from "next/link";

import { cn } from "@/lib/cn";

/**
 * Poste de barbeiro — o simbolo da casa.
 *
 * Desenhado em SVG, e nao exportado como imagem, por tres motivos: fica nitido
 * em qualquer tamanho e densidade de tela, acompanha o tema (as tampas usam a
 * cor do texto) e nao custa uma requisicao a mais no carregamento.
 *
 * O corpo listrado vive dentro de um <svg> aninhado: SVG encaixado recorta o
 * proprio conteudo por definicao, entao as listras diagonais param na borda do
 * cilindro sem precisar de clipPath com id — e id repetido quebraria a pagina
 * onde o logo aparece duas vezes (cabecalho e rodape, por exemplo).
 */
export function BrandMark({
  className,
  animated = false,
}: {
  className?: string;
  /** Gira as listras, como um poste de verdade. So no hover e so se a pessoa aceitar movimento. */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 40"
      fill="none"
      className={cn("h-8 w-auto", className)}
      aria-hidden
      focusable="false"
    >
      {/* Ponteira de cima */}
      <circle cx="12" cy="2.6" r="2.2" fill="currentColor" />
      <rect x="3.5" y="5.4" width="17" height="4" rx="2" fill="currentColor" />

      {/* Cilindro listrado */}
      <svg x="4.6" y="10.2" width="14.8" height="19.6" viewBox="0 0 14.8 19.6">
        <rect width="14.8" height="19.6" fill="var(--pole-body)" />
        <g transform="rotate(-33 7.4 9.8)">
          <rect x="-10" y="-6" width="36" height="3.6" fill="var(--pole-red)" />
          <rect x="-10" y="0.6" width="36" height="3.6" fill="var(--pole-blue)" />
          <rect x="-10" y="7.2" width="36" height="3.6" fill="var(--pole-red)" />
          <rect x="-10" y="13.8" width="36" height="3.6" fill="var(--pole-blue)" />
          <rect x="-10" y="20.4" width="36" height="3.6" fill="var(--pole-red)" />
          {animated ? (
            <animateTransform
              attributeName="transform"
              type="translate"
              from="0 0"
              to="0 -13.2"
              dur="1.6s"
              repeatCount="indefinite"
              additive="sum"
            />
          ) : null}
        </g>
      </svg>

      {/* Contorno do cilindro: separa o branco do poste do fundo branco da pagina */}
      <rect
        x="4.6"
        y="10.2"
        width="14.8"
        height="19.6"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
      />

      {/* Ponteira de baixo */}
      <rect x="3.5" y="30.6" width="17" height="4" rx="2" fill="currentColor" />
      <rect x="7.5" y="34.6" width="9" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  );
}

/**
 * Logotipo: "mr. mandu" em caixa baixa, como na marca da barbearia. O ponto
 * depois de "mr" faz parte do nome — nao e abreviacao que a gente inventou.
 */
export function Logo({
  href = "/",
  className,
  compact,
}: {
  href?: string;
  className?: string;
  /** So o simbolo, sem o nome — para barras estreitas. */
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 rounded-[var(--radius-sm)] text-[var(--text-primary)]",
        className,
      )}
      aria-label="mr. mandu — início"
    >
      {/* Nome antes do simbolo, como no logotipo da casa. */}
      {compact ? null : (
        <span className="font-display text-[1.35rem] leading-none tracking-[-0.02em]">
          mr. mandu
        </span>
      )}
      <BrandMark className="h-9 transition-transform duration-300 group-hover:-translate-y-0.5" />
    </Link>
  );
}
