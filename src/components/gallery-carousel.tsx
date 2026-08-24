"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { cn } from "@/lib/cn";
import { filterPillClass } from "@/components/ui/filter-pill";
import {
  CATEGORIAS_COM_FOTO,
  CATEGORIA_LABEL,
  type CategoriaGaleria,
  type ItemGaleria,
} from "@/content/galeria";

/**
 * Galeria da casa.
 *
 * O componente NAO conhece nenhuma foto: recebe a lista pronta de
 * src/content/galeria.ts, que por sua vez le src/content/galeria.json. Trocar
 * as imagens de verdade e mexer em arquivo de conteudo, nunca aqui.
 *
 * Rola no dedo com encaixe (mesma mecanica das outras fileiras do site) e
 * ganha setas no desktop, onde nao existe gesto de arrastar confortavel.
 */
export function GalleryCarousel({ itens }: { itens: ItemGaleria[] }) {
  const [categoria, setCategoria] = React.useState<CategoriaGaleria | "todas">("todas");
  const trilhoRef = React.useRef<HTMLUListElement>(null);
  const [podeVoltar, setPodeVoltar] = React.useState(false);
  const [podeAvancar, setPodeAvancar] = React.useState(false);

  const visiveis = React.useMemo(
    () => (categoria === "todas" ? itens : itens.filter((i) => i.categoria === categoria)),
    [itens, categoria],
  );

  // As setas so aparecem quando ha para onde ir. Um botao que nao faz nada e
  // pior que botao nenhum.
  const medir = React.useCallback(() => {
    const el = trilhoRef.current;
    if (!el) return;
    const folga = el.scrollWidth - el.clientWidth;
    setPodeVoltar(el.scrollLeft > 8);
    setPodeAvancar(folga > 8 && el.scrollLeft < folga - 8);
  }, []);

  React.useEffect(() => {
    const el = trilhoRef.current;
    if (!el) return;
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", medir);
      observer.disconnect();
    };
  }, [medir, visiveis.length]);

  function deslizar(direcao: 1 | -1) {
    const el = trilhoRef.current;
    if (!el) return;
    // Anda uma "tela" de cada vez, com folga, em vez de um item fixo: o numero
    // de fotos visiveis muda com a largura.
    el.scrollBy({ left: direcao * el.clientWidth * 0.85, behavior: "smooth" });
  }

  function trocarCategoria(nova: CategoriaGaleria | "todas") {
    setCategoria(nova);
    // Volta para o comeco: filtrar e mostrar outro conjunto, e manter a rolagem
    // no meio dele deixa a impressao de que faltam fotos.
    trilhoRef.current?.scrollTo({ left: 0, behavior: "auto" });
  }

  if (itens.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
        <ImageOff className="size-4" aria-hidden />
        Nenhuma foto cadastrada em src/content/galeria.json.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {/* Filtro por categoria: estado local, sem rota — a galeria e um bloco
            da home, nao merece entrada propria no historico do navegador. */}
        <div
          className="snap-row fade-edges -mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Categorias da galeria"
        >
          <button
            type="button"
            role="tab"
            aria-selected={categoria === "todas"}
            onClick={() => trocarCategoria("todas")}
            className={filterPillClass(categoria === "todas")}
          >
            Todas
            <span className={cn("tnum text-xs", categoria === "todas" ? "opacity-70" : "text-[var(--text-muted)]")}>
              {itens.length}
            </span>
          </button>

          {CATEGORIAS_COM_FOTO.map((c) => {
            const total = itens.filter((i) => i.categoria === c).length;
            const ativa = categoria === c;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={ativa}
                onClick={() => trocarCategoria(c)}
                className={filterPillClass(ativa)}
              >
                {CATEGORIA_LABEL[c]}
                <span className={cn("tnum text-xs", ativa ? "opacity-70" : "text-[var(--text-muted)]")}>
                  {total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Setas so no desktop: no celular o gesto e a rolagem. */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <Seta direcao="anterior" onClick={() => deslizar(-1)} desativada={!podeVoltar} />
          <Seta direcao="proxima" onClick={() => deslizar(1)} desativada={!podeAvancar} />
        </div>
      </div>

      <ul
        ref={trilhoRef}
        className="snap-row -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {visiveis.map((item, index) => (
          <li
            key={item.arquivo}
            className="w-[78vw] max-w-[22rem] shrink-0 sm:w-[20rem] lg:w-[22rem]"
          >
            <figure className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  // As duas primeiras aparecem sem rolar; o resto pode esperar.
                  loading={index < 2 ? "eager" : "lazy"}
                  sizes="(max-width: 639px) 78vw, (max-width: 1023px) 20rem, 22rem"
                  className="object-cover transition-transform duration-[600ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
                />
              </div>

              <figcaption className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-sm font-medium">{item.titulo}</span>
                <span className="shrink-0 text-2xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {CATEGORIA_LABEL[item.categoria]}
                </span>
              </figcaption>

              {/* Enquanto a foto for provisoria, ela se declara na propria
                  imagem — quem revisar o site nao precisa adivinhar. */}
              {item.placeholder ? (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-dashed border-white/70 bg-black/60 px-2.5 py-1 text-[11px] font-medium leading-4 text-white">
                  foto provisória
                </span>
              ) : null}
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Seta({
  direcao,
  onClick,
  desativada,
}: {
  direcao: "anterior" | "proxima";
  onClick: () => void;
  desativada: boolean;
}) {
  const Icon = direcao === "anterior" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desativada}
      aria-label={direcao === "anterior" ? "Fotos anteriores" : "Próximas fotos"}
      className={cn(
        "pressable flex size-9 items-center justify-center rounded-full border border-[var(--border-default)]",
        "text-[var(--text-secondary)] transition-opacity",
        desativada
          ? "cursor-default opacity-30"
          : "hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
