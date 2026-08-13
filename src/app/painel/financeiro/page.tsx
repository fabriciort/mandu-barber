import { Banknote, Percent, Receipt, TrendingUp, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { RevenueChart } from "@/components/revenue-chart";
import { requireOwner } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { formatMoney } from "@/lib/format";
import {
  addDaysISO,
  diffInDaysISO,
  formatDate,
  isValidDateKey,
  rangeBoundaries,
  toDateKey,
  todayKey,
} from "@/lib/time";
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/lib/enums";

export const metadata = { title: "Financeiro" };
export const dynamic = "force-dynamic";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string }>;
}) {
  const params = await searchParams;
  await requireOwner("/painel/financeiro");
  const shop = await getShopConfig();

  const today = todayKey(shop.timezone);
  const from = params.de && isValidDateKey(params.de) ? params.de : `${today.slice(0, 7)}-01`;
  const to = params.ate && isValidDateKey(params.ate) ? params.ate : today;
  const range = rangeBoundaries(from, to, shop.timezone);

  const [payments, appointments, invoices, barbers] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: range.start, lt: range.end } },
      include: {
        appointment: {
          select: {
            code: true,
            barberId: true,
            client: { select: { name: true } },
            services: { select: { name: true } },
          },
        },
        invoice: { select: { description: true, client: { select: { name: true } } } },
      },
      orderBy: { paidAt: "desc" },
      take: 200,
    }),
    prisma.appointment.findMany({
      where: { status: "COMPLETED", startsAt: { gte: range.start, lt: range.end } },
      select: { startsAt: true, totalCents: true, discountCents: true, barberId: true },
    }),
    prisma.invoice.findMany({
      where: { createdAt: { gte: range.start, lt: range.end } },
      select: { amountCents: true, status: true },
    }),
    prisma.barberProfile.findMany({
      where: { active: true },
      include: { user: { select: { name: true } } },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const serviceRevenue = appointments.reduce((sum, a) => sum + a.totalCents, 0);
  const subscriptionRevenue = invoices
    .filter((invoice) => invoice.status === "PAID")
    .reduce((sum, invoice) => sum + invoice.amountCents, 0);
  const planDiscounts = appointments.reduce((sum, a) => sum + a.discountCents, 0);
  const pendingInvoices = invoices
    .filter((invoice) => invoice.status !== "PAID" && invoice.status !== "VOID")
    .reduce((sum, invoice) => sum + invoice.amountCents, 0);

  // Metodo de pagamento
  const byMethod = new Map<string, { count: number; totalCents: number }>();
  for (const payment of payments) {
    const entry = byMethod.get(payment.method) ?? { count: 0, totalCents: 0 };
    entry.count += 1;
    entry.totalCents += payment.amountCents;
    byMethod.set(payment.method, entry);
  }
  const methodTotal = [...byMethod.values()].reduce((sum, m) => sum + m.totalCents, 0) || 1;

  // Comissoes
  const commissions = barbers.map((barber) => {
    const revenue = appointments
      .filter((a) => a.barberId === barber.id)
      .reduce((sum, a) => sum + a.totalCents, 0);
    return {
      id: barber.id,
      name: barber.user.name,
      color: barber.agendaColor,
      percent: barber.commissionPercent,
      revenueCents: revenue,
      commissionCents: Math.round((revenue * barber.commissionPercent) / 100),
    };
  });
  const commissionTotal = commissions.reduce((sum, c) => sum + c.commissionCents, 0);

  // Serie diaria do periodo
  const seriesMap = new Map<string, { revenueCents: number; appointments: number }>();
  const days = diffInDaysISO(from, to);
  for (let offset = 0; offset <= Math.min(days, 92); offset++) {
    seriesMap.set(addDaysISO(from, offset), { revenueCents: 0, appointments: 0 });
  }
  for (const appointment of appointments) {
    const key = toDateKey(appointment.startsAt, shop.timezone);
    const entry = seriesMap.get(key);
    if (!entry) continue;
    entry.revenueCents += appointment.totalCents;
    entry.appointments += 1;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description={`De ${formatDate(range.start, shop.timezone)} a ${formatDate(new Date(range.end.getTime() - 1), shop.timezone)}.`}
      />

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex gap-2">
            <div>
              <label htmlFor="de" className="text-xs text-[var(--text-muted)]">
                Inicio
              </label>
              <Input id="de" type="date" name="de" defaultValue={from} />
            </div>
            <div>
              <label htmlFor="ate" className="text-xs text-[var(--text-muted)]">
                Fim
              </label>
              <Input id="ate" type="date" name="ate" defaultValue={to} />
            </div>
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-contrast)] transition-all hover:brightness-110"
          >
            Aplicar periodo
          </button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Receita de servicos"
          value={formatMoney(serviceRevenue)}
          hint={`${appointments.length} atendimentos`}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Receita de assinaturas"
          value={formatMoney(subscriptionRevenue)}
          hint="faturas pagas no periodo"
          icon={Receipt}
          tone="accent"
        />
        <StatCard
          label="Descontos concedidos"
          value={formatMoney(planDiscounts)}
          hint="franquia e desconto de plano"
          icon={Percent}
        />
        <StatCard
          label="A receber"
          value={formatMoney(pendingInvoices)}
          hint="faturas em aberto"
          icon={Banknote}
          tone={pendingInvoices > 0 ? "warning" : "neutral"}
        />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Receita de servicos por dia</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Total do periodo: {formatMoney(serviceRevenue)}
          </p>
        </div>
        <div className="mt-4">
          <RevenueChart data={[...seriesMap.entries()].map(([date, value]) => ({ date, ...value }))} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <TrendingUp className="size-4 text-[var(--accent)]" />
            Repasse da equipe
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Base: receita de servicos concluidos no periodo.
          </p>

          <ul className="mt-4 space-y-3">
            {commissions.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{member.name}</span>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {formatMoney(member.revenueCents)} × {member.percent}%
                </span>
                <span className="w-24 shrink-0 text-right font-semibold">
                  {formatMoney(member.commissionCents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-[var(--border-subtle)] pt-3 font-semibold">
            <span>Total a repassar</span>
            <span>{formatMoney(commissionTotal)}</span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Sobra para a casa: {formatMoney(serviceRevenue - commissionTotal)}.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Como o dinheiro entrou</h2>
          {byMethod.size === 0 ? (
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Nenhum pagamento registrado no periodo.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {[...byMethod.entries()]
                .sort((a, b) => b[1].totalCents - a[1].totalCents)
                .map(([method, value]) => (
                  <li key={method}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{PAYMENT_METHOD_LABEL[method as PaymentMethod] ?? method}</span>
                      <span className="font-medium">{formatMoney(value.totalCents)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${(value.totalCents / methodTotal) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {value.count} recebimento(s) ·{" "}
                      {Math.round((value.totalCents / methodTotal) * 100)}% do total
                    </p>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <SectionTitle>Lancamentos recentes</SectionTitle>
        {payments.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Nenhum pagamento registrado no periodo selecionado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left">
                <tr className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Forma</th>
                  <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-raised)]">
                {payments.slice(0, 60).map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {formatDate(payment.paidAt, shop.timezone)}
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                      {payment.appointment
                        ? payment.appointment.services.map((s) => s.name).join(" + ")
                        : (payment.invoice?.description ?? "Lancamento avulso")}
                    </td>
                    <td className="px-4 py-2.5">
                      {payment.appointment?.client.name ?? payment.invoice?.client.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone="outline" size="sm">
                        {PAYMENT_METHOD_LABEL[payment.method as PaymentMethod] ?? payment.method}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium">
                      {formatMoney(payment.amountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
