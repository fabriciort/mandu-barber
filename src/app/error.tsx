"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[erro]", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-[var(--surface-muted)]">
        <TriangleAlert className="size-7 text-[var(--text-primary)]" />
      </span>
      <h1 className="mt-6 font-display text-2xl">
        Algo saiu do lugar
      </h1>
      <p className="mt-2 max-w-sm text-[var(--text-muted)]">
        Tivemos um problema para carregar esta tela. Tente de novo — se persistir, fale com a
        barbearia.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-[var(--text-muted)]">ref: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button onClick={reset}>
          <RefreshCw className="size-4" />
          Tentar de novo
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
