"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PhoneInput } from "@/components/phone-input";
import { useToast } from "@/components/ui/toast";
import { changePasswordAction, updateProfileAction } from "@/server/actions/auth";
import type { ActionState } from "@/server/actions/result";

export function ProfileForm({
  defaultValues,
  email,
}: {
  defaultValues: { name: string; phone: string | null; birthDate: string };
  email: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateProfileAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Dados atualizados");
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível salvar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <Field label="Nome completo" htmlFor="name" required error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={defaultValues.name} required />
      </Field>

      <Field label="E-mail" htmlFor="email" hint="Para trocar o e-mail, fale com a barbearia.">
        <Input id="email" value={email} disabled />
      </Field>

      <Field label="Celular" htmlFor="phone" error={state.fieldErrors?.phone}>
        <PhoneInput id="phone" name="phone" defaultValue={defaultValues.phone} />
      </Field>

      <Field
        label="Data de nascimento"
        htmlFor="birthDate"
        hint="A gente gosta de lembrar de quem faz aniversário."
      >
        <Input id="birthDate" name="birthDate" type="date" defaultValue={defaultValues.birthDate} />
      </Field>

      <Button type="submit" loading={pending}>
        Salvar alterações
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const toast = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changePasswordAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Senha alterada", state.message);
      formRef.current?.reset();
    } else if (state.message) {
      toast.error("Não foi possível trocar a senha", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-5 space-y-4">
      <Field label="Senha atual" htmlFor="current" required error={state.fieldErrors?.current}>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </Field>

      <Field
        label="Nova senha"
        htmlFor="next"
        required
        error={state.fieldErrors?.next}
        hint="Mínimo de 8 caracteres."
      >
        <Input
          id="next"
          name="next"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Field label="Confirmar nova senha" htmlFor="confirm" required error={state.fieldErrors?.confirm}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>

      <Button type="submit" variant="secondary" loading={pending}>
        Trocar senha
      </Button>
    </form>
  );
}
