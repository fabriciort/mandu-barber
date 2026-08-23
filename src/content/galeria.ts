import { z } from "zod";

import dados from "./galeria.json";

/**
 * Galeria da barbearia: arquivos em public/gallery/, descricao em galeria.json.
 *
 * A separacao existe para que trocar as fotos NAO seja mexer em componente.
 * Quando as imagens de verdade chegarem, o caminho e:
 *
 *   1. jogar os arquivos em public/gallery/ (mesmos nomes, ou nomes novos);
 *   2. no galeria.json, ajustar `arquivo`, escrever o `alt` de verdade e
 *      apagar `placeholder`;
 *   3. mais nada. O carrossel le a lista, nao conhece nenhuma foto pelo nome.
 *
 * O schema abaixo roda na carga do modulo: um arquivo com categoria errada ou
 * sem alt quebra o build, e nao vira uma imagem muda em producao.
 */

export const CATEGORIAS = ["espaco", "equipe", "trabalhos"] as const;
export type CategoriaGaleria = (typeof CATEGORIAS)[number];

export const CATEGORIA_LABEL: Record<CategoriaGaleria, string> = {
  espaco: "O espaço",
  equipe: "A equipe",
  trabalhos: "Trabalhos",
};

const itemSchema = z.object({
  /** Nome do arquivo dentro de public/gallery/. */
  arquivo: z.string().min(1),
  categoria: z.enum(CATEGORIAS),
  /** Legenda curta que aparece sobre a foto. */
  titulo: z.string().min(1),
  /**
   * Texto alternativo. Obrigatorio: uma galeria sem alt e uma galeria que nao
   * existe para quem usa leitor de tela.
   */
  alt: z.string().min(1),
  /** Marca a imagem provisoria — some quando a foto real entrar. */
  placeholder: z.boolean().optional(),
});

export type ItemGaleria = z.infer<typeof itemSchema> & { src: string };

const arquivoSchema = z.object({
  itens: z.array(itemSchema).min(1),
});

function carregar(): ItemGaleria[] {
  const lido = arquivoSchema.safeParse(dados);
  if (!lido.success) {
    // Mensagem direta: quem vai mexer nisto e quem esta trocando as fotos, nao
    // necessariamente quem escreveu o componente.
    throw new Error(
      `src/content/galeria.json invalido: ${lido.error.issues
        .map((i) => `${i.path.join(".")} — ${i.message}`)
        .join("; ")}`,
    );
  }

  return lido.data.itens.map((item) => ({ ...item, src: `/gallery/${item.arquivo}` }));
}

export const GALERIA: ItemGaleria[] = carregar();

/** Categorias que de fato tem foto — a barra de filtro nao mostra caixa vazia. */
export const CATEGORIAS_COM_FOTO: CategoriaGaleria[] = CATEGORIAS.filter((c) =>
  GALERIA.some((item) => item.categoria === c),
);

/** Ainda ha alguma imagem provisoria na galeria? */
export const GALERIA_TEM_PLACEHOLDER = GALERIA.some((item) => item.placeholder);
