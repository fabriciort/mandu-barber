import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubscribeButton } from "./subscribe-button";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { getActiveSubscription } from "@/server/services/subscriptions";
import { formatMoney } from "@/lib/format";
import { planSavings } from "@/lib/pricing";
import { formatDuration } from "@/lib/time";

export const metadata: Metadata = {
  title: "Planos de assinatura",
  description:
    "Assine a Mandu Barber: franquia mensal de cortes e barbas, desconto no cardapio e prioridade na agenda.",
};

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const user = await getCurrentUser();
  const [plans, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: { active: true },
      include: {
        benefits: {
          include: { service: { select: { name: true, priceCents: true, durationMinutes: true } } },
        },
        _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    user ? getActiveSubscription(user.id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Assinatura
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
          Corte sempre em dia, preco travado
        </h1>
        <p className="mt-4 text-lg text-[var(--text-muted)]">
          Escolha a franquia que combina com sua rotina. Sem fidelidade — voce cancela quando
          quiser e usa tudo o que ja pagou.
        </p>
      </div>

      {subscription ? (
        <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-moss-500/30 bg-moss-500/8 px-5 py-4">
          <p className="text-sm">
            Voce ja assina o <strong>{subscription.planName}</strong>.
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/minha-conta/plano">Gerenciar meu plano</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const perks = parseList(plan.perks);
          const savings = planSavings(
            plan.priceCents,
            plan.benefits.map((b) => ({
              quantityPerCycle: b.quantityPerCycle,
              priceCents: b.service.priceCents,
            })),
          );
          const isCurrent = subscription?.planId === plan.id;

          return (
            <Card
              key={plan.id}
              id={plan.slug}
              className={`relative flex scroll-mt-24 flex-col p-7 ${
                plan.highlight
                  ? "border-[var(--accent)] shadow-[var(--shadow-lift)] lg:-my-3 lg:py-10"
                  : ""
              }`}
            >
              {plan.highlight ? (
                <Badge tone="accent" className="absolute -top-3 left-7">
                  <Crown className="size-3" />
                  Mais assinado
                </Badge>
              ) : null}
              {isCurrent ? (
                <Badge tone="success" className="absolute -top-3 right-7">
                  Seu plano
                </Badge>
              ) : null}

              <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                {plan.name}
              </h2>
              {plan.tagline ? (
                <p className="mt-1 text-sm text-[var(--text-muted)]">{plan.tagline}</p>
              ) : null}

              <div className="mt-6">
                <p className="flex items-baseline gap-1.5">
                  <span className="font-[family-name:var(--font-display)] text-4xl font-semibold">
                    {formatMoney(plan.priceCents)}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    /{plan.intervalMonths === 1 ? "mes" : `${plan.intervalMonths} meses`}
                  </span>
                </p>
                {savings.savingsCents > 0 ? (
                  <p className="mt-1.5 text-sm font-medium text-moss-600 dark:text-moss-400">
                    Economia de {formatMoney(savings.savingsCents)} vs. avulso
                    {savings.hasUnlimited ? " (uso medio)" : ""}
                  </p>
                ) : null}
              </div>

              {plan.benefits.length > 0 ? (
                <div className="mt-6 rounded-xl bg-[var(--surface-muted)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Franquia mensal
                  </p>
                  <ul className="mt-2.5 space-y-2">
                    {plan.benefits.map((benefit) => (
                      <li key={benefit.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span>{benefit.service.name}</span>
                        <span className="shrink-0 font-semibold text-[var(--accent)]">
                          {benefit.quantityPerCycle < 0
                            ? "Ilimitado"
                            : `${benefit.quantityPerCycle}x`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 text-xs text-[var(--text-muted)]">
                    Equivale a{" "}
                    {formatDuration(
                      plan.benefits.reduce(
                        (sum, b) =>
                          sum +
                          b.service.durationMinutes * Math.max(1, Math.abs(b.quantityPerCycle)),
                        0,
                      ),
                    )}{" "}
                    de cadeira por mes.
                  </p>
                </div>
              ) : null}

              <ul className="mt-6 flex-1 space-y-2.5">
                {perks.map((perk) => (
                  <li key={perk} className="flex gap-2.5 text-sm text-[var(--text-secondary)]">
                    <Check className="mt-0.5 size-4 shrink-0 text-moss-500" />
                    {perk}
                  </li>
                ))}
              </ul>

              {plan._count.subscriptions > 0 ? (
                <p className="mt-5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Star className="size-3.5 fill-brass-400 text-brass-400" />
                  {plan._count.subscriptions} assinante(s) ativos
                </p>
              ) : null}

              <div className="mt-6">
                {isCurrent ? (
                  <Button asChild block variant="secondary">
                    <Link href="/minha-conta/plano">Gerenciar assinatura</Link>
                  </Button>
                ) : subscription ? (
                  <Button block variant="secondary" disabled>
                    Voce ja tem um plano ativo
                  </Button>
                ) : (
                  <SubscribeButton
                    planId={plan.id}
                    planName={plan.name}
                    priceCents={plan.priceCents}
                    authenticated={Boolean(user)}
                    highlight={plan.highlight}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ---------------------------------------------------------- duvidas */}
      <section className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center font-[family-name:var(--font-display)] text-3xl font-semibold">
          Perguntas que sempre aparecem
        </h2>

        <dl className="mt-8 space-y-4">
          {FAQ.map((item) => (
            <div
              key={item.question}
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5"
            >
              <dt className="font-medium">{item.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-16 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-6 py-10 text-center">
        <Sparkles className="mx-auto size-6 text-[var(--accent)]" />
        <h2 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-semibold">
          Ainda na duvida?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[var(--text-muted)]">
          Marque um corte avulso primeiro. Se gostar, a assinatura fica esperando por voce.
        </p>
        <Button asChild className="mt-6">
          <Link href="/agendar">Agendar um corte avulso</Link>
        </Button>
      </div>
    </div>
  );
}

const FAQ = [
  {
    question: "Se eu nao usar todos os cortes do mes, perco?",
    answer:
      "Nos planos com acumulo, o que sobra vai para o mes seguinte ate o limite indicado no plano. Nos demais, a franquia e renovada a cada ciclo — por isso vale escolher o plano do tamanho da sua rotina.",
  },
  {
    question: "Como funciona o desconto nos servicos fora da franquia?",
    answer:
      "Assim que a franquia acaba (ou se voce escolhe um servico que nao esta nela), o desconto do plano entra automaticamente no fechamento da conta. Voce ve o valor final antes de confirmar o agendamento.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Pode. O cancelamento vale para o fim do ciclo vigente: voce usa tudo o que ja pagou e nao ha nova cobranca. Se mudar de ideia antes da virada, da para reativar em um clique.",
  },
  {
    question: "E se eu precisar desmarcar um horario?",
    answer:
      "Cancelando dentro do prazo, o credito volta para o seu saldo do ciclo na hora. Nada de credito perdido por remarcar.",
  },
  {
    question: "Posso usar o plano com qualquer profissional?",
    answer:
      "Sim, com qualquer profissional habilitado no servico. Alguns profissionais tem preco de tabela diferente, mas a franquia do plano cobre igual.",
  },
];

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
