"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";

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
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveServiceAction, toggleServiceAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";
import { formatMoney, parseMoneyToCents } from "@/lib/format";
import { SERVICE_CATEGORY_LABEL } from "@/lib/enums";

type ServiceInput = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
  active: boolean;
  featured: boolean;
  barberIds: string[];
};

export function ServiceFormDialog({
  service,
  barbers,
}: {
  service?: ServiceInput;
  barbers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [priceInput, setPriceInput] = React.useState(
    service ? (service.priceCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveServiceAction, {
    ok: false,
  });

  const priceCents = parseMoneyToCents(priceInput);

  React.useEffect(() => {
    if (state.ok) {
      toast.success(service ? "Servico atualizado" : "Servico criado");
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
        {service ? (
          <Button size="icon-sm" variant="ghost" aria-label={`Editar ${service.name}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Novo servico
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Editar servico" : "Novo servico"}</DialogTitle>
          <DialogDescription>
            A duracao define o bloco reservado na agenda. O tempo de limpeza segura a proxima
            marcacao sem alongar o atendimento do cliente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
          <input type="hidden" name="priceCents" value={priceCents ?? 0} />

          <DialogBody className="space-y-4">
            <Field label="Nome" htmlFor="name" required error={state.fieldErrors?.name}>
              <Input id="name" name="name" defaultValue={service?.name} required maxLength={80} />
            </Field>

            <Field label="Descricao" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                defaultValue={service?.description ?? ""}
                rows={2}
                maxLength={400}
                placeholder="Como o cliente ve este servico no site."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria" htmlFor="category">
                <Select id="category" name="category" defaultValue={service?.category ?? "CABELO"}>
                  {Object.entries(SERVICE_CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Preco"
                htmlFor="price"
                required
                error={priceInput && priceCents === null ? "Valor invalido." : undefined}
                hint={priceCents !== null ? formatMoney(priceCents) : "Ex.: 70,00"}
              >
                <Input
                  id="price"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  inputMode="decimal"
                  placeholder="70,00"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Duracao (min)"
                htmlFor="durationMinutes"
                required
                error={state.fieldErrors?.durationMinutes}
              >
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  defaultValue={service?.durationMinutes ?? 30}
                  required
                />
              </Field>

              <Field
                label="Tempo de limpeza (min)"
                htmlFor="bufferMinutes"
                hint="Folga apos o atendimento antes do proximo."
              >
                <Input
                  id="bufferMinutes"
                  name="bufferMinutes"
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  defaultValue={service?.bufferMinutes ?? 0}
                />
              </Field>
            </div>

            <Field
              label="Profissionais habilitados"
              error={state.fieldErrors?.barberIds}
              hint="Somente quem estiver marcado aparece no agendamento deste servico."
            >
              <div className="grid gap-1.5 rounded-lg border border-[var(--border-subtle)] p-2 sm:grid-cols-2">
                {barbers.map((barber) => (
                  <label
                    key={barber.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-[var(--surface-muted)]"
                  >
                    <input
                      type="checkbox"
                      name="barberIds"
                      value={barber.id}
                      defaultChecked={service?.barberIds.includes(barber.id) ?? true}
                      className="size-4 accent-[var(--accent)]"
                    />
                    {barber.name}
                  </label>
                ))}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField
                name="active"
                label="Servico ativo"
                hint="Inativo some do site e do painel de agendamento."
                defaultChecked={service?.active ?? true}
              />
              <CheckboxField
                name="featured"
                label="Destacar na home"
                hint="Aparece com selo na vitrine."
                defaultChecked={service?.featured ?? false}
              />
            </div>

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
            <Button type="submit" loading={pending} disabled={priceCents === null}>
              {service ? "Salvar" : "Criar servico"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ToggleServiceButton({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(toggleServiceAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Servico atualizado");
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel alterar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        size="icon-sm"
        variant="ghost"
        loading={pending}
        aria-label={active ? "Desativar servico" : "Reativar servico"}
      >
        {active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </Button>
    </form>
  );
}
