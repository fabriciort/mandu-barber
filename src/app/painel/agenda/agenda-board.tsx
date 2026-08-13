"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Plus } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentDrawer } from "./appointment-drawer";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { BlockTimeDialog } from "./block-time-dialog";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { addDaysISO, formatMinutesLabel, parseDateKey } from "@/lib/time";
import { APPOINTMENT_STATUS_LABEL, type AppointmentStatus } from "@/lib/enums";

export type AgendaBarber = {
  id: string;
  name: string;
  avatarUrl: string | null;
  color: string;
  working: { start: number; end: number }[];
};

export type AgendaAppointment = {
  id: string;
  code: string;
  barberId: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  services: string[];
  coveredByPlan: boolean;
  status: string;
  paymentStatus: string;
  startMinute: number;
  endMinute: number;
  totalCents: number;
  clientNotes: string | null;
  internalNotes: string | null;
};

export type AgendaBlock = {
  id: string;
  barberId: string | null;
  title: string;
  type: string;
  startMinute: number;
  endMinute: number;
};

/** Altura de um minuto no quadro. 1.1px deixa 1h com ~66px: legivel e compacto. */
const PX_PER_MINUTE = 1.1;
const GUTTER = 56;

export function AgendaBoard({
  date,
  timezone,
  rangeStart,
  rangeEnd,
  barbers,
  appointments,
  blocks,
  services,
  clients,
  canChooseBarber,
  selectedBarberId,
  nowMinutes,
}: {
  date: string;
  timezone: string;
  rangeStart: number;
  rangeEnd: number;
  barbers: AgendaBarber[];
  appointments: AgendaAppointment[];
  blocks: AgendaBlock[];
  services: { id: string; name: string; priceCents: number; durationMinutes: number; barberIds: string[] }[];
  clients: { id: string; name: string; phone: string | null }[];
  canChooseBarber: boolean;
  selectedBarberId: string | null;
  nowMinutes: number | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = React.useState<AgendaAppointment | null>(null);

  const height = (rangeEnd - rangeStart) * PX_PER_MINUTE;
  const hourMarks = React.useMemo(() => {
    const marks: number[] = [];
    for (let minute = Math.ceil(rangeStart / 60) * 60; minute <= rangeEnd; minute += 60) {
      marks.push(minute);
    }
    return marks;
  }, [rangeStart, rangeEnd]);

  function navigate(nextDate: string, nextBarber?: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("data", nextDate);
    if (nextBarber === null) params.delete("profissional");
    else if (nextBarber) params.set("profissional", nextBarber);
    router.push(`/painel/agenda?${params}`);
  }

  const parsed = parseDateKey(date);
  const dayLabel = parsed.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const activeCount = appointments.filter((a) => a.status !== "CANCELED").length;
  const dayRevenue = appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + a.totalCents, 0);

  return (
    <>
      {/* ------------------------------------------------------- controles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-1">
          <button
            type="button"
            onClick={() => navigate(addDaysISO(date, -1))}
            className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <input
            type="date"
            value={date}
            onChange={(event) => event.target.value && navigate(event.target.value)}
            className="bg-transparent px-2 text-sm outline-none"
            aria-label="Data da agenda"
          />
          <button
            type="button"
            onClick={() => navigate(addDaysISO(date, 1))}
            className="rounded-md p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
            aria-label="Proximo dia"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(new Date().toLocaleDateString("en-CA", { timeZone: timezone }))}
        >
          <CalendarDays className="size-4" />
          Hoje
        </Button>

        {canChooseBarber && barbers.length > 1 ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => navigate(date, null)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                !selectedBarberId
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)]",
              )}
            >
              Todos
            </button>
            {barbers.map((barber) => (
              <button
                key={barber.id}
                type="button"
                onClick={() => navigate(date, barber.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selectedBarberId === barber.id
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)]",
                )}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: barber.color }} />
                {barber.name.split(" ")[0]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <BlockTimeDialog
            date={date}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
            canBlockShop={canChooseBarber}
          />
          <NewAppointmentDialog
            date={date}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
            services={services}
            clients={clients}
            canChooseBarber={canChooseBarber}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-[var(--surface-muted)] px-4 py-2.5 text-sm">
        <span className="font-medium capitalize">{dayLabel}</span>
        <span className="text-[var(--text-muted)]">
          {activeCount} atendimento(s) · {formatMoney(dayRevenue)} concluido(s)
        </span>
      </div>

      {/* ---------------------------------------------------------- quadro */}
      {barbers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">
          Nenhum profissional ativo para exibir.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
          {/* Cabecalho de colunas */}
          <div
            className="sticky top-0 z-10 flex border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]"
            style={{ minWidth: GUTTER + barbers.length * 180 }}
          >
            <div className="shrink-0" style={{ width: GUTTER }} />
            {barbers.map((barber) => (
              <div
                key={barber.id}
                className="flex min-w-[180px] flex-1 items-center gap-2 border-l border-[var(--border-subtle)] px-3 py-2.5"
              >
                <Avatar name={barber.name} src={barber.avatarUrl} size="sm" ring={barber.color} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{barber.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {barber.working.length === 0
                      ? "Folga"
                      : barber.working
                          .map(
                            (w) =>
                              `${formatMinutesLabel(w.start)}-${formatMinutesLabel(w.end)}`,
                          )
                          .join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Corpo */}
          <div className="relative flex" style={{ height, minWidth: GUTTER + barbers.length * 180 }}>
            {/* Regua de horas */}
            <div className="relative shrink-0" style={{ width: GUTTER }}>
              {hourMarks.map((minute) => (
                <span
                  key={minute}
                  className="absolute right-2 -translate-y-1/2 text-xs tabular-nums text-[var(--text-muted)]"
                  style={{ top: (minute - rangeStart) * PX_PER_MINUTE }}
                >
                  {formatMinutesLabel(minute)}
                </span>
              ))}
            </div>

            {/* Linhas de hora */}
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0" style={{ marginLeft: GUTTER }}>
              {hourMarks.map((minute) => (
                <div
                  key={minute}
                  className="absolute inset-x-0 border-t border-[var(--border-subtle)]"
                  style={{ top: (minute - rangeStart) * PX_PER_MINUTE }}
                />
              ))}
              {nowMinutes !== null && nowMinutes >= rangeStart && nowMinutes <= rangeEnd ? (
                <div
                  className="absolute inset-x-0 z-20 border-t-2 border-rust-500"
                  style={{ top: (nowMinutes - rangeStart) * PX_PER_MINUTE }}
                >
                  <span className="absolute -left-1 -top-1 size-2 rounded-full bg-rust-500" />
                </div>
              ) : null}
            </div>

            {/* Colunas */}
            {barbers.map((barber) => {
              const columnAppointments = appointments.filter((a) => a.barberId === barber.id);
              const columnBlocks = blocks.filter(
                (b) => b.barberId === barber.id || b.barberId === null,
              );

              return (
                <div
                  key={barber.id}
                  className="relative min-w-[180px] flex-1 border-l border-[var(--border-subtle)]"
                >
                  {/* Fora do expediente */}
                  <OutsideShift working={barber.working} rangeStart={rangeStart} rangeEnd={rangeEnd} />

                  {columnBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)]/80 px-2 py-1"
                      style={{
                        top: (Math.max(block.startMinute, rangeStart) - rangeStart) * PX_PER_MINUTE,
                        height:
                          (Math.min(block.endMinute, rangeEnd) -
                            Math.max(block.startMinute, rangeStart)) *
                          PX_PER_MINUTE,
                      }}
                    >
                      <p className="flex items-center gap-1 truncate text-xs font-medium text-[var(--text-muted)]">
                        <Lock className="size-3 shrink-0" />
                        {block.title}
                      </p>
                    </div>
                  ))}

                  {columnAppointments.map((appointment) => (
                    <AppointmentBlock
                      key={appointment.id}
                      appointment={appointment}
                      color={barber.color}
                      rangeStart={rangeStart}
                      onSelect={() => setSelected(appointment)}
                    />
                  ))}

                  {columnAppointments.length === 0 && columnBlocks.length === 0 ? (
                    <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-[var(--text-muted)]">
                      Dia livre
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[var(--accent)]" />
          Agendado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-moss-500" />
          Concluido
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-clay-400" />
          Nao compareceu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border border-dashed border-[var(--border-strong)]" />
          Bloqueio
        </span>
      </div>

      <AppointmentDrawer
        appointment={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        barberName={barbers.find((b) => b.id === selected?.barberId)?.name ?? ""}
      />
    </>
  );
}

function AppointmentBlock({
  appointment,
  color,
  rangeStart,
  onSelect,
}: {
  appointment: AgendaAppointment;
  color: string;
  rangeStart: number;
  onSelect: () => void;
}) {
  const duration = appointment.endMinute - appointment.startMinute;
  const canceled = appointment.status === "CANCELED";
  const compact = duration < 35;

  const tone =
    appointment.status === "COMPLETED"
      ? { bg: "rgb(95 138 76 / 0.16)", border: "#5f8a4c" }
      : appointment.status === "NO_SHOW"
        ? { bg: "rgb(201 111 74 / 0.16)", border: "#c96f4a" }
        : appointment.status === "IN_PROGRESS"
          ? { bg: "rgb(201 139 58 / 0.28)", border: color }
          : { bg: "rgb(201 139 58 / 0.14)", border: color };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "absolute inset-x-1 z-[8] overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left transition-all hover:z-10 hover:shadow-[var(--shadow-lift)]",
        canceled && "opacity-45 line-through",
      )}
      style={{
        top: (appointment.startMinute - rangeStart) * PX_PER_MINUTE,
        height: Math.max(duration * PX_PER_MINUTE, 22),
        backgroundColor: canceled ? "var(--surface-muted)" : tone.bg,
        borderLeftColor: canceled ? "var(--border-strong)" : tone.border,
      }}
      aria-label={`${appointment.clientName}, ${formatMinutesLabel(appointment.startMinute)}, ${
        APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]
      }`}
    >
      <p className="truncate text-xs font-semibold leading-tight">
        {formatMinutesLabel(appointment.startMinute)} {appointment.clientName}
      </p>
      {!compact ? (
        <p className="truncate text-[11px] leading-tight text-[var(--text-secondary)]">
          {appointment.services.join(" + ")}
        </p>
      ) : null}
      {duration >= 55 ? (
        <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          {appointment.coveredByPlan ? "Plano" : formatMoney(appointment.totalCents)}
        </p>
      ) : null}
    </button>
  );
}

/** Sombreia as faixas fora da jornada do profissional. */
function OutsideShift({
  working,
  rangeStart,
  rangeEnd,
}: {
  working: { start: number; end: number }[];
  rangeStart: number;
  rangeEnd: number;
}) {
  const gaps: { start: number; end: number }[] = [];
  let cursor = rangeStart;

  for (const block of [...working].sort((a, b) => a.start - b.start)) {
    if (block.start > cursor) gaps.push({ start: cursor, end: Math.min(block.start, rangeEnd) });
    cursor = Math.max(cursor, block.end);
  }
  if (cursor < rangeEnd) gaps.push({ start: cursor, end: rangeEnd });

  return (
    <>
      {gaps.map((gap) => (
        <div
          key={`${gap.start}-${gap.end}`}
          className="absolute inset-x-0 bg-[var(--surface-sunken)]/60"
          style={{
            top: (gap.start - rangeStart) * PX_PER_MINUTE,
            height: (gap.end - gap.start) * PX_PER_MINUTE,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

export { PX_PER_MINUTE };
export const AddIcon = Plus;
export const StatusBadge = Badge;
