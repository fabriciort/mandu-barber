import { PrismaClient } from "@prisma/client";

import { resolveDatabaseUrl } from "@/lib/database-url";

/**
 * Em desenvolvimento o Next recarrega os modulos a cada edicao; sem este cache
 * global cada recarga abriria uma nova pool de conexoes ate estourar o limite.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const { url } = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Aceita o nome que o provedor usar (POSTGRES_URL, DATABASE_URL_UNPOOLED...)
    // em vez de exigir exatamente DATABASE_URL.
    ...(url ? { datasources: { db: { url } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
