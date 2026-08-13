import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db";
import type { NotificationType } from "@/lib/enums";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Central de avisos.
 *
 * Hoje entrega no sino do app (tabela Notification). O ponto de extensao para
 * WhatsApp/e-mail e `dispatchExternal`: como tudo passa por `notify`, plugar um
 * provedor depois nao exige caçar chamadas espalhadas pelo codigo.
 */
export async function notify(
  db: Db,
  params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  },
) {
  const notification = await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
    },
  });

  await dispatchExternal(params);
  return notification;
}

/** Avisa a equipe inteira (usado em agendamento novo vindo do site). */
export async function notifyStaff(
  db: Db,
  params: { type: NotificationType; title: string; body: string; link?: string; barberId?: string },
) {
  const recipients = await db.user.findMany({
    where: {
      active: true,
      OR: [
        { role: "OWNER" },
        ...(params.barberId ? [{ barber: { id: params.barberId } }] : []),
      ],
    },
    select: { id: true },
  });

  for (const recipient of recipients) {
    await notify(db, { ...params, userId: recipient.id });
  }
}

/**
 * Adaptador de canais externos. Sem credenciais configuradas ele apenas
 * registra a intencao — o produto funciona ponta a ponta sem depender de
 * contrato com gateway de mensagem.
 */
async function dispatchExternal(params: { type: NotificationType; title: string }) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[notificação] ${params.type}: ${params.title}`);
  }
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
