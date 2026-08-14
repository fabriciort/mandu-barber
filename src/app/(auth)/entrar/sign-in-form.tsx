"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { signInAction } from "@/server/actions/auth";
import type { ActionState } from "@/server/actions/result";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signInAction, {
    ok: false,
  });
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (!state.ok) return;
    const role = String(state.data?.role ?? "CLIENT");
    router.replace(next ?? (role === "CLIENT" ? "/minha-conta" : "/painel"));
    router.refresh();
  }, [state, next, router]);

  return (
    <form action={formAction} className="mt-8 space-y-4" noValidate>
      {state.message && !state.ok ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}

      <Field label="E-mail" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@email.com"
        />
      </Field>

      <Field label="Senha" htmlFor="password" required error={state.fieldErrors?.password}>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <Button type="submit" block size="lg" loading={pending}>
        Entrar
      </Button>
    </form>
  );
}
