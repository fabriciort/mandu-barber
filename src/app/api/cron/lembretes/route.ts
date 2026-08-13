import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { notify } from "@/server/services/notifications";
import { getShopConfig } from "@/server/services/settings";
import { rollCycleIfDue } from "@/server/services/subscriptions";
import { formatDateTime, formatTime } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Rotina periodica da barbearia. Deve ser chamada a cada hora por um agendador
 * (cron do provedor, GitHub Action, o que estiver a mao):
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/lembretes
 *
 * Faz tres coisas, todas idempotentes:
 *  1. envia lembrete dos atendimentos das proximas 24h (uma vez por agendamento);
 *  2. marca faturas vencidas e coloca a assinatura em atraso;
 *  3. vira o ciclo das assinaturas cujo periodo terminou.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");

  if (secret && header !== `Bearer ${secret}`) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  const shop = await getShopConfig();
  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 3_600_000);

  // ------------------------------------------------------------- lembretes
  const upcoming = await prisma.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startsAt: { gte: now, lte: horizon },
      reminderSentAt: null,
    },
    include: {
      client: { select: { id: true, name: true } },
      barber: { include: { user: { select: { name: true } } } },
      services: { select: { name: true } },
    },
    take: 200,
  });

  for (const appointment of upcoming) {
    await notify(prisma, {
      userId: appointment.clientId,
      type: "REMINDER",
      title: `Seu horário e ${formatTime(appointment.startsAt, shop.timezone)}`,
      body: `${appointment.services.map((s) => s.name).join(" + ")} com ${appointment.barber.user.name} em ${formatDateTime(appointment.startsAt, shop.timezone)}.`,
      link: `/minha-conta/agendamentos/${appointment.id}`,
    });
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { reminderSentAt: now },
    });
  }

  // -------------------------------------------------------- faturas vencidas
  const overdue = await prisma.invoice.findMany({
    where: { status: "OPEN", dueDate: { lt: now } },
    select: { id: true, subscriptionId: true, clientId: true, description: true },
    take: 200,
  });

  for (const invoice of overdue) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "OVERDUE" } });
    if (invoice.subscriptionId) {
      await prisma.subscription.updateMany({
        where: { id: invoice.subscriptionId, status: "ACTIVE" },
        data: { status: "PAST_DUE" },
      });
    }
    await notify(prisma, {
      userId: invoice.clientId,
      type: "SUBSCRIPTION",
      title: "Fatura em aberto",
      body: `${invoice.description} está aguardando pagamento. Passe na loja ou fale com a gente.`,
      link: "/minha-conta/plano",
    });
  }

  // ------------------------------------------------------- ciclos vencidos
  const dueSubscriptions = await prisma.subscription.findMany({
    where: { status: { in: ["ACTIVE", "PAST_DUE"] }, currentPeriodEnd: { lte: now } },
    select: { id: true },
    take: 200,
  });

  for (const subscription of dueSubscriptions) {
    await rollCycleIfDue(prisma, subscription.id, now);
  }

  return NextResponse.json({
    executadoEm: now.toISOString(),
    lembretesEnviados: upcoming.length,
    faturasVencidas: overdue.length,
    ciclosRenovados: dueSubscriptions.length,
  });
}
