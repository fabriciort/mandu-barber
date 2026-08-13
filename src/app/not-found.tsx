import Link from "next/link";
import { Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="conteudo"
      className="flex min-h-dvh flex-col items-center justify-center px-4 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
        <Scissors className="size-7 text-[var(--accent)]" />
      </span>
      <p className="mt-6 font-[family-name:var(--font-display)] text-5xl font-semibold">404</p>
      <h1 className="mt-2 text-xl font-semibold">Essa página não existe</h1>
      <p className="mt-2 max-w-sm text-[var(--text-muted)]">
        O link pode ter mudado de lugar. Que tal marcar um horário enquanto você está por aqui?
      </p>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/agendar">Agendar horário</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
