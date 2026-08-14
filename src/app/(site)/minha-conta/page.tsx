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
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  type AppointmentStatus,
} from "@/lib/enums";
import { cn } from "@/lib/cn";

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
          Próximo horário
        </SectionTitle>

        {next ? (
          /* O proximo horario e a informacao numero um de quem entra aqui:
             ganha o bloco invertido, o maior peso tipografico da pagina. */
          <div className="grain relative overflow-hidden rounded-[var(--radius-2xl)] bg-[var(--surface-inverse)] text-[var(--text-inverse)]">
            <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-10">
              <div className="shrink-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-current/30 px-2.5 py-1 text-2xs font-semibold uppercase tracking-[0.14em]">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                  </span>
                  {formatRelative(next.startsAt, now)}
                </span>
                <p className="tnum mt-4 font-display text-[4rem] leading-[0.85] sm:text-[5rem]">
                  {formatTime(next.startsAt, shop.timezone)}
                </p>
                {/* first-letter e nao capitalize: em portugues so a primeira
                    letra sobe — "Domingo, 16 de agosto", nunca "16 De Agosto". */}
                <p className="mt-3 text-sm opacity-65 first-letter:uppercase">
                  {formatLongDate(next.startsAt, shop.timezone)}
                </p>
              </div>

              {/* Fio separador: vertical no desktop, horizontal no celular. */}
              <span
                className="h-px w-full bg-current opacity-15 lg:h-24 lg:w-px"
                aria-hidden
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-2xs uppercase tracking-[0.14em] opacity-65">
                  <span>{APPOINTMENT_STATUS_LABEL[next.status as AppointmentStatus]}</span>
                  <span aria-hidden>·</span>
                  <span className="font-mono normal-case tracking-normal">{next.code}</span>
                </div>

                <h3 className="mt-2 text-pretty text-xl font-semibold leading-snug">
                  {next.services.map((s) => s.name).join(" + ")}
                </h3>

                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <Avatar
                      name={next.barber.user.name}
                      src={next.barber.user.avatarUrl}
                      size="xs"
                    />
                    {next.barber.user.name}
                  </span>
                  <span className="flex items-center gap-1.5 opacity-75">
                    <Clock className="size-4" aria-hidden />
                    {formatDuration(next.services.reduce((sum, s) => sum + s.durationMinutes, 0))}
                  </span>
                  <span className="flex items-center gap-1.5 opacity-75">
                    <Wallet className="size-4" aria-hidden />
                    {next.totalCents === 0 ? "Coberto pelo plano" : formatMoney(next.totalCents)}
                  </span>
                </div>

                {shop.addressLine ? (
                  <p className="mt-2.5 flex items-center gap-1.5 text-sm opacity-60">
                    <MapPin className="size-4" aria-hidden />
                    {formatAddress(shop)}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 gap-2 lg:flex-col">
                <Button asChild variant="inverse" className="flex-1 lg:flex-none">
                  <Link href={`/minha-conta/agendamentos/${next.id}`}>Ver detalhes</Link>
                </Button>
                <CancelAppointmentButton
                  appointmentId={next.id}
                  when={formatDateTime(next.startsAt, shop.timezone)}
                  variant="inverse-outline"
                  size="md"
                  className="flex-1 lg:flex-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="Você não tem horário marcado"
            description="Escolha um serviço e reserve sua cadeira em menos de um minuto."
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
          <SectionTitle>Como foi seu último corte?</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {pendingReviews.map((appointment) => (
              <Card key={appointment.id} className="flex items-center gap-3.5 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-[var(--border-strong)]">
                  <Star className="size-[18px]" aria-hidden />
                </span>
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
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-inverse)] text-[var(--text-inverse)]">
                  <Sparkles className="size-[18px]" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{subscription.planName}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Renova em {formatDate(subscription.currentPeriodEnd, shop.timezone)}
                  </p>
                </div>
              </div>
              {subscription.cancelAtPeriodEnd ? (
                <Badge tone="dashed">Encerra no fim do ciclo</Badge>
              ) : (
                <Badge tone="solid">Ativa</Badge>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {subscription.credits.map((credit) => {
                const unlimited = credit.total < 0;
                const left = unlimited ? Infinity : Math.max(0, credit.total - credit.used);
                const total = Math.max(0, credit.total);

                return (
                  <div
                    key={credit.serviceId}
                    className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-4"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{credit.serviceName}</p>
                      <p className="tnum text-sm font-semibold">
                        {unlimited ? "Ilimitado" : `${left} de ${total}`}
                      </p>
                    </div>

                    {/* Creditos sao contaveis: mostrar cada um como um traco diz
                        mais que uma barra de porcentagem — da para bater o olho e
                        contar quantos cortes ainda cabem no mes. */}
                    {unlimited ? (
                      <div className="mt-3 h-1.5 rounded-full bg-[var(--accent)] opacity-90" />
                    ) : (
                      <div className="mt-3 flex gap-1" aria-hidden>
                        {Array.from({ length: Math.min(total, 12) }).map((_, index) => (
                          <span
                            key={index}
                            className={cn(
                              "h-1.5 flex-1 rounded-full transition-colors",
                              index < left
                                ? "bg-[var(--accent)]"
                                : "bg-[var(--surface-sunken)] ring-1 ring-inset ring-[var(--border-subtle)]",
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="Você ainda não assina nenhum plano"
            description="Quem corta todo mês economiza assinando. Franquia de cortes, desconto no resto e prioridade na agenda."
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
          Histórico recente
        </SectionTitle>

        {history.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Seu histórico aparece aqui depois do primeiro atendimento.
          </p>
        ) : (
          <>
            <dl className="mb-5 grid grid-cols-3 divide-x divide-[var(--border-subtle)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
              {[
                { label: "Atendimentos", value: String(totals._count) },
                { label: "Investido", value: formatMoney(totals._sum.totalCents ?? 0) },
                {
                  label: "Cliente desde",
                  value:
                    history.length > 0
                      ? formatDate(history[history.length - 1].startsAt, shop.timezone)
                      : "—",
                },
              ].map((item) => (
                <div key={item.label} className="px-3 py-3.5 sm:px-5">
                  <dt className="text-2xs uppercase tracking-[0.1em] text-[var(--text-muted)] sm:tracking-[0.14em]">
                    {item.label}
                  </dt>
                  <dd className="tnum mt-1 text-[0.9375rem] font-semibold tracking-[var(--tracking-tight)] sm:text-lg">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
              {history.map((appointment) => (
                <li
                  key={appointment.id}
                  className={cn(
                    "flex flex-wrap items-center gap-3 bg-[var(--surface-raised)] px-4 py-3.5",
                    // Cancelado/faltou fica visualmente recuado: continua legivel,
                    // mas nao disputa atencao com o que de fato aconteceu.
                    appointment.status !== "COMPLETED" && "opacity-60",
                  )}
                >
                  <Avatar
                    name={appointment.barber.user.name}
                    src={appointment.barber.user.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        appointment.status === "CANCELED" && "line-through",
                      )}
                    >
                      {appointment.services.map((s) => s.name).join(" + ")}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {formatLongDate(appointment.startsAt, shop.timezone)} ·{" "}
                      {appointment.barber.user.name}
                    </p>
                  </div>
                  <Badge tone={APPOINTMENT_STATUS_TONE[appointment.status as AppointmentStatus]} size="sm">
                    {APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]}
                  </Badge>
                  <span className="tnum text-sm font-medium">
                    {appointment.totalCents === 0 ? "Plano" : formatMoney(appointment.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              {pluralize(totals._count, "atendimento concluído", "atendimentos concluídos")} no
              total.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
