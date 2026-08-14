"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Check, Search, Sparkles } from "lucide-react";

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
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { assignSubscriptionAction, payInvoiceAction } from "@/server/actions/subscriptions";
import type { ActionState } from "@/server/actions/result";
import { formatMoney } from "@/lib/format";

/** Venda de plano no balcao: o gestor ativa a assinatura em nome do cliente. */
export function AssignSubscriptionDialog({
  plans,
  clients,
}: {
  plans: { id: string; name: string; priceCents: number }[];
  clients: { id: string; name: string; phone: string | null }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    assignSubscriptionAction,
    { ok: false },
  );

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Assinatura criada");
      setOpen(false);
      setClientId("");
      setQuery("");
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível criar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients.slice(0, 8);
    return clients
      .filter((c) => c.name.toLowerCase().includes(term) || (c.phone ?? "").includes(term))
      .slice(0, 8);
  }, [query, clients]);

  const selected = clients.find((c) => c.id === clientId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Sparkles className="size-4" />
          Ativar plano
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ativar plano para um cliente</DialogTitle>
          <DialogDescription>
            A franquia fica disponível na hora e a primeira fatura entra em aberto.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="clientId" value={clientId} />

          <DialogBody className="space-y-4">
            <Field label="Cliente" required>
              {selected ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2">
                  <span className="text-sm font-medium">{selected.name}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setClientId("")}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Buscar cliente sem plano ativo"
                      className="pl-9"
                    />
                  </div>
                  {filtered.length > 0 ? (
                    <ul className="mt-2 max-h-40 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
                      {filtered.map((client) => (
                        <li key={client.id}>
                          <button
                            type="button"
                            onClick={() => setClientId(client.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-muted)]"
                          >
                            <span>{client.name}</span>
                            <span className="text-xs text-[var(--text-muted)]">{client.phone}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Nenhum cliente disponível — todos já possuem plano ativo.
                    </p>
                  )}
                </>
              )}
            </Field>

            <Field label="Plano" htmlFor="planId" required>
              <Select id="planId" name="planId" required defaultValue="">
                <option value="" disabled>
                  Escolha o plano
                </option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} — {formatMoney(plan.priceCents)}/mês
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Forma de pagamento" htmlFor="paymentMethod">
              <Select id="paymentMethod" name="paymentMethod" defaultValue="PIX">
                <option value="PIX">Pix</option>
                <option value="CARD">Cartão</option>
                <option value="CASH">Dinheiro</option>
                <option value="TRANSFER">Transferência</option>
              </Select>
            </Field>

            {state.message && !state.ok ? (
              <p className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)]">
                {state.message}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending} disabled={!clientId}>
              Ativar assinatura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Baixa manual de fatura — o pagamento entra pelo caixa da loja. */
export function PayInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(payInvoiceAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Fatura baixada");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível baixar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Check className="size-4" />
          Baixar
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            Confirma o recebimento e reativa a assinatura se estiver em atraso.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />

          <DialogBody>
            <Field label="Forma de pagamento" htmlFor="method">
              <Select id="method" name="method" defaultValue="PIX">
                <option value="PIX">Pix</option>
                <option value="CARD">Cartão</option>
                <option value="CASH">Dinheiro</option>
                <option value="TRANSFER">Transferência</option>
              </Select>
            </Field>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
