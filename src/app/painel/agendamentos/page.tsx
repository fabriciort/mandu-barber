import Link from "next/link";
import { ClipboardList, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/field";
import { requireStaff, scopeToBarber } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { formatMoney, formatPhone, pluralize } from "@/lib/format";
import { formatDate, formatTime, rangeBoundaries, todayKey, addDaysISO, isValidDateKey } from "@/lib/time";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  SOURCE_LABEL,
  type AppointmentSource,
  type AppointmentStatus,
} from "@/lib/enums";

export const metadata = { title: "Agendamentos" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export default async function AppointmentsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    de?: string;
    ate?: string;
    profissional?: string;
    pagina?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await requireStaff("/painel/agendamentos");
  const shop = await getShopConfig();

  const today = todayKey(shop.timezone);
  const from = params.de && isValidDateKey(params.de) ? params.de : addDaysISO(today, -30);
  const to = params.ate && isValidDateKey(params.ate) ? params.ate : addDaysISO(today, 30);
  const page = Math.max(1, Number(params.pagina) || 1);
  const scopedBarberId = scopeToBarber(user, params.profissional ?? null);
  const range = rangeBoundaries(from, to, shop.timezone);
  const query = params.q?.trim();

  const where = {
    ...(scopedBarberId ? { barberId: scopedBarberId } : {}),
    ...(params.status && params.status !== "todos" ? { status: params.status } : {}),
    startsAt: { gte: range.start, lt: range.end },
    ...(query
      ? {
          OR: [
            { code: { contains: query } },
            { client: { name: { contains: query } } },
            { client: { phone: { contains: query } } },
          ],
        }
      : {}),
  };

  const [appointments, total, barbers] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        barber: { include: { user: { select: { name: true, avatarUrl: true } } } },
        services: { select: { name: true } },
      },
      orderBy: { startsAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
    user.role === "OWNER"
      ? prisma.barberProfile.findMany({
          where: { active: true },
          include: { user: { select: { name: true } } },
          orderBy: { displayOrder: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        description={`${pluralize(total, "registro", "registros")} no período selecionado.`}
      />

      <Card className="p-4">
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              name="q"
              defaultValue={params.q}
              placeholder="Nome, telefone ou código"
              className="pl-9"
              aria-label="Buscar"
            />
          </div>

          <Select name="status" defaultValue={params.status ?? "todos"} aria-label="Status">
            <option value="todos">Todos os status</option>
            {Object.entries(APPOINTMENT_STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          {barbers.length > 0 ? (
            <Select
              name="profissional"
              defaultValue={params.profissional ?? ""}
              aria-label="Profissional"
            >
              <option value="">Todos os profissionais</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.user.name}
                </option>
              ))}
            </Select>
          ) : null}

          <div className="flex gap-2">
            <Input type="date" name="de" defaultValue={from} aria-label="Data inicial" />
            <Input type="date" name="ate" defaultValue={to} aria-label="Data final" />
          </div>

          <Button type="submit" className="sm:col-span-2 lg:col-span-1">
            Filtrar
          </Button>
        </form>
      </Card>

      {appointments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum agendamento encontrado"
          description="Ajuste o período ou os filtros para encontrar o que procura."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[var(--surface-muted)] text-left">
                <tr className="text-2xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  <th className="px-4 py-2.5 font-medium">Quando</th>
                  <th className="px-4 py-2.5 font-medium">Cliente</th>
                  <th className="px-4 py-2.5 font-medium">Serviços</th>
                  <th className="px-4 py-2.5 font-medium">Profissional</th>
                  <th className="px-4 py-2.5 font-medium">Origem</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-raised)]">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        href={`/painel/agenda?data=${formatDateKey(appointment.startsAt, shop.timezone)}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {formatDate(appointment.startsAt, shop.timezone)}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {formatTime(appointment.startsAt, shop.timezone)} · {appointment.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/painel/clientes/${appointment.client.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {appointment.client.name}
                      </Link>
                      <span className="block text-xs text-[var(--text-muted)]">
                        {formatPhone(appointment.client.phone)}
                      </span>
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-[var(--text-secondary)]">
                      {appointment.services.map((s) => s.name).join(" + ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar
                          name={appointment.barber.user.name}
                          src={appointment.barber.user.avatarUrl}
                          size="xs"
                        />
                        <span className="truncate">{appointment.barber.user.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                      {SOURCE_LABEL[appointment.source as AppointmentSource]}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={APPOINTMENT_STATUS_TONE[appointment.status as AppointmentStatus]}
                        size="sm"
                      >
                        {APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {appointment.totalCents === 0
                        ? "Plano"
                        : formatMoney(appointment.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <p className="text-[var(--text-muted)]">
                Página {page} de {pages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={buildPageUrl(params, page - 1)}
                    className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 transition-colors hover:border-[var(--accent)]"
                  >
                    Anterior
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link
                    href={buildPageUrl(params, page + 1)}
                    className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 transition-colors hover:border-[var(--accent)]"
                  >
                    Próxima
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function formatDateKey(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone });
}

function buildPageUrl(params: Record<string, string | undefined>, page: number): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "pagina") search.set(key, value);
  }
  search.set("pagina", String(page));
  return `/painel/agendamentos?${search}`;
}
