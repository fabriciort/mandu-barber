"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Lock } from "lucide-react";

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
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { saveTimeOffAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";

/**
 * Bloqueio de agenda. Recusa criar o bloqueio se houver atendimento no
 * periodo — a acao do servidor devolve quantos, para a equipe remarcar antes.
 */
export function BlockTimeDialog({
  date,
  barbers,
  canBlockShop,
}: {
  date: string;
  barbers: { id: string; name: string }[];
  canBlockShop: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [allDay, setAllDay] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveTimeOffAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Bloqueio criado");
      setOpen(false);
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível bloquear", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          <Lock className="size-4" />
          Bloquear
        </Button>
      </DialogTrigger>

      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Bloquear agenda</DialogTitle>
          <DialogDescription>
            Nenhum agendamento novo entra no período bloqueado.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <DialogBody className="space-y-4">
            <Field label="Motivo" htmlFor="title" required error={state.fieldErrors?.title}>
              <Input
                id="title"
                name="title"
                required
                maxLength={120}
                placeholder="Ex.: almoço estendido, dentista, manutenção"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tipo" htmlFor="type">
                <Select id="type" name="type" defaultValue="BLOCK">
                  <option value="BLOCK">Bloqueio pontual</option>
                  <option value="VACATION">Férias</option>
                  <option value="HOLIDAY">Feriado</option>
                  <option value="TRAINING">Treinamento</option>
                </Select>
              </Field>

              {canBlockShop ? (
                <Field label="Aplicar a" htmlFor="barberId">
                  <Select id="barberId" name="barberId" defaultValue="">
                    <option value="">Barbearia inteira</option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(event) => setAllDay(event.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Dia inteiro
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Início" htmlFor="startDate">
                <Input id="startDate" name="startDate" type="date" defaultValue={date} required />
                {!allDay ? (
                  <TimeSelect name="startMinute" defaultMinutes={12 * 60} className="mt-2" />
                ) : (
                  <input type="hidden" name="startMinute" value={0} />
                )}
              </Field>

              <Field label="Fim" htmlFor="endDate">
                <Input id="endDate" name="endDate" type="date" defaultValue={date} required />
                {!allDay ? (
                  <TimeSelect name="endMinute" defaultMinutes={13 * 60} className="mt-2" />
                ) : (
                  <input type="hidden" name="endMinute" value={24 * 60} />
                )}
              </Field>
            </div>

            {state.message && !state.ok ? (
              <p className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-primary)]">
                {state.message}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Criar bloqueio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Seletor de horário em passos de 15 minutos. */
function TimeSelect({
  name,
  defaultMinutes,
  className,
}: {
  name: string;
  defaultMinutes: number;
  className?: string;
}) {
  const options = React.useMemo(() => {
    const list: { value: number; label: string }[] = [];
    for (let minute = 0; minute < 24 * 60; minute += 15) {
      list.push({
        value: minute,
        label: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
      });
    }
    return list;
  }, []);

  return (
    <Select name={name} defaultValue={defaultMinutes} className={className}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
