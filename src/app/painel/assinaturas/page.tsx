import Link from "next/link";
import { AlertTriangle, BarChart3, Repeat, TrendingDown, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill, FilterRow } from "@/components/ui/filter-pill";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { AssignSubscriptionDialog, PayInvoiceButton } from "./subscription-admin";
import { requireOwner } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { monthlyRecurringRevenue } from "@/server/services/subscriptions";
import { formatMoney, formatPhone } from "@/lib/format";
import { formatDate } from "@/lib/time";
import { SUBSCRIPTION_STATUS_LABEL, type SubscriptionStatus } from "@/lib/enums";

export const metadata = { title: "Assinaturas" };
export const dynamic = "force-dynamic";

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  await requireOwner("/painel/assinaturas");
  const shop = await getShopConfig();

  const statusFilter = params.status && params.status !== "todos" ? params.status : null;

  const [subscriptions, mrr, counts, openInvoices, plans, clients] = await Promise.all([
    prisma.subscription.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      include: {
        client: { select: { id: true, name: true, phone: true, avatarUrl: true } },
        plan: { select: { name: true } },
        credits: { include: { service: { select: { name: true } } } },
        invoices: { where: { status: { in: ["OPEN", "OVERDUE"] } }, select: { id: true } },
      },
      orderBy: [{ status: "asc" }, { currentPeriodEnd: "asc" }],
      take: 100,
    }),
    monthlyRecurringRevenue(),
    prisma.subscription.groupBy({ by: ["status"], _count: true }),
    prisma.invoice.findMany({
      where: { status: { in: ["OPEN", "OVERDUE"] } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 20,
    }),
    prisma.plan.findMany({
      where: { active: true },
      select: { id: true, name: true, priceCents: true },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: "CLIENT",
        active: true,
        subscriptions: { none: { status: { in: ["ACTIVE", "PAST_DUE", "PAUSED"] } } },
      },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 400,
    }),
  ]);

  const countOf = (status: string) => counts.find((c) => c.status === status)?._count ?? 0;
  const active = countOf("ACTIVE") + countOf("PAST_DUE");
  const canceling = subscriptions.filter((s) => s.cancelAtPeriodEnd && s.status === "ACTIVE").length;
  const overdueTotal = openInvoices
    .filter((invoice) => invoice.dueDate < new Date())
    .reduce((sum, invoice) => sum + invoice.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        description="Receita recorrente, saldo de franquia e faturas em aberto."
        actions={<AssignSubscriptionDialog plans={plans} clients={clients} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Receita recorrente"
          value={formatMoney(mrr)}
          hint="por mês, normalizada"
          icon={Repeat}
        />
        <StatCard label="Assinantes ativos" value={active} icon={Users} />
        <StatCard
          label="Cancelam no fim do ciclo"
          value={canceling}
          hint={active > 0 ? `${Math.round((canceling / active) * 100)}% da base` : undefined}
          icon={TrendingDown}
        />
        <StatCard
          label="Faturas vencidas"
          value={formatMoney(overdueTotal)}
          hint={`${openInvoices.length} em aberto`}
          icon={AlertTriangle}
        />
      </div>

      <FilterRow label="Filtrar assinaturas por situação">
        {[
          { value: "todos", label: "Todas" },
          { value: "ACTIVE", label: "Ativas" },
          { value: "PAST_DUE", label: "Em atraso" },
          { value: "PAUSED", label: "Pausadas" },
          { value: "CANCELED", label: "Canceladas" },
        ].map((option) => (
          <FilterPill
            key={option.value}
            href={`/painel/assinaturas${option.value === "todos" ? "" : `?status=${option.value}`}`}
            active={(params.status ?? "todos") === option.value}
          >
            {option.label}
          </FilterPill>
        ))}
      </FilterRow>

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma assinatura neste filtro"
          description="Ative um plano para um cliente pelo botao acima ou aguarde as contratacoes pelo site."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[var(--surface-muted)] text-left">
              <tr className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Plano</th>
                <th className="px-4 py-2.5 font-medium">Ciclo atual</th>
                <th className="px-4 py-2.5 font-medium">Saldo</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 text-right font-medium">Mensalidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-raised)]">
              {subscriptions.map((subscription) => {
                const cycleCredits = subscription.credits.filter(
                  (c) => c.cycleStart.getTime() === subscription.currentPeriodStart.getTime(),
                );

                return (
                  <tr key={subscription.id} className="transition-colors hover:bg-[var(--surface-muted)]/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/painel/clientes/${subscription.client.id}`}
                        className="flex items-center gap-2 font-medium hover:text-[var(--accent)]"
                      >
                        <Avatar
                          name={subscription.client.name}
                          src={subscription.client.avatarUrl}
                          size="xs"
                        />
                        <span className="truncate">{subscription.client.name}</span>
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {formatPhone(subscription.client.phone)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{subscription.plan.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                      {formatDate(subscription.currentPeriodStart, shop.timezone)} –{" "}
                      {formatDate(subscription.currentPeriodEnd, shop.timezone)}
                    </td>
                    <td className="px-4 py-3">
                      {cycleCredits.length === 0 ? (
                        <span className="text-[var(--text-muted)]">—</span>
                      ) : (
                        <div className="space-y-0.5 text-xs">
                          {cycleCredits.map((credit) => (
                            <div key={credit.id}>
                              <span className="text-[var(--text-muted)]">
                                {credit.service.name}:
                              </span>{" "}
                              <span className="font-medium">
                                {credit.total < 0
                                  ? "ilimitado"
                                  : `${Math.max(0, credit.total - credit.used)}/${credit.total}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          subscription.status === "ACTIVE"
                            ? subscription.cancelAtPeriodEnd
                              ? "dashed"
                              : "solid"
                            : subscription.status === "PAST_DUE"
                              ? "dashed"
                              : "muted"
                        }
                        size="sm"
                      >
                        {subscription.cancelAtPeriodEnd && subscription.status === "ACTIVE"
                          ? "Encerra no ciclo"
                          : SUBSCRIPTION_STATUS_LABEL[subscription.status as SubscriptionStatus]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatMoney(subscription.priceCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openInvoices.length > 0 ? (
        <section>
          <SectionTitle>Faturas em aberto</SectionTitle>
          <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
            {openInvoices.map((invoice) => {
              const overdue = invoice.dueDate < new Date();
              return (
                <li
                  key={invoice.id}
                  className="flex flex-wrap items-center gap-3 bg-[var(--surface-raised)] px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{invoice.client.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {invoice.description} · vence em{" "}
                      {formatDate(invoice.dueDate, shop.timezone)}
                    </p>
                  </div>
                  {overdue ? (
                    <Badge tone="dashed" size="sm">
                      Vencida
                    </Badge>
                  ) : (
                    <Badge tone="dashed" size="sm">
                      Em aberto
                    </Badge>
                  )}
                  <span className="font-semibold">{formatMoney(invoice.amountCents)}</span>
                  <PayInvoiceButton invoiceId={invoice.id} />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
