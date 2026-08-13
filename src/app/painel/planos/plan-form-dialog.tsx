"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Infinity as InfinityIcon, Minus, Pencil, Plus } from "lucide-react";

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
import { CheckboxField, Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { savePlanAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";
import { formatMoney, parseMoneyToCents } from "@/lib/format";
import { planSavings } from "@/lib/pricing";
import { cn } from "@/lib/cn";

type PlanInput = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  priceCents: number;
  intervalMonths: number;
  extraDiscountPercent: number;
  priorityBooking: boolean;
  allowRollover: boolean;
  maxRolloverCredits: number;
  perks: string;
  highlight: boolean;
  active: boolean;
  benefits: { serviceId: string; quantityPerCycle: number }[];
};

export function PlanFormDialog({
  plan,
  services,
}: {
  plan?: PlanInput;
  services: { id: string; name: string; priceCents: number }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(savePlanAction, {
    ok: false,
  });

  const [priceInput, setPriceInput] = React.useState(
    plan ? (plan.priceCents / 100).toFixed(2).replace(".", ",") : "",
  );
  const [benefits, setBenefits] = React.useState<Record<string, number>>(() =>
    Object.fromEntries((plan?.benefits ?? []).map((b) => [b.serviceId, b.quantityPerCycle])),
  );

  const priceCents = parseMoneyToCents(priceInput) ?? 0;

  const savings = planSavings(
    priceCents,
    Object.entries(benefits)
      .filter(([, quantity]) => quantity !== 0)
      .map(([serviceId, quantity]) => ({
        quantityPerCycle: quantity,
        priceCents: services.find((s) => s.id === serviceId)?.priceCents ?? 0,
      })),
  );

  React.useEffect(() => {
    if (state.ok) {
      toast.success(plan ? "Plano atualizado" : "Plano criado");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel salvar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function setQuantity(serviceId: string, quantity: number) {
    setBenefits((current) => {
      const next = { ...current };
      if (quantity === 0) delete next[serviceId];
      else next[serviceId] = quantity;
      return next;
    });
  }

  const benefitsPayload = JSON.stringify(
    Object.entries(benefits).map(([serviceId, quantityPerCycle]) => ({
      serviceId,
      quantityPerCycle,
    })),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan ? (
          <Button size="sm" variant="secondary" block>
            <Pencil className="size-4" />
            Editar plano
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="size-4" />
            Novo plano
          </Button>
        )}
      </DialogTrigger>

      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar plano" : "Novo plano"}</DialogTitle>
          <DialogDescription>
            A franquia define quantas vezes por ciclo cada servico sai sem custo para o assinante.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          {plan ? <input type="hidden" name="id" value={plan.id} /> : null}
          <input type="hidden" name="priceCents" value={priceCents} />
          <input type="hidden" name="benefits" value={benefitsPayload} />
          <input type="hidden" name="accentColor" value="#c98b3a" />

          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="name" required error={state.fieldErrors?.name}>
                <Input id="name" name="name" defaultValue={plan?.name} required maxLength={80} />
              </Field>
              <Field label="Chamada" htmlFor="tagline">
                <Input
                  id="tagline"
                  name="tagline"
                  defaultValue={plan?.tagline ?? ""}
                  maxLength={120}
                  placeholder="Ex.: Para quem corta todo mes"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Preco"
                htmlFor="price"
                required
                hint={priceCents ? formatMoney(priceCents) : "Ex.: 119,00"}
              >
                <Input
                  id="price"
                  value={priceInput}
                  onChange={(event) => setPriceInput(event.target.value)}
                  inputMode="decimal"
                  placeholder="119,00"
                  required
                />
              </Field>
              <Field label="Ciclo (meses)" htmlFor="intervalMonths">
                <Input
                  id="intervalMonths"
                  name="intervalMonths"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={plan?.intervalMonths ?? 1}
                />
              </Field>
              <Field
                label="Desconto extra (%)"
                htmlFor="extraDiscountPercent"
                hint="Fora da franquia."
              >
                <Input
                  id="extraDiscountPercent"
                  name="extraDiscountPercent"
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={plan?.extraDiscountPercent ?? 0}
                />
              </Field>
            </div>

            <Field label="Franquia por ciclo">
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-2">
                {services.map((service) => {
                  const quantity = benefits[service.id] ?? 0;
                  const unlimited = quantity < 0;

                  return (
                    <div
                      key={service.id}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5",
                        quantity !== 0 && "bg-[var(--accent-soft)]",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {service.name}
                        <span className="ml-2 text-xs text-[var(--text-muted)]">
                          {formatMoney(service.priceCents)}
                        </span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setQuantity(service.id, unlimited ? 0 : -1)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-xs transition-colors",
                          unlimited
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "border-[var(--border-strong)] text-[var(--text-muted)] hover:border-[var(--accent)]",
                        )}
                        aria-pressed={unlimited}
                        aria-label={`Franquia ilimitada de ${service.name}`}
                      >
                        <InfinityIcon className="size-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQuantity(service.id, Math.max(0, quantity - 1))}
                          disabled={unlimited || quantity <= 0}
                          className="rounded-md border border-[var(--border-strong)] p-1 transition-colors hover:border-[var(--accent)] disabled:opacity-40"
                          aria-label={`Diminuir franquia de ${service.name}`}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium tabular-nums">
                          {unlimited ? "∞" : quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(service.id, unlimited ? 1 : quantity + 1)}
                          className="rounded-md border border-[var(--border-strong)] p-1 transition-colors hover:border-[var(--accent)]"
                          aria-label={`Aumentar franquia de ${service.name}`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {savings.fullPriceCents > 0 ? (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Valor de tabela da franquia: {formatMoney(savings.fullPriceCents)}
                  {savings.hasUnlimited ? " (ilimitado estimado em 4 usos)" : ""} · economia
                  anunciada ao cliente: {formatMoney(savings.savingsCents)}.
                </p>
              ) : null}
            </Field>

            <Field
              label="Beneficios (um por linha)"
              htmlFor="perks"
              hint="Como aparecem na vitrine de planos."
            >
              <Textarea
                id="perks"
                name="perks"
                rows={4}
                defaultValue={plan?.perks ?? ""}
                placeholder={"4 cortes por mes\n15% nos demais servicos\nPrioridade na agenda"}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxField
                name="priorityBooking"
                label="Prioridade na agenda"
                defaultChecked={plan?.priorityBooking ?? false}
              />
              <CheckboxField
                name="allowRollover"
                label="Acumular creditos nao usados"
                defaultChecked={plan?.allowRollover ?? false}
              />
              <CheckboxField
                name="highlight"
                label="Destacar como mais assinado"
                defaultChecked={plan?.highlight ?? false}
              />
              <CheckboxField
                name="active"
                label="Plano ativo"
                defaultChecked={plan?.active ?? true}
              />
            </div>

            <Field
              label="Limite de acumulo"
              htmlFor="maxRolloverCredits"
              hint="Quantos creditos podem passar para o ciclo seguinte."
            >
              <Input
                id="maxRolloverCredits"
                name="maxRolloverCredits"
                type="number"
                min={0}
                max={20}
                defaultValue={plan?.maxRolloverCredits ?? 0}
                className="max-w-32"
              />
            </Field>

            <Field label="Descricao interna" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={plan?.description ?? ""}
                maxLength={400}
              />
            </Field>

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
            <Button type="submit" loading={pending} disabled={priceCents <= 0}>
              {plan ? "Salvar plano" : "Criar plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
