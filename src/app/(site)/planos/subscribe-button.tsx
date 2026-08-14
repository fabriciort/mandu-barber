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
      toast.error("Não foi possível assinar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // No plano em destaque o cartao inteiro e invertido, entao o botao precisa
  // inverter junto para nao sumir no fundo.
  const variant = highlight ? "inverse" : "secondary";

  if (!authenticated) {
    return (
      <Button
        block
        size="lg"
        variant={variant}
        onClick={() => router.push(`/entrar?proximo=${encodeURIComponent("/planos")}`)}
      >
        Entrar para assinar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button block size="lg" variant={variant}>
          Assinar {planName}
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Assinar {planName}</DialogTitle>
          <DialogDescription>
            {formatMoney(priceCents)} por mês. Sua franquia fica disponível imediatamente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="planId" value={planId} />

          <DialogBody className="space-y-4">
            <Field
              label="Forma de pagamento"
              htmlFor="paymentMethod"
              hint="A cobrança é registrada como fatura em aberto e confirmada pela barbearia."
            >
              <Select id="paymentMethod" name="paymentMethod" defaultValue="PIX">
                <option value="PIX">Pix</option>
                <option value="CARD">Cartão</option>
                <option value="CASH">Dinheiro na loja</option>
                <option value="TRANSFER">Transferência</option>
              </Select>
            </Field>

            <p className="rounded-lg bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
              Sem fidelidade. Você pode cancelar a qualquer momento e continua usando o que já
              pagou até o fim do ciclo.
            </p>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Agora não
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
