import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  Percent,
  Repeat,
  Star,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { RevenueChart } from "@/components/revenue-chart";
import { requireStaff } from "@/server/auth/guards";
import { getDashboard } from "@/server/services/reports";
import { getShopConfig } from "@/server/services/settings";
import { formatMoney, formatPercent } from "@/lib/format";
import { formatTime, todayKey } from "@/lib/time";
import { APPOINTMENT_STATUS_LABEL, APPOINTMENT_STATUS_TONE, type AppointmentStatus } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function PanelHomePage() {
  const user = await requireStaff("/painel");
  const shop = await getShopConfig();

  // Profissional ve os proprios numeros; o gestor ve a casa inteira.
  const scoped = user.role === "BARBER" ? user.barberId : null;
  const data = await getDashboard({ barberId: scoped });
  const isOwner = user.role === "OWNER";

  const revenueDelta =
    data.month.previousRevenueCents > 0
      ? Math.round(
          ((data.month.revenueCents - data.month.previousRevenueCents) /
            data.month.previousRevenueCents) *
            100,
        )
      : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title={isOwner ? "Visão geral" : "Meu dia"}
        description={
          isOwner
            ? "Como a barbearia está hoje e no mês."
            : "Seus atendimentos, seu faturamento e sua ocupação."
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/painel/agenda?data=${todayKey(shop.timezone)}`}>
                <CalendarClock className="size-4" />
                Ver agenda
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/painel/agendamentos?novo=1">Novo agendamento</Link>
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------ hoje */}
      <section>
        <SectionTitle>Hoje</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Atendimentos"
            value={data.today.appointments}
            hint={`${data.today.completed} concluídos`}
            icon={CalendarCheck}
            tone="accent"
          />
          <StatCard
            label="Faturamento"
            value={formatMoney(data.today.revenueCents)}
            hint="atendimentos concluídos"
            icon={Wallet}
            tone="success"
          />
          <StatCard
            label="Ocupação da cadeira"
            value={formatPercent(data.today.occupancyPercent)}
            hint="do tempo disponível"
            icon={Percent}
          />
          <StatCard
            label="Ticket médio do mês"
            value={formatMoney(data.month.ticketCents)}
            hint={`${data.month.appointments} atendimentos`}
            icon={TrendingUp}
          />
        </div>
      </section>

      {/* ----------------------------------------------------- proximos hoje */}
      <section>
        <SectionTitle
          action={
            <Button asChild size="sm" variant="ghost">
              <Link href="/painel/agenda">
                Abrir agenda
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        >
          Próximos na fila
        </SectionTitle>

        {data.today.nextAppointments.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="Nada mais marcado para hoje"
            description="Aproveite para revisar o cardápio ou lancar um atendimento de balcão."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/painel/agendamentos?novo=1">Lancar atendimento</Link>
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            {data.today.nextAppointments.map((appointment) => (
              <li
                key={appointment.id}
                className="flex flex-wrap items-center gap-3 bg-[var(--surface-raised)] px-4 py-3"
              >
                <span className="w-14 shrink-0 font-semibold">
                  {formatTime(appointment.startsAt, shop.timezone)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{appointment.clientName}</p>
                  <p className="truncate text-sm text-[var(--text-muted)]">
                    {appointment.services}
                    {isOwner ? ` · ${appointment.barberName}` : ""}
                  </p>
                </div>
                <Badge
                  tone={APPOINTMENT_STATUS_TONE[appointment.status as AppointmentStatus] as never}
                  size="sm"
                >
                  {APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]}
                </Badge>
                <span className="w-20 text-right text-sm font-medium">
                  {appointment.totalCents === 0 ? "Plano" : formatMoney(appointment.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------------- mes e serie */}
      <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="font-semibold">Faturamento dos últimos 30 dias</h2>
              <p className="text-sm text-[var(--text-muted)]">
                {formatMoney(data.month.revenueCents)} no mês corrente
              </p>
            </div>
            {revenueDelta !== null ? (
              <Badge tone={revenueDelta >= 0 ? "success" : "danger"}>
                {revenueDelta >= 0 ? "+" : ""}
                {revenueDelta}% vs. mês anterior
              </Badge>
            ) : null}
          </div>

          <div className="mt-4">
            <RevenueChart data={data.series} />
          </div>
        </Card>

        <div className="space-y-4">
          {isOwner ? (
            <Card className="p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <Repeat className="size-4 text-[var(--accent)]" />
                Assinaturas
              </h2>

              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Receita recorrente</dt>
                  <dd className="text-lg font-semibold">
                    {formatMoney(data.subscriptions.mrrCents)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Assinantes ativos</dt>
                  <dd className="font-medium">{data.subscriptions.active}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-[var(--text-muted)]">Cancelam no fim do ciclo</dt>
                  <dd className="font-medium">{data.subscriptions.canceling}</dd>
                </div>
              </dl>

              {data.subscriptions.overdueInvoices > 0 ? (
                <Link
                  href="/painel/financeiro"
                  className="mt-4 flex items-center gap-2.5 rounded-lg border border-clay-400/30 bg-clay-400/10 px-3 py-2.5 text-sm transition-colors hover:border-clay-400/60"
                >
                  <AlertTriangle className="size-4 shrink-0 text-clay-500" />
                  <span className="flex-1">
                    {data.subscriptions.overdueInvoices} fatura(s) vencida(s) ·{" "}
                    {formatMoney(data.subscriptions.overdueCents)}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-clay-500" />
                </Link>
              ) : null}

              <Button asChild variant="secondary" size="sm" block className="mt-4">
                <Link href="/painel/assinaturas">Gerenciar assinaturas</Link>
              </Button>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-semibold">Saúde da operação</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-[var(--text-muted)]">
                  <UserPlus className="size-4" />
                  Clientes novos no mês
                </dt>
                <dd className="font-medium">{data.month.newClients}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Faltas (no-show)</dt>
                <dd
                  className={
                    data.month.noShowPercent > 10 ? "font-medium text-rust-500" : "font-medium"
                  }
                >
                  {formatPercent(data.month.noShowPercent)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--text-muted)]">Cancelamentos</dt>
                <dd className="font-medium">{formatPercent(data.month.cancelPercent)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------ equipe */}
      {isOwner ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold">Desempenho da equipe no mês</h2>
            <ul className="mt-4 space-y-3">
              {data.team.map((member) => (
                <li key={member.barberId} className="flex items-center gap-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatMoney(member.revenueCents)}
                      </p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${member.occupancyPercent}%`,
                            backgroundColor: member.color,
                          }}
                        />
                      </div>
                      <span className="w-24 shrink-0 text-right text-xs text-[var(--text-muted)]">
                        {member.appointments} atend. · {member.occupancyPercent}%
                      </span>
                    </div>
                  </div>
                  {member.rating ? (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-brass-600 dark:text-brass-300">
                      <Star className="size-3 fill-current" />
                      {member.rating.toFixed(1)}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              A barra mostra a ocupação do mês: quanto do tempo disponível virou cadeira ocupada.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">Serviços que mais faturam</h2>
            {data.topServices.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Sem atendimentos concluídos neste mês.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.topServices.map((service, index) => {
                  const max = data.topServices[0].revenueCents || 1;
                  return (
                    <li key={service.name}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">
                          <span className="mr-2 text-[var(--text-muted)]">{index + 1}.</span>
                          {service.name}
                        </span>
                        <span className="shrink-0 font-medium">
                          {formatMoney(service.revenueCents)}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${(service.revenueCents / max) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {service.count} execução(oes)
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
