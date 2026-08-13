import { PrismaClient } from "@prisma/client";

/**
 * Em desenvolvimento o Next recarrega os modulos a cada edicao; sem este cache
 * global cada recarga abriria uma nova pool de conexoes ate estourar o limite.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
