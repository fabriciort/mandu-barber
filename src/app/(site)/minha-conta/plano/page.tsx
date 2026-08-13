import Link from "next/link";
import { CalendarClock, CreditCard, Receipt, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/misc";
import { SubscriptionControls } from "./subscription-controls";
import { requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { getActiveSubscription } from "@/server/services/subscriptions";
import { formatMoney } from "@/lib/format";
import { formatDate } from "@/lib/time";
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/lib/enums";

export const metadata = { title: "Meu plano" };
export const dynamic = "force-dynamic";

export default async function MyPlanPage() {
  const user = await requireUser("/minha-conta/plano");
  const shop = await getShopConfig();
  const subscription = await getActiveSubscription(user.id);

  const [invoices, usage, savedCents] = await Promise.all([
    prisma.invoice.findMany({
      where: { clientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    subscription
      ? prisma.subscriptionUsage.findMany({
          where: { subscriptionId: subscription.id },
          include: {
            service: { select: { name: true } },
            appointment: { select: { id: true, startsAt: true, code: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : Promise.resolve([]),
    prisma.appointment.aggregate({
      where: { clientId: user.id, subscriptionId: { not: null } },
      _sum: { discountCents: true },
    }),
  ]);

  if (!subscription) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Sparkles}
          title="Você ainda não tem plano ativo"
          description="Assinando, você trava o preço do corte, ganha desconto no resto do cardápio e entra na fila de prioridade da agenda."
          action={
            <Button asChild>
              <Link href="/planos">Conhecer os planos</Link>
            </Button>
          }
        />

        {invoices.length > 0 ? (
          <section>
            <SectionTitle>Faturas anteriores</SectionTitle>
            <InvoiceList invoices={invoices} timezone={shop.timezone} />
          </section>
        ) : null}
      </div>
    );
  }

  const totalSaved = savedCents._sum.discountCents ?? 0;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)]">
              <Sparkles className="size-6 text-[var(--accent)]" />
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                {subscription.planName}
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {formatMoney(subscription.priceCents)} por mês ·{" "}
                {subscription.cancelAtPeriodEnd
                  ? `Encerra em ${formatDate(subscription.currentPeriodEnd, shop.timezone)}`
                  : `Renova em ${formatDate(subscription.currentPeriodEnd, shop.timezone)}`}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {subscription.status === "PAST_DUE" ? (
              <Badge tone="danger">Pagamento pendente</Badge>
            ) : subscription.cancelAtPeriodEnd ? (
              <Badge tone="warning">Encerra no fim do ciclo</Badge>
            ) : (
              <Badge tone="success">Ativa</Badge>
            )}
            <SubscriptionControls
              subscriptionId={subscription.id}
              cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
              periodEnd={formatDate(subscription.currentPeriodEnd, shop.timezone)}
            />
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Saldo deste ciclo
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Ciclo de {formatDate(subscription.currentPeriodStart, shop.timezone)} a{" "}
            {formatDate(subscription.currentPeriodEnd, shop.timezone)}
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {subscription.credits.map((credit) => {
              const unlimited = credit.total < 0;
              const left = unlimited ? 0 : Math.max(0, credit.total - credit.used);
              const percent = unlimited ? 100 : credit.total ? (left / credit.total) * 100 : 0;

              return (
                <div
                  key={credit.serviceId}
                  className="rounded-xl border border-[var(--border-subtle)] p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{credit.serviceName}</p>
                    <p className="font-semibold text-[var(--accent)]">
                      {unlimited ? "Ilimitado" : `${left}/${credit.total}`}
                    </p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {unlimited
                      ? `${credit.used} usados neste ciclo`
                      : left === 0
                        ? "Franquia esgotada — os próximos entram com desconto do plano."
                        : `${left} disponível(is) até o fim do ciclo`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 rounded-xl bg-[var(--surface-muted)] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="size-5 text-moss-500" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Economia acumulada</p>
                <p className="font-semibold">{formatMoney(totalSaved)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <CreditCard className="size-5 text-[var(--text-muted)]" />
              <div>
                <p className="text-xs text-[var(--text-muted)]">Desconto extra do plano</p>
                <p className="font-semibold">{subscription.extraDiscountPercent}%</p>
              </div>
            </div>
            {subscription.priorityBooking ? (
              <div className="flex items-center gap-2.5">
                <CalendarClock className="size-5 text-[var(--accent)]" />
                <div>
                  <p className="text-xs text-[var(--text-muted)]">Agenda</p>
                  <p className="font-semibold">Prioridade em horários de pico</p>
                </div>
              </div>
            ) : null}
          </div>

          <Button asChild className="mt-5">
            <Link href="/agendar">Usar meu crédito agora</Link>
          </Button>
        </div>
      </Card>

      {usage.length > 0 ? (
        <section>
          <SectionTitle>Movimentação do plano</SectionTitle>
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            {usage.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 bg-[var(--surface-raised)] px-4 py-3 text-sm"
              >
                <Badge tone={entry.delta > 0 ? "neutral" : "success"} size="sm">
                  {entry.delta > 0 ? `-${entry.delta}` : `+${Math.abs(entry.delta)}`}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{entry.service.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {entry.reason}
                    {entry.appointment
                      ? ` · ${formatDate(entry.appointment.startsAt, shop.timezone)}`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(entry.createdAt, shop.timezone)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionTitle>Faturas</SectionTitle>
        <InvoiceList invoices={invoices} timezone={shop.timezone} />
      </section>
    </div>
  );
}

function InvoiceList({
  invoices,
  timezone,
}: {
  invoices: {
    id: string;
    description: string;
    amountCents: number;
    status: string;
    dueDate: Date;
    paidAt: Date | null;
  }[];
  timezone: string;
}) {
  if (invoices.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">Nenhuma fatura por aqui ainda.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
      {invoices.map((invoice) => (
        <li
          key={invoice.id}
          className="flex flex-wrap items-center gap-3 bg-[var(--surface-raised)] px-4 py-3"
        >
          <Receipt className="size-4 shrink-0 text-[var(--text-muted)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{invoice.description}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {invoice.paidAt
                ? `Paga em ${formatDate(invoice.paidAt, timezone)}`
                : `Vence em ${formatDate(invoice.dueDate, timezone)}`}
            </p>
          </div>
          <Badge
            tone={
              invoice.status === "PAID"
                ? "success"
                : invoice.status === "OVERDUE"
                  ? "danger"
                  : invoice.status === "VOID"
                    ? "neutral"
                    : "warning"
            }
            size="sm"
          >
            {INVOICE_STATUS_LABEL[invoice.status as InvoiceStatus]}
          </Badge>
          <span className="text-sm font-semibold">{formatMoney(invoice.amountCents)}</span>
        </li>
      ))}
    </ul>
  );
}
