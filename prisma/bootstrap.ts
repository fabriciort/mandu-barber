/**
 * Carga inicial da barbearia.
 *
 * Popula os dados de demonstracao APENAS quando o banco esta vazio — a partir
 * do primeiro usuario cadastrado, nunca mais toca em nada. E o que permite
 * subir o projeto sem abrir terminal e, ao mesmo tempo, garante que deploys
 * seguintes preservem os dados reais da loja.
 *
 * Chamado por prisma/deploy.ts durante o build.
 * Para repovoar do zero (apaga tudo): npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

import { seed } from "./seed";

const prisma = new PrismaClient();

export async function bootstrap() {
  const existing = await prisma.user.count();

  if (existing > 0) {
    console.log(`[bootstrap] Banco ja tem ${existing} usuario(s). Nada a fazer.`);
    return;
  }

  console.log("[bootstrap] Banco vazio — populando a barbearia de demonstracao.");

  try {
    await seed();
  } catch (error) {
    console.error("[bootstrap] Falha ao popular:", error);
    await rollbackPartialSeed();
    console.error("[bootstrap] Dados parciais removidos — o proximo deploy tenta de novo.");
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * O seed nao e transacional: se parar no meio, deixa o banco pela metade e a
 * proxima execucao veria "ja tem usuario" e pularia, congelando o estado
 * quebrado. Como so chegamos aqui com o banco vazio, desfazer e seguro.
 */
async function rollbackPartialSeed() {
  try {
    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.review.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.invoice.deleteMany(),
      prisma.subscriptionUsage.deleteMany(),
      prisma.subscriptionCredit.deleteMany(),
      prisma.subscription.deleteMany(),
      prisma.appointmentService.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.planBenefit.deleteMany(),
      prisma.plan.deleteMany(),
      prisma.barberService.deleteMany(),
      prisma.workingHour.deleteMany(),
      prisma.timeOff.deleteMany(),
      prisma.barberProfile.deleteMany(),
      prisma.service.deleteMany(),
      prisma.session.deleteMany(),
      prisma.user.deleteMany(),
      prisma.businessHour.deleteMany(),
      prisma.shopSettings.deleteMany(),
    ]);
  } catch (cleanupError) {
    console.error("[bootstrap] Falha ao limpar os dados parciais:", cleanupError);
  }
}

// Permite rodar sozinho: npx tsx prisma/bootstrap.ts
if (process.argv[1]?.endsWith("bootstrap.ts")) {
  bootstrap()
    .catch(() => process.exit(1))
    .finally(async () => {
      await prisma.$disconnect();
    });
}
