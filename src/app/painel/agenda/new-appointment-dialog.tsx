"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, Plus, Search } from "lucide-react";

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
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createPanelBookingAction } from "@/server/actions/booking";
import type { ActionState } from "@/server/actions/result";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { formatDuration } from "@/lib/time";

type ServiceOption = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
  barberIds: string[];
};

/**
 * Lancamento de agendamento pelo balcao. Usa a mesma API de disponibilidade do
 * site — com a diferenca de que a equipe pode encaixar fora da antecedencia
 * minima (o servidor libera isso para quem tem papel de staff).
 */
export function NewAppointmentDialog({
  date,
  barbers,
  services,
  clients,
  canChooseBarber,
}: {
  date: string;
  barbers: { id: string; name: string }[];
  services: ServiceOption[];
  clients: { id: string; name: string; phone: string | null }[];
  canChooseBarber: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createPanelBookingAction,
    { ok: false },
  );

  const [clientQuery, setClientQuery] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [serviceIds, setServiceIds] = React.useState<string[]>([]);
  const [barberId, setBarberId] = React.useState(canChooseBarber ? "" : barbers[0]?.id ?? "");
  const [selectedDate, setSelectedDate] = React.useState(date);
  const [minute, setMinute] = React.useState<number | null>(null);
  const [slots, setSlots] = React.useState<{ minute: number; label: string }[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => setSelectedDate(date), [date]);

  const serviceKey = serviceIds.join(",");

  React.useEffect(() => {
    if (!open || serviceIds.length === 0) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);

    const query = new URLSearchParams({ data: selectedDate, servicos: serviceKey });
    if (barberId) query.set("profissional", barberId);

    fetch(`/api/disponibilidade?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => setSlots(payload.slots ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, selectedDate, serviceKey, barberId, serviceIds.length]);

  React.useEffect(() => setMinute(null), [selectedDate, serviceKey, barberId]);

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Agendamento criado");
      setOpen(false);
      resetForm();
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível agendar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function resetForm() {
    setClientId("");
    setClientQuery("");
    setServiceIds([]);
    setMinute(null);
  }

  const filteredClients = React.useMemo(() => {
    const query = clientQuery.trim().toLowerCase();
    if (!query) return clients.slice(0, 8);
    return clients
      .filter(
        (client) =>
          client.name.toLowerCase().includes(query) || (client.phone ?? "").includes(query),
      )
      .slice(0, 8);
  }, [clientQuery, clients]);

  const availableServices = barberId
    ? services.filter((service) => service.barberIds.includes(barberId))
    : services;

  const selectedClient = clients.find((c) => c.id === clientId);
  const total = serviceIds.reduce(
    (sum, id) => sum + (services.find((s) => s.id === id)?.priceCents ?? 0),
    0,
  );
  const duration = serviceIds.reduce(
    (sum, id) => sum + (services.find((s) => s.id === id)?.durationMinutes ?? 0),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Novo agendamento
        </Button>
      </DialogTrigger>

      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
          <DialogDescription>
            Lance um horário para um cliente já cadastrado. A franquia do plano dele é aplicada
            automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          {serviceIds.map((id) => (
            <input key={id} type="hidden" name="serviceIds" value={id} />
          ))}
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="barberId" value={barberId} />
          <input type="hidden" name="date" value={selectedDate} />
          <input type="hidden" name="minute" value={minute ?? ""} />

          <DialogBody className="space-y-5">
            {/* Cliente */}
            <Field label="Cliente" required error={state.fieldErrors?.clientId}>
              {selectedClient ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2">
                  <span className="text-sm font-medium">{selectedClient.name}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setClientId("")}>
                    Trocar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <Input
                      value={clientQuery}
                      onChange={(event) => setClientQuery(event.target.value)}
                      placeholder="Buscar por nome ou telefone"
                      className="pl-9"
                    />
                  </div>
                  {filteredClients.length > 0 ? (
                    <ul className="mt-2 max-h-40 divide-y divide-[var(--border-subtle)] overflow-y-auto rounded-lg border border-[var(--border-subtle)]">
                      {filteredClients.map((client) => (
                        <li key={client.id}>
                          <button
                            type="button"
                            onClick={() => setClientId(client.id)}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-muted)]"
                          >
                            <span>{client.name}</span>
                            <span className="text-xs text-[var(--text-muted)]">{client.phone}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      Nenhum cliente encontrado. Cadastre em Clientes antes de agendar.
                    </p>
                  )}
                </>
              )}
            </Field>

            {/* Profissional */}
            {canChooseBarber ? (
              <Field label="Profissional" htmlFor="barber">
                <Select
                  id="barber"
                  value={barberId}
                  onChange={(event) => setBarberId(event.target.value)}
                >
                  <option value="">Qualquer profissional livre</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {/* Servicos */}
            <Field label="Serviços" required error={state.fieldErrors?.serviceIds}>
              <div className="grid max-h-44 gap-1.5 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-2 sm:grid-cols-2">
                {availableServices.map((service) => {
                  const checked = serviceIds.includes(service.id);
                  return (
                    <label
                      key={service.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        checked ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-muted)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setServiceIds((current) =>
                            current.includes(service.id)
                              ? current.filter((id) => id !== service.id)
                              : [...current, service.id],
                          )
                        }
                        className="size-4 accent-[var(--accent)]"
                      />
                      <span className="min-w-0 flex-1 truncate">{service.name}</span>
                      <span className="shrink-0 text-xs text-[var(--text-muted)]">
                        {formatMoney(service.priceCents)}
                      </span>
                    </label>
                  );
                })}
              </div>
              {serviceIds.length > 0 ? (
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  {formatDuration(duration)} · {formatMoney(total)} (antes do plano)
                </p>
              ) : null}
            </Field>

            {/* Data e horario */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data" htmlFor="date">
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </Field>

              <Field label="Horário" required>
                {serviceIds.length === 0 ? (
                  <p className="py-2 text-sm text-[var(--text-muted)]">
                    Escolha os serviços para ver os horários.
                  </p>
                ) : loading ? (
                  <p className="flex items-center gap-2 py-2 text-sm text-[var(--text-muted)]">
                    <Loader2 className="size-4 animate-spin" />
                    Buscando horários...
                  </p>
                ) : slots.length === 0 ? (
                  <p className="py-2 text-sm text-[var(--text-muted)]">
                    Sem horário livre nesta data.
                  </p>
                ) : (
                  <div className="grid max-h-32 grid-cols-4 gap-1.5 overflow-y-auto">
                    {slots.map((slot) => (
                      <button
                        key={slot.minute}
                        type="button"
                        onClick={() => setMinute(slot.minute)}
                        className={cn(
                          "rounded-md border py-1.5 text-xs font-medium transition-colors",
                          minute === slot.minute
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--accent)]",
                        )}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            </div>

            <Field label="Nota interna" htmlFor="internalNotes">
              <Textarea
                id="internalNotes"
                name="internalNotes"
                rows={2}
                maxLength={500}
                placeholder="Visível apenas para a equipe."
              />
            </Field>

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
            <Button
              type="submit"
              loading={pending}
              disabled={!clientId || serviceIds.length === 0 || minute === null}
            >
              Criar agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
