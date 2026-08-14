import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/session";

export const metadata = { title: "Sem acesso" };

export default async function ForbiddenPage() {
  const user = await getCurrentUser();

  return (
    <main
      id="conteudo"
      className="flex min-h-dvh flex-col items-center justify-center px-4 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-muted)]">
        <ShieldAlert className="size-7 text-[var(--text-primary)]" />
      </span>
      <h1 className="mt-6 font-display text-3xl">
        Esta área não é sua
      </h1>
      <p className="mt-2 max-w-sm text-[var(--text-muted)]">
        Sua conta não tem permissao para o painel de gestão. Se você faz parte da equipe, peca ao
        gestor para liberar seu acesso.
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href={user?.role === "CLIENT" ? "/minha-conta" : "/"}>
            {user?.role === "CLIENT" ? "Ir para minha conta" : "Voltar ao início"}
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/agendar">Agendar horário</Link>
        </Button>
      </div>
    </main>
  );
}
