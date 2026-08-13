import { AgendaBoard } from "./agenda-board";
import { PageHeader } from "@/components/ui/misc";
import { requireStaff, scopeToBarber } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { dayBoundaries, isValidDateKey, minutesOfDay, todayKey, weekdayOf, zonedDateTime } from "@/lib/time";
import { mergeIntervals } from "@/lib/intervals";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; profissional?: string }>;
}) {
  const params = await searchParams;
  const user = await requireStaff("/painel/agenda");
  const shop = await getShopConfig();

  const date =
    params.data && isValidDateKey(params.data) ? params.data : todayKey(shop.timezone);
  const scopedBarberId = scopeToBarber(user, params.profissional ?? null);

  const { start: dayStart, end: dayEnd } = dayBoundaries(date, shop.timezone);
  const weekday = weekdayOf(zonedDateTime(date, 12 * 60, shop.timezone), shop.timezone);

  const [barbers, appointments, timeOffs, services, clients] = await Promise.all([
    prisma.barberProfile.findMany({
      where: { active: true, ...(scopedBarberId ? { id: scopedBarberId } : {}) },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        workingHours: { where: { weekday } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.appointment.findMany({
      where: {
        ...(scopedBarberId ? { barberId: scopedBarberId } : {}),
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        services: { select: { name: true, priceCents: true, coveredByPlan: true } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.timeOff.findMany({
      where: {
        OR: [
          ...(scopedBarberId ? [{ barberId: scopedBarberId }] : [{ barberId: { not: null } }]),
          { barberId: null },
        ],
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
      },
    }),
    prisma.service.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      include: { barbers: { select: { barberId: true } } },
    }),
    prisma.user.findMany({
      where: { role: "CLIENT", active: true },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  const shopHours = mergeIntervals(shop.businessHours[weekday] ?? []);
  const workingByBarber = new Map<string, { start: number; end: number }[]>();
  for (const barber of barbers) {
    workingByBarber.set(
      barber.id,
      mergeIntervals(barber.workingHours.map((wh) => ({ start: wh.startMinute, end: wh.endMinute }))),
    );
  }

  // Janela vertical do quadro: cobre o expediente da loja e qualquer
  // compromisso fora dele (encaixe antes de abrir, atendimento que esticou).
  const candidates = [
    ...shopHours.flatMap((h) => [h.start, h.end]),
    ...[...workingByBarber.values()].flat().flatMap((h) => [h.start, h.end]),
    ...appointments.flatMap((a) => [
      clampMinutes(a.startsAt, dayStart, dayEnd, shop.timezone),
      clampMinutes(a.endsAt, dayStart, dayEnd, shop.timezone),
    ]),
  ];
  const rangeStart = candidates.length ? Math.max(0, Math.min(...candidates) - 30) : 8 * 60;
  const rangeEnd = candidates.length ? Math.min(24 * 60, Math.max(...candidates) + 30) : 20 * 60;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Arraste o olho pela coluna: cada bloco é um atendimento. Clique para operar."
      />

      <AgendaBoard
        date={date}
        timezone={shop.timezone}
        rangeStart={rangeStart}
        rangeEnd={Math.max(rangeEnd, rangeStart + 120)}
        canChooseBarber={user.role === "OWNER"}
        selectedBarberId={params.profissional ?? null}
        nowMinutes={
          todayKey(shop.timezone) === date ? minutesOfDay(new Date(), shop.timezone) : null
        }
        barbers={barbers.map((barber) => ({
          id: barber.id,
          name: barber.user.name,
          avatarUrl: barber.user.avatarUrl,
          color: barber.agendaColor,
          working: workingByBarber.get(barber.id) ?? [],
        }))}
        appointments={appointments.map((appointment) => ({
          id: appointment.id,
          code: appointment.code,
          barberId: appointment.barberId,
          clientId: appointment.client.id,
          clientName: appointment.client.name,
          clientPhone: appointment.client.phone,
          services: appointment.services.map((s) => s.name),
          coveredByPlan: appointment.services.some((s) => s.coveredByPlan),
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
          startMinute: clampMinutes(appointment.startsAt, dayStart, dayEnd, shop.timezone),
          endMinute: clampMinutes(appointment.endsAt, dayStart, dayEnd, shop.timezone),
          totalCents: appointment.totalCents,
          clientNotes: appointment.clientNotes,
          internalNotes: appointment.internalNotes,
        }))}
        blocks={timeOffs.map((off) => ({
          id: off.id,
          barberId: off.barberId,
          title: off.title,
          type: off.type,
          startMinute: clampMinutes(off.startsAt, dayStart, dayEnd, shop.timezone),
          endMinute: clampMinutes(off.endsAt, dayStart, dayEnd, shop.timezone),
        }))}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
          barberIds: service.barbers.map((b) => b.barberId),
        }))}
        clients={clients}
      />
    </div>
  );
}

/** Instante -> minuto local do dia, com corte nas bordas (0..1440). */
function clampMinutes(value: Date, dayStart: Date, dayEnd: Date, timezone: string): number {
  if (value <= dayStart) return 0;
  if (value >= dayEnd) return 24 * 60;
  return minutesOfDay(value, timezone);
}
