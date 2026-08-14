"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PhoneInput } from "@/components/phone-input";
import { signUpAction } from "@/server/actions/auth";
import type { ActionState } from "@/server/actions/result";

export function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (!state.ok) return;
    router.replace(next ?? "/minha-conta");
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

      <Field label="Nome completo" htmlFor="name" required error={state.fieldErrors?.name}>
        <Input id="name" name="name" autoComplete="name" required placeholder="Como podemos te chamar" />
      </Field>

      <Field label="E-mail" htmlFor="email" required error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="voce@email.com" />
      </Field>

      <Field
        label="Celular"
        htmlFor="phone"
        error={state.fieldErrors?.phone}
        hint="Usamos para avisar sobre o seu horário."
      >
        <PhoneInput id="phone" name="phone" autoComplete="tel" />
      </Field>

      <Field
        label="Senha"
        htmlFor="password"
        required
        error={state.fieldErrors?.password}
        hint="Mínimo de 8 caracteres."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Button type="submit" block size="lg" loading={pending}>
        Criar conta
      </Button>

      <p className="text-center text-xs text-[var(--text-muted)]">
        Ao criar sua conta você concorda em receber avisos sobre seus agendamentos.
      </p>
    </form>
  );
}
