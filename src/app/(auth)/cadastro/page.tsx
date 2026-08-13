import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "./sign-up-form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect("/minha-conta");

  const next =
    params.proximo?.startsWith("/") && !params.proximo.startsWith("//") ? params.proximo : undefined;

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Criar conta
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Leva menos de um minuto. Depois disso, agendar leva menos ainda.
      </p>

      <SignUpForm next={next} />

      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Ja tem conta?{" "}
        <Link
          href={`/entrar${next ? `?proximo=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-[var(--accent)] hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
