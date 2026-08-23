/**
 * Semente da Mr. Mandu Barber.
 *
 * DUAS NATUREZAS DE DADO CONVIVEM AQUI, e a diferenca importa:
 *
 *   REAL     — identidade da empresa e nomes da equipe. Sai de
 *              src/content/mr-mandu.ts, que so guarda o que foi confirmado.
 *
 *   DE APOIO — catalogo, precos, jornada, clientes, agenda e avaliacoes.
 *              Existe para o painel abrir com movimento em vez de telas vazias,
 *              e para o motor de agenda ter o que calcular. NAO e o negocio
 *              real da barbearia.
 *
 * Todo dado de apoio que apareceria no site publico como se fosse verdade esta
 * marcado com TODO [A DEFINIR] e tem uma pendencia correspondente em
 * PENDENCIAS. Enquanto a pendencia estiver aberta, a pagina publica mostra o
 * marcador <AConfirmar /> no lugar do valor — de proposito, para ninguem
 * publicar preco de mentira achando que ja era o preco certo.
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { EMPRESA, EQUIPE, MARCA, urlMaps } from "../src/content/mr-mandu";

const prisma = new PrismaClient();

const TZ_OFFSET_MINUTES = 180; // America/Sao_Paulo = UTC-3

/** Constroi um instante UTC a partir de data/hora locais da barbearia. */
function localDateTime(daysFromToday: number, hour: number, minute = 0): Date {
  const now = new Date();
  const base = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday),
  );
  base.setUTCMinutes(hour * 60 + minute + TZ_OFFSET_MINUTES);
  return base;
}

function localWeekday(daysFromToday: number): number {
  const now = new Date();
  const base = new Date(now.getTime() - TZ_OFFSET_MINUTES * 60_000);
  base.setUTCDate(base.getUTCDate() + daysFromToday);
  return base.getUTCDay();
}

/** Escolha civilizada por indice: aceita indice negativo sem devolver undefined. */
function pick<T>(items: T[], index: number): T {
  const size = items.length;
  return items[((index % size) + size) % size];
}

export async function seed() {
  console.log("Limpando base...");
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

  const password = await bcrypt.hash("mandu123", 10);

  // ---------------------------------------------------------------- loja
  console.log("Configurando a barbearia...");
  await prisma.shopSettings.create({
    data: {
      id: "shop",
      // Identidade real da empresa. Fonte: src/content/mr-mandu.ts, que por sua
      // vez sai do cadastro na Receita e das redes oficiais.
      name: EMPRESA.assinaturaVisual,
      tagline: MARCA.slogan,
      phone: EMPRESA.telefones[0],
      // TODO [A DEFINIR] PENDENCIAS.whatsapp — nao sabemos qual dos dois fixos
      // atende WhatsApp, nem se existe um celular so para isso. Fica null de
      // proposito: com numero errado aqui, o site publica um botao que leva a
      // lugar nenhum.
      whatsapp: null,
      email: EMPRESA.email,
      addressLine: EMPRESA.endereco.logradouro,
      district: EMPRESA.endereco.bairro,
      city: EMPRESA.endereco.cidade,
      state: EMPRESA.endereco.uf,
      zipCode: EMPRESA.endereco.cep,
      instagram: EMPRESA.redes.instagram,
      mapsUrl: urlMaps(),
      timezone: "America/Sao_Paulo",
      slotStepMinutes: 15,
      minLeadMinutes: 45,
      maxAdvanceDays: 60,
      cancellationWindowHours: 3,
      allowOnlineBooking: true,

      // TODO [A DEFINIR] PENDENCIAS.horarios — estes horarios NAO sao os da
      // barbearia; sao um valor de trabalho para o motor de agenda funcionar
      // (sem jornada cadastrada nao existe horario livre para oferecer).
      //
      // Por isso o site NAO publica esta tabela como se fosse verdade: onde ela
      // apareceria, sai o marcador <AConfirmar />. Quando o cliente confirmar,
      // troque aqui, cadastre pelo painel em /painel/configuracoes e vire
      // PENDENCIAS.horarios.pendente para false.
      businessHours: {
        create: [
          { weekday: 0, openMinute: 0, closeMinute: 0, closed: true },
          { weekday: 1, openMinute: 9 * 60, closeMinute: 20 * 60 },
          { weekday: 2, openMinute: 9 * 60, closeMinute: 20 * 60 },
          { weekday: 3, openMinute: 9 * 60, closeMinute: 20 * 60 },
          { weekday: 4, openMinute: 9 * 60, closeMinute: 21 * 60 },
          { weekday: 5, openMinute: 9 * 60, closeMinute: 21 * 60 },
          { weekday: 6, openMinute: 8 * 60, closeMinute: 18 * 60 },
        ],
      },
    },
  });

  // ------------------------------------------------------------ servicos
  //
  // TODO [A DEFINIR] PENDENCIAS.servicos — cardapio e precos NAO confirmados.
  // Os nomes seguem o vocabulario da marca (barboterapia, visagismo, cortes);
  // os valores e duracoes sao de trabalho, para o agendamento ter o que somar
  // e o que reservar na agenda. Enquanto a pendencia estiver aberta, o site
  // publico mostra <AConfirmar /> no lugar do preco.
  console.log("Criando catalogo de serviços...");
  const serviceSeed = [
    {
      name: "Corte Mandu",
      slug: "corte-mandu",
      category: "CABELO",
      description: "Corte na tesoura e máquina, finalizado com toalha quente e pomada.",
      durationMinutes: 45,
      bufferMinutes: 5,
      priceCents: 7000,
      featured: true,
      displayOrder: 1,
    },
    {
      name: "Corte Social",
      slug: "corte-social",
      category: "CABELO",
      description: "Corte clássico, alinhado e discreto. Para quem quer sempre o mesmo padrão.",
      durationMinutes: 30,
      bufferMinutes: 5,
      priceCents: 5500,
      displayOrder: 2,
    },
    {
      name: "Barba Terapia",
      slug: "barba-terapia",
      category: "BARBA",
      description: "Toalha quente, navalha, óleo e balm. Trinta minutos de descanso de verdade.",
      durationMinutes: 30,
      bufferMinutes: 5,
      priceCents: 5000,
      featured: true,
      displayOrder: 3,
    },
    {
      name: "Barba Express",
      slug: "barba-express",
      category: "BARBA",
      description: "Alinhamento rápido de contorno e pescoço.",
      durationMinutes: 20,
      priceCents: 3500,
      displayOrder: 4,
    },
    {
      name: "Combo Mandu",
      slug: "combo-mandu",
      category: "COMBO",
      description: "Corte Mandu + Barba Terapia. O pacote completo da casa.",
      durationMinutes: 70,
      bufferMinutes: 10,
      priceCents: 11000,
      featured: true,
      displayOrder: 5,
    },
    {
      name: "Pezinho",
      slug: "pezinho",
      category: "CABELO",
      description: "Acabamento de nuca e costeleta entre um corte e outro.",
      durationMinutes: 15,
      priceCents: 2500,
      displayOrder: 6,
    },
    {
      name: "Sobrancelha na navalha",
      slug: "sobrancelha",
      category: "ESTETICA",
      description: "Limpeza e desenho no formato do rosto.",
      durationMinutes: 15,
      priceCents: 2500,
      displayOrder: 7,
    },
    {
      name: "Pigmentação de barba",
      slug: "pigmentacao-barba",
      category: "ESTETICA",
      description: "Preenchimento de falhas com pigmento temporário.",
      durationMinutes: 40,
      bufferMinutes: 10,
      priceCents: 8000,
      displayOrder: 8,
    },
    {
      name: "Corte Kids",
      slug: "corte-kids",
      category: "INFANTIL",
      description: "Atendimento paciente para crianças até 10 anos, com cadeira alta.",
      durationMinutes: 30,
      bufferMinutes: 10,
      priceCents: 5000,
      displayOrder: 9,
    },
    {
      name: "Platinado",
      slug: "platinado",
      category: "ESTETICA",
      description: "Descoloração completa com matização e tratamento.",
      durationMinutes: 120,
      bufferMinutes: 15,
      priceCents: 22000,
      displayOrder: 10,
    },
  ];

  const services = await Promise.all(
    serviceSeed.map((data) => prisma.service.create({ data })),
  );
  const byslug = (slug: string) => {
    const found = services.find((s) => s.slug === slug);
    if (!found) throw new Error(`serviço ${slug} não encontrado`);
    return found;
  };

  // ---------------------------------------------------------------- equipe
  //
  // Nomes e cargos REAIS (confirmados). O que NAO e real e nao foi inventado:
  // headline, bio e especialidades ficam como [A DEFINIR] visivel, porque
  // biografia inventada de pessoa real e o tipo de texto que passa despercebido
  // numa revisao e vai ao ar como se a pessoa tivesse dito aquilo.
  console.log("Criando equipe...");

  const fundador = EQUIPE[0];
  const barbeiro = EQUIPE[1];
  const recepcao = EQUIPE[2];

  const owner = await prisma.user.create({
    data: {
      // Nome de exibicao: o nome completo nao cabe num cartao de escolha de
      // profissional. O nome de registro fica em EQUIPE, se precisar.
      name: fundador.nomeExibicao,
      // TODO [A DEFINIR] e-mail individual de acesso do proprietario. Ate la,
      // o acesso usa o e-mail institucional confirmado da empresa.
      email: EMPRESA.email,
      // TODO [A DEFINIR] telefone direto do proprietario. O fixo da loja serve
      // para o cadastro nao ficar vazio.
      phone: EMPRESA.telefones[0],
      passwordHash: password,
      role: "OWNER",
    },
  });

  // TODO [A DEFINIR] PENDENCIAS.cargoRecepcao — a Maria Mandu (recepcao, desde
  // 10/2024) NAO entra como BarberProfile de proposito: isso a colocaria no
  // fluxo de agendamento como se cortasse cabelo. O sistema so tem CLIENT,
  // BARBER e OWNER; para ela operar a agenda sem virar profissional, e preciso
  // criar o cargo Recepcao (mudanca de banco e de permissao, nao de texto).
  // Ela aparece no site, na secao de equipe, a partir de EQUIPE.
  void recepcao;

  const barberSeed = [
    {
      name: fundador.nomeExibicao,
      email: owner.email,
      // TODO [A DEFINIR] PENDENCIAS.apresentacaoEquipe — como o João Vitor
      // quer ser apresentado. Fica NULL, e nao com um texto "[A DEFINIR]":
      // este campo aparece dentro do fluxo de agendamento, onde marcador de
      // obra vira ruido para o cliente. A pendencia e sinalizada no site, na
      // secao de equipe.
      headline: null,
      bio: null,
      specialties: [] as string[],
      phone: null,
      commissionPercent: 100,
      color: "#3f3f45",
      existingUserId: owner.id,
      desde: new Date(EMPRESA.ativaDesde),
      // TODO [A DEFINIR] PENDENCIAS.servicos — quais servicos cada profissional
      // atende. Por ora todos atendem tudo, senao nao ha o que agendar.
      services: ["corte-mandu", "corte-social", "barba-terapia", "barba-express", "combo-mandu", "pezinho", "sobrancelha"],
      hours: { weekdays: [{ start: 9 * 60, end: 19 * 60 }], saturday: [{ start: 8 * 60, end: 16 * 60 }] },
    },
    {
      name: barbeiro.nomeExibicao,
      // TODO [A DEFINIR] e-mail de acesso do Patrick.
      email: "patrick@mrmandubarber.com.br",
      // TODO [A DEFINIR] telefone do Patrick.
      phone: null,
      headline: null,
      bio: null,
      specialties: [] as string[],
      commissionPercent: 50,
      color: "#7c7c83",
      desde: new Date("2022-05-01"),
      services: ["corte-mandu", "corte-social", "barba-terapia", "barba-express", "combo-mandu", "pezinho", "platinado", "sobrancelha", "pigmentacao-barba", "corte-kids"],
      hours: { weekdays: [{ start: 10 * 60, end: 20 * 60 }], saturday: [{ start: 9 * 60, end: 18 * 60 }] },
    },
  ];

  const barbers = [] as { id: string; userId: string; name: string }[];

  for (const [index, seed] of barberSeed.entries()) {
    const userId =
      seed.existingUserId ??
      (
        await prisma.user.create({
          data: {
            name: seed.name,
            email: seed.email,
            phone: seed.phone,
            passwordHash: password,
            role: "BARBER",
          },
        })
      ).id;

    const profile = await prisma.barberProfile.create({
      data: {
        userId,
        headline: seed.headline,
        bio: seed.bio,
        specialties: JSON.stringify(seed.specialties),
        commissionPercent: seed.commissionPercent,
        agendaColor: seed.color,
        displayOrder: index,
        // Datas reais: o fundador desde a abertura da empresa, o Patrick desde
        // maio/2022 (ambos confirmados).
        startedAt: seed.desde,
      },
    });

    for (const slug of seed.services) {
      await prisma.barberService.create({
        data: { barberId: profile.id, serviceId: byslug(slug).id },
      });
    }

    for (let weekday = 1; weekday <= 5; weekday++) {
      for (const block of seed.hours.weekdays) {
        await prisma.workingHour.create({
          data: { barberId: profile.id, weekday, startMinute: block.start, endMinute: block.end },
        });
      }
    }
    for (const block of seed.hours.saturday) {
      await prisma.workingHour.create({
        data: { barberId: profile.id, weekday: 6, startMinute: block.start, endMinute: block.end },
      });
    }

    barbers.push({ id: profile.id, userId, name: seed.name });
  }

  /**
   * A agenda de demonstracao referencia profissionais por posicao. A equipe
   * real tem duas pessoas na cadeira hoje e pode crescer; o resto por tamanho
   * evita que um seed quebre so porque alguem entrou ou saiu do time.
   */
  const prof = (i: number) => barbers[i % barbers.length];

  // Ferias reais na agenda, para o painel mostrar bloqueio de verdade.
  await prisma.timeOff.create({
    data: {
      barberId: prof(1).id,
      title: "Férias",
      type: "VACATION",
      startsAt: localDateTime(21, 0),
      endsAt: localDateTime(28, 0),
    },
  });
  await prisma.timeOff.create({
    data: {
      barberId: null,
      title: "Manutenção da loja",
      type: "HOLIDAY",
      startsAt: localDateTime(14, 0),
      endsAt: localDateTime(15, 0),
    },
  });

  // ----------------------------------------------------------------- planos
  //
  // TODO [A DEFINIR] PENDENCIAS.planos — a assinatura e o diferencial da casa
  // ("a primeira barbearia por assinatura de Embu-Guaçu"), mas nem os valores
  // nem o que entra em cada plano foram confirmados.
  //
  // TODO [A DEFINIR] PENDENCIAS.diasDaAssinatura — a marca ja divulga que os
  // creditos valem "somente em dias especificos da semana". Isso NAO esta
  // implementado: hoje o credito vale em qualquer dia. Quando os dias vierem,
  // e regra de negocio no agendamento, nao so texto na pagina.
  console.log("Criando planos...");
  const planEssencial = await prisma.plan.create({
    data: {
      name: "Mandu Essencial",
      slug: "essencial",
      tagline: "Para quem corta todo mês, sem falta.",
      description: "Dois cortes por mês e desconto no resto do cardápio.",
      priceCents: 11900,
      extraDiscountPercent: 10,
      accentColor: "#7fa66a",
      displayOrder: 1,
      perks: JSON.stringify([
        "2 cortes por mês",
        "10% de desconto nos demais serviços",
        "Reagendamento sem burocracia",
      ]),
      benefits: { create: [{ serviceId: byslug("corte-mandu").id, quantityPerCycle: 2 }] },
    },
  });

  const planPrime = await prisma.plan.create({
    data: {
      name: "Mandu Prime",
      slug: "prime",
      tagline: "Cabelo e barba sempre em dia.",
      description: "Quatro cortes e duas barbas por mês, com prioridade de horário.",
      priceCents: 21900,
      extraDiscountPercent: 15,
      priorityBooking: true,
      allowRollover: true,
      maxRolloverCredits: 2,
      accentColor: "#c98b3a",
      highlight: true,
      displayOrder: 2,
      perks: JSON.stringify([
        "4 cortes por mês",
        "2 barbas terapia por mês",
        "15% nos demais serviços",
        "Prioridade em horários de pico",
        "Até 2 créditos acumulam para o mês seguinte",
      ]),
      benefits: {
        create: [
          { serviceId: byslug("corte-mandu").id, quantityPerCycle: 4 },
          { serviceId: byslug("barba-terapia").id, quantityPerCycle: 2 },
        ],
      },
    },
  });

  const planBlack = await prisma.plan.create({
    data: {
      name: "Mandu Black",
      slug: "black",
      tagline: "Ilimitado. Entre quando quiser.",
      description: "Corte e barba sem limite, mais estética com desconto pesado.",
      priceCents: 34900,
      extraDiscountPercent: 25,
      priorityBooking: true,
      accentColor: "#131110",
      displayOrder: 3,
      perks: JSON.stringify([
        "Cortes ilimitados",
        "Barba terapia ilimitada",
        "25% em estética e química",
        "Prioridade máxima na agenda",
        "Bebida cortesia em todo atendimento",
      ]),
      benefits: {
        create: [
          { serviceId: byslug("corte-mandu").id, quantityPerCycle: -1 },
          { serviceId: byslug("barba-terapia").id, quantityPerCycle: -1 },
        ],
      },
    },
  });

  // --------------------------------------------------------------- clientes
  console.log("Criando clientes...");
  const clientSeed = [
    ["André Lopes", "andre.lopes@email.com", "11988880001"],
    ["Felipe Moreira", "felipe.moreira@email.com", "11988880002"],
    ["Gustavo Prado", "gustavo.prado@email.com", "11988880003"],
    ["Henrique Sá", "henrique.sa@email.com", "11988880004"],
    ["Igor Bastos", "igor.bastos@email.com", "11988880005"],
    ["João Vitor Reis", "joao.reis@email.com", "11988880006"],
    ["Leandro Cunha", "leandro.cunha@email.com", "11988880007"],
    ["Marcelo Dias", "marcelo.dias@email.com", "11988880008"],
    ["Nelson Araújo", "nelson.araujo@email.com", "11988880009"],
    ["Otávio Ramos", "otavio.ramos@email.com", "11988880010"],
    ["Paulo Serra", "paulo.serra@email.com", "11988880011"],
    ["Rafael Antunes", "rafael.antunes@email.com", "11988880012"],
    ["Samuel Krause", "samuel.krause@email.com", "11988880013"],
    ["Thiago Bertoldo", "thiago.bertoldo@email.com", "11988880014"],
    ["Vinícius Amaral", "vinicius.amaral@email.com", "11988880015"],
    ["Wagner Lisboa", "wagner.lisboa@email.com", "11988880016"],
  ];

  const clients = [];
  for (const [name, email, phone] of clientSeed) {
    clients.push(
      await prisma.user.create({
        data: { name, email, phone, passwordHash: password, role: "CLIENT" },
      }),
    );
  }

  // Cliente de demonstracao, com plano e historico — e a conta que se mostra.
  const demo = await prisma.user.create({
    data: {
      name: "Tiago Fontes",
      email: "cliente@mandubarber.com.br",
      phone: "11987650000",
      passwordHash: password,
      role: "CLIENT",
      notes: "Prefere máquina 2 nas laterais. Sempre pede café sem açúcar.",
    },
  });
  clients.unshift(demo);

  // ---------------------------------------------------------- assinaturas
  console.log("Criando assinaturas...");
  const plans = [planPrime, planEssencial, planBlack];
  const subscribers = [demo, ...clients.slice(1, 7)];

  for (const [index, client] of subscribers.entries()) {
    const plan = index === 0 ? planPrime : pick(plans, index);
    const start = localDateTime(-((index % 20) + 5), 10);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);

    const subscription = await prisma.subscription.create({
      data: {
        clientId: client.id,
        planId: plan.id,
        priceCents: plan.priceCents,
        status: "ACTIVE",
        startedAt: start,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        paymentMethod: index % 2 === 0 ? "PIX" : "CARD",
      },
    });

    const benefits = await prisma.planBenefit.findMany({ where: { planId: plan.id } });
    for (const benefit of benefits) {
      await prisma.subscriptionCredit.create({
        data: {
          subscriptionId: subscription.id,
          serviceId: benefit.serviceId,
          cycleStart: start,
          cycleEnd: end,
          total: benefit.quantityPerCycle,
          used: benefit.quantityPerCycle > 1 && index % 3 === 0 ? 1 : 0,
        },
      });
    }

    await prisma.invoice.create({
      data: {
        clientId: client.id,
        subscriptionId: subscription.id,
        description: `Assinatura ${plan.name}`,
        amountCents: plan.priceCents,
        status: index % 5 === 4 ? "OPEN" : "PAID",
        dueDate: start,
        paidAt: index % 5 === 4 ? null : start,
        periodStart: start,
        periodEnd: end,
        ...(index % 5 === 4
          ? {}
          : {
              payments: {
                create: {
                  amountCents: plan.priceCents,
                  method: index % 2 === 0 ? "PIX" : "CARD",
                  paidAt: start,
                },
              },
            }),
      },
    });
  }

  // -------------------------------------------------------- agendamentos
  console.log("Criando agenda...");
  const comboIds = [
    ["corte-mandu"],
    ["corte-social"],
    ["barba-terapia"],
    ["combo-mandu"],
    ["corte-mandu", "sobrancelha"],
    ["corte-kids"],
    ["barba-express"],
    ["corte-mandu", "barba-express"],
  ];

  let codeCounter = 1000;
  const nextCode = () => `MB-${(codeCounter++).toString(36).toUpperCase().padStart(5, "0")}`;

  async function createAppointment(params: {
    clientId: string;
    barberId: string;
    slugs: string[];
    daysFromToday: number;
    hour: number;
    minute: number;
    status: string;
    paid?: boolean;
    withReview?: { rating: number; comment: string };
  }) {
    const chosen = params.slugs.map(byslug);
    const duration = chosen.reduce((sum, s) => sum + s.durationMinutes, 0);
    const startsAt = localDateTime(params.daysFromToday, params.hour, params.minute);
    const endsAt = new Date(startsAt.getTime() + duration * 60_000);
    const subtotal = chosen.reduce((sum, s) => sum + s.priceCents, 0);

    const appointment = await prisma.appointment.create({
      data: {
        code: nextCode(),
        clientId: params.clientId,
        barberId: params.barberId,
        status: params.status,
        startsAt,
        endsAt,
        subtotalCents: subtotal,
        discountCents: 0,
        totalCents: subtotal,
        paymentStatus: params.paid ? "PAID" : "PENDING",
        source: params.daysFromToday % 3 === 0 ? "PANEL" : "ONLINE",
        services: {
          create: chosen.map((s) => ({
            serviceId: s.id,
            name: s.name,
            priceCents: s.priceCents,
            durationMinutes: s.durationMinutes,
          })),
        },
        ...(params.paid
          ? {
              payments: {
                create: {
                  amountCents: subtotal,
                  method: pick(["PIX", "CARD", "CASH"], params.daysFromToday),
                  paidAt: endsAt,
                },
              },
            }
          : {}),
        ...(params.status === "COMPLETED" ? { completedAt: endsAt, checkedInAt: startsAt } : {}),
      },
    });

    if (params.withReview) {
      await prisma.review.create({
        data: {
          appointmentId: appointment.id,
          clientId: params.clientId,
          barberId: params.barberId,
          rating: params.withReview.rating,
          comment: params.withReview.comment,
          createdAt: new Date(endsAt.getTime() + 3_600_000),
        },
      });
    }

    return appointment;
  }

  const reviewComments = [
    "Melhor degradê que já fiz. Saio de lá parecendo outro.",
    "Atendimento no horário, sem enrolação. Voltarei.",
    "A barba com toalha quente vale cada centavo.",
    "Ambiente impecável e café bom.",
    "Cortou exatamente como pedi, na primeira explicação.",
    "Meu filho não chorou pela primeira vez. Já virou nosso lugar.",
  ];

  // Historico: 8 semanas para tras, movimento crescente.
  let created = 0;
  for (let day = 56; day >= 1; day--) {
    const weekday = localWeekday(-day);
    if (weekday === 0) continue;

    const volume = 4 + Math.floor((56 - day) / 12) + (weekday === 6 ? 3 : 0);
    for (let i = 0; i < volume; i++) {
      const barber = pick(barbers, day + i);
      const client = pick(clients, day * 3 + i * 5);
      const slugs = pick(comboIds, day + i * 2).filter((slug) =>
        barberSeed.find((b) => b.name === barber.name)?.services.includes(slug),
      );
      if (slugs.length === 0) continue;

      const hour = 9 + ((i * 2 + day) % 9);
      const minute = pick([0, 15, 30, 45], i);
      const noShow = (day + i) % 23 === 0;

      await createAppointment({
        clientId: client.id,
        barberId: barber.id,
        slugs,
        daysFromToday: -day,
        hour,
        minute,
        status: noShow ? "NO_SHOW" : "COMPLETED",
        paid: !noShow,
        withReview:
          !noShow && (day + i) % 7 === 0
            ? { rating: (day + i) % 13 === 0 ? 4 : 5, comment: pick(reviewComments, day + i) }
            : undefined,
      });
      created++;
    }
  }

  // Futuro: proximos 12 dias com agenda parcialmente ocupada.
  for (let day = 0; day <= 12; day++) {
    const weekday = localWeekday(day);
    if (weekday === 0) continue;

    const volume = 3 + (weekday === 6 ? 3 : 0) + (day < 3 ? 2 : 0);
    for (let i = 0; i < volume; i++) {
      const barber = pick(barbers, day * 2 + i);
      const client = pick(clients, day * 7 + i * 3);
      const slugs = pick(comboIds, day * 3 + i).filter((slug) =>
        barberSeed.find((b) => b.name === barber.name)?.services.includes(slug),
      );
      if (slugs.length === 0) continue;

      const hour = 10 + ((i * 3 + day) % 8);
      await createAppointment({
        clientId: client.id,
        barberId: barber.id,
        slugs,
        daysFromToday: day,
        hour,
        minute: pick([0, 30], i),
        status: day === 0 && hour < 12 ? "CONFIRMED" : "SCHEDULED",
      });
      created++;
    }
  }

  // Agendamentos garantidos para a conta de demonstracao.
  await createAppointment({
    clientId: demo.id,
    barberId: prof(0).id,
    slugs: ["combo-mandu"],
    daysFromToday: 2,
    hour: 15,
    minute: 0,
    status: "SCHEDULED",
  });
  await createAppointment({
    clientId: demo.id,
    barberId: prof(2).id,
    slugs: ["barba-terapia"],
    daysFromToday: -9,
    hour: 17,
    minute: 30,
    status: "COMPLETED",
    paid: true,
    // Avaliacao de apoio, para o painel de avaliacoes nao abrir vazio. NAO vai
    // ao ar: a home so publica depoimento quando PENDENCIAS.depoimentos fechar.
    withReview: { rating: 5, comment: "Ritual completo. Saí renovado." },
  });

  await prisma.notification.create({
    data: {
      userId: demo.id,
      type: "SUBSCRIPTION",
      title: "Plano Mandu Prime ativo",
      body: "Você tem créditos disponíveis neste ciclo. Aproveite.",
      link: "/minha-conta/plano",
    },
  });

  console.log(`\nPronto. ${created + 2} agendamentos, ${clients.length} clientes, ${barbers.length} profissionais.`);
  console.log("\nAcessos de demonstracao (senha: mandu123)");
  console.log(`  Gestor:        ${owner.email}`);
  console.log("  Cliente:       cliente@mandubarber.com.br");
  console.log(
    "\n  ATENCAO: a conta de gestor usa o e-mail real da empresa com a senha\n" +
      "  de demonstracao. TROQUE esta senha antes de qualquer ambiente publico —\n" +
      "  ela da acesso total ao painel da barbearia.",
  );
}

// Executado direto pela linha de comando (npm run db:seed). Quando importado
// pelo bootstrap, apenas a funcao `seed` e usada.
if (process.argv[1]?.endsWith("seed.ts")) {
  seed()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
