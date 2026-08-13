"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Scissors,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { addDaysISO, formatDuration, parseDateKey } from "@/lib/time";
import { priceAppointment, type CreditBalance } from "@/lib/pricing";
import { SERVICE_CATEGORY_LABEL, WEEKDAY_SHORT, type ServiceCategory } from "@/lib/enums";
import { createBookingAction } from "@/server/actions/booking";
import { useToast } from "@/components/ui/toast";

type ServiceOption = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  priceCents: number;
  durationMinutes: number;
  barberIds: string[];
  overrides: { barberId: string; priceCents: number | null; durationMinutes: number | null }[];
};

type BarberOption = {
  id: string;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
  color: string;
  serviceIds: string[];
  rating: number | null;
  reviewCount: number;
};

type SubscriptionInfo = {
  planName: string;
  extraDiscountPercent: number;
  credits: { serviceId: string; serviceName: string; total: number; used: number }[];
};

type Slot = { minute: number; label: string; barberIds: string[] };

const STEPS = ["Serviços", "Profissional", "Horário", "Confirmar"] as const;

const NO_SLOT_REASON: Record<string, string> = {
  CLOSED: "A barbearia não abre neste dia.",
  PAST: "Esta data já passou.",
  TOO_FAR: "Ainda não abrimos a agenda para esta data.",
  NO_BARBER: "Nenhum profissional atende essa combinação de serviços.",
  FULL: "Todos os horários deste dia foram preenchidos.",
  BOOKING_DISABLED: "O agendamento online está pausado.",
};

export function BookingWizard({
  services,
  barbers,
  subscription,
  authenticated,
  today,
  maxAdvanceDays,
  initialServiceId,
  initialBarberId,
  initialDate,
}: {
  services: ServiceOption[];
  barbers: BarberOption[];
  subscription: SubscriptionInfo | null;
  authenticated: boolean;
  today: string;
  maxAdvanceDays: number;
  initialServiceId?: string;
  initialBarberId?: string;
  initialDate?: string;
}) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = React.useState(0);
  const [selectedServices, setSelectedServices] = React.useState<string[]>(
    initialServiceId ? [initialServiceId] : [],
  );
  const [barberId, setBarberId] = React.useState<string | null>(initialBarberId ?? null);
  const [date, setDate] = React.useState<string>(initialDate ?? today);
  const [minute, setMinute] = React.useState<number | null>(null);
  const [notes, setNotes] = React.useState("");
  const [usePlan, setUsePlan] = React.useState(true);

  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [slotReason, setSlotReason] = React.useState<string | undefined>();
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [dayCounts, setDayCounts] = React.useState<Record<string, number>>({});
  const [weekStart, setWeekStart] = React.useState(initialDate ?? today);
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState<{ id: string; code: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const chosen = React.useMemo(
    () => selectedServices.map((id) => services.find((s) => s.id === id)!).filter(Boolean),
    [selectedServices, services],
  );

  /** Profissionais que atendem TODOS os serviços escolhidos. */
  const eligibleBarbers = React.useMemo(() => {
    if (chosen.length === 0) return barbers;
    return barbers.filter((barber) =>
      chosen.every((service) => barber.serviceIds.includes(service.id)),
    );
  }, [barbers, chosen]);

  // Se o profissional escolhido deixar de atender a combinacao, soltamos a
  // selecao em vez de deixar o usuario preso num estado impossivel.
  React.useEffect(() => {
    if (barberId && !eligibleBarbers.some((b) => b.id === barberId)) {
      setBarberId(null);
    }
  }, [barberId, eligibleBarbers]);

  /** Preco e duracao dependem do profissional (sobrescritas por barbeiro). */
  const resolved = React.useMemo(() => {
    return chosen.map((service) => {
      const override = barberId
        ? service.overrides.find((o) => o.barberId === barberId)
        : undefined;
      return {
        id: service.id,
        name: service.name,
        priceCents: override?.priceCents ?? service.priceCents,
        durationMinutes: override?.durationMinutes ?? service.durationMinutes,
      };
    });
  }, [chosen, barberId]);

  const credits: CreditBalance[] =
    subscription && usePlan
      ? subscription.credits.map((c) => ({ serviceId: c.serviceId, total: c.total, used: c.used }))
      : [];

  const pricing = React.useMemo(
    () =>
      priceAppointment(
        resolved,
        credits,
        subscription && usePlan
          ? { extraDiscountPercent: subscription.extraDiscountPercent }
          : null,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resolved, subscription, usePlan],
  );

  const totalDuration = resolved.reduce((sum, s) => sum + s.durationMinutes, 0);

  // ----------------------------------------------------------- carregamentos

  const serviceKey = selectedServices.join(",");

  React.useEffect(() => {
    if (step !== 2 || selectedServices.length === 0) return;

    const controller = new AbortController();
    setLoadingSlots(true);
    setSlotReason(undefined);

    const query = new URLSearchParams({ data: date, servicos: serviceKey });
    if (barberId) query.set("profissional", barberId);

    fetch(`/api/disponibilidade?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setSlots(payload.slots ?? []);
        setSlotReason(payload.reason);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setSlots([]);
      })
      .finally(() => setLoadingSlots(false));

    return () => controller.abort();
  }, [step, date, serviceKey, barberId, selectedServices.length]);

  // Contagem por dia da faixa visivel do calendario.
  React.useEffect(() => {
    if (step !== 2 || selectedServices.length === 0) return;

    const controller = new AbortController();
    const query = new URLSearchParams({
      modo: "periodo",
      data: weekStart,
      ate: addDaysISO(weekStart, 13),
      servicos: serviceKey,
    });
    if (barberId) query.set("profissional", barberId);

    fetch(`/api/disponibilidade?${query}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => setDayCounts((current) => ({ ...current, ...(payload.dias ?? {}) })))
      .catch(() => undefined);

    return () => controller.abort();
  }, [step, weekStart, serviceKey, barberId, selectedServices.length]);

  // Trocar de dia invalida o horario ja marcado.
  React.useEffect(() => {
    setMinute(null);
  }, [date, barberId, serviceKey]);

  // ------------------------------------------------------------- navegacao

  const canAdvance = [
    selectedServices.length > 0,
    true, // profissional e opcional ("qualquer um")
    minute !== null,
    true,
  ][step];

  function goNext() {
    if (!canAdvance) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    scrollToTop();
  }

  function goBack() {
    setStep((current) => Math.max(current - 1, 0));
    scrollToTop();
  }

  function scrollToTop() {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleService(id: string) {
    setSelectedServices((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
  }

  async function submit() {
    if (!authenticated) {
      const params = new URLSearchParams({
        proximo: `/agendar?servico=${chosen[0]?.slug ?? ""}&data=${date}${barberId ? `&profissional=${barberId}` : ""}`,
      });
      router.push(`/entrar?${params}`);
      return;
    }
    if (minute === null) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    for (const id of selectedServices) formData.append("serviceIds", id);
    if (barberId) formData.set("barberId", barberId);
    formData.set("date", date);
    formData.set("minute", String(minute));
    formData.set("notes", notes);
    formData.set("usePlan", usePlan ? "true" : "false");

    const result = await createBookingAction({ ok: false }, formData);
    setSubmitting(false);

    if (result.ok) {
      setConfirmed({
        id: String(result.data?.appointmentId ?? ""),
        code: String(result.data?.code ?? ""),
      });
      toast.success("Agendamento confirmado", "Enviamos os detalhes para a sua conta.");
      router.refresh();
    } else {
      setError(result.message ?? "Não foi possível concluir.");
      toast.error("Não foi possível agendar", result.message);
      // Horario tomado no meio do caminho: volta para a escolha de horario.
      if (result.message?.includes("horario")) setStep(2);
    }
  }

  if (confirmed) {
    return (
      <ConfirmationPanel
        code={confirmed.code}
        appointmentId={confirmed.id}
        date={date}
        minute={minute ?? 0}
        services={pricing.charges.map((c) => c.name)}
        barberName={
          barberId ? barbers.find((b) => b.id === barberId)?.name ?? null : null
        }
        totalCents={pricing.totalCents}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div>
        <Stepper current={step} onSelect={(index) => index < step && setStep(index)} />

        <div className="mt-8">
          {step === 0 ? (
            <ServiceStep
              services={services}
              selected={selectedServices}
              onToggle={toggleService}
              subscription={subscription}
            />
          ) : null}

          {step === 1 ? (
            <BarberStep
              barbers={eligibleBarbers}
              selected={barberId}
              onSelect={setBarberId}
              serviceCount={chosen.length}
            />
          ) : null}

          {step === 2 ? (
            <ScheduleStep
              today={today}
              maxAdvanceDays={maxAdvanceDays}
              date={date}
              onDateChange={setDate}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              dayCounts={dayCounts}
              slots={slots}
              loading={loadingSlots}
              reason={slotReason}
              minute={minute}
              onMinuteChange={setMinute}
              barbers={barbers}
              selectedBarberId={barberId}
            />
          ) : null}

          {step === 3 ? (
            <ConfirmStep
              pricing={pricing}
              date={date}
              minute={minute}
              duration={totalDuration}
              barber={barberId ? barbers.find((b) => b.id === barberId) ?? null : null}
              slotBarbers={
                minute !== null
                  ? (slots.find((s) => s.minute === minute)?.barberIds ?? []).map(
                      (id) => barbers.find((b) => b.id === id)?.name ?? "",
                    )
                  : []
              }
              subscription={subscription}
              usePlan={usePlan}
              onUsePlanChange={setUsePlan}
              notes={notes}
              onNotesChange={setNotes}
              authenticated={authenticated}
              error={error}
            />
          ) : null}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-6">
          <Button variant="ghost" onClick={goBack} disabled={step === 0}>
            <ArrowLeft className="size-4" />
            Voltar
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={goNext} disabled={!canAdvance} size="lg">
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting} size="lg">
              {authenticated ? "Confirmar agendamento" : "Entrar e confirmar"}
            </Button>
          )}
        </div>
      </div>

      <SummaryCard
        charges={pricing.charges}
        subtotalCents={pricing.subtotalCents}
        discountCents={pricing.discountCents}
        totalCents={pricing.totalCents}
        duration={totalDuration}
        date={step >= 2 && minute !== null ? date : null}
        minute={minute}
        barberName={barberId ? barbers.find((b) => b.id === barberId)?.name ?? null : null}
        planName={subscription && usePlan ? subscription.planName : null}
      />
    </div>
  );
}

// ------------------------------------------------------------------- passos

function Stepper({ current, onSelect }: { current: number; onSelect: (index: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas do agendamento">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(index)}
              disabled={index >= current}
              className={cn(
                "flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors",
                done && "cursor-pointer hover:opacity-80",
                index > current && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  active && "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]",
                  done && "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]",
                  !active && !done && "border-[var(--border-strong)] text-[var(--text-muted)]",
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
                )}
              >
                {label}
              </span>
            </button>
            {index < STEPS.length - 1 ? (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  done ? "bg-[var(--accent)]" : "bg-[var(--border-subtle)]",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ServiceStep({
  services,
  selected,
  onToggle,
  subscription,
}: {
  services: ServiceOption[];
  selected: string[];
  onToggle: (id: string) => void;
  subscription: SubscriptionInfo | null;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, ServiceOption[]>();
    for (const service of services) {
      const list = map.get(service.category) ?? [];
      list.push(service);
      map.set(service.category, list);
    }
    return [...map.entries()];
  }, [services]);

  const creditFor = (serviceId: string) => {
    const credit = subscription?.credits.find((c) => c.serviceId === serviceId);
    if (!credit) return null;
    if (credit.total < 0) return "Ilimitado no plano";
    const left = Math.max(0, credit.total - credit.used);
    return left > 0 ? `${left} no plano` : null;
  };

  return (
    <section aria-labelledby="titulo-servicos">
      <h2 id="titulo-servicos" className="text-lg font-semibold">
        O que você vai fazer hoje?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Pode combinar mais de um serviço — somamos a duração para reservar o tempo certo.
      </p>

      <div className="mt-6 space-y-8">
        {grouped.map(([category, list]) => (
          <div key={category}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {SERVICE_CATEGORY_LABEL[category as ServiceCategory] ?? category}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {list.map((service) => {
                const isSelected = selected.includes(service.id);
                const credit = creditFor(service.id);

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => onToggle(service.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "group relative flex flex-col rounded-xl border p-4 text-left transition-all",
                      isSelected
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-soft)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
                    )}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-medium">{service.name}</span>
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                            : "border-[var(--border-strong)]",
                        )}
                      >
                        {isSelected ? <Check className="size-3.5" /> : null}
                      </span>
                    </span>

                    {service.description ? (
                      <span className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                        {service.description}
                      </span>
                    ) : null}

                    <span className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-semibold">{formatMoney(service.priceCents)}</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-muted)]">
                        {formatDuration(service.durationMinutes)}
                      </span>
                      {credit ? (
                        <Badge tone="success" size="sm" className="ml-auto">
                          <BadgeCheck className="size-3" />
                          {credit}
                        </Badge>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BarberStep({
  barbers,
  selected,
  onSelect,
  serviceCount,
}: {
  barbers: BarberOption[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  serviceCount: number;
}) {
  return (
    <section aria-labelledby="titulo-profissional">
      <h2 id="titulo-profissional" className="text-lg font-semibold">
        Com quem você quer cortar?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        {barbers.length === 0
          ? "Nenhum profissional atende essa combinação. Volte e ajuste os serviços."
          : `Mostrando quem atende ${serviceCount > 1 ? "todos os serviços escolhidos" : "o serviço escolhido"}.`}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
            selected === null
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-[var(--surface-muted)]">
            <Users className="size-5 text-[var(--text-secondary)]" />
          </span>
          <span className="min-w-0">
            <span className="block font-medium">Qualquer profissional</span>
            <span className="block text-sm text-[var(--text-muted)]">
              Mais horários disponíveis
            </span>
          </span>
        </button>

        {barbers.map((barber) => {
          const isSelected = selected === barber.id;
          return (
            <button
              key={barber.id}
              type="button"
              onClick={() => onSelect(barber.id)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                  : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)]",
              )}
            >
              <Avatar name={barber.name} src={barber.avatarUrl} size="lg" ring={barber.color} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{barber.name}</span>
                <span className="block truncate text-sm text-[var(--text-muted)]">
                  {barber.headline}
                </span>
                {barber.rating ? (
                  <span className="mt-1 flex items-center gap-1 text-xs font-medium text-brass-600 dark:text-brass-300">
                    <Star className="size-3 fill-current" />
                    {barber.rating.toFixed(1)}
                    <span className="font-normal text-[var(--text-muted)]">
                      ({barber.reviewCount})
                    </span>
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ScheduleStep({
  today,
  maxAdvanceDays,
  date,
  onDateChange,
  weekStart,
  onWeekChange,
  dayCounts,
  slots,
  loading,
  reason,
  minute,
  onMinuteChange,
  barbers,
  selectedBarberId,
}: {
  today: string;
  maxAdvanceDays: number;
  date: string;
  onDateChange: (value: string) => void;
  weekStart: string;
  onWeekChange: (value: string) => void;
  dayCounts: Record<string, number>;
  slots: Slot[];
  loading: boolean;
  reason?: string;
  minute: number | null;
  onMinuteChange: (value: number) => void;
  barbers: BarberOption[];
  selectedBarberId: string | null;
}) {
  const days = React.useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDaysISO(weekStart, index)),
    [weekStart],
  );

  const periods = React.useMemo(() => groupByPeriod(slots), [slots]);
  const canGoBack = weekStart > today;
  const lastAllowed = addDaysISO(today, maxAdvanceDays);

  return (
    <section aria-labelledby="titulo-horario">
      <h2 id="titulo-horario" className="text-lg font-semibold">
        Quando fica bom para você?
      </h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Mostramos apenas horários em que o atendimento cabe inteiro.
      </p>

      {/* Faixa de dias */}
      <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => onWeekChange(maxDate(today, addDaysISO(weekStart, -7)))}
            disabled={!canGoBack}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-40"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium first-letter:uppercase">{monthLabel(days[0], days[13])}</span>
          <button
            type="button"
            onClick={() => onWeekChange(addDaysISO(weekStart, 7))}
            disabled={addDaysISO(weekStart, 7) > lastAllowed}
            className="rounded-lg p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] disabled:opacity-40"
            aria-label="Próxima semana"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const parsed = parseDateKey(day);
            const count = dayCounts[day];
            const disabled = count === 0 || day > lastAllowed;
            const isSelected = day === date;

            return (
              <button
                key={day}
                type="button"
                onClick={() => onDateChange(day)}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={`${parsed.getDate()} de ${parsed.toLocaleDateString("pt-BR", { month: "long" })}${
                  count ? `, ${count} horários` : ", indisponível"
                }`}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 transition-all",
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : disabled
                      ? "cursor-not-allowed border-transparent text-[var(--text-muted)] opacity-45"
                      : "border-[var(--border-subtle)] hover:border-[var(--accent)]",
                )}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-80">
                  {WEEKDAY_SHORT[parsed.getDay()]}
                </span>
                <span className="text-sm font-semibold">{parsed.getDate()}</span>
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    isSelected
                      ? "bg-[var(--accent-contrast)]"
                      : count > 0
                        ? "bg-moss-500"
                        : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Horários */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-[var(--text-muted)]">
            <Loader2 className="size-4 animate-spin" />
            Consultando a agenda...
          </div>
        ) : slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-strong)] px-6 py-12 text-center">
            <CalendarDays className="mx-auto size-6 text-[var(--text-muted)]" />
            <p className="mt-3 font-medium">{NO_SLOT_REASON[reason ?? "FULL"]}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Escolha outro dia na faixa acima
              {selectedBarberId ? " ou volte e selecione outro profissional." : "."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {periods.map(({ key, label, icon: Icon, items }) =>
              items.length === 0 ? null : (
                <div key={key}>
                  <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    <Icon className="size-3.5" />
                    {label}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {items.map((slot) => {
                      const isSelected = minute === slot.minute;
                      return (
                        <button
                          key={slot.minute}
                          type="button"
                          onClick={() => onMinuteChange(slot.minute)}
                          aria-pressed={isSelected}
                          className={cn(
                            "rounded-lg border py-2.5 text-sm font-medium transition-all",
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]"
                              : "border-[var(--border-subtle)] bg-[var(--surface-raised)] hover:border-[var(--accent)] hover:text-[var(--accent)]",
                          )}
                        >
                          {slot.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ),
            )}

            {!selectedBarberId && minute !== null ? (
              <p className="flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                <Users className="size-4 shrink-0 text-[var(--text-muted)]" />
                {describeAvailableBarbers(slots, minute, barbers)}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

function ConfirmStep({
  pricing,
  date,
  minute,
  duration,
  barber,
  slotBarbers,
  subscription,
  usePlan,
  onUsePlanChange,
  notes,
  onNotesChange,
  authenticated,
  error,
}: {
  pricing: ReturnType<typeof priceAppointment>;
  date: string;
  minute: number | null;
  duration: number;
  barber: BarberOption | null;
  slotBarbers: string[];
  subscription: SubscriptionInfo | null;
  usePlan: boolean;
  onUsePlanChange: (value: boolean) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  authenticated: boolean;
  error: string | null;
}) {
  const covered = pricing.charges.filter((c) => c.coveredByPlan);

  return (
    <section aria-labelledby="titulo-confirmar" className="space-y-6">
      <div>
        <h2 id="titulo-confirmar" className="text-lg font-semibold">
          Tudo certo?
        </h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Confira os detalhes. Você recebe a confirmação na hora.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Quando</dt>
            <dd className="mt-1 font-medium first-letter:uppercase">{longDate(date)}</dd>
            <dd className="text-sm text-[var(--text-muted)]">
              {minute !== null ? minutesToLabel(minute) : "--:--"} · {formatDuration(duration)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Com quem</dt>
            <dd className="mt-1 flex items-center gap-2 font-medium">
              {barber ? (
                <>
                  <Avatar name={barber.name} src={barber.avatarUrl} size="xs" />
                  {barber.name}
                </>
              ) : (
                "A definir no horário"
              )}
            </dd>
            {!barber && slotBarbers.length > 0 ? (
              <dd className="text-sm text-[var(--text-muted)]">
                Disponível: {slotBarbers.filter(Boolean).join(", ")}
              </dd>
            ) : null}
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Serviços</dt>
            <dd className="mt-1 font-medium">{pricing.charges.length}</dd>
            <dd className="text-sm text-[var(--text-muted)]">
              {pricing.charges.map((c) => c.name).join(", ")}
            </dd>
          </div>
        </dl>
      </div>

      {subscription ? (
        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
            usePlan
              ? "border-moss-500/40 bg-moss-500/8"
              : "border-[var(--border-subtle)] bg-[var(--surface-raised)]",
          )}
        >
          <input
            type="checkbox"
            checked={usePlan}
            onChange={(event) => onUsePlanChange(event.target.checked)}
            className="mt-0.5 size-4 accent-[var(--accent)]"
          />
          <span className="flex-1">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="size-4 text-moss-500" />
              Usar meu plano {subscription.planName}
            </span>
            <span className="mt-1 block text-sm text-[var(--text-muted)]">
              {covered.length > 0
                ? `${covered.length} serviço(s) sairao sem custo usando sua franquia.`
                : `Sem franquia disponível para estes serviços — você ainda recebe ${subscription.extraDiscountPercent}% de desconto.`}
            </span>
          </span>
        </label>
      ) : null}

      <div>
        <label htmlFor="observacoes" className="text-sm font-medium text-[var(--text-secondary)]">
          Alguma observação? <span className="text-[var(--text-muted)]">(opcional)</span>
        </label>
        <Textarea
          id="observacoes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          maxLength={500}
          placeholder="Ex.: máquina 2 nas laterais, tesoura em cima. Vou chegar 5 min antes."
          className="mt-2"
        />
      </div>

      {!authenticated ? (
        <p className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          Você será levado ao login e volta direto para esta tela — nada do que montou se perde.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rust-500/30 bg-rust-500/10 px-4 py-3 text-sm text-rust-500" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

// ------------------------------------------------------------------- resumo

function SummaryCard({
  charges,
  subtotalCents,
  discountCents,
  totalCents,
  duration,
  date,
  minute,
  barberName,
  planName,
}: {
  charges: ReturnType<typeof priceAppointment>["charges"];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  duration: number;
  date: string | null;
  minute: number | null;
  barberName: string | null;
  planName: string | null;
}) {
  return (
    <aside className="lg:sticky lg:top-24">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <Scissors className="size-4" />
          Seu agendamento
        </h2>

        {charges.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Escolha um serviço para montar seu horário.
          </p>
        ) : (
          <>
            <ul className="mt-4 space-y-2.5">
              {charges.map((charge) => (
                <li key={charge.serviceId + charge.name} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{charge.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDuration(charge.durationMinutes)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {charge.coveredByPlan ? (
                      <Badge tone="success" size="sm">
                        Plano
                      </Badge>
                    ) : (
                      <>
                        <span className="font-medium">{formatMoney(charge.chargedCents)}</span>
                        {charge.discountCents > 0 ? (
                          <span className="block text-xs text-[var(--text-muted)] line-through">
                            {formatMoney(charge.listPriceCents)}
                          </span>
                        ) : null}
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-4 text-sm">
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Subtotal</span>
                <span>{formatMoney(subtotalCents)}</span>
              </div>
              {discountCents > 0 ? (
                <div className="flex justify-between text-moss-600 dark:text-moss-400">
                  <span>{planName ? `Plano ${planName}` : "Desconto"}</span>
                  <span>-{formatMoney(discountCents)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-1.5 text-base font-semibold">
                <span>Total</span>
                <span>{totalCents === 0 ? "Coberto pelo plano" : formatMoney(totalCents)}</span>
              </div>
            </div>

            <dl className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Clock className="size-4 shrink-0 text-[var(--text-muted)]" />
                {formatDuration(duration)} de cadeira
              </div>
              {date && minute !== null ? (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <CalendarDays className="size-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="first-letter:uppercase">
                    {shortDate(date)} às {minutesToLabel(minute)}
                  </span>
                </div>
              ) : null}
              {barberName ? (
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Users className="size-4 shrink-0 text-[var(--text-muted)]" />
                  {barberName}
                </div>
              ) : null}
            </dl>
          </>
        )}
      </div>
    </aside>
  );
}

function ConfirmationPanel({
  code,
  appointmentId,
  date,
  minute,
  services,
  barberName,
  totalCents,
}: {
  code: string;
  appointmentId: string;
  date: string;
  minute: number;
  services: string[];
  barberName: string | null;
  totalCents: number;
}) {
  return (
    <div className="mx-auto max-w-lg animate-[var(--animate-fade-up)] text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-moss-500/12">
        <CheckCircle2 className="size-8 text-moss-500" />
      </span>

      <h2 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold">
        Horário reservado
      </h2>
      <p className="mt-2 text-[var(--text-muted)]">
        Guardamos sua cadeira. Você recebe um lembrete antes do atendimento.
      </p>

      <div className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-6 text-left">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
          <span className="text-sm text-[var(--text-muted)]">Código</span>
          <span className="font-mono text-lg font-semibold tracking-wider">{code}</span>
        </div>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Quando</dt>
            <dd className="text-right font-medium first-letter:uppercase">
              {longDate(date)} às {minutesToLabel(minute)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Serviços</dt>
            <dd className="text-right font-medium">{services.join(", ")}</dd>
          </div>
          {barberName ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--text-muted)]">Profissional</dt>
              <dd className="text-right font-medium">{barberName}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">Total</dt>
            <dd className="text-right font-semibold">
              {totalCents === 0 ? "Coberto pelo plano" : formatMoney(totalCents)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={`/minha-conta/agendamentos/${appointmentId}`}>Ver meu agendamento</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- utilitarios

function groupByPeriod(slots: Slot[]) {
  return [
    {
      key: "manha",
      label: "Manha",
      icon: Sunrise,
      items: slots.filter((s) => s.minute < 12 * 60),
    },
    {
      key: "tarde",
      label: "Tarde",
      icon: Sun,
      items: slots.filter((s) => s.minute >= 12 * 60 && s.minute < 18 * 60),
    },
    {
      key: "noite",
      label: "Noite",
      icon: Sunset,
      items: slots.filter((s) => s.minute >= 18 * 60),
    },
  ];
}

function describeAvailableBarbers(slots: Slot[], minute: number, barbers: BarberOption[]): string {
  const slot = slots.find((s) => s.minute === minute);
  if (!slot) return "";
  const names = slot.barberIds
    .map((id) => barbers.find((b) => b.id === id)?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "";
  if (names.length === 1) return `Você será atendido por ${names[0]}.`;
  return `Livres neste horário: ${names.join(", ")}. Definimos na chegada.`;
}

function minutesToLabel(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function longDate(dateISO: string): string {
  return parseDateKey(dateISO).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shortDate(dateISO: string): string {
  return parseDateKey(dateISO).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function monthLabel(fromISO: string, toISO: string): string {
  const from = parseDateKey(fromISO);
  const to = parseDateKey(toISO);
  const fromLabel = from.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  if (from.getMonth() === to.getMonth()) return fromLabel;
  return `${from.toLocaleDateString("pt-BR", { month: "short" })} – ${to.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}`;
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}
