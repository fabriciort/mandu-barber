import "server-only";

import { prisma } from "@/server/db";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/enums";
import {
  generateSlots,
  intersectIntervals,
  mergeIntervals,
  subtractIntervals,
  containsInterval,
  type Interval,
} from "@/lib/intervals";
import {
  addDaysISO,
  dayBoundaries,
  diffInDaysISO,
  minutesOfDay,
  rangeBoundaries,
  todayKey,
  weekdayOf,
  zonedDateTime,
} from "@/lib/time";
import { getShopConfig, type ShopConfig } from "./settings";

export type ResolvedService = {
  id: string;
  name: string;
  durationMinutes: number;
  bufferMinutes: number;
  priceCents: number;
};

export type BarberSlot = {
  /** Minutos desde a meia-noite local. */
  minute: number;
  /** "09:30" — pronto para exibir. */
  label: string;
  /** Profissionais que conseguem atender neste horario. */
  barberIds: string[];
};

export type DayAvailability = {
  date: string;
  timezone: string;
  /** Duracao total do atendimento pedido (sem o buffer de limpeza). */
  durationMinutes: number;
  slots: BarberSlot[];
  /** Motivo de a lista vir vazia — a UI explica em vez de mostrar "nada aqui". */
  reason?: "CLOSED" | "PAST" | "TOO_FAR" | "NO_BARBER" | "FULL" | "BOOKING_DISABLED";
};

type BusyRow = { barberId: string; start: number; end: number };

/**
 * Resolve preco e duracao de cada servico para um profissional especifico,
 * respeitando as sobrescritas de BarberService.
 */
export function resolveServicesForBarber(
  services: {
    id: string;
    name: string;
    durationMinutes: number;
    bufferMinutes: number;
    priceCents: number;
    barbers: { barberId: string; priceCents: number | null; durationMinutes: number | null }[];
  }[],
  barberId: string,
): ResolvedService[] {
  return services.map((service) => {
    const override = service.barbers.find((b) => b.barberId === barberId);
    return {
      id: service.id,
      name: service.name,
      durationMinutes: override?.durationMinutes ?? service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      priceCents: override?.priceCents ?? service.priceCents,
    };
  });
}

export function sumDuration(services: ResolvedService[]): number {
  return services.reduce((total, s) => total + s.durationMinutes, 0);
}

export function sumPrice(services: ResolvedService[]): number {
  return services.reduce((total, s) => total + s.priceCents, 0);
}

/** Buffer de limpeza do ultimo servico: bloqueia a agenda sem alongar o atendimento. */
export function trailingBuffer(services: ResolvedService[]): number {
  return services.length === 0 ? 0 : Math.max(...services.map((s) => s.bufferMinutes));
}

type AvailabilityInput = {
  dateISO: string;
  serviceIds: string[];
  /** null = "qualquer profissional" */
  barberId?: string | null;
  /** Ignora um agendamento existente (usado ao remarcar). */
  excludeAppointmentId?: string;
  /** Permite ignorar antecedencia minima e bloqueio de canal online (painel). */
  ignoreLeadTime?: boolean;
  now?: Date;
};

/**
 * Grade de horarios de um dia.
 *
 * Regras aplicadas, nesta ordem:
 *  1. canal online habilitado e data dentro da janela permitida;
 *  2. jornada da loja no dia da semana;
 *  3. jornada do profissional (interseccao com a da loja);
 *  4. menos agendamentos ativos (com o buffer do ultimo servico);
 *  5. menos bloqueios do profissional e da loja inteira;
 *  6. o atendimento precisa caber inteiro em uma unica janela livre;
 *  7. antecedencia minima a partir de agora.
 */
export async function getDayAvailability(input: AvailabilityInput): Promise<DayAvailability> {
  const shop = await getShopConfig();
  const now = input.now ?? new Date();
  const { dateISO } = input;

  const base: DayAvailability = {
    date: dateISO,
    timezone: shop.timezone,
    durationMinutes: 0,
    slots: [],
  };

  if (!shop.allowOnlineBooking && !input.ignoreLeadTime) {
    return { ...base, reason: "BOOKING_DISABLED" };
  }

  const today = todayKey(shop.timezone, now);
  const dayOffset = diffInDaysISO(today, dateISO);
  if (dayOffset < 0) return { ...base, reason: "PAST" };
  if (!input.ignoreLeadTime && dayOffset > shop.maxAdvanceDays) {
    return { ...base, reason: "TOO_FAR" };
  }

  const weekday = weekdayOf(zonedDateTime(dateISO, 12 * 60, shop.timezone), shop.timezone);
  const shopHours = shop.businessHours[weekday] ?? [];
  if (shopHours.length === 0) return { ...base, reason: "CLOSED" };

  const services = await prisma.service.findMany({
    where: { id: { in: input.serviceIds }, active: true },
    include: { barbers: { select: { barberId: true, priceCents: true, durationMinutes: true } } },
  });
  if (services.length === 0 || services.length !== new Set(input.serviceIds).size) {
    return { ...base, reason: "NO_BARBER" };
  }

  // Somente profissionais habilitados em TODOS os servicos escolhidos.
  const barbers = await prisma.barberProfile.findMany({
    where: {
      active: true,
      ...(input.barberId ? { id: input.barberId } : { acceptsNewClients: true }),
      AND: services.map((service) => ({ services: { some: { serviceId: service.id } } })),
    },
    include: { workingHours: { where: { weekday } } },
    orderBy: { displayOrder: "asc" },
  });
  if (barbers.length === 0) return { ...base, reason: "NO_BARBER" };

  const { start: dayStart, end: dayEnd } = dayBoundaries(dateISO, shop.timezone);
  const barberIds = barbers.map((b) => b.id);

  const [appointments, timeOffs] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      },
      select: {
        barberId: true,
        startsAt: true,
        endsAt: true,
        services: { select: { service: { select: { bufferMinutes: true } } } },
      },
    }),
    prisma.timeOff.findMany({
      where: {
        OR: [{ barberId: { in: barberIds } }, { barberId: null }],
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const busy: BusyRow[] = [];
  for (const appt of appointments) {
    const buffer = appt.services.reduce(
      (max, s) => Math.max(max, s.service.bufferMinutes),
      0,
    );
    busy.push({
      barberId: appt.barberId,
      start: clampToDay(appt.startsAt, dayStart, dayEnd, shop.timezone, "start"),
      end: clampToDay(appt.endsAt, dayStart, dayEnd, shop.timezone, "end") + buffer,
    });
  }
  for (const off of timeOffs) {
    const row = {
      start: clampToDay(off.startsAt, dayStart, dayEnd, shop.timezone, "start"),
      end: clampToDay(off.endsAt, dayStart, dayEnd, shop.timezone, "end"),
    };
    if (off.barberId) busy.push({ barberId: off.barberId, ...row });
    else for (const id of barberIds) busy.push({ barberId: id, ...row });
  }

  const nowMinutes = todayKey(shop.timezone, now) === dateISO ? minutesOfDay(now, shop.timezone) : -Infinity;
  const notBefore = input.ignoreLeadTime ? nowMinutes : nowMinutes + shop.minLeadMinutes;

  const slotMap = new Map<number, string[]>();
  let maxDuration = 0;

  for (const barber of barbers) {
    const resolved = resolveServicesForBarber(services, barber.id);
    const duration = sumDuration(resolved);
    const buffer = trailingBuffer(resolved);
    maxDuration = Math.max(maxDuration, duration);

    const working = mergeIntervals(
      barber.workingHours.map((wh) => ({ start: wh.startMinute, end: wh.endMinute })),
    );
    if (working.length === 0) continue;

    const withinShop = intersectIntervals(shopHours, working);
    const barberBusy = busy.filter((b) => b.barberId === barber.id).map(toInterval);
    const free = subtractIntervals(withinShop, barberBusy);

    // A folga de limpeza precisa caber alem do atendimento, mas nao pode
    // impedir o ultimo horario do expediente: exigimos o buffer apenas contra
    // outros compromissos, nao contra o fim da jornada.
    const starts = generateSlots(free, {
      duration,
      step: shop.slotStepMinutes,
      notBefore,
    }).filter((minute) =>
      buffer === 0
        ? true
        : containsInterval(free, { start: minute, end: minute + duration }) &&
          !barberBusy.some((b) => b.start < minute + duration + buffer && minute < b.end),
    );

    for (const minute of starts) {
      const list = slotMap.get(minute) ?? [];
      list.push(barber.id);
      slotMap.set(minute, list);
    }
  }

  const slots: BarberSlot[] = [...slotMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([minute, barberIds]) => ({
      minute,
      label: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
      barberIds,
    }));

  return {
    ...base,
    durationMinutes: maxDuration,
    slots,
    reason: slots.length === 0 ? "FULL" : undefined,
  };
}

/**
 * Quantos horarios existem em cada dia de um intervalo — alimenta o calendario
 * do agendamento, que precisa mostrar de cara quais dias tem vaga.
 *
 * Roda um unico conjunto de consultas para todo o periodo e depois avalia os
 * dias em memoria.
 */
export async function getRangeAvailability(params: {
  fromISO: string;
  toISO: string;
  serviceIds: string[];
  barberId?: string | null;
  now?: Date;
}): Promise<Record<string, number>> {
  const shop = await getShopConfig();
  const now = params.now ?? new Date();
  const today = todayKey(shop.timezone, now);

  const services = await prisma.service.findMany({
    where: { id: { in: params.serviceIds }, active: true },
    include: { barbers: { select: { barberId: true, priceCents: true, durationMinutes: true } } },
  });
  if (services.length === 0) return {};

  const barbers = await prisma.barberProfile.findMany({
    where: {
      active: true,
      ...(params.barberId ? { id: params.barberId } : { acceptsNewClients: true }),
      AND: services.map((service) => ({ services: { some: { serviceId: service.id } } })),
    },
    include: { workingHours: true },
  });
  if (barbers.length === 0) return {};

  const barberIds = barbers.map((b) => b.id);
  const { start, end } = rangeBoundaries(params.fromISO, params.toISO, shop.timezone);

  const [appointments, timeOffs] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        status: { in: ACTIVE_APPOINTMENT_STATUSES },
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: {
        barberId: true,
        startsAt: true,
        endsAt: true,
        services: { select: { service: { select: { bufferMinutes: true } } } },
      },
    }),
    prisma.timeOff.findMany({
      where: {
        OR: [{ barberId: { in: barberIds } }, { barberId: null }],
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const result: Record<string, number> = {};
  const totalDays = diffInDaysISO(params.fromISO, params.toISO);

  for (let offset = 0; offset <= totalDays; offset++) {
    const dateISO = addDaysISO(params.fromISO, offset);
    const dayOffset = diffInDaysISO(today, dateISO);
    if (dayOffset < 0 || dayOffset > shop.maxAdvanceDays) {
      result[dateISO] = 0;
      continue;
    }

    const { start: dayStart, end: dayEnd } = dayBoundaries(dateISO, shop.timezone);
    const weekday = weekdayOf(zonedDateTime(dateISO, 12 * 60, shop.timezone), shop.timezone);
    const shopHours = shop.businessHours[weekday] ?? [];
    if (shopHours.length === 0) {
      result[dateISO] = 0;
      continue;
    }

    const nowMinutes = today === dateISO ? minutesOfDay(now, shop.timezone) : -Infinity;
    const notBefore = nowMinutes + shop.minLeadMinutes;

    const dayBusy = collectBusy(appointments, timeOffs, barberIds, dayStart, dayEnd, shop);
    const available = new Set<number>();

    for (const barber of barbers) {
      const resolved = resolveServicesForBarber(services, barber.id);
      const duration = sumDuration(resolved);
      const working = mergeIntervals(
        barber.workingHours
          .filter((wh) => wh.weekday === weekday)
          .map((wh) => ({ start: wh.startMinute, end: wh.endMinute })),
      );
      if (working.length === 0) continue;

      const free = subtractIntervals(
        intersectIntervals(shopHours, working),
        dayBusy.filter((b) => b.barberId === barber.id).map(toInterval),
      );
      for (const minute of generateSlots(free, {
        duration,
        step: shop.slotStepMinutes,
        notBefore,
      })) {
        available.add(minute);
      }
    }

    result[dateISO] = available.size;
  }

  return result;
}

function collectBusy(
  appointments: {
    barberId: string;
    startsAt: Date;
    endsAt: Date;
    services: { service: { bufferMinutes: number } }[];
  }[],
  timeOffs: { barberId: string | null; startsAt: Date; endsAt: Date }[],
  barberIds: string[],
  dayStart: Date,
  dayEnd: Date,
  shop: ShopConfig,
): BusyRow[] {
  const busy: BusyRow[] = [];

  for (const appt of appointments) {
    if (appt.startsAt >= dayEnd || appt.endsAt <= dayStart) continue;
    const buffer = appt.services.reduce((max, s) => Math.max(max, s.service.bufferMinutes), 0);
    busy.push({
      barberId: appt.barberId,
      start: clampToDay(appt.startsAt, dayStart, dayEnd, shop.timezone, "start"),
      end: clampToDay(appt.endsAt, dayStart, dayEnd, shop.timezone, "end") + buffer,
    });
  }

  for (const off of timeOffs) {
    if (off.startsAt >= dayEnd || off.endsAt <= dayStart) continue;
    const row = {
      start: clampToDay(off.startsAt, dayStart, dayEnd, shop.timezone, "start"),
      end: clampToDay(off.endsAt, dayStart, dayEnd, shop.timezone, "end"),
    };
    if (off.barberId) busy.push({ barberId: off.barberId, ...row });
    else for (const id of barberIds) busy.push({ barberId: id, ...row });
  }

  return busy;
}

/**
 * Converte um instante para minutos locais do dia, cortando o que extrapola.
 * Compromissos que atravessam a meia-noite (ferias de varios dias) viram
 * bloqueios de 0 a 1440 no dia consultado.
 */
function clampToDay(
  value: Date,
  dayStart: Date,
  dayEnd: Date,
  timezone: string,
  edge: "start" | "end",
): number {
  if (value <= dayStart) return 0;
  if (value >= dayEnd) return 24 * 60;
  const minutes = minutesOfDay(value, timezone);
  // Meia-noite exata no fim de um bloqueio deve valer 1440, nao 0.
  return edge === "end" && minutes === 0 ? 24 * 60 : minutes;
}

function toInterval(row: BusyRow): Interval {
  return { start: row.start, end: row.end };
}
