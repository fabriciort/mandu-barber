"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { CalendarX2, Star } from "lucide-react";

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
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cancelBookingAction, reviewAction } from "@/server/actions/booking";
import type { ActionState } from "@/server/actions/result";
import { cn } from "@/lib/cn";

export function CancelAppointmentButton({
  appointmentId,
  when,
  variant = "ghost",
  label = "Cancelar",
  staff = false,
}: {
  appointmentId: string;
  when: string;
  variant?: "ghost" | "secondary" | "danger" | "outline";
  label?: string;
  staff?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(cancelBookingAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Agendamento cancelado", state.message);
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Não deu para cancelar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <CalendarX2 className="size-4" />
          {label}
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Cancelar agendamento</DialogTitle>
          <DialogDescription>
            O horário de {when} será liberado para outra pessoa. Se você usou crédito do plano, ele
            volta para o seu saldo.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <DialogBody>
            <label htmlFor="motivo" className="text-sm font-medium text-[var(--text-secondary)]">
              Motivo {staff ? "" : "(opcional)"}
            </label>
            <Textarea
              id="motivo"
              name="reason"
              className="mt-2"
              maxLength={300}
              placeholder={staff ? "Ex.: cliente ligou pedindo remarcação." : "Conta pra gente o que aconteceu."}
            />
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Manter agendamento
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewButton({
  appointmentId,
  barberName,
}: {
  appointmentId: string;
  barberName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(reviewAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Avaliação enviada", "Obrigado por ajudar a equipe a melhorar.");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Não deu para avaliar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          <Star className="size-4" />
          Avaliar
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Como foi o atendimento?</DialogTitle>
          <DialogDescription>Sua nota fica visível para {barberName} e para a gestão.</DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="appointmentId" value={appointmentId} />
          <input type="hidden" name="rating" value={rating} />

          <DialogBody className="space-y-4">
            <div
              className="flex justify-center gap-1"
              role="radiogroup"
              aria-label="Nota do atendimento"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
                  onClick={() => setRating(value)}
                  className="rounded-lg p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "size-8 transition-colors",
                      value <= rating
                        ? "fill-brass-400 text-brass-400"
                        : "text-[var(--border-strong)]",
                    )}
                  />
                </button>
              ))}
            </div>

            <div>
              <label htmlFor="comentario" className="text-sm font-medium text-[var(--text-secondary)]">
                Comentário (opcional)
              </label>
              <Textarea
                id="comentario"
                name="comment"
                className="mt-2"
                maxLength={600}
                placeholder="O que funcionou bem? O que poderia melhorar?"
              />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Agora não
            </Button>
            <Button type="submit" loading={pending}>
              Enviar avaliação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
