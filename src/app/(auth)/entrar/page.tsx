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
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
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

      <div className="mt-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Acessos de demonstracao
        </p>
        <ul className="mt-2 space-y-1 text-xs text-[var(--text-secondary)]">
          <li>
            <span className="text-[var(--text-muted)]">Cliente:</span> cliente@mandubarber.com.br
          </li>
          <li>
            <span className="text-[var(--text-muted)]">Profissional:</span> bruno@mandubarber.com.br
          </li>
          <li>
            <span className="text-[var(--text-muted)]">Gestor:</span> ricardo@mandubarber.com.br
          </li>
          <li className="pt-1">
            <span className="text-[var(--text-muted)]">Senha:</span> mandu123
          </li>
        </ul>
      </div>
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
