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
import { useToast } from "@/components/ui/toast";
import {
  cancelSubscriptionAction,
  resumeSubscriptionAction,
} from "@/server/actions/subscriptions";
import type { ActionState } from "@/server/actions/result";

export function SubscriptionControls({
  subscriptionId,
  cancelAtPeriodEnd,
  periodEnd,
}: {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
  periodEnd: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);

  const [cancelState, cancelAction, cancelling] = useActionState<ActionState, FormData>(
    cancelSubscriptionAction,
    { ok: false },
  );
  const [resumeState, resumeAction, resuming] = useActionState<ActionState, FormData>(
    resumeSubscriptionAction,
    { ok: false },
  );

  React.useEffect(() => {
    if (cancelState.ok) {
      toast.success("Assinatura atualizada", cancelState.message);
      setOpen(false);
      router.refresh();
    } else if (cancelState.message) {
      toast.error("Não foi possível cancelar", cancelState.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelState]);

  React.useEffect(() => {
    if (resumeState.ok) {
      toast.success("Assinatura reativada", "Seus créditos continuam valendo.");
      router.refresh();
    } else if (resumeState.message) {
      toast.error("Não foi possível reativar", resumeState.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeState]);

  if (cancelAtPeriodEnd) {
    return (
      <form action={resumeAction}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <Button type="submit" size="sm" variant="secondary" loading={resuming}>
          Manter minha assinatura
        </Button>
      </form>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Cancelar assinatura
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Cancelar assinatura</DialogTitle>
          <DialogDescription>
            Você continua com todos os beneficios até {periodEnd}. Depois disso, a cobranca para e
            os créditos não renovam.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <p className="text-sm text-[var(--text-secondary)]">
            Se mudar de ideia antes do fim do ciclo, da para reativar em um clique — nada se perde.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Continuar assinante
          </Button>
          <form action={cancelAction}>
            <input type="hidden" name="subscriptionId" value={subscriptionId} />
            <Button type="submit" variant="danger" loading={cancelling}>
              Cancelar no fim do ciclo
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
