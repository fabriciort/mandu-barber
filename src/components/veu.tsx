import { cn } from "@/lib/cn";

/**
 * Veu de desfoque progressivo.
 *
 * Fica atras das barras flutuantes e das bordas de tela, no lugar do degrade
 * de cor que existia antes. A diferenca pratica: um degrade de branco APAGA o
 * que passa por baixo — na home, a foto da galeria virava um borrao
 * esbranquicado atras do logo. O desfoque acalma a area sem tirar a imagem da
 * composicao: o que esta atras continua la, so que fora de foco.
 *
 * Como funciona: N camadas empilhadas, cada uma desfocando o DOBRO da
 * anterior, cada uma com sua faixa de mascara. Uma camada so, com mascara,
 * desfoca por igual e corta seco no fim da mascara — dava para ver a linha
 * entre borrado e nitido. Com as faixas se sobrepondo, o desfoque cresce em
 * rampa e o olho nao acha onde comeca.
 */
export function Veu({
  /** De onde o desfoque e mais forte para onde ele some. */
  para = "cima",
  /**
   * Quantas camadas. Cada uma e uma superficie que a GPU rele e borra, entao
   * o numero e custo direto. Tres ja da rampa macia; cinco so acrescentava
   * conta. Como o raio DOBRA a cada camada, cortar duas tambem derruba o raio
   * maximo de 16px para 4px — e o custo do desfoque cresce com o raio.
   */
  camadas = 3,
  /** Desfoque da camada mais fraca, em px. Dobra a cada camada. */
  base = 1.5,
  /**
   * Tinta de apoio sobre o desfoque. Desfocar sozinho nao aumenta contraste:
   * texto claro sobre foto clara continua ilegivel depois de borrado. Uma
   * pelicula fina resolve — bem mais fraca que o veu de cor antigo.
   */
  tinta,
  className,
}: {
  para?: "cima" | "baixo";
  camadas?: number;
  base?: number;
  tinta?: string;
  className?: string;
}) {
  // "para=cima" = forte embaixo, sumindo para cima. Em `to top` o 0% fica
  // embaixo, que e justamente a ponta forte — o sentido bate com o nome.
  const sentido = para === "cima" ? "to top" : "to bottom";

  return (
    <div className={cn("veu", className)} aria-hidden>
      {Array.from({ length: camadas }).map((_, i) => {
        // TODAS as camadas ficam opacas na ponta forte; o que muda e ATE ONDE
        // cada uma alcanca. A de menor desfoque vai mais longe, a de maior
        // desfoque cobre so a ponta. Somadas, o desfoque cresce em rampa.
        //
        // Ja errei isto uma vez ao contrario — camadas fortes na ponta que
        // deveria sumir — e o resultado foi uma linha dura bem visivel onde o
        // desfoque comecava, exatamente o defeito que o veu existe para evitar.
        const meio = 60 * (1 - i / camadas);
        const fim = meio + 40;
        const mascara = `linear-gradient(${sentido}, #000 0%, #000 ${meio}%, transparent ${fim}%)`;

        return (
          <span
            key={i}
            style={{
              backdropFilter: `blur(${base * 2 ** i}px)`,
              WebkitBackdropFilter: `blur(${base * 2 ** i}px)`,
              maskImage: mascara,
              WebkitMaskImage: mascara,
            }}
          />
        );
      })}

      {tinta ? (
        <span
          style={{ background: `linear-gradient(${sentido}, ${tinta}, transparent)` }}
        />
      ) : null}
    </div>
  );
}
