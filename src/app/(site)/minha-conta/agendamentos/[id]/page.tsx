import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, MessageSquare, Receipt, Star, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { DataItem } from "@/components/ui/misc";
import { CancelAppointmentButton, ReviewButton } from "@/components/appointment-actions";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { formatMoney } from "@/lib/format";
import { formatDateTime, formatDuration, formatLongDate, formatTime } from "@/lib/time";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
  type AppointmentStatus,
  type PaymentStatus,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const shop = await getShopConfig();

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      services: true,
      review: true,
      subscription: { include: { plan: { select: { name: true } } } },
      barber: { include: { user: { select: { name: true, avatarUrl: true } } } },
    },
  });

  // Um cliente so ve o proprio agendamento; equipe usa o painel.
  if (!appointment || (appointment.clientId !== user.id && user.role === "CLIENT")) notFound();

  const status = appointment.status as AppointmentStatus;
  const duration = appointment.services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const isUpcoming = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(status);

  return (
    <div className="space-y-6">
      <Link
        href="/minha-conta/agendamentos"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" />
        Voltar para meus agendamentos
      </Link>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone={APPOINTMENT_STATUS_TONE[status]}>
                  {APPOINTMENT_STATUS_LABEL[status]}
                </Badge>
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  {appointment.code}
                </span>
              </div>
              <h1 className="mt-2 font-display text-2xl">
                {appointment.services.map((s) => s.name).join(" + ")}
              </h1>
              <p className="mt-1 text-sm first-letter:uppercase text-[var(--text-muted)]">
                {formatLongDate(appointment.startsAt, shop.timezone)} às{" "}
                {formatTime(appointment.startsAt, shop.timezone)}
              </p>
            </div>

            {isUpcoming ? (
              <div className="flex gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/agendar?servico=${appointment.services[0]?.serviceId ?? ""}`}>
                    Agendar de novo
                  </Link>
                </Button>
                <CancelAppointmentButton
                  appointmentId={appointment.id}
                  when={formatDateTime(appointment.startsAt, shop.timezone)}
                  variant="outline"
                />
              </div>
            ) : status === "COMPLETED" && !appointment.review ? (
              <ReviewButton
                appointmentId={appointment.id}
                barberName={appointment.barber.user.name}
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <DataItem label="Profissional">
            <span className="flex items-center gap-2">
              <Avatar
                name={appointment.barber.user.name}
                src={appointment.barber.user.avatarUrl}
                size="xs"
              />
              {appointment.barber.user.name}
            </span>
          </DataItem>
          <DataItem label="Duração">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-[var(--text-muted)]" />
              {formatDuration(duration)}
            </span>
          </DataItem>
          <DataItem label="Término previsto">
            {formatTime(appointment.endsAt, shop.timezone)}
          </DataItem>
          <DataItem label="Pagamento">
            {PAYMENT_STATUS_LABEL[appointment.paymentStatus as PaymentStatus]}
          </DataItem>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <Receipt className="size-4" />
            Valores
          </h2>

          <ul className="mt-4 space-y-3">
            {appointment.services.map((service) => (
              <li key={service.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  {service.name}
                  <span className="ml-2 text-xs text-[var(--text-muted)]">
                    {formatDuration(service.durationMinutes)}
                  </span>
                </span>
                {service.coveredByPlan ? (
                  <Badge tone="solid" size="sm">
                    Coberto pelo plano
                  </Badge>
                ) : (
                  <span className="font-medium">{formatMoney(service.priceCents)}</span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-4 text-sm">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Subtotal</span>
              <span>{formatMoney(appointment.subtotalCents)}</span>
            </div>
            {appointment.discountCents > 0 ? (
              <div className="flex justify-between text-[var(--text-primary)]">
                <span>
                  {appointment.subscription
                    ? `Plano ${appointment.subscription.plan.name}`
                    : "Desconto"}
                </span>
                <span>-{formatMoney(appointment.discountCents)}</span>
              </div>
            ) : null}
            <div className="flex justify-between pt-1.5 text-base font-semibold">
              <span>Total</span>
              <span>
                {appointment.totalCents === 0
                  ? "Coberto pelo plano"
                  : formatMoney(appointment.totalCents)}
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              <MapPin className="size-4" />
              Onde
            </h2>
            <p className="mt-3 text-sm">{formatAddress(shop) || shop.name}</p>
            {shop.mapsUrl ? (
              <Button asChild variant="secondary" size="sm" className="mt-4">
                <a href={shop.mapsUrl} target="_blank" rel="noreferrer">
                  Abrir no mapa
                </a>
              </Button>
            ) : null}
          </Card>

          {appointment.clientNotes ? (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <MessageSquare className="size-4" />
                Sua observação
              </h2>
              <p className="mt-3 text-sm text-[var(--text-secondary)]">{appointment.clientNotes}</p>
            </Card>
          ) : null}

          {appointment.review ? (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <Star className="size-4" />
                Sua avaliação
              </h2>
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={
                      index < appointment.review!.rating
                        ? "size-4 fill-[var(--text-primary)] text-[var(--text-primary)]"
                        : "size-4 text-[var(--border-strong)]"
                    }
                  />
                ))}
              </div>
              {appointment.review.comment ? (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  {appointment.review.comment}
                </p>
              ) : null}
              {appointment.review.reply ? (
                <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                    <User className="size-3" />
                    Resposta da barbearia
                  </p>
                  <p className="mt-1 text-sm">{appointment.review.reply}</p>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
