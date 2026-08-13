import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  Quote,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { prisma } from "@/server/db";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { formatMoney } from "@/lib/format";
import { formatDuration, formatMinutesLabel } from "@/lib/time";
import { SERVICE_CATEGORY_LABEL, WEEKDAY_SHORT, type ServiceCategory } from "@/lib/enums";
import { planSavings } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const shop = await getShopConfig();

  const [services, barbers, plans, reviews, stats] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ featured: "desc" }, { displayOrder: "asc" }],
      take: 8,
    }),
    prisma.barberProfile.findMany({
      where: { active: true },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        reviews: { select: { rating: true } },
      },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.plan.findMany({
      where: { active: true },
      include: { benefits: { include: { service: { select: { priceCents: true } } } } },
      orderBy: { displayOrder: "asc" },
      take: 3,
    }),
    prisma.review.findMany({
      where: { comment: { not: null }, rating: { gte: 4 } },
      include: {
        client: { select: { name: true } },
        barber: { select: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    getStats(),
  ]);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="grain relative overflow-hidden bg-ink-950 text-ink-50">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(70% 55% at 15% 0%, rgba(201,139,58,0.25) 0%, transparent 60%), radial-gradient(50% 50% at 100% 100%, rgba(201,111,74,0.18) 0%, transparent 65%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-28">
          <div className="animate-[var(--animate-fade-up)]">
            <Badge tone="accent" className="border-brass-400/40 bg-brass-400/15 text-brass-200">
              <Sparkles className="size-3" />
              {shop.district ? `${shop.district}, ${shop.city}` : "São Paulo"}
            </Badge>

            <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-[1.05] tracking-tight sm:text-6xl">
              Seu horário reservado.
              <br />
              <span className="text-brass-300">Seu corte, do jeito certo.</span>
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-300">
              Escolha o serviço, o profissional e o horário em menos de um minuto. Sem fila de
              espera no WhatsApp, sem &quot;me confirma depois&quot;.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-brass-400 text-ink-950 hover:bg-brass-300">
                <Link href="/agendar">
                  Agendar agora
                  <ArrowRight className="size-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-ink-600 text-ink-100 hover:border-brass-400 hover:text-brass-300"
              >
                <Link href="/planos">Ver planos de assinatura</Link>
              </Button>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-700 pt-8">
              <Stat value={`${stats.completed}+`} label="Atendimentos concluídos" />
              <Stat value={stats.rating} label={`Média de ${stats.reviewCount} avaliações`} />
              <Stat value={`${barbers.length}`} label="Profissionais na equipe" />
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <NextSlotsPreview />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- diferencial */}
      <section className="border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <Highlight
            icon={CalendarCheck}
            title="Agenda que reflete a realidade"
            description="Você só ve horários que o profissional tem de fato. Nada de confirmar e descobrir depois que não dava."
          />
          <Highlight
            icon={ShieldCheck}
            title="Cancelou, o crédito volta"
            description={`Cancelamento online até ${shop.cancellationWindowHours}h antes. Se você é assinante, o crédito do plano retorna na hora.`}
          />
          <Highlight
            icon={Clock}
            title="Lembrete antes do horário"
            description="Um aviso no dia anterior e outro na hora certa. A cadeira não fica vazia e você não perde o corte."
          />
        </div>
      </section>

      {/* ---------------------------------------------------------- servicos */}
      <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Cardápio"
          title="O que fazemos"
          description="Preços de tabela. Assinantes pagam menos ou nada, conforme o plano."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <Card key={service.id} interactive className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <Badge tone={service.featured ? "accent" : "neutral"} size="sm">
                  {SERVICE_CATEGORY_LABEL[service.category as ServiceCategory] ?? service.category}
                </Badge>
                {service.featured ? <Star className="size-4 fill-brass-400 text-brass-400" /> : null}
              </div>

              <h3 className="mt-3 font-medium">{service.name}</h3>
              {service.description ? (
                <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-[var(--text-muted)]">
                  {service.description}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              <div className="mt-4 flex items-end justify-between border-t border-[var(--border-subtle)] pt-3">
                <div>
                  <p className="text-lg font-semibold">{formatMoney(service.priceCents)}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDuration(service.durationMinutes)}
                  </p>
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/agendar?servico=${service.slug}`}>
                    Agendar
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ equipe */}
      <section id="equipe" className="scroll-mt-20 border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Quem corta"
            title="A equipe da casa"
            description="Cada um com sua mao. Escolha quem já conhece seu cabelo — ou deixe que a gente indica quem está livre."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {barbers.map((barber) => {
              const specialties = parseList(barber.specialties);
              const rating = average(barber.reviews.map((r) => r.rating));

              return (
                <Card key={barber.id} interactive className="p-5">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={barber.user.name}
                      src={barber.user.avatarUrl}
                      size="lg"
                      ring={barber.agendaColor}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{barber.user.name}</h3>
                      <p className="truncate text-xs text-[var(--text-muted)]">{barber.headline}</p>
                      {rating ? (
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-brass-600 dark:text-brass-300">
                          <Star className="size-3 fill-current" />
                          {rating.toFixed(1)}
                          <span className="font-normal text-[var(--text-muted)]">
                            ({barber.reviews.length})
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {barber.bio ? (
                    <p className="mt-4 line-clamp-3 text-sm text-[var(--text-muted)]">{barber.bio}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {specialties.map((item) => (
                      <Badge key={item} tone="outline" size="sm">
                        {item}
                      </Badge>
                    ))}
                  </div>

                  <Button asChild variant="secondary" size="sm" block className="mt-5">
                    <Link href={`/agendar?profissional=${barber.id}`}>Agendar com {barber.user.name.split(" ")[0]}</Link>
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ planos */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Assinatura"
          title="Quem corta sempre, paga menos"
          description="Franquia mensal de cortes e barbas, desconto no resto e prioridade na agenda."
        />

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const savings = planSavings(
              plan.priceCents,
              plan.benefits.map((b) => ({
                quantityPerCycle: b.quantityPerCycle,
                priceCents: b.service.priceCents,
              })),
            );

            return (
              <Card
                key={plan.id}
                interactive
                className={`relative flex flex-col p-6 ${plan.highlight ? "border-brass-500/50 shadow-[var(--shadow-lift)]" : ""}`}
              >
                {plan.highlight ? (
                  <Badge tone="accent" className="absolute -top-2.5 left-6">
                    Mais assinado
                  </Badge>
                ) : null}

                <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{plan.tagline}</p>

                <p className="mt-5 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{formatMoney(plan.priceCents)}</span>
                  <span className="text-sm text-[var(--text-muted)]">/mês</span>
                </p>
                {savings.savingsCents > 0 ? (
                  <p className="mt-1 text-xs font-medium text-moss-600 dark:text-moss-400">
                    Economia de até {formatMoney(savings.savingsCents)} por mês
                  </p>
                ) : null}

                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {parseList(plan.perks)
                    .slice(0, 4)
                    .map((perk) => (
                      <li key={perk} className="flex gap-2 text-[var(--text-secondary)]">
                        <Scissors className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" />
                        {perk}
                      </li>
                    ))}
                </ul>

                <Button
                  asChild
                  block
                  variant={plan.highlight ? "primary" : "secondary"}
                  className="mt-6"
                >
                  <Link href={`/planos#${plan.slug}`}>Conhecer o {plan.name}</Link>
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- depoimentos */}
      {reviews.length > 0 ? (
        <section className="border-y border-[var(--border-subtle)] bg-[var(--surface-muted)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <SectionHeading
              eyebrow="Na cadeira"
              title="O que dizem os clientes"
              description="Avaliações deixadas após atendimentos concluídos, sem curadoria."
            />

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <Card key={review.id} className="flex flex-col p-5">
                  <Quote className="size-5 text-[var(--accent)] opacity-50" />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                    {review.comment}
                  </p>
                  <div className="mt-4 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
                    <Avatar name={review.client.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{review.client.name}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        com {review.barber.user.name}
                      </p>
                    </div>
                    <div className="flex gap-0.5" aria-label={`${review.rating} de 5`}>
                      {Array.from({ length: review.rating }).map((_, index) => (
                        <Star key={index} className="size-3.5 fill-brass-400 text-brass-400" />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ visita */}
      <section id="visita" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid gap-10 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-8 md:grid-cols-2 md:p-12">
          <div>
            <SectionHeading eyebrow="Visita" title="Passe na loja" />
            <p className="mt-4 text-[var(--text-secondary)]">
              {formatAddress(shop) || "São Paulo, SP"}
            </p>

            <div className="mt-6 space-y-1.5 text-sm">
              {shop.businessHours.map((blocks, weekday) => (
                <div key={weekday} className="flex items-center gap-3">
                  <span className="w-10 text-[var(--text-muted)]">{WEEKDAY_SHORT[weekday]}</span>
                  <span className={blocks.length ? "font-medium" : "text-[var(--text-muted)]"}>
                    {blocks.length
                      ? blocks
                          .map((b) => `${formatMinutesLabel(b.start)} - ${formatMinutesLabel(b.end)}`)
                          .join("  •  ")
                      : "Fechado"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/agendar">
                  <CalendarCheck className="size-4" />
                  Reservar horário
                </Link>
              </Button>
              {shop.mapsUrl ? (
                <Button asChild variant="outline">
                  <a href={shop.mapsUrl} target="_blank" rel="noreferrer">
                    <MapPin className="size-4" />
                    Como chegar
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="relative min-h-64 overflow-hidden rounded-2xl bg-ink-900">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, rgba(201,139,58,0.35), transparent 55%), radial-gradient(circle at 75% 80%, rgba(201,111,74,0.28), transparent 50%)",
              }}
            />
            <div className="relative flex h-full flex-col justify-end p-6 text-ink-100">
              <Scissors className="size-8 text-brass-300" />
              <p className="mt-4 font-[family-name:var(--font-display)] text-2xl leading-snug">
                &quot;Cadeira boa, conversa boa e o corte no ponto.&quot;
              </p>
              <p className="mt-2 text-sm text-ink-400">O que a gente quer ouvir toda vez.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- auxiliares

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="font-[family-name:var(--font-display)] text-2xl font-semibold text-brass-300">
        {value}
      </dt>
      <dd className="mt-1 text-xs leading-snug text-ink-400">{label}</dd>
    </div>
  );
}

function Highlight({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
        <Icon className="size-5" />
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-[var(--text-muted)]">{description}</p>
      ) : null}
    </div>
  );
}

/** Vitrine dos próximos horários livres — prova de que a agenda esta viva. */
async function NextSlotsPreview() {
  const { getRangeAvailability } = await import("@/server/services/availability");
  const { todayKey, addDaysISO, parseDateKey } = await import("@/lib/time");
  const shop = await getShopConfig();

  const featured = await prisma.service.findFirst({
    where: { active: true, featured: true },
    orderBy: { displayOrder: "asc" },
  });
  if (!featured) return null;

  const from = todayKey(shop.timezone);
  const to = addDaysISO(from, 6);
  const counts = await getRangeAvailability({
    fromISO: from,
    toISO: to,
    serviceIds: [featured.id],
  });

  const days = Object.entries(counts).slice(0, 7);

  return (
    <div className="rounded-3xl border border-ink-700 bg-ink-900/70 p-6 shadow-[var(--shadow-lift)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-400">Próximos 7 dias</p>
          <p className="mt-1 font-medium text-ink-100">{featured.name}</p>
        </div>
        <Badge tone="accent" className="border-brass-400/40 bg-brass-400/15 text-brass-200">
          {formatDuration(featured.durationMinutes)}
        </Badge>
      </div>

      <ul className="mt-6 space-y-2">
        {days.map(([date, count]) => {
          const day = parseDateKey(date);
          const weekday = WEEKDAY_SHORT[day.getDay()];
          return (
            <li
              key={date}
              className="flex items-center justify-between rounded-xl border border-ink-700/70 bg-ink-850/60 px-4 py-3"
            >
              <span className="flex items-center gap-3">
                <span className="flex size-9 flex-col items-center justify-center rounded-lg bg-ink-800 text-[10px] uppercase text-ink-400">
                  {weekday}
                  <span className="text-sm font-semibold text-ink-100">{day.getDate()}</span>
                </span>
              </span>
              <span
                className={
                  count > 0
                    ? "text-sm font-medium text-brass-300"
                    : "text-sm text-ink-500"
                }
              >
                {count > 0 ? `${count} horários livres` : "Sem vaga"}
              </span>
            </li>
          );
        })}
      </ul>

      <Button asChild block className="mt-6 bg-brass-400 text-ink-950 hover:bg-brass-300">
        <Link href="/agendar">Escolher meu horário</Link>
      </Button>
    </div>
  );
}

async function getStats() {
  const [completed, aggregate] = await Promise.all([
    prisma.appointment.count({ where: { status: "COMPLETED" } }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);

  return {
    completed: Math.floor(completed / 10) * 10,
    rating: aggregate._avg.rating ? aggregate._avg.rating.toFixed(1) : "5,0",
    reviewCount: aggregate._count,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function parseList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
