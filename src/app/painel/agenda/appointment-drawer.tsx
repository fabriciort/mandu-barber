"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { CheckCircle2, Phone, Play, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import { CancelAppointmentButton } from "@/components/appointment-actions";
import { useToast } from "@/components/ui/toast";
import { setStatusAction } from "@/server/actions/booking";
import type { ActionState } from "@/server/actions/result";
import { formatMoney, formatPhone } from "@/lib/format";
import { formatMinutesLabel } from "@/lib/time";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  type AppointmentStatus,
  type PaymentStatus,
} from "@/lib/enums";
import type { AgendaAppointment } from "./agenda-board";

/**
 * Ficha do atendimento com as acoes de balcao. As transicoes disponiveis
 * mudam conforme o status para nao oferecer botao que nao faz sentido
 * (concluir um atendimento cancelado, por exemplo).
 */
export function AppointmentDrawer({
  appointment,
  open,
  onClose,
  barberName,
}: {
  appointment: AgendaAppointment | null;
  open: boolean;
  onClose: () => void;
  barberName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(setStatusAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Atendimento atualizado");
      onClose();
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel atualizar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!appointment) return null;

  const status = appointment.status as AppointmentStatus;
  const isActive = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(status);
  const needsPayment = appointment.totalCents > 0 && appointment.paymentStatus !== "PAID";

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge tone={APPOINTMENT_STATUS_TONE[status] as never} size="sm">
              {APPOINTMENT_STATUS_LABEL[status]}
            </Badge>
            <span className="font-mono text-xs text-[var(--text-muted)]">{appointment.code}</span>
          </div>
          <DialogTitle>{appointment.clientName}</DialogTitle>
          <DialogDescription>
            {formatMinutesLabel(appointment.startMinute)} –{" "}
            {formatMinutesLabel(appointment.endMinute)} · {barberName}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Servicos
            </p>
            <p className="mt-1.5">{appointment.services.join(" + ")}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {appointment.coveredByPlan
                ? "Coberto pelo plano do cliente"
                : formatMoney(appointment.totalCents)}{" "}
              · Pagamento: {PAYMENT_STATUS_LABEL[appointment.paymentStatus as PaymentStatus]}
            </p>
          </div>

          {appointment.clientPhone ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild size="sm" variant="secondary">
                <a href={`tel:${appointment.clientPhone}`}>
                  <Phone className="size-4" />
                  {formatPhone(appointment.clientPhone)}
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <a
                  href={`https://wa.me/55${appointment.clientPhone}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/painel/clientes/${appointment.clientId}`}>Ficha do cliente</Link>
              </Button>
            </div>
          ) : null}

          {appointment.clientNotes ? (
            <div className="rounded-lg bg-[var(--surface-muted)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Observacao do cliente
              </p>
              <p className="mt-1 text-sm">{appointment.clientNotes}</p>
            </div>
          ) : null}

          {appointment.internalNotes ? (
            <div className="rounded-lg border border-dashed border-[var(--border-strong)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Nota interna
              </p>
              <p className="mt-1 text-sm">{appointment.internalNotes}</p>
            </div>
          ) : null}

          {isActive ? (
            <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Operar atendimento
              </p>

              <div className="flex flex-wrap gap-2">
                {status !== "IN_PROGRESS" ? (
                  <form action={formAction}>
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="status" value="IN_PROGRESS" />
                    <Button type="submit" size="sm" variant="secondary" loading={pending}>
                      <Play className="size-4" />
                      Iniciar atendimento
                    </Button>
                  </form>
                ) : null}

                <form action={formAction}>
                  <input type="hidden" name="appointmentId" value={appointment.id} />
                  <input type="hidden" name="status" value="NO_SHOW" />
                  <Button type="submit" size="sm" variant="ghost" loading={pending}>
                    <UserX className="size-4" />
                    Nao compareceu
                  </Button>
                </form>

                <CancelAppointmentButton
                  appointmentId={appointment.id}
                  when={`${formatMinutesLabel(appointment.startMinute)}`}
                  staff
                />
              </div>

              <form action={formAction} className="rounded-lg border border-[var(--border-subtle)] p-3">
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="status" value="COMPLETED" />
                <input type="hidden" name="amountCents" value={appointment.totalCents} />

                <p className="text-sm font-medium">Fechar a conta</p>
                {needsPayment ? (
                  <Field
                    label="Forma de pagamento"
                    htmlFor="paymentMethod"
                    className="mt-3"
                    hint={`Valor a receber: ${formatMoney(appointment.totalCents)}`}
                  >
                    <Select id="paymentMethod" name="paymentMethod" defaultValue="PIX">
                      <option value="PIX">Pix</option>
                      <option value="CARD">Cartao</option>
                      <option value="CASH">Dinheiro</option>
                      <option value="TRANSFER">Transferencia</option>
                    </Select>
                  </Field>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {appointment.totalCents === 0
                      ? "Coberto pelo plano — nada a receber."
                      : "Pagamento ja registrado."}
                  </p>
                )}

                <Button type="submit" size="sm" className="mt-3" loading={pending}>
                  <CheckCircle2 className="size-4" />
                  Concluir atendimento
                </Button>
              </form>
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
