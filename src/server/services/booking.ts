import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db";
import { ACTIVE_APPOINTMENT_STATUSES, type AppointmentSource } from "@/lib/enums";
import { priceAppointment, type PriceableService } from "@/lib/pricing";
import { addMinutes, formatDateTime, zonedDateTime } from "@/lib/time";
import {
  resolveServicesForBarber,
  sumDuration,
  trailingBuffer,
  getDayAvailability,
} from "./availability";
import { getShopConfig } from "./settings";
import { consumeCredits, getActiveSubscription, refundCredits } from "./subscriptions";
import { notify, notifyStaff } from "./notifications";
import { audit } from "./audit";

type Db = PrismaClient | Prisma.TransactionClient;

/** Erro de regra de negocio: a mensagem e segura para mostrar ao usuario. */
export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I, O, 0, 1

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `MB-${code}`;
}

export type CreateAppointmentInput = {
  clientId: string;
  /** null = deixar o sistema escolher o profissional livre no horario. */
  barberId: string | null;
  serviceIds: string[];
  dateISO: string;
  /** Minutos desde a meia-noite no fuso da loja. */
  minute: number;
  source?: AppointmentSource;
  clientNotes?: string | null;
  internalNotes?: string | null;
  /** Consumir a franquia do plano quando houver saldo. */
  usePlan?: boolean;
  /** Painel pode agendar fora da antecedencia minima. */
  ignoreLeadTime?: boolean;
  actorId?: string;
};

/**
 * Cria um agendamento de ponta a ponta: escolhe o profissional se necessario,
 * calcula preco com plano, revalida o conflito dentro da transacao e avisa
 * cliente e equipe.
 *
 * A revalidacao dentro da transacao e o que impede a corrida classica de dois
 * clientes fechando o mesmo horario com a tela aberta ao mesmo tempo.
 */
export async function createAppointment(input: CreateAppointmentInput) {
  const shop = await getShopConfig();

  if (input.serviceIds.length === 0) {
    throw new BookingError("Escolha pelo menos um serviço.");
  }

  const availability = await getDayAvailability({
    dateISO: input.dateISO,
    serviceIds: input.serviceIds,
    barberId: input.barberId,
    ignoreLeadTime: input.ignoreLeadTime,
  });

  const slot = availability.slots.find((s) => s.minute === input.minute);
  if (!slot) {
    throw new BookingError(
      "Este horário acabou de ser preenchido. Escolha outro horário disponível.",
    );
  }

  const barberId = input.barberId ?? pickBarber(slot.barberIds);
  if (!slot.barberIds.includes(barberId)) {
    throw new BookingError("O profissional escolhido não esta livre neste horário.");
  }

  const services = await prisma.service.findMany({
    where: { id: { in: input.serviceIds }, active: true },
    include: { barbers: { select: { barberId: true, priceCents: true, durationMinutes: true } } },
  });
  if (services.length !== new Set(input.serviceIds).size) {
    throw new BookingError("Um dos serviços escolhidos não esta mais disponível.");
  }

  const resolved = resolveServicesForBarber(services, barberId);
  const duration = sumDuration(resolved);
  const startsAt = zonedDateTime(input.dateISO, input.minute, shop.timezone);
  const endsAt = addMinutes(startsAt, duration);

  const subscription = input.usePlan === false ? null : await getActiveSubscription(input.clientId);
  const priceable: PriceableService[] = resolved.map((s) => ({
    id: s.id,
    name: s.name,
    priceCents: s.priceCents,
    durationMinutes: s.durationMinutes,
  }));

  const pricing = subscription
    ? priceAppointment(priceable, subscription.credits, {
        extraDiscountPercent: subscription.extraDiscountPercent,
      })
    : priceAppointment(priceable, [], null);

  const appointment = await prisma.$transaction(async (tx) => {
    await assertSlotFree(tx, {
      barberId,
      startsAt,
      endsAt: addMinutes(endsAt, trailingBuffer(resolved)),
    });

    const created = await tx.appointment.create({
      data: {
        code: generateCode(),
        clientId: input.clientId,
        barberId,
        status: "SCHEDULED",
        startsAt,
        endsAt,
        subtotalCents: pricing.subtotalCents,
        discountCents: pricing.discountCents,
        totalCents: pricing.totalCents,
        paymentStatus: pricing.totalCents === 0 ? "WAIVED" : "PENDING",
        subscriptionId: pricing.usedPlan ? subscription?.id ?? null : null,
        source: input.source ?? "ONLINE",
        clientNotes: input.clientNotes?.trim() || null,
        internalNotes: input.internalNotes?.trim() || null,
        services: {
          create: pricing.charges.map((charge) => ({
            serviceId: charge.serviceId,
            name: charge.name,
            priceCents: charge.chargedCents,
            durationMinutes: charge.durationMinutes,
            coveredByPlan: charge.coveredByPlan,
          })),
        },
      },
      include: appointmentInclude,
    });

    if (subscription && pricing.creditsToConsume.length > 0) {
      await consumeCredits(tx, {
        subscriptionId: subscription.id,
        cycleStart: subscription.currentPeriodStart,
        appointmentId: created.id,
        items: pricing.creditsToConsume,
      });
    }

    await audit(tx, {
      actorId: input.actorId ?? input.clientId,
      action: "appointment.create",
      entity: "Appointment",
      entityId: created.id,
      meta: { code: created.code, barberId, totalCents: pricing.totalCents },
    });

    return created;
  });

  const when = formatDateTime(appointment.startsAt, shop.timezone);
  await notify(prisma, {
    userId: appointment.clientId,
    type: "APPOINTMENT_CONFIRMED",
    title: "Agendamento confirmado",
    body: `${serviceNames(appointment)} com ${appointment.barber.user.name} em ${when}.`,
    link: `/minha-conta/agendamentos/${appointment.id}`,
  });
  await notifyStaff(prisma, {
    type: "APPOINTMENT_CONFIRMED",
    title: "Novo agendamento",
    body: `${appointment.client.name} — ${serviceNames(appointment)} em ${when}.`,
    link: `/painel/agenda?data=${input.dateISO}`,
    barberId,
  });

  return appointment;
}

/**
 * Cancela e devolve a franquia consumida. Cliente respeita a janela de
 * cancelamento configurada; a equipe pode cancelar a qualquer momento (ha
 * casos reais — cliente ligou, barbeiro passou mal — que a regra nao cobre).
 */
export async function cancelAppointment(params: {
  appointmentId: string;
  actorId: string;
  actorIsStaff: boolean;
  reason?: string | null;
}) {
  const shop = await getShopConfig();

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: appointmentInclude,
  });
  if (!appointment) throw new BookingError("Agendamento não encontrado.");
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status as never)) {
    throw new BookingError("Este agendamento já foi encerrado.");
  }

  if (!params.actorIsStaff) {
    const limit = appointment.startsAt.getTime() - shop.cancellationWindowHours * 3_600_000;
    if (Date.now() > limit) {
      throw new BookingError(
        `Cancelamentos online são aceitos até ${shop.cancellationWindowHours}h antes. Fale com a barbearia pelo WhatsApp.`,
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await refundCredits(tx, appointment.id);

    const result = await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        canceledById: params.actorId,
        cancelReason: params.reason?.trim() || null,
        paymentStatus: appointment.paymentStatus === "PAID" ? "REFUNDED" : "PENDING",
      },
      include: appointmentInclude,
    });

    await audit(tx, {
      actorId: params.actorId,
      action: "appointment.cancel",
      entity: "Appointment",
      entityId: appointment.id,
      meta: { code: appointment.code, byStaff: params.actorIsStaff },
    });

    return result;
  });

  const when = formatDateTime(appointment.startsAt, shop.timezone);
  const target = params.actorId === appointment.clientId ? null : appointment.clientId;
  if (target) {
    await notify(prisma, {
      userId: target,
      type: "APPOINTMENT_CANCELED",
      title: "Agendamento cancelado",
      body: `Seu horário de ${when} foi cancelado.${params.reason ? ` Motivo: ${params.reason}` : ""}`,
      link: "/minha-conta/agendamentos",
    });
  }
  await notifyStaff(prisma, {
    type: "APPOINTMENT_CANCELED",
    title: "Agendamento cancelado",
    body: `${appointment.client.name} — ${when}.`,
    link: "/painel/agenda",
    barberId: appointment.barberId,
  });

  return updated;
}

/**
 * Remarca preservando preco e franquia ja consumida — o cliente nao perde o
 * credito por trocar de horario, e o novo horario e validado como um
 * agendamento novo.
 */
export async function rescheduleAppointment(params: {
  appointmentId: string;
  dateISO: string;
  minute: number;
  barberId?: string | null;
  actorId: string;
  actorIsStaff: boolean;
}) {
  const shop = await getShopConfig();

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: appointmentInclude,
  });
  if (!appointment) throw new BookingError("Agendamento não encontrado.");
  if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status as never)) {
    throw new BookingError("Somente agendamentos ativos podem ser remarcados.");
  }

  const serviceIds = appointment.services.map((s) => s.serviceId);
  const availability = await getDayAvailability({
    dateISO: params.dateISO,
    serviceIds,
    barberId: params.barberId ?? appointment.barberId,
    excludeAppointmentId: appointment.id,
    ignoreLeadTime: params.actorIsStaff,
  });

  const slot = availability.slots.find((s) => s.minute === params.minute);
  if (!slot) throw new BookingError("Horário indisponível para remarcação.");

  const barberId = params.barberId ?? appointment.barberId;
  if (!slot.barberIds.includes(barberId)) {
    throw new BookingError("O profissional não esta livre neste horário.");
  }

  const duration = appointment.services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const startsAt = zonedDateTime(params.dateISO, params.minute, shop.timezone);
  const endsAt = addMinutes(startsAt, duration);

  const updated = await prisma.$transaction(async (tx) => {
    await assertSlotFree(tx, { barberId, startsAt, endsAt, ignoreId: appointment.id });

    const result = await tx.appointment.update({
      where: { id: appointment.id },
      data: { startsAt, endsAt, barberId, status: "SCHEDULED", reminderSentAt: null },
      include: appointmentInclude,
    });

    await audit(tx, {
      actorId: params.actorId,
      action: "appointment.reschedule",
      entity: "Appointment",
      entityId: appointment.id,
      meta: { from: appointment.startsAt.toISOString(), to: startsAt.toISOString() },
    });

    return result;
  });

  await notify(prisma, {
    userId: appointment.clientId,
    type: "APPOINTMENT_RESCHEDULED",
    title: "Agendamento remarcado",
    body: `Novo horário: ${formatDateTime(startsAt, shop.timezone)}.`,
    link: `/minha-conta/agendamentos/${appointment.id}`,
  });

  return updated;
}

/** Transicoes de atendimento operadas pelo painel. */
export async function setAppointmentStatus(params: {
  appointmentId: string;
  status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW";
  actorId: string;
  paymentMethod?: string | null;
  amountCents?: number | null;
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: appointmentInclude,
  });
  if (!appointment) throw new BookingError("Agendamento não encontrado.");

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const data: Prisma.AppointmentUpdateInput = { status: params.status };

    if (params.status === "IN_PROGRESS") data.checkedInAt = now;
    if (params.status === "COMPLETED") {
      data.completedAt = now;
      if (!appointment.checkedInAt) data.checkedInAt = now;

      const amount = params.amountCents ?? appointment.totalCents;
      if (amount > 0 && params.paymentMethod) {
        data.paymentStatus = "PAID";
        await tx.payment.create({
          data: {
            appointmentId: appointment.id,
            amountCents: amount,
            method: params.paymentMethod,
            receivedById: params.actorId,
          },
        });
      } else if (amount === 0) {
        data.paymentStatus = "WAIVED";
      }
    }
    if (params.status === "NO_SHOW") {
      // Falta nao devolve credito: o horario ficou parado do mesmo jeito.
      data.completedAt = null;
    }

    const updated = await tx.appointment.update({
      where: { id: appointment.id },
      data,
      include: appointmentInclude,
    });

    await audit(tx, {
      actorId: params.actorId,
      action: `appointment.${params.status.toLowerCase()}`,
      entity: "Appointment",
      entityId: appointment.id,
      meta: { code: appointment.code },
    });

    return updated;
  });
}

/**
 * Guarda transacional contra sobreposicao. E a ultima linha de defesa: a UI ja
 * filtrou os horarios, mas duas abas simultaneas chegam aqui juntas.
 */
async function assertSlotFree(
  db: Db,
  params: { barberId: string; startsAt: Date; endsAt: Date; ignoreId?: string },
) {
  const conflict = await db.appointment.findFirst({
    where: {
      barberId: params.barberId,
      status: { in: ACTIVE_APPOINTMENT_STATUSES },
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
      ...(params.ignoreId ? { id: { not: params.ignoreId } } : {}),
    },
    select: { id: true },
  });
  if (conflict) {
    throw new BookingError("Este horário acabou de ser preenchido. Escolha outro.");
  }

  const blocked = await db.timeOff.findFirst({
    where: {
      OR: [{ barberId: params.barberId }, { barberId: null }],
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
    },
    select: { id: true },
  });
  if (blocked) {
    throw new BookingError("A agenda esta bloqueada neste horário.");
  }
}

/** Distribui "qualquer profissional" de forma justa em vez de sempre o primeiro. */
function pickBarber(barberIds: string[]): string {
  if (barberIds.length === 0) throw new BookingError("Nenhum profissional disponível.");
  return barberIds[Math.floor(Math.random() * barberIds.length)];
}

function serviceNames(appointment: { services: { name: string }[] }): string {
  return appointment.services.map((s) => s.name).join(" + ");
}

export const appointmentInclude = {
  client: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
  barber: {
    select: {
      id: true,
      agendaColor: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  },
  services: true,
  review: true,
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;
