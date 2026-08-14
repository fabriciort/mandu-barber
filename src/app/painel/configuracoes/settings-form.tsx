"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Clock, MapPin, Save, Settings2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckboxField, Field, Input, Select } from "@/components/ui/field";
import { PhoneInput } from "@/components/phone-input";
import { useToast } from "@/components/ui/toast";
import { saveSettingsAction } from "@/server/actions/management";
import type { ActionState } from "@/server/actions/result";
import { formatMinutesLabel } from "@/lib/time";
import { WEEKDAY_LABEL } from "@/lib/enums";

type BusinessHour = {
  weekday: number;
  openMinute: number;
  closeMinute: number;
  closed: boolean;
};

export function SettingsForm({
  settings,
  businessHours,
}: {
  settings: {
    name: string;
    tagline: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    addressLine: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    instagram: string | null;
    mapsUrl: string | null;
    slotStepMinutes: number;
    minLeadMinutes: number;
    maxAdvanceDays: number;
    cancellationWindowHours: number;
    allowOnlineBooking: boolean;
  };
  businessHours: BusinessHour[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [hours, setHours] = React.useState(businessHours);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveSettingsAction, {
    ok: false,
  });

  React.useEffect(() => {
    if (state.ok) {
      toast.success("Configurações salvas");
      router.refresh();
    } else if (state.message) {
      toast.error("Não foi possível salvar", state.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function updateDay(weekday: number, patch: Partial<BusinessHour>) {
    setHours((current) =>
      current.map((day) => (day.weekday === weekday ? { ...day, ...patch } : day)),
    );
  }

  const invalidDay = hours.find((day) => !day.closed && day.closeMinute <= day.openMinute);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="businessHours" value={JSON.stringify(hours)} />

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Store className="size-4 text-[var(--accent)]" />
          Identidade
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nome da barbearia" htmlFor="name" required error={state.fieldErrors?.name}>
            <Input id="name" name="name" defaultValue={settings.name} required maxLength={80} />
          </Field>
          <Field label="Frase de apoio" htmlFor="tagline">
            <Input id="tagline" name="tagline" defaultValue={settings.tagline} maxLength={160} />
          </Field>
          <Field label="Telefone fixo" htmlFor="phone">
            <PhoneInput id="phone" name="phone" defaultValue={settings.phone} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp" hint="Usado nos botoes de contato do site.">
            <PhoneInput id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp} />
          </Field>
          <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email}>
            <Input id="email" name="email" type="email" defaultValue={settings.email ?? ""} />
          </Field>
          <Field label="Instagram" htmlFor="instagram" hint="Somente o usuário, sem @.">
            <Input id="instagram" name="instagram" defaultValue={settings.instagram ?? ""} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin className="size-4 text-[var(--accent)]" />
          Endereço
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Logradouro" htmlFor="addressLine" className="sm:col-span-2">
            <Input
              id="addressLine"
              name="addressLine"
              defaultValue={settings.addressLine ?? ""}
              maxLength={160}
            />
          </Field>
          <Field label="Bairro" htmlFor="district">
            <Input id="district" name="district" defaultValue={settings.district ?? ""} />
          </Field>
          <Field label="Cidade" htmlFor="city">
            <Input id="city" name="city" defaultValue={settings.city ?? ""} />
          </Field>
          <Field label="UF" htmlFor="state">
            <Input id="state" name="state" defaultValue={settings.state ?? ""} maxLength={2} />
          </Field>
          <Field label="CEP" htmlFor="zipCode">
            <Input id="zipCode" name="zipCode" defaultValue={settings.zipCode ?? ""} maxLength={12} />
          </Field>
          <Field label="Link do mapa" htmlFor="mapsUrl" className="sm:col-span-2 lg:col-span-3">
            <Input id="mapsUrl" name="mapsUrl" defaultValue={settings.mapsUrl ?? ""} maxLength={400} />
          </Field>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock className="size-4 text-[var(--accent)]" />
          Funcionamento
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Este é o limite externo da agenda: nenhum profissional aparece disponível fora dele.
        </p>

        <div className="mt-5 space-y-2">
          {hours.map((day) => (
            <div
              key={day.weekday}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5"
            >
              <span className="w-24 text-sm font-medium">{WEEKDAY_LABEL[day.weekday]}</span>

              <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <input
                  type="checkbox"
                  checked={!day.closed}
                  onChange={(event) => updateDay(day.weekday, { closed: !event.target.checked })}
                  className="size-4 accent-[var(--accent)]"
                />
                Aberto
              </label>

              {!day.closed ? (
                <div className="flex items-center gap-2">
                  <TimeSelect
                    value={day.openMinute}
                    onChange={(value) => updateDay(day.weekday, { openMinute: value })}
                    label={`Abertura de ${WEEKDAY_LABEL[day.weekday]}`}
                  />
                  <span className="text-[var(--text-muted)]">às</span>
                  <TimeSelect
                    value={day.closeMinute}
                    onChange={(value) => updateDay(day.weekday, { closeMinute: value })}
                    label={`Fechamento de ${WEEKDAY_LABEL[day.weekday]}`}
                  />
                  {day.closeMinute <= day.openMinute ? (
                    <span className="text-xs text-[var(--text-primary)]">fim antes do início</span>
                  ) : null}
                </div>
              ) : (
                <span className="text-sm text-[var(--text-muted)]">Fechado o dia todo</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Settings2 className="size-4 text-[var(--accent)]" />
          Regras do agendamento
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Passo da grade (min)"
            htmlFor="slotStepMinutes"
            hint="De quanto em quanto tempo os horários aparecem."
          >
            <Select id="slotStepMinutes" name="slotStepMinutes" defaultValue={settings.slotStepMinutes}>
              {[5, 10, 15, 20, 30, 60].map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Antecedência mínima (min)"
            htmlFor="minLeadMinutes"
            hint="Quanto tempo antes o cliente ainda pode reservar."
          >
            <Input
              id="minLeadMinutes"
              name="minLeadMinutes"
              type="number"
              min={0}
              max={1440}
              step={15}
              defaultValue={settings.minLeadMinutes}
            />
          </Field>

          <Field
            label="Antecedência máxima (dias)"
            htmlFor="maxAdvanceDays"
            hint="Até quando a agenda fica aberta."
          >
            <Input
              id="maxAdvanceDays"
              name="maxAdvanceDays"
              type="number"
              min={1}
              max={365}
              defaultValue={settings.maxAdvanceDays}
            />
          </Field>

          <Field
            label="Prazo de cancelamento (h)"
            htmlFor="cancellationWindowHours"
            hint="Depois disso, só a equipe cancela."
          >
            <Input
              id="cancellationWindowHours"
              name="cancellationWindowHours"
              type="number"
              min={0}
              max={72}
              defaultValue={settings.cancellationWindowHours}
            />
          </Field>
        </div>

        <div className="mt-5">
          <CheckboxField
            name="allowOnlineBooking"
            label="Agendamento online habilitado"
            hint="Desligue para pausar o canal do site sem tirar o ar da agenda interna."
            defaultChecked={settings.allowOnlineBooking}
          />
        </div>
      </Card>

      {state.message && !state.ok ? (
        <p className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">
          {state.message}
        </p>
      ) : null}

      <div className="sticky bottom-20 flex justify-end lg:bottom-4">
        <Button type="submit" size="lg" loading={pending} disabled={Boolean(invalidDay)}>
          <Save className="size-4" />
          Salvar configurações
        </Button>
      </div>
    </form>
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
    for (let minute = 0; minute <= 24 * 60; minute += 30) list.push(minute);
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
