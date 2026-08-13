import "server-only";

import { prisma } from "@/server/db";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/enums";
import { addDaysISO, dayBoundaries, diffInDaysISO, rangeBoundaries, todayKey, toDateKey, weekdayOf, zonedDateTime } from "@/lib/time";
import { intersectIntervals, mergeIntervals, totalMinutes } from "@/lib/intervals";
import { getShopConfig } from "./settings";
import { monthlyRecurringRevenue } from "./subscriptions";

export type DashboardData = {
  today: {
    appointments: number;
    completed: number;
    revenueCents: number;
    occupancyPercent: number;
    nextAppointments: {
      id: string;
      code: string;
      clientName: string;
      barberName: string;
      services: string;
      startsAt: Date;
      status: string;
      totalCents: number;
    }[];
  };
  month: {
    revenueCents: number;
    appointments: number;
    ticketCents: number;
    newClients: number;
    noShowPercent: number;
    cancelPercent: number;
    previousRevenueCents: number;
  };
  subscriptions: {
    active: number;
    mrrCents: number;
    canceling: number;
    overdueInvoices: number;
    overdueCents: number;
  };
  series: { date: string; revenueCents: number; appointments: number }[];
  topServices: { name: string; count: number; revenueCents: number }[];
  team: {
    barberId: string;
    name: string;
    color: string;
    appointments: number;
    revenueCents: number;
    commissionCents: number;
    occupancyPercent: number;
    rating: number | null;
  }[];
};

/**
 * Painel do dono em uma unica passada.
 *
 * Todas as janelas de tempo sao calculadas no fuso da loja: "hoje" e o dia
 * comercial de quem esta na cadeira, nao o dia UTC do servidor.
 */
export async function getDashboard(params?: { barberId?: string | null }): Promise<DashboardData> {
  const shop = await getShopConfig();
  const now = new Date();
  const today = todayKey(shop.timezone, now);
  const barberFilter = params?.barberId ? { barberId: params.barberId } : {};

  const day = dayBoundaries(today, shop.timezone);
  const monthStartISO = `${today.slice(0, 7)}-01`;
  const monthRange = rangeBoundaries(monthStartISO, today, shop.timezone);
  const previousMonthStartISO = shiftMonth(monthStartISO, -1);
  const previousMonthRange = rangeBoundaries(
    previousMonthStartISO,
    addDaysISO(monthStartISO, -1),
    shop.timezone,
  );
  const seriesStartISO = addDaysISO(today, -29);
  const seriesRange = rangeBoundaries(seriesStartISO, today, shop.timezone);

  const [
    todayAppointments,
    monthAppointments,
    previousMonthAppointments,
    seriesAppointments,
    newClients,
    activeSubscriptions,
    cancelingSubscriptions,
    overdueInvoices,
    mrrCents,
    barbers,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { ...barberFilter, startsAt: { gte: day.start, lt: day.end } },
      include: {
        client: { select: { name: true } },
        barber: { select: { user: { select: { name: true } } } },
        services: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { ...barberFilter, startsAt: { gte: monthRange.start, lt: monthRange.end } },
      select: {
        status: true,
        totalCents: true,
        barberId: true,
        startsAt: true,
        endsAt: true,
        services: { select: { name: true, priceCents: true } },
      },
    }),
    prisma.appointment.aggregate({
      where: {
        ...barberFilter,
        status: "COMPLETED",
        startsAt: { gte: previousMonthRange.start, lt: previousMonthRange.end },
      },
      _sum: { totalCents: true },
    }),
    prisma.appointment.findMany({
      where: {
        ...barberFilter,
        status: "COMPLETED",
        startsAt: { gte: seriesRange.start, lt: seriesRange.end },
      },
      select: { startsAt: true, totalCents: true },
    }),
    prisma.user.count({
      where: { role: "CLIENT", createdAt: { gte: monthRange.start, lt: monthRange.end } },
    }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } } }),
    prisma.subscription.count({ where: { cancelAtPeriodEnd: true, status: "ACTIVE" } }),
    prisma.invoice.findMany({
      where: { status: { in: ["OPEN", "OVERDUE"] }, dueDate: { lt: now } },
      select: { amountCents: true },
    }),
    monthlyRecurringRevenue(),
    prisma.barberProfile.findMany({
      where: { active: true, ...(params?.barberId ? { id: params.barberId } : {}) },
      include: {
        user: { select: { name: true } },
        workingHours: true,
        reviews: { select: { rating: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  // ------------------------------------------------------------------- hoje
  const todayCompleted = todayAppointments.filter((a) => a.status === "COMPLETED");
  const todayRevenue = todayCompleted.reduce((sum, a) => sum + a.totalCents, 0);
  const todayCapacity = capacityMinutes(barbers, today, shop.businessHours, shop.timezone);
  const todayBooked = todayAppointments
    .filter((a) => a.status !== "CANCELED")
    .reduce((sum, a) => sum + minutesBetween(a.startsAt, a.endsAt), 0);

  // ------------------------------------------------------------------- mes
  const monthCompleted = monthAppointments.filter((a) => a.status === "COMPLETED");
  const monthRevenue = monthCompleted.reduce((sum, a) => sum + a.totalCents, 0);
  const monthNoShow = monthAppointments.filter((a) => a.status === "NO_SHOW").length;
  const monthCanceled = monthAppointments.filter((a) => a.status === "CANCELED").length;
  const monthTotal = monthAppointments.length || 1;

  // ------------------------------------------------------------ serie 30 dias
  const seriesMap = new Map<string, { revenueCents: number; appointments: number }>();
  for (let offset = 0; offset <= diffInDaysISO(seriesStartISO, today); offset++) {
    seriesMap.set(addDaysISO(seriesStartISO, offset), { revenueCents: 0, appointments: 0 });
  }
  for (const appointment of seriesAppointments) {
    const key = toDateKey(appointment.startsAt, shop.timezone);
    const entry = seriesMap.get(key);
    if (!entry) continue;
    entry.revenueCents += appointment.totalCents;
    entry.appointments += 1;
  }

  // ------------------------------------------------------------- servicos top
  const serviceMap = new Map<string, { count: number; revenueCents: number }>();
  for (const appointment of monthCompleted) {
    for (const service of appointment.services) {
      const entry = serviceMap.get(service.name) ?? { count: 0, revenueCents: 0 };
      entry.count += 1;
      entry.revenueCents += service.priceCents;
      serviceMap.set(service.name, entry);
    }
  }

  // -------------------------------------------------------------- por barbeiro
  const team = barbers.map((barber) => {
    const own = monthCompleted.filter((a) => a.barberId === barber.id);
    const revenue = own.reduce((sum, a) => sum + a.totalCents, 0);
    const booked = own.reduce((sum, a) => sum + minutesBetween(a.startsAt, a.endsAt), 0);
    const capacity = capacityMinutesForBarber(
      barber,
      monthStartISO,
      today,
      shop.businessHours,
      shop.timezone,
    );
    const ratings = barber.reviews.map((r) => r.rating);

    return {
      barberId: barber.id,
      name: barber.user.name,
      color: barber.agendaColor,
      appointments: own.length,
      revenueCents: revenue,
      commissionCents: Math.round((revenue * barber.commissionPercent) / 100),
      occupancyPercent: capacity === 0 ? 0 : Math.min(100, Math.round((booked / capacity) * 100)),
      rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    };
  });

  return {
    today: {
      appointments: todayAppointments.filter((a) => a.status !== "CANCELED").length,
      completed: todayCompleted.length,
      revenueCents: todayRevenue,
      occupancyPercent:
        todayCapacity === 0 ? 0 : Math.min(100, Math.round((todayBooked / todayCapacity) * 100)),
      nextAppointments: todayAppointments
        .filter((a) => ACTIVE_APPOINTMENT_STATUSES.includes(a.status as never))
        .slice(0, 6)
        .map((a) => ({
          id: a.id,
          code: a.code,
          clientName: a.client.name,
          barberName: a.barber.user.name,
          services: a.services.map((s) => s.name).join(" + "),
          startsAt: a.startsAt,
          status: a.status,
          totalCents: a.totalCents,
        })),
    },
    month: {
      revenueCents: monthRevenue,
      appointments: monthCompleted.length,
      ticketCents: monthCompleted.length ? Math.round(monthRevenue / monthCompleted.length) : 0,
      newClients,
      noShowPercent: Math.round((monthNoShow / monthTotal) * 100),
      cancelPercent: Math.round((monthCanceled / monthTotal) * 100),
      previousRevenueCents: previousMonthAppointments._sum.totalCents ?? 0,
    },
    subscriptions: {
      active: activeSubscriptions,
      mrrCents,
      canceling: cancelingSubscriptions,
      overdueInvoices: overdueInvoices.length,
      overdueCents: overdueInvoices.reduce((sum, i) => sum + i.amountCents, 0),
    },
    series: [...seriesMap.entries()].map(([date, value]) => ({ date, ...value })),
    topServices: [...serviceMap.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 6),
    team,
  };
}

type BarberWithHours = {
  id: string;
  workingHours: { weekday: number; startMinute: number; endMinute: number }[];
};

/** Minutos de cadeira disponiveis num dia, somando toda a equipe. */
function capacityMinutes(
  barbers: BarberWithHours[],
  dateISO: string,
  businessHours: { start: number; end: number }[][],
  timezone: string,
): number {
  const weekday = weekdayOf(zonedDateTime(dateISO, 12 * 60, timezone), timezone);
  const shopHours = businessHours[weekday] ?? [];
  if (shopHours.length === 0) return 0;

  return barbers.reduce((sum, barber) => {
    const working = mergeIntervals(
      barber.workingHours
        .filter((wh) => wh.weekday === weekday)
        .map((wh) => ({ start: wh.startMinute, end: wh.endMinute })),
    );
    return sum + totalMinutes(intersectIntervals(shopHours, working));
  }, 0);
}

function capacityMinutesForBarber(
  barber: BarberWithHours,
  fromISO: string,
  toISO: string,
  businessHours: { start: number; end: number }[][],
  timezone: string,
): number {
  let total = 0;
  for (let offset = 0; offset <= diffInDaysISO(fromISO, toISO); offset++) {
    total += capacityMinutes([barber], addDaysISO(fromISO, offset), businessHours, timezone);
  }
  return total;
}

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function shiftMonth(dateISO: string, months: number): string {
  const [year, month] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + months, 1));
  return date.toISOString().slice(0, 10);
}
