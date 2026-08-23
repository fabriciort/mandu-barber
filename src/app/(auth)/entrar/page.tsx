import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "./sign-in-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNext(params.proximo) ?? defaultRoute(user.role));

  return (
    <div>
      <h1 className="font-display text-3xl">
        Entrar
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Acesse para agendar, acompanhar seu plano e ver seu histórico.
      </p>

      <SignInForm next={safeNext(params.proximo)} />

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Ainda não tem conta?{" "}
        <Link
          href={`/cadastro${params.proximo ? `?proximo=${encodeURIComponent(params.proximo)}` : ""}`}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Criar conta
        </Link>
      </p>

      {/* Acessos de demonstracao — SO em ambiente de demonstracao.
       *
       * Este bloco ja publicou e-mail do gestor com a senha ao lado. Com a
       * carga real, a conta de gestor passou a usar o e-mail verdadeiro da
       * empresa: publicar aquilo seria entregar a administracao de uma
       * barbearia de verdade para quem abrisse a pagina.
       *
       * Agora depende de NEXT_PUBLIC_MOSTRAR_DEMO=1, que so existe no ambiente
       * de demonstracao, e mostra apenas a conta de CLIENTE — a de gestor nao
       * aparece em lugar nenhum. */}
      {process.env.NEXT_PUBLIC_MOSTRAR_DEMO === "1" ? (
        <div className="mt-8 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-muted)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Ambiente de demonstração
          </p>
          <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
            <li>
              <span className="text-[var(--text-muted)]">Cliente:</span> cliente@mandubarber.com.br
            </li>
            <li>
              <span className="text-[var(--text-muted)]">Senha:</span> mandu123
            </li>
          </ul>
          <p className="mt-2 text-2xs leading-snug text-[var(--text-muted)]">
            Os acessos da equipe não são divulgados aqui.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Só aceitamos redirecionamento interno — nunca para outro dominio. */
function safeNext(value?: string): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

function defaultRoute(role: string): string {
  return role === "CLIENT" ? "/minha-conta" : "/painel";
}
