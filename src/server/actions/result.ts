import { ZodError } from "zod";

import { AuthorizationError } from "@/server/auth/guards";
import { BookingError } from "@/server/services/booking";

/**
 * Contrato unico de retorno das Server Actions.
 *
 * Formularios usam `useActionState`, entao a acao nunca lanca para a UI: ela
 * devolve um estado que o componente sabe renderizar (erro geral ou por campo).
 */
export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Payload livre para a UI reagir (id criado, redirecionamento sugerido). */
  data?: Record<string, unknown>;
};

export const idle: ActionState = { ok: false };

export function success(message?: string, data?: Record<string, unknown>): ActionState {
  return { ok: true, message, data };
}

export function failure(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, message, fieldErrors };
}

/**
 * Executa a acao traduzindo excecoes conhecidas em mensagens uteis. Erros
 * inesperados viram uma mensagem generica (e ficam no log do servidor), para
 * nao vazar detalhe interno na tela do cliente.
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.errors) {
        const key = issue.path.join(".") || "form";
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, message: "Confira os campos destacados.", fieldErrors };
    }
    if (error instanceof BookingError || error instanceof AuthorizationError) {
      return { ok: false, message: error.message };
    }
    // Um redirect() do Next se propaga como erro especial e nao deve ser engolido.
    if (isNextControlFlow(error)) throw error;

    console.error("[action]", error);
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      message: message && message.length < 160 ? message : "Nao foi possivel concluir. Tente novamente.",
    };
  }
}

function isNextControlFlow(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    ((error as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (error as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}
