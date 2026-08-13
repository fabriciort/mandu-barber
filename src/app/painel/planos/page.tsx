import { CreditCard, Crown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { PlanFormDialog } from "./plan-form-dialog";
import { requireOwner } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { formatMoney } from "@/lib/format";
import { planSavings } from "@/lib/pricing";

export const metadata = { title: "Planos" };
export const dynamic = "force-dynamic";

export default async function PlansAdminPage() {
  await requireOwner("/painel/planos");

  const [plans, services] = await Promise.all([
    prisma.plan.findMany({
      include: {
        benefits: { include: { service: { select: { name: true, priceCents: true } } } },
        _count: { select: { subscriptions: { where: { status: { in: ["ACTIVE", "PAST_DUE"] } } } } },
      },
      orderBy: [{ active: "desc" }, { displayOrder: "asc" }],
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, priceCents: true },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const mrr = plans.reduce(
    (sum, plan) =>
      sum + Math.round((plan.priceCents / Math.max(1, plan.intervalMonths)) * plan._count.subscriptions),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos"
        description={`${plans.filter((p) => p.active).length} plano(s) ativo(s) · ${formatMoney(mrr)} de receita recorrente.`}
        actions={<PlanFormDialog services={services} />}
      />

      {plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum plano cadastrado"
          description="Crie um plano para comecar a vender assinaturas."
          action={<PlanFormDialog services={services} />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const savings = planSavings(
              plan.priceCents,
              plan.benefits.map((b) => ({
                quantityPerCycle: b.quantityPerCycle,
                priceCents: b.service.priceCents,
              })),
            );

            return (
              <Card key={plan.id} className={`flex flex-col p-5 ${plan.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate font-semibold">
                      {plan.highlight ? <Crown className="size-4 text-brass-500" /> : null}
                      {plan.name}
                    </h3>
                    <p className="truncate text-sm text-[var(--text-muted)]">{plan.tagline}</p>
                  </div>
                  {!plan.active ? (
                    <Badge tone="danger" size="sm">
                      Inativo
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-4 text-2xl font-semibold">
                  {formatMoney(plan.priceCents)}
                  <span className="text-sm font-normal text-[var(--text-muted)]">
                    /{plan.intervalMonths === 1 ? "mes" : `${plan.intervalMonths} meses`}
                  </span>
                </p>

                <div className="mt-4 flex-1 space-y-1.5 text-sm">
                  {plan.benefits.length === 0 ? (
                    <p className="text-[var(--text-muted)]">Sem franquia — apenas desconto.</p>
                  ) : (
                    plan.benefits.map((benefit) => (
                      <div key={benefit.id} className="flex justify-between gap-2">
                        <span className="truncate text-[var(--text-secondary)]">
                          {benefit.service.name}
                        </span>
                        <span className="shrink-0 font-medium">
                          {benefit.quantityPerCycle < 0 ? "Ilimitado" : `${benefit.quantityPerCycle}x`}
                        </span>
                      </div>
                    ))
                  )}
                  <div className="flex justify-between gap-2 border-t border-[var(--border-subtle)] pt-1.5">
                    <span className="text-[var(--text-muted)]">Desconto extra</span>
                    <span className="font-medium">{plan.extraDiscountPercent}%</span>
                  </div>
                  {plan.allowRollover ? (
                    <div className="flex justify-between gap-2">
                      <span className="text-[var(--text-muted)]">Acumula ate</span>
                      <span className="font-medium">{plan.maxRolloverCredits} credito(s)</span>
                    </div>
                  ) : null}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2.5 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">Assinantes</dt>
                    <dd className="font-semibold">{plan._count.subscriptions}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">Valor de tabela</dt>
                    <dd className="font-semibold">{formatMoney(savings.fullPriceCents)}</dd>
                  </div>
                </dl>

                {savings.savingsCents > 0 && savings.fullPriceCents > 0 ? (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Margem sobre tabela:{" "}
                    {Math.round((plan.priceCents / savings.fullPriceCents) * 100)}% do valor cheio.
                  </p>
                ) : null}

                <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                  <PlanFormDialog
                    services={services}
                    plan={{
                      id: plan.id,
                      name: plan.name,
                      tagline: plan.tagline,
                      description: plan.description,
                      priceCents: plan.priceCents,
                      intervalMonths: plan.intervalMonths,
                      extraDiscountPercent: plan.extraDiscountPercent,
                      priorityBooking: plan.priorityBooking,
                      allowRollover: plan.allowRollover,
                      maxRolloverCredits: plan.maxRolloverCredits,
                      perks: parseList(plan.perks).join("\n"),
                      highlight: plan.highlight,
                      active: plan.active,
                      benefits: plan.benefits.map((b) => ({
                        serviceId: b.serviceId,
                        quantityPerCycle: b.quantityPerCycle,
                      })),
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
