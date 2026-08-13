import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { CancelAppointmentButton, ReviewButton } from "@/components/appointment-actions";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { formatMoney } from "@/lib/format";
import { formatDateTime, formatDuration, formatLongDate, formatTime } from "@/lib/time";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  type AppointmentStatus,
} from "@/lib/enums";

export const metadata = { title: "Meus agendamentos" };
export const dynamic = "force-dynamic";

export default async function MyAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser("/minha-conta/agendamentos");
  const shop = await getShopConfig();

  const filter = params.filtro === "historico" ? "historico" : "proximos";
  const now = new Date();

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: user.id,
      ...(filter === "proximos"
        ? { status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] }, endsAt: { gte: now } }
        : {
            OR: [
              { status: { in: ["COMPLETED", "CANCELED", "NO_SHOW"] } },
              { endsAt: { lt: now } },
            ],
          }),
    },
    include: {
      services: true,
      review: { select: { id: true, rating: true } },
      barber: { include: { user: { select: { name: true, avatarUrl: true } } } },
    },
    orderBy: { startsAt: filter === "proximos" ? "asc" : "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1">
          <FilterLink active={filter === "proximos"} href="/minha-conta/agendamentos">
            Proximos
          </FilterLink>
          <FilterLink
            active={filter === "historico"}
            href="/minha-conta/agendamentos?filtro=historico"
          >
            Historico
          </FilterLink>
        </div>

        <Button asChild size="sm">
          <Link href="/agendar">
            <CalendarPlus className="size-4" />
            Novo agendamento
          </Link>
        </Button>
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={filter === "proximos" ? "Nenhum horario marcado" : "Nada no historico ainda"}
          description={
            filter === "proximos"
              ? "Quando voce agendar, seus proximos horarios aparecem aqui."
              : "Seus atendimentos concluidos vao ficar guardados nesta aba."
          }
          action={
            filter === "proximos" ? (
              <Button asChild>
                <Link href="/agendar">Agendar horario</Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const duration = appointment.services.reduce((sum, s) => sum + s.durationMinutes, 0);
            const status = appointment.status as AppointmentStatus;
            const isUpcoming = ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(status);

            return (
              <Card key={appointment.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-[var(--surface-muted)] py-2.5 text-center">
                    <span className="text-xs uppercase text-[var(--text-muted)]">
                      {appointment.startsAt.toLocaleDateString("pt-BR", {
                        month: "short",
                        timeZone: shop.timezone,
                      })}
                    </span>
                    <span className="text-xl font-semibold leading-tight">
                      {appointment.startsAt.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        timeZone: shop.timezone,
                      })}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatTime(appointment.startsAt, shop.timezone)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={APPOINTMENT_STATUS_TONE[status] as never} size="sm">
                        {APPOINTMENT_STATUS_LABEL[status]}
                      </Badge>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {appointment.code}
                      </span>
                      {appointment.review ? (
                        <Badge tone="accent" size="sm">
                          Avaliado {appointment.review.rating}/5
                        </Badge>
                      ) : null}
                    </div>

                    <h3 className="mt-1.5 font-medium">
                      {appointment.services.map((s) => s.name).join(" + ")}
                    </h3>

                    <p className="mt-1 text-sm capitalize text-[var(--text-muted)]">
                      {formatLongDate(appointment.startsAt, shop.timezone)} ·{" "}
                      {formatDuration(duration)}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                        <Avatar
                          name={appointment.barber.user.name}
                          src={appointment.barber.user.avatarUrl}
                          size="xs"
                        />
                        {appointment.barber.user.name}
                      </span>
                      <span className="font-medium">
                        {appointment.totalCents === 0
                          ? "Coberto pelo plano"
                          : formatMoney(appointment.totalCents)}
                      </span>
                    </div>

                    {appointment.cancelReason ? (
                      <p className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-muted)]">
                        Motivo do cancelamento: {appointment.cancelReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/minha-conta/agendamentos/${appointment.id}`}>
                        Detalhes
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                    {isUpcoming ? (
                      <CancelAppointmentButton
                        appointmentId={appointment.id}
                        when={formatDateTime(appointment.startsAt, shop.timezone)}
                      />
                    ) : null}
                    {status === "COMPLETED" && !appointment.review ? (
                      <ReviewButton
                        appointmentId={appointment.id}
                        barberName={appointment.barber.user.name}
                      />
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-[var(--surface-raised)] px-3.5 py-1.5 text-sm font-medium shadow-[var(--shadow-soft)]"
          : "rounded-md px-3.5 py-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      }
    >
      {children}
    </Link>
  );
}
