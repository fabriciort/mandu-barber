"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

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
import { Field, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { subscribeAction } from "@/server/actions/subscriptions";
import type { ActionState } from "@/server/actions/result";
import { formatMoney } from "@/lib/format";

export function SubscribeButton({
  planId,
  planName,
  priceCents,
  authenticated,
  highlight,
}: {
  planId: string;
  planName: string;
  priceCents: number;
  authenticated: boolean;
  highlight: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(subscribeAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Plano ativado", state.message);
      setOpen(false);
      router.push("/minha-conta/plano");
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel assinar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!authenticated) {
    return (
      <Button
        block
        variant={highlight ? "primary" : "secondary"}
        onClick={() => router.push(`/entrar?proximo=${encodeURIComponent("/planos")}`)}
      >
        Entrar para assinar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button block variant={highlight ? "primary" : "secondary"}>
          Assinar {planName}
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Assinar {planName}</DialogTitle>
          <DialogDescription>
            {formatMoney(priceCents)} por mes. Sua franquia fica disponivel imediatamente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="planId" value={planId} />

          <DialogBody className="space-y-4">
            <Field
              label="Forma de pagamento"
              htmlFor="paymentMethod"
              hint="A cobranca e registrada como fatura em aberto e confirmada pela barbearia."
            >
              <Select id="paymentMethod" name="paymentMethod" defaultValue="PIX">
                <option value="PIX">Pix</option>
                <option value="CARD">Cartao</option>
                <option value="CASH">Dinheiro na loja</option>
                <option value="TRANSFER">Transferencia</option>
              </Select>
            </Field>

            <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
              Sem fidelidade. Voce pode cancelar a qualquer momento e continua usando o que ja
              pagou ate o fim do ciclo.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Agora nao
            </Button>
            <Button type="submit" loading={pending}>
              Confirmar assinatura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
