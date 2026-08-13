import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock,
  MapPin,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/misc";
import { CancelAppointmentButton, ReviewButton } from "@/components/appointment-actions";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { getActiveSubscription } from "@/server/services/subscriptions";
import { formatMoney, pluralize } from "@/lib/format";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatLongDate,
  formatRelative,
  formatTime,
} from "@/lib/time";
import { APPOINTMENT_STATUS_LABEL, type AppointmentStatus } from "@/lib/enums";

export const metadata = { title: "Minha conta" };
export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const user = await requireUser("/minha-conta");
  const shop = await getShopConfig();
  const now = new Date();

  const [upcoming, pendingReviews, history, subscription, totals] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clientId: user.id,
        status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
        endsAt: { gte: now },
      },
      include: {
        services: true,
        barber: { include: { user: { select: { name: true, avatarUrl: true } } } },
      },
      orderBy: { startsAt: "asc" },
      take: 3,
    }),
    prisma.appointment.findMany({
      where: { clientId: user.id, status: "COMPLETED", review: null },
      include: { barber: { include: { user: { select: { name: true } } } }, services: true },
      orderBy: { startsAt: "desc" },
      take: 2,
    }),
    prisma.appointment.findMany({
      where: { clientId: user.id, status: { in: ["COMPLETED", "NO_SHOW", "CANCELED"] } },
      include: {
        services: true,
        barber: { include: { user: { select: { name: true, avatarUrl: true } } } },
      },
      orderBy: { startsAt: "desc" },
      take: 4,
    }),
    getActiveSubscription(user.id),
    prisma.appointment.aggregate({
      where: { clientId: user.id, status: "COMPLETED" },
      _count: true,
      _sum: { totalCents: true },
    }),
  ]);

  const next = upcoming[0];

  return (
    <div className="space-y-10">
      {/* ------------------------------------------------- proximo horario */}
      <section>
        <SectionTitle
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/agendar">
                <CalendarPlus className="size-4" />
                Novo agendamento
              </Link>
            </Button>
          }
        >
          Proximo horario
        </SectionTitle>

        {next ? (
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-[var(--accent-soft)] px-6 py-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                  {formatRelative(next.startsAt, now)}
                </span>
                <span className="mt-1 font-[family-name:var(--font-display)] text-3xl font-semibold">
                  {formatTime(next.startsAt, shop.timezone)}
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(next.startsAt, shop.timezone)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={next.status === "CONFIRMED" ? "success" : "info"}>
                    {APPOINTMENT_STATUS_LABEL[next.status as AppointmentStatus]}
                  </Badge>
                  <span className="font-mono text-xs text-[var(--text-muted)]">{next.code}</span>
                </div>

                <h3 className="mt-2 text-lg font-semibold">
                  {next.services.map((s) => s.name).join(" + ")}
                </h3>

                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--text-secondary)]">
                  <span className="flex items-center gap-2">
                    <Avatar name={next.barber.user.name} src={next.barber.user.avatarUrl} size="xs" />
                    {next.barber.user.name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-4 text-[var(--text-muted)]" />
                    {formatDuration(
                      next.services.reduce((sum, s) => sum + s.durationMinutes, 0),
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Wallet className="size-4 text-[var(--text-muted)]" />
                    {next.totalCents === 0 ? "Coberto pelo plano" : formatMoney(next.totalCents)}
                  </span>
                </div>

                {shop.addressLine ? (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
                    <MapPin className="size-4" />
                    {formatAddress(shop)}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/minha-conta/agendamentos/${next.id}`}>Ver detalhes</Link>
                </Button>
                <CancelAppointmentButton
                  appointmentId={next.id}
                  when={formatDateTime(next.startsAt, shop.timezone)}
                />
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Voce nao tem horario marcado"
            description="Escolha um servico e reserve sua cadeira em menos de um minuto."
            action={
              <Button asChild>
                <Link href="/agendar">
                  Agendar agora
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
        )}

        {upcoming.length > 1 ? (
          <ul className="mt-3 space-y-2">
            {upcoming.slice(1).map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/minha-conta/agendamentos/${appointment.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-sm transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="font-medium">
                    {formatDate(appointment.startsAt, shop.timezone)} ·{" "}
                    {formatTime(appointment.startsAt, shop.timezone)}
                  </span>
                  <span className="truncate text-[var(--text-muted)]">
                    {appointment.services.map((s) => s.name).join(" + ")}
                  </span>
                  <ArrowRight className="ml-auto size-4 shrink-0 text-[var(--text-muted)]" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* ------------------------------------------------ avaliacoes abertas */}
      {pendingReviews.length > 0 ? (
        <section>
          <SectionTitle>Como foi seu ultimo corte?</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingReviews.map((appointment) => (
              <Card key={appointment.id} className="flex items-center gap-4 p-4">
                <Star className="size-5 shrink-0 text-brass-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {appointment.services.map((s) => s.name).join(" + ")}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {formatDate(appointment.startsAt, shop.timezone)} ·{" "}
                    {appointment.barber.user.name}
                  </p>
                </div>
                <ReviewButton
                  appointmentId={appointment.id}
                  barberName={appointment.barber.user.name}
                />
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- plano */}
      <section>
        <SectionTitle
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/minha-conta/plano">
                Gerenciar
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        >
          Assinatura
        </SectionTitle>

        {subscription ? (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                  <Sparkles className="size-5 text-[var(--accent)]" />
                </span>
                <div>
                  <p className="font-semibold">{subscription.planName}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Renova em {formatDate(subscription.currentPeriodEnd, shop.timezone)}
                  </p>
                </div>
              </div>
              {subscription.cancelAtPeriodEnd ? (
                <Badge tone="warning">Encerra no fim do ciclo</Badge>
              ) : (
                <Badge tone="success">Ativa</Badge>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {subscription.credits.map((credit) => {
                const unlimited = credit.total < 0;
                const left = unlimited ? Infinity : Math.max(0, credit.total - credit.used);
                const percent = unlimited
                  ? 100
                  : credit.total === 0
                    ? 0
                    : (left / credit.total) * 100;

                return (
                  <div
                    key={credit.serviceId}
                    className="rounded-xl border border-[var(--border-subtle)] p-4"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{credit.serviceName}</p>
                      <p className="text-sm font-semibold text-[var(--accent)]">
                        {unlimited ? "Ilimitado" : `${left} de ${credit.total}`}
                      </p>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Voce ainda nao assina nenhum plano"
            description="Quem corta todo mes economiza assinando. Franquia de cortes, desconto no resto e prioridade na agenda."
            action={
              <Button asChild variant="secondary">
                <Link href="/planos">Ver planos</Link>
              </Button>
            }
          />
        )}
      </section>

      {/* ------------------------------------------------------- historico */}
      <section>
        <SectionTitle
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/minha-conta/agendamentos">
                Ver tudo
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        >
          Historico recente
        </SectionTitle>

        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Seu historico aparece aqui depois do primeiro atendimento.
          </p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-6 rounded-xl bg-[var(--surface-muted)] px-5 py-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Atendimentos</p>
                <p className="text-lg font-semibold">{totals._count}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Investido na cadeira</p>
                <p className="text-lg font-semibold">
                  {formatMoney(totals._sum.totalCents ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Cliente desde</p>
                <p className="text-lg font-semibold">
                  {history.length > 0
                    ? formatDate(history[history.length - 1].startsAt, shop.timezone)
                    : "—"}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              {history.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-3 bg-[var(--surface-raised)] px-4 py-3"
                >
                  <Avatar
                    name={appointment.barber.user.name}
                    src={appointment.barber.user.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {appointment.services.map((s) => s.name).join(" + ")}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatLongDate(appointment.startsAt, shop.timezone)} ·{" "}
                      {appointment.barber.user.name}
                    </p>
                  </div>
                  <Badge
                    tone={
                      appointment.status === "COMPLETED"
                        ? "neutral"
                        : appointment.status === "CANCELED"
                          ? "danger"
                          : "warning"
                    }
                    size="sm"
                  >
                    {APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]}
                  </Badge>
                  <span className="text-sm font-medium">
                    {appointment.totalCents === 0
                      ? "Plano"
                      : formatMoney(appointment.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {pluralize(totals._count, "atendimento concluido", "atendimentos concluidos")} no
              total.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
