import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/cn";
import { PENDENCIAS, TEM_PENDENCIA, type Pendencia } from "@/content/mr-mandu";

/**
 * Marcador de dado que ainda nao foi confirmado com o cliente.
 *
 * Existe para resolver um risco concreto de lancamento: preco e horario de
 * mentira nao PARECEM de mentira. "R$ 70,00" e "09:00 - 20:00" passam por
 * qualquer revisao — sao plausiveis — e vao ao ar como se fossem verdade.
 * Um marcador tracejado no lugar do valor nao passa: quem abrir a pagina ve
 * na hora que falta combinar aquilo.
 *
 * Segue a gramatica das etiquetas da casa: no monocromatico, quem carrega o
 * significado e a FORMA, e o tracejado ja quer dizer "algo fora do previsto".
 */
export function AConfirmar({
  o: pendencia,
  children,
  className,
}: {
  /** Qual pendencia este marcador representa. */
  o: Pendencia;
  /** Rotulo curto do que falta. Sem isto, escreve "a confirmar". */
  children?: React.ReactNode;
  className?: string;
}) {
  if (!pendencia.pendente) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full",
        "border border-dashed border-[var(--text-muted)] px-2.5 py-1",
        "text-xs font-medium leading-4 text-[var(--text-muted)]",
        className,
      )}
      // O texto da pergunta vai junto: quem passa o mouse em homologacao ja le
      // o que precisa perguntar, sem abrir o codigo.
      title={pendencia.pergunta}
    >
      {children ?? "a confirmar"}
    </span>
  );
}

/**
 * Versao para usar dentro de bloco invertido (fundo escuro), onde a borda
 * cinza da versao normal desapareceria.
 */
export function AConfirmarNoEscuro({
  o: pendencia,
  children,
  className,
}: {
  o: Pendencia;
  children?: React.ReactNode;
  className?: string;
}) {
  if (!pendencia.pendente) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full",
        "border border-dashed border-current/50 px-2.5 py-1",
        "text-xs font-medium leading-4 text-current opacity-70",
        className,
      )}
      title={pendencia.pergunta}
    >
      {children ?? "a confirmar"}
    </span>
  );
}

/**
 * Faixa de homologacao no topo do site.
 *
 * Enquanto houver qualquer pendencia aberta, todo mundo que abrir o site ve
 * que o conteudo ainda esta em conferencia. Some sozinha quando a ultima
 * pendencia de PENDENCIAS virar `pendente: false` — nao precisa lembrar de
 * remover esta faixa no dia do lancamento.
 */
export function FaixaHomologacao() {
  if (!TEM_PENDENCIA) return null;

  const abertas = Object.values(PENDENCIAS).filter((p) => p.pendente);

  return (
    <div className="border-b border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] print:hidden">
      <div className="mx-auto flex max-w-6xl items-start gap-2.5 px-4 py-2.5 sm:px-6">
        <AlertCircle className="mt-px size-4 shrink-0 text-[var(--text-muted)]" aria-hidden />
        <p className="text-xs leading-snug text-[var(--text-secondary)]">
          <span className="font-semibold">Conteúdo em conferência.</span>{" "}
          {abertas.length} {abertas.length === 1 ? "informação" : "informações"} desta página
          {abertas.length === 1 ? " ainda depende" : " ainda dependem"} de confirmação da
          barbearia — os pontos marcados com contorno tracejado. Preços, horários e regras de
          plano só valem depois disso.
        </p>
      </div>
    </div>
  );
}
