"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Pencil, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { PhoneInput } from "@/components/phone-input";
import { useToast } from "@/components/ui/toast";
import { saveClientAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";

export function ClientFormDialog({
  client,
}: {
  client?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    notes: string | null;
    active: boolean;
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveClientAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      const provisional = state.data?.provisionalPassword;
      toast.success(
        client ? "Cliente atualizado" : "Cliente cadastrado",
        provisional ? `Senha provisoria: ${provisional}` : undefined,
      );
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel salvar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {client ? (
          <Button size="sm" variant="secondary">
            <Pencil className="size-4" />
            Editar
          </Button>
        ) : (
          <Button size="sm">
            <UserPlus className="size-4" />
            Novo cliente
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>
            {client
              ? "Atualize os dados e as observacoes da ficha."
              : "Cadastro de balcao. A senha provisoria e o telefone informado."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          {client ? <input type="hidden" name="id" value={client.id} /> : null}

          <DialogBody className="space-y-4">
            <Field label="Nome completo" htmlFor="name" required error={state.fieldErrors?.name}>
              <Input id="name" name="name" defaultValue={client?.name} required maxLength={120} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="E-mail" htmlFor="email" required error={state.fieldErrors?.email}>
                <Input id="email" name="email" type="email" defaultValue={client?.email} required />
              </Field>

              <Field label="Celular" htmlFor="phone" error={state.fieldErrors?.phone}>
                <PhoneInput id="phone" name="phone" defaultValue={client?.phone} />
              </Field>
            </div>

            <Field
              label="Observacoes internas"
              htmlFor="notes"
              hint="Preferencias de corte, alergias, o que ajuda no atendimento."
            >
              <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} maxLength={600} />
            </Field>

            {client ? (
              <label className="flex items-center gap-2 text-sm">
                {/* Checkbox primeiro, hidden depois: o FormData segue a ordem do
                    DOM, entao marcado envia "true" e desmarcado cai no "false"
                    do hidden (um checkbox desmarcado nao e enviado). */}
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  defaultChecked={client.active}
                  className="size-4 accent-[var(--accent)]"
                />
                <input type="hidden" name="active" value="false" />
                Cliente ativo
              </label>
            ) : null}

            {state.message && !state.ok ? (
              <p className="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-500">
                {state.message}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              {client ? "Salvar alteracoes" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
