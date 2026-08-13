"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Clock, Copy, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveWorkingHoursAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";
import { formatMinutesLabel } from "@/lib/time";
import { WEEKDAY_LABEL } from "@/lib/enums";
import type { Interval } from "@/lib/intervals";

type Block = { start: number; end: number };

/**
 * Editor de jornada.
 *
 * Varios intervalos por dia sao suportados de proposito: e assim que se modela
 * o almoco (09:00-12:00 e 13:30-19:00) sem inventar um tipo de bloqueio so
 * para isso.
 */
export function WorkingHoursDialog({
  barberId,
  barberName,
  hours,
  shopHours,
}: {
  barberId: string;
  barberName: string;
  hours: { weekday: number; start: number; end: number }[];
  shopHours: Interval[][];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveWorkingHoursAction,
    { ok: false },
  );

  const [days, setDays] = React.useState<Block[][]>(() => buildDays(hours));

  React.useEffect(() => {
    if (open) setDays(buildDays(hours));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Jornada atualizada");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Nao foi possivel salvar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function updateBlock(weekday: number, index: number, patch: Partial<Block>) {
    setDays((current) =>
      current.map((blocks, day) =>
        day === weekday
          ? blocks.map((block, i) => (i === index ? { ...block, ...patch } : block))
          : blocks,
      ),
    );
  }

  function addBlock(weekday: number) {
    setDays((current) =>
      current.map((blocks, day) => {
        if (day !== weekday) return blocks;
        const shopDay = shopHours[weekday]?.[0];
        const last = blocks[blocks.length - 1];
        const start = last ? Math.min(last.end + 60, 22 * 60) : (shopDay?.start ?? 9 * 60);
        return [...blocks, { start, end: Math.min(start + 240, 24 * 60) }];
      }),
    );
  }

  function removeBlock(weekday: number, index: number) {
    setDays((current) =>
      current.map((blocks, day) => (day === weekday ? blocks.filter((_, i) => i !== index) : blocks)),
    );
  }

  /** Copia a jornada do primeiro dia util preenchido para segunda a sexta. */
  function replicateWeekdays() {
    const source = days.slice(1, 6).find((blocks) => blocks.length > 0);
    if (!source) return;
    setDays((current) =>
      current.map((blocks, day) =>
        day >= 1 && day <= 5 ? source.map((block) => ({ ...block })) : blocks,
      ),
    );
    toast.toast({ tone: "info", title: "Jornada replicada de segunda a sexta" });
  }

  const payload = JSON.stringify(
    days.map((blocks, weekday) => ({ weekday, blocks })).filter((day) => day.blocks.length > 0),
  );

  const totalHours =
    days.flat().reduce((sum, block) => sum + Math.max(0, block.end - block.start), 0) / 60;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Clock className="size-4" />
          Jornada
        </Button>
      </DialogTrigger>

      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Jornada de {barberName}</DialogTitle>
          <DialogDescription>
            Os horarios disponiveis para o cliente sao a interseccao desta jornada com o
            funcionamento da loja.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="barberId" value={barberId} />
          <input type="hidden" name="hours" value={payload} />

          <DialogBody className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[var(--text-muted)]">
                {totalHours.toFixed(1).replace(".", ",")} h por semana
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={replicateWeekdays}>
                <Copy className="size-4" />
                Replicar seg-sex
              </Button>
            </div>

            {WEEKDAY_LABEL.map((label, weekday) => {
              const blocks = days[weekday];
              const shopDay = shopHours[weekday] ?? [];

              return (
                <div
                  key={weekday}
                  className="rounded-lg border border-[var(--border-subtle)] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {shopDay.length === 0
                          ? "Loja fechada"
                          : `Loja: ${shopDay
                              .map(
                                (h) =>
                                  `${formatMinutesLabel(h.start)}-${formatMinutesLabel(h.end)}`,
                              )
                              .join(", ")}`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => addBlock(weekday)}
                      disabled={shopDay.length === 0}
                    >
                      <Plus className="size-4" />
                      Intervalo
                    </Button>
                  </div>

                  {blocks.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">Folga</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {blocks.map((block, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <TimeSelect
                            value={block.start}
                            onChange={(value) => updateBlock(weekday, index, { start: value })}
                            label={`Inicio do intervalo ${index + 1} de ${label}`}
                          />
                          <span className="text-[var(--text-muted)]">ate</span>
                          <TimeSelect
                            value={block.end}
                            onChange={(value) => updateBlock(weekday, index, { end: value })}
                            label={`Fim do intervalo ${index + 1} de ${label}`}
                          />
                          {block.end <= block.start ? (
                            <span className="text-xs text-rust-500">invalido</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => removeBlock(weekday, index)}
                            className="ml-auto rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-rust-500"
                            aria-label="Remover intervalo"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {state.message && !state.ok ? (
              <p className="rounded-lg border border-rust-500/30 bg-rust-500/10 px-3 py-2 text-sm text-rust-500">
                {state.message}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={pending}
              disabled={days.flat().some((block) => block.end <= block.start)}
            >
              Salvar jornada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const options = React.useMemo(() => {
    const list: number[] = [];
    for (let minute = 0; minute <= 24 * 60; minute += 15) list.push(minute);
    return list;
  }, []);

  return (
    <Select
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      aria-label={label}
      className="w-28"
    >
      {options.map((minute) => (
        <option key={minute} value={minute}>
          {formatMinutesLabel(minute === 24 * 60 ? 24 * 60 - 1 : minute)}
        </option>
      ))}
    </Select>
  );
}

function buildDays(hours: { weekday: number; start: number; end: number }[]): Block[][] {
  const days: Block[][] = Array.from({ length: 7 }, () => []);
  for (const hour of hours) {
    days[hour.weekday]?.push({ start: hour.start, end: hour.end });
  }
  return days.map((blocks) => blocks.sort((a, b) => a.start - b.start));
}
