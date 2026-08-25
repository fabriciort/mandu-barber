"use client";

import * as React from "react";

/**
 * Deixa a pilula do logo e o circulo do menu TRANSPARENTES enquanto a rolagem
 * ainda esta em cima da foto do heroi, e devolve o vidro depois dela.
 *
 * Sobre a foto, o cromo com fundo proprio parece colado por cima; sem fundo,
 * o logo e o menu viram parte da imagem — que e como a marca se apresenta nas
 * pecas dela.
 *
 * COMO, e por que assim:
 *
 * O estado nao vive em React. Ele e um atributo em <html>, e o CSS reage a ele.
 * A pilula e o circulo sao montados em componentes diferentes (um no cabecalho,
 * outro dentro do menu), entao levar um booleano ate os dois exigiria tornar
 * meia arvore cliente e re-renderizar tudo a cada mudanca. Um atributo custa
 * uma escrita e nenhuma renderizacao.
 *
 * E a deteccao e IntersectionObserver, nao ouvinte de scroll: o navegador so
 * avisa nas duas travessias que importam, em vez de nos acordar a cada quadro
 * de rolagem.
 */
export function CromoSobreFoto() {
  const marcaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const marca = marcaRef.current;
    if (!marca) return;

    const raiz = document.documentElement;
    // Onde termina a barra flutuante: 3.25rem de altura + 0.75rem de topo,
    // mais uma folga para a troca acontecer antes de encostar.
    const LIMITE = 80;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        // `isIntersecting` sozinho nao basta: a marca tambem fica "fora" quando
        // esta ABAIXO da tela (telas curtas, foto que nao coube). Comparar a
        // posicao com o limite diz de que lado ela saiu.
        raiz.dataset.cromo = entrada.boundingClientRect.top > LIMITE ? "sobre-foto" : "";
      },
      { rootMargin: `-${LIMITE}px 0px 0px 0px`, threshold: 0 },
    );

    observador.observe(marca);
    return () => {
      observador.disconnect();
      // Sair da home tem de devolver o vidro; senao a proxima pagina abriria
      // com o cabecalho invisivel sobre fundo claro.
      delete raiz.dataset.cromo;
    };
  }, []);

  return (
    <div
      ref={marcaRef}
      aria-hidden
      // Fica exatamente onde a foto acaba. No celular isso e --foto-h; no
      // desktop a foto ocupa o heroi inteiro, entao e o fim da secao.
      className="pointer-events-none absolute inset-x-0 top-[var(--foto-h)] h-px lg:top-full"
    />
  );
}
