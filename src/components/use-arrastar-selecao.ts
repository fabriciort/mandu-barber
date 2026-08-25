"use client";

import * as React from "react";

/**
 * Arrastar para escolher a aba — o gesto das barras do iOS 26.
 *
 * Comportamento (conferido na documentacao de quem reimplementou o gesto para
 * fora do sistema, ja que o efeito nativo usa API privada da Apple):
 *
 *   1. A pilula acompanha o dedo 1:1, sem encaixar de aba em aba enquanto o
 *      dedo esta na tela.
 *   2. Os icones acendem conforme voce passa por eles — e so previa: a aba
 *      ainda nao mudou.
 *   3. A navegacao acontece ao SOLTAR. A tela nunca troca no meio do gesto.
 *   4. Um toque tiquinho de vibracao a cada fronteira cruzada.
 *   5. O toque simples continua valendo: o arrasto so comeca depois de um
 *      limiar, entao quem so quis tocar nao e punido por tremer o dedo.
 *
 * O que fica de fora, e por que: o "blob" de vidro que se estica entre as abas
 * no iOS vem de API privada e nao existe nem para quem programa para iPhone.
 * Aqui a pilula desliza — que e o que da para fazer honestamente.
 */
export function useArrastarSelecao({
  quantidade,
  indiceAtivo,
  aoSoltar,
}: {
  quantidade: number;
  /** Aba realmente aberta agora. */
  indiceAtivo: number;
  /** Chamado com o indice onde o dedo soltou. */
  aoSoltar: (indice: number) => void;
}) {
  const trilhoRef = React.useRef<HTMLDivElement>(null);
  const partida = React.useRef<{ x: number; y: number; ponteiro: number } | null>(null);
  /** Marca que o ultimo gesto foi arrasto — usado para engolir o clique. */
  const arrastou = React.useRef(false);
  const ultimoAlvo = React.useRef(indiceAtivo);

  const [arrasto, setArrasto] = React.useState<{ pct: number; alvo: number } | null>(null);
  const [pressionado, setPressionado] = React.useState(false);
  /** Espelho do alvo, para o "soltar" nunca depender do ciclo de renderizacao. */
  const alvoRef = React.useRef<number | null>(null);

  const larguraPct = 100 / quantidade;

  /** Converte a posicao do dedo em deslocamento da pilula e aba sob o dedo. */
  const medir = React.useCallback(
    (clientX: number) => {
      const trilho = trilhoRef.current;
      if (!trilho) return null;

      const caixa = trilho.getBoundingClientRect();
      const larguraCelula = caixa.width / quantidade;
      const x = clientX - caixa.left;

      // A aba sob o dedo sai da posicao do DEDO, nao da pilula ja limitada:
      // e o dedo que "passa por cima" do icone, e e ele que o usuario segue.
      const alvo = Math.min(quantidade - 1, Math.max(0, Math.floor(x / larguraCelula)));

      // Ja a pilula fica centrada no dedo e presa dentro do trilho, senao ela
      // escaparia pelas pontas quando o dedo sai da barra.
      const esquerda = Math.min(
        caixa.width - larguraCelula,
        Math.max(0, x - larguraCelula / 2),
      );

      return { pct: (esquerda / larguraCelula) * 100, alvo };
    },
    [quantidade],
  );

  const vibrar = React.useCallback(() => {
    try {
      navigator.vibrate?.(8);
    } catch {
      // Alguns navegadores lancam quando a vibracao esta bloqueada. O gesto
      // funciona sem ela; nao vale derrubar o arrasto por causa disso.
    }
  }, []);

  const encerrar = React.useCallback(() => {
    partida.current = null;
    alvoRef.current = null;
    setArrasto(null);
    setPressionado(false);
  }, []);

  const soltar = React.useCallback(() => {
    const houveArrasto = arrastou.current;
    const alvo = alvoRef.current;
    encerrar();
    if (!houveArrasto) return;
    // Navega ao SOLTAR, nunca durante. E so se mudou de aba.
    if (typeof alvo === "number" && alvo !== indiceAtivo) aoSoltar(alvo);
  }, [aoSoltar, encerrar, indiceAtivo]);

  /**
   * Rede de seguranca: enquanto o dedo esta na tela, o fim do gesto tambem e
   * ouvido na janela.
   *
   * Se o `pointerup` se perder — o dedo sai pela borda da tela, o sistema
   * rouba o gesto, a aba perde o foco — o `arrastou` ficaria preso em true, e
   * ai o proximo toque comum seria engolido pelo onClickCapture. O usuario
   * tocaria numa aba e nada aconteceria, sem nenhuma pista do porque.
   */
  React.useEffect(() => {
    if (!pressionado) return;
    const fim = () => soltar();
    const cancelar = () => {
      arrastou.current = false;
      encerrar();
    };
    window.addEventListener("pointerup", fim);
    window.addEventListener("pointercancel", cancelar);
    window.addEventListener("blur", cancelar);
    return () => {
      window.removeEventListener("pointerup", fim);
      window.removeEventListener("pointercancel", cancelar);
      window.removeEventListener("blur", cancelar);
    };
  }, [pressionado, soltar, encerrar]);

  const handlers = {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      // Botao direito e do meio nao arrastam nada.
      if (e.pointerType === "mouse" && e.button !== 0) return;
      partida.current = { x: e.clientX, y: e.clientY, ponteiro: e.pointerId };
      ultimoAlvo.current = indiceAtivo;
      arrastou.current = false;
      setPressionado(true);
    },

    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const inicio = partida.current;
      if (!inicio || inicio.ponteiro !== e.pointerId) return;

      if (!arrastou.current) {
        // Limiar: so vira arrasto depois de andar de verdade na horizontal, e
        // so se andou mais na horizontal que na vertical — assim rolar a
        // pagina comecando em cima da barra continua rolando a pagina.
        const dx = Math.abs(e.clientX - inicio.x);
        const dy = Math.abs(e.clientY - inicio.y);
        if (dx < 8 || dx <= dy) return;

        arrastou.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }

      const medida = medir(e.clientX);
      if (!medida) return;

      if (medida.alvo !== ultimoAlvo.current) {
        ultimoAlvo.current = medida.alvo;
        vibrar();
      }
      alvoRef.current = medida.alvo;
      setArrasto(medida);
    },

    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      // O trabalho e feito pelo ouvinte da janela, que pega este caso e tambem
      // os que nao chegam ate aqui. So evitamos o clique nativo depois de um
      // arrasto de verdade.
      if (arrastou.current) e.preventDefault();
    },

    onPointerCancel() {
      // Gesto interrompido (chamada chegando, gesto do sistema): a pilula volta
      // para onde estava e nada e escolhido.
      arrastou.current = false;
      encerrar();
    },

    onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
      // Depois de arrastar, o ponteiro solta em cima de um link e o navegador
      // dispara o clique dele. Sem engolir aqui, o arrasto navegaria duas
      // vezes — e a segunda seria para a aba errada, a que estava embaixo.
      if (!arrastou.current) return;
      arrastou.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return {
    trilhoRef,
    handlers,
    arrastando: arrasto !== null,
    pressionado,
    /** Qual aba mostrar como ativa agora — previa durante o arrasto. */
    indiceVisual: arrasto ? arrasto.alvo : indiceAtivo,
    /**
     * O transform sai inteiro daqui, escala junto — e nao numa classe `scale-*`
     * do Tailwind.
     *
     * Em Tailwind v4 `scale-*` vira a propriedade CSS `scale`, que e aplicada
     * ANTES do `transform` na cadeia: o resultado e que ela multiplica o
     * deslocamento tambem. Na ponta direita do trilho isso jogava a pilula 7px
     * para fora da capsula. Num `transform` unico, `translateX(...) scale(...)`
     * translada primeiro e so depois cresce em torno do centro — a pilula
     * "levanta" no lugar, que era a intencao.
     */
    estiloPilula: {
      width: `${larguraPct}%`,
      transform: `translateX(${arrasto ? arrasto.pct : indiceAtivo * 100}%) scale(${
        arrasto ? 1.03 : pressionado ? 0.97 : 1
      })`,
    } satisfies React.CSSProperties,
  };
}
