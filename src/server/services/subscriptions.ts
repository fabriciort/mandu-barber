import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db";
import type { CreditBalance } from "@/lib/pricing";

type Db = PrismaClient | Prisma.TransactionClient;

export type ActiveSubscription = {
  id: string;
  planId: string;
  planName: string;
  planSlug: string;
  status: string;
  priceCents: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  extraDiscountPercent: number;
  priorityBooking: boolean;
  credits: (CreditBalance & { serviceName: string; cycleStart: Date })[];
};

/** Avanca uma data em N meses preservando o dia (28..31 caem no ultimo dia do mes). */
export function addMonthsKeepingDay(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

/**
 * Cria (ou completa) os creditos do ciclo corrente.
 *
 * Idempotente: a unicidade (assinatura, servico, inicio do ciclo) faz com que
 * rodar de novo nao duplique franquia.
 */
export async function ensureCycleCredits(db: Db, subscriptionId: string): Promise<void> {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: { include: { benefits: true } } },
  });
  if (!subscription) return;

  const existing = await db.subscriptionCredit.findMany({
    where: { subscriptionId, cycleStart: subscription.currentPeriodStart },
    select: { serviceId: true },
  });
  const already = new Set(existing.map((c) => c.serviceId));

  const missing = subscription.plan.benefits.filter((b) => !already.has(b.serviceId));
  if (missing.length === 0) return;

  // Rollover: sobras do ciclo anterior sao somadas ate o teto configurado.
  const previous = subscription.plan.allowRollover
    ? await db.subscriptionCredit.findMany({
        where: { subscriptionId, cycleEnd: subscription.currentPeriodStart },
      })
    : [];

  for (const benefit of missing) {
    let total = benefit.quantityPerCycle;
    if (total >= 0 && subscription.plan.allowRollover) {
      const prior = previous.find((c) => c.serviceId === benefit.serviceId);
      if (prior && prior.total >= 0) {
        const leftover = Math.max(0, prior.total - prior.used);
        total += Math.min(leftover, subscription.plan.maxRolloverCredits);
      }
    }

    await db.subscriptionCredit.create({
      data: {
        subscriptionId,
        serviceId: benefit.serviceId,
        cycleStart: subscription.currentPeriodStart,
        cycleEnd: subscription.currentPeriodEnd,
        total,
        used: 0,
      },
    });
  }
}

/**
 * Vira o ciclo quando a data de renovacao passou, gerando a fatura do periodo.
 * Chamada tanto pela rotina agendada quanto por qualquer leitura da assinatura
 * — assim o saldo do cliente nunca aparece desatualizado por falta de cron.
 */
export async function rollCycleIfDue(db: Db, subscriptionId: string, now = new Date()) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return null;
  if (subscription.status === "CANCELED" || subscription.status === "PAUSED") return subscription;

  let current = subscription;
  let guard = 0;

  while (current.currentPeriodEnd <= now && guard++ < 24) {
    if (current.cancelAtPeriodEnd) {
      return db.subscription.update({
        where: { id: current.id },
        data: { status: "CANCELED", canceledAt: current.currentPeriodEnd },
        include: { plan: true },
      });
    }

    const nextStart = current.currentPeriodEnd;
    const nextEnd = addMonthsKeepingDay(nextStart, current.plan.intervalMonths);

    current = await db.subscription.update({
      where: { id: current.id },
      data: { currentPeriodStart: nextStart, currentPeriodEnd: nextEnd },
      include: { plan: true },
    });

    await ensureCycleCredits(db, current.id);
    await createCycleInvoice(db, current.id, nextStart, nextEnd, current.priceCents, current.plan.name);
  }

  return current;
}

async function createCycleInvoice(
  db: Db,
  subscriptionId: string,
  periodStart: Date,
  periodEnd: Date,
  amountCents: number,
  planName: string,
) {
  const subscription = await db.subscription.findUnique({
    where: { id: subscriptionId },
    select: { clientId: true },
  });
  if (!subscription) return;

  const existing = await db.invoice.findFirst({
    where: { subscriptionId, periodStart },
    select: { id: true },
  });
  if (existing) return;

  await db.invoice.create({
    data: {
      clientId: subscription.clientId,
      subscriptionId,
      description: `Assinatura ${planName}`,
      amountCents,
      status: "OPEN",
      dueDate: periodStart,
      periodStart,
      periodEnd,
    },
  });
}

/**
 * Assinatura utilizavel do cliente, com o ciclo ja atualizado e os creditos
 * garantidos. Devolve null quando nao ha plano ativo.
 */
export async function getActiveSubscription(
  clientId: string,
  now = new Date(),
): Promise<ActiveSubscription | null> {
  const found = await prisma.subscription.findFirst({
    where: { clientId, status: { in: ["ACTIVE", "PAST_DUE"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!found) return null;

  await rollCycleIfDue(prisma, found.id, now);
  await ensureCycleCredits(prisma, found.id);

  const subscription = await prisma.subscription.findUnique({
    where: { id: found.id },
    include: {
      plan: true,
      credits: { include: { service: { select: { name: true } } } },
    },
  });
  if (!subscription || !["ACTIVE", "PAST_DUE"].includes(subscription.status)) return null;

  return {
    id: subscription.id,
    planId: subscription.planId,
    planName: subscription.plan.name,
    planSlug: subscription.plan.slug,
    status: subscription.status,
    priceCents: subscription.priceCents,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    extraDiscountPercent: subscription.plan.extraDiscountPercent,
    priorityBooking: subscription.plan.priorityBooking,
    credits: subscription.credits
      .filter((c) => c.cycleStart.getTime() === subscription.currentPeriodStart.getTime())
      .map((c) => ({
        serviceId: c.serviceId,
        serviceName: c.service.name,
        total: c.total,
        used: c.used,
        cycleStart: c.cycleStart,
      })),
  };
}

/** Debita a franquia e registra o lancamento no razao. */
export async function consumeCredits(
  db: Db,
  params: {
    subscriptionId: string;
    cycleStart: Date;
    appointmentId: string;
    items: { serviceId: string; quantity: number }[];
    reason?: string;
  },
) {
  for (const item of params.items) {
    if (item.quantity <= 0) continue;

    const credit = await db.subscriptionCredit.findUnique({
      where: {
        subscriptionId_serviceId_cycleStart: {
          subscriptionId: params.subscriptionId,
          serviceId: item.serviceId,
          cycleStart: params.cycleStart,
        },
      },
    });
    if (!credit) continue;
    if (credit.total >= 0 && credit.used + item.quantity > credit.total) {
      throw new Error("Saldo do plano insuficiente para este agendamento.");
    }

    if (credit.total >= 0) {
      await db.subscriptionCredit.update({
        where: { id: credit.id },
        data: { used: { increment: item.quantity } },
      });
    }

    await db.subscriptionUsage.create({
      data: {
        subscriptionId: params.subscriptionId,
        serviceId: item.serviceId,
        appointmentId: params.appointmentId,
        delta: item.quantity,
        reason: params.reason ?? "Agendamento",
        cycleStart: params.cycleStart,
      },
    });
  }
}

/**
 * Estorna a franquia de um agendamento cancelado, devolvendo o credito ao
 * ciclo em que ele foi consumido (nunca ao ciclo novo, o que daria saldo extra).
 */
export async function refundCredits(
  db: Db,
  appointmentId: string,
  reason = "Cancelamento",
): Promise<void> {
  const usages = await db.subscriptionUsage.findMany({
    where: { appointmentId, delta: { gt: 0 } },
  });
  if (usages.length === 0) return;

  const refunded = await db.subscriptionUsage.findMany({
    where: { appointmentId, delta: { lt: 0 } },
  });
  const refundedByService = new Map<string, number>();
  for (const usage of refunded) {
    refundedByService.set(
      usage.serviceId,
      (refundedByService.get(usage.serviceId) ?? 0) + Math.abs(usage.delta),
    );
  }

  for (const usage of usages) {
    const already = refundedByService.get(usage.serviceId) ?? 0;
    const pending = usage.delta - already;
    if (pending <= 0) continue;
    refundedByService.set(usage.serviceId, already + pending);

    const credit = await db.subscriptionCredit.findUnique({
      where: {
        subscriptionId_serviceId_cycleStart: {
          subscriptionId: usage.subscriptionId,
          serviceId: usage.serviceId,
          cycleStart: usage.cycleStart,
        },
      },
    });

    if (credit && credit.total >= 0) {
      await db.subscriptionCredit.update({
        where: { id: credit.id },
        data: { used: { decrement: Math.min(pending, credit.used) } },
      });
    }

    await db.subscriptionUsage.create({
      data: {
        subscriptionId: usage.subscriptionId,
        serviceId: usage.serviceId,
        appointmentId,
        delta: -pending,
        reason,
        cycleStart: usage.cycleStart,
      },
    });
  }
}

/** Contrata um plano. Um cliente ativo nao pode ter duas assinaturas vigentes. */
export async function createSubscription(params: {
  clientId: string;
  planId: string;
  paymentMethod?: string | null;
  startAt?: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.subscription.findFirst({
      where: { clientId: params.clientId, status: { in: ["ACTIVE", "PAST_DUE", "PAUSED"] } },
    });
    if (existing) {
      throw new Error("Este cliente já possui uma assinatura ativa.");
    }

    const plan = await tx.plan.findUnique({ where: { id: params.planId } });
    if (!plan || !plan.active) throw new Error("Plano indisponível.");

    const start = params.startAt ?? new Date();
    const end = addMonthsKeepingDay(start, plan.intervalMonths);

    const subscription = await tx.subscription.create({
      data: {
        clientId: params.clientId,
        planId: plan.id,
        priceCents: plan.priceCents,
        status: "ACTIVE",
        startedAt: start,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        paymentMethod: params.paymentMethod ?? null,
      },
    });

    await ensureCycleCredits(tx, subscription.id);
    await createCycleInvoice(tx, subscription.id, start, end, plan.priceCents, plan.name);

    return subscription;
  });
}

/**
 * Cancelamento. O padrao e encerrar no fim do ciclo — o cliente ja pagou o mes
 * e continua com direito ao que contratou; cortar na hora seria confisco.
 */
export async function cancelSubscription(subscriptionId: string, immediate = false) {
  const now = new Date();
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: immediate
      ? { status: "CANCELED", canceledAt: now, cancelAtPeriodEnd: false }
      : { cancelAtPeriodEnd: true },
  });
}

export async function resumeSubscription(subscriptionId: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { cancelAtPeriodEnd: false, status: "ACTIVE", pausedAt: null },
  });
}

/** Receita recorrente mensal normalizada (planos trimestrais entram divididos). */
export async function monthlyRecurringRevenue(): Promise<number> {
  const active = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
    include: { plan: { select: { intervalMonths: true } } },
  });
  return active.reduce(
    (sum, s) => sum + Math.round(s.priceCents / Math.max(1, s.plan.intervalMonths)),
    0,
  );
}
