import type { Metadata } from "next";
import Link from "next/link";
import { CalendarOff } from "lucide-react";

import { BookingWizard } from "./booking-wizard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/auth/session";
import { getShopConfig } from "@/server/services/settings";
import { getActiveSubscription } from "@/server/services/subscriptions";
import { todayKey } from "@/lib/time";

export const metadata: Metadata = {
  title: "Agendar horário",
  description: "Escolha serviço, profissional e horário na Mandu Barber.",
};

export const dynamic = "force-dynamic";

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string; profissional?: string; data?: string }>;
}) {
  const params = await searchParams;
  const [shop, user] = await Promise.all([getShopConfig(), getCurrentUser()]);

  const [services, barbers] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { barbers: { select: { barberId: true, priceCents: true, durationMinutes: true } } },
    }),
    prisma.barberProfile.findMany({
      where: { active: true, acceptsNewClients: true },
      orderBy: { displayOrder: "asc" },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        services: { select: { serviceId: true } },
        reviews: { select: { rating: true } },
      },
    }),
  ]);

  if (!shop.allowOnlineBooking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
        <EmptyState
          icon={CalendarOff}
          title="Agendamento online pausado"
          description="Estamos com a agenda online temporariamente fechada. Fale com a gente pelo WhatsApp que encaixamos você."
          action={
            shop.whatsapp ? (
              <Button asChild>
                <a href={`https://wa.me/55${shop.whatsapp}`} target="_blank" rel="noreferrer">
                  Chamar no WhatsApp
                </a>
              </Button>
            ) : null
          }
        />
      </div>
    );
  }

  const subscription = user ? await getActiveSubscription(user.id) : null;

  const preselectedService = params.servico
    ? services.find((s) => s.slug === params.servico || s.id === params.servico)?.id
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl">
          Agendar horário
        </h1>
        <p className="mt-2 text-[var(--text-muted)]">
          Quatro passos rápidos. Você vê o preço final antes de confirmar.
        </p>
      </div>

      {!user ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] px-4 py-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Monte seu agendamento a vontade. Na hora de confirmar, pedimos seu acesso.
          </p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/entrar?proximo=/agendar">Entrar agora</Link>
          </Button>
        </div>
      ) : null}

      <BookingWizard
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          slug: service.slug,
          description: service.description,
          category: service.category,
          priceCents: service.priceCents,
          durationMinutes: service.durationMinutes,
          barberIds: service.barbers.map((b) => b.barberId),
          overrides: service.barbers.map((b) => ({
            barberId: b.barberId,
            priceCents: b.priceCents,
            durationMinutes: b.durationMinutes,
          })),
        }))}
        barbers={barbers.map((barber) => ({
          id: barber.id,
          name: barber.user.name,
          avatarUrl: barber.user.avatarUrl,
          headline: barber.headline,
          color: barber.agendaColor,
          serviceIds: barber.services.map((s) => s.serviceId),
          rating:
            barber.reviews.length > 0
              ? barber.reviews.reduce((sum, r) => sum + r.rating, 0) / barber.reviews.length
              : null,
          reviewCount: barber.reviews.length,
        }))}
        subscription={
          subscription
            ? {
                planName: subscription.planName,
                extraDiscountPercent: subscription.extraDiscountPercent,
                credits: subscription.credits.map((credit) => ({
                  serviceId: credit.serviceId,
                  serviceName: credit.serviceName,
                  total: credit.total,
                  used: credit.used,
                })),
              }
            : null
        }
        authenticated={Boolean(user)}
        today={todayKey(shop.timezone)}
        maxAdvanceDays={shop.maxAdvanceDays}
        initialServiceId={preselectedService}
        initialBarberId={params.profissional}
        initialDate={params.data}
      />
    </div>
  );
}
