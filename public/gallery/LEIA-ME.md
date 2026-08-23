# Fotos da galeria

As imagens que estão aqui hoje são **provisórias**. Elas dizem "FOTO A DEFINIR"
na própria imagem justamente para ninguém publicar o site achando que já são as
fotos boas.

## Para trocar por fotos reais

1. Coloque os arquivos nesta pasta. Pode manter os mesmos nomes (`espaco-01.jpg`,
   `equipe-01.jpg`, …) ou usar nomes novos.
2. Abra `src/content/galeria.json` e, para cada foto:
   - ajuste `arquivo` se mudou o nome;
   - escreva o `alt` de verdade — descreva **o que se vê**, não repita o título.
     É o que uma pessoa cega vai ouvir no lugar da imagem;
   - apague a linha `"placeholder": true`. É ela que faz aparecer o selo
     "foto provisória" em cima da imagem.
3. Pronto. Nenhum componente precisa ser alterado — o carrossel lê a lista, não
   conhece nenhuma foto pelo nome.

## Recomendações de arquivo

- **Proporção:** o carrossel recorta em 4:3. Fotos verticais funcionam, mas vão
  perder topo e base.
- **Tamanho:** mande em alta (1600px ou mais no lado maior). O Next reduz
  sozinho para cada tela; o que ele **não** faz é aumentar uma foto pequena.
- **Formato:** `.jpg` para fotografia, `.png` só se precisar de fundo
  transparente.
- **Peso:** não se preocupe em comprimir antes — o otimizador do Next cuida
  disso na entrega.

## Categorias válidas

`espaco` · `equipe` · `trabalhos`

Para criar uma categoria nova, acrescente em `CATEGORIAS` e `CATEGORIA_LABEL`
dentro de `src/content/galeria.ts`. O filtro da galeria se ajusta sozinho e só
mostra categoria que tenha pelo menos uma foto.
