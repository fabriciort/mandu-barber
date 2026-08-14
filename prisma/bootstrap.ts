/**
 * Preparo do banco no deploy.
 *
 * Roda no build (veja o script "build" no package.json) logo depois das
 * migracoes. Popula a barbearia de demonstracao APENAS quando o banco esta
 * vazio — a partir do primeiro usuario cadastrado, nunca mais toca em nada.
 *
 * E o que permite subir o projeto sem abrir terminal: cria o banco no provedor,
 * aponta a DATABASE_URL e o primeiro deploy ja entrega o site com dados.
 *
 * Para repovoar do zero (apaga tudo): npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

import { seed } from "./seed";

const prisma = new PrismaClient();

async function bootstrap() {
  const existing = await prisma.user.count();

  if (existing > 0) {
    console.log(`[bootstrap] Banco ja tem ${existing} usuario(s). Nada a fazer.`);
    return;
  }

  console.log("[bootstrap] Banco vazio — populando a barbearia de demonstracao.");
  await seed();
}

/**
 * O seed nao e transacional: se parar no meio, deixa o banco pela metade e a
 * proxima execucao veria "ja tem usuario" e pularia, congelando o estado
 * quebrado. Como so chegamos aqui com o banco vazio, desfazer e seguro e
 * devolve o banco ao ponto de partida para o proximo deploy tentar de novo.
 */
async function rollbackPartialSeed() {
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
}

bootstrap()
  .catch(async (error) => {
    // Falhar aqui nao pode derrubar o deploy por causa de dados de exemplo:
    // as migracoes ja rodaram e o app sobe, com o gestor populando pelo painel.
    console.error("[bootstrap] Nao foi possivel popular o banco:", error);
    try {
      await rollbackPartialSeed();
      console.error("[bootstrap] Dados parciais removidos — o proximo deploy tenta de novo.");
    } catch (cleanupError) {
      console.error("[bootstrap] Falha ao limpar os dados parciais:", cleanupError);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
