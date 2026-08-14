import { Star, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { BarberFormDialog } from "./barber-form-dialog";
import { WorkingHoursDialog } from "./working-hours-dialog";
import { requireOwner } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { formatMoney, formatPhone } from "@/lib/format";
import { formatMinutesLabel } from "@/lib/time";
import { WEEKDAY_SHORT } from "@/lib/enums";

export const metadata = { title: "Profissionais" };
export const dynamic = "force-dynamic";

export default async function BarbersPage() {
  await requireOwner("/painel/profissionais");
  const shop = await getShopConfig();

  const barbers = await prisma.barberProfile.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, active: true } },
      workingHours: { orderBy: [{ weekday: "asc" }, { startMinute: "asc" }] },
      services: { select: { serviceId: true } },
      reviews: { select: { rating: true } },
      _count: { select: { appointments: { where: { status: "COMPLETED" } } } },
    },
    orderBy: [{ active: "desc" }, { displayOrder: "asc" }],
  });

  const revenue = await prisma.appointment.groupBy({
    by: ["barberId"],
    where: { status: "COMPLETED" },
    _sum: { totalCents: true },
  });
  const revenueMap = new Map(revenue.map((row) => [row.barberId, row._sum.totalCents ?? 0]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profissionais"
        description="Equipe, jornada de trabalho e comissão."
        actions={<BarberFormDialog />}
      />

      {barbers.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Nenhum profissional cadastrado"
          description="Cadastre a equipe para liberar a agenda."
          action={<BarberFormDialog />}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {barbers.map((barber) => {
            const specialties = parseList(barber.specialties);
            const ratings = barber.reviews.map((r) => r.rating);
            const rating = ratings.length
              ? ratings.reduce((a, b) => a + b, 0) / ratings.length
              : null;

            const hoursByDay = new Map<number, { start: number; end: number }[]>();
            for (const hour of barber.workingHours) {
              const list = hoursByDay.get(hour.weekday) ?? [];
              list.push({ start: hour.startMinute, end: hour.endMinute });
              hoursByDay.set(hour.weekday, list);
            }

            return (
              <Card key={barber.id} className={`p-5 ${barber.active ? "" : "opacity-60"}`}>
                <div className="flex items-start gap-4">
                  <Avatar
                    name={barber.user.name}
                    src={barber.user.avatarUrl}
                    size="lg"
                    ring={barber.agendaColor}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{barber.user.name}</h3>
                      {!barber.active ? (
                        <Badge tone="dashed" size="sm">
                          Inativo
                        </Badge>
                      ) : !barber.acceptsNewClients ? (
                        <Badge tone="dashed" size="sm">
                          Agenda fechada
                        </Badge>
                      ) : null}
                      {rating ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                          <Star className="size-3 fill-current" />
                          {rating.toFixed(1)} ({ratings.length})
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-[var(--text-muted)]">{barber.headline}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {barber.user.email}
                      {barber.user.phone ? ` · ${formatPhone(barber.user.phone)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {specialties.map((item) => (
                    <Badge key={item} tone="outline" size="sm">
                      {item}
                    </Badge>
                  ))}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-[var(--surface-muted)] px-4 py-3 text-sm">
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">Atendimentos</dt>
                    <dd className="font-semibold">{barber._count.appointments}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">Receita gerada</dt>
                    <dd className="font-semibold">
                      {formatMoney(revenueMap.get(barber.id) ?? 0)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--text-muted)]">Comissão</dt>
                    <dd className="font-semibold">{barber.commissionPercent}%</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Jornada
                  </p>
                  <div className="mt-2 space-y-1 text-sm">
                    {WEEKDAY_SHORT.map((label, weekday) => {
                      const blocks = hoursByDay.get(weekday) ?? [];
                      return (
                        <div key={weekday} className="flex items-center gap-3">
                          <span className="w-8 text-xs text-[var(--text-muted)]">{label}</span>
                          <span
                            className={
                              blocks.length ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"
                            }
                          >
                            {blocks.length
                              ? blocks
                                  .map(
                                    (b) =>
                                      `${formatMinutesLabel(b.start)}-${formatMinutesLabel(b.end)}`,
                                  )
                                  .join("  •  ")
                              : "Folga"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
                  <WorkingHoursDialog
                    barberId={barber.id}
                    barberName={barber.user.name}
                    hours={barber.workingHours.map((h) => ({
                      weekday: h.weekday,
                      start: h.startMinute,
                      end: h.endMinute,
                    }))}
                    shopHours={shop.businessHours}
                  />
                  <BarberFormDialog
                    barber={{
                      id: barber.id,
                      name: barber.user.name,
                      email: barber.user.email,
                      phone: barber.user.phone,
                      headline: barber.headline,
                      bio: barber.bio,
                      specialties: specialties.join(", "),
                      commissionPercent: barber.commissionPercent,
                      agendaColor: barber.agendaColor,
                      acceptsNewClients: barber.acceptsNewClients,
                      active: barber.active,
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
