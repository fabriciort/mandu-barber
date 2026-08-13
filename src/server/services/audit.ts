import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Trilha de auditoria das acoes de gestao. Barbearia tem dinheiro no balcao e
 * varias maos na agenda: saber quem cancelou, quem mudou preco e quem deu
 * cortesia evita discussao depois.
 */
export async function audit(
  db: Db,
  params: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    meta?: Record<string, unknown>;
  },
) {
  await db.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      meta: params.meta ? JSON.stringify(params.meta) : null,
    },
  });
}
