import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Phone, Sparkles, Star, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { DataItem, SectionTitle } from "@/components/ui/misc";
import { ClientFormDialog } from "../client-form-dialog";
import { requireStaff } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { getActiveSubscription } from "@/server/services/subscriptions";
import { formatMoney, formatPhone } from "@/lib/format";
import { formatDate, formatRelative, formatTime } from "@/lib/time";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_TONE,
  type AppointmentStatus,
} from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff();
  const shop = await getShopConfig();

  const client = await prisma.user.findUnique({
    where: { id },
    include: {
      appointments: {
        include: {
          services: { select: { name: true } },
          barber: { include: { user: { select: { name: true, avatarUrl: true } } } },
        },
        orderBy: { startsAt: "desc" },
        take: 20,
      },
      reviews: {
        include: { barber: { include: { user: { select: { name: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      invoices: { orderBy: { createdAt: "desc" }, take: 6 },
    },
  });

  if (!client || client.role !== "CLIENT") notFound();

  const [totals, subscription, favoriteBarber] = await Promise.all([
    prisma.appointment.aggregate({
      where: { clientId: client.id, status: "COMPLETED" },
      _count: true,
      _sum: { totalCents: true, discountCents: true },
    }),
    getActiveSubscription(client.id),
    prisma.appointment.groupBy({
      by: ["barberId"],
      where: { clientId: client.id, status: "COMPLETED" },
      _count: true,
      orderBy: { _count: { barberId: "desc" } },
      take: 1,
    }),
  ]);

  const favorite = favoriteBarber[0]
    ? await prisma.barberProfile.findUnique({
        where: { id: favoriteBarber[0].barberId },
        include: { user: { select: { name: true } } },
      })
    : null;

  const noShows = client.appointments.filter((a) => a.status === "NO_SHOW").length;

  return (
    <div className="space-y-6">
      <Link
        href="/painel/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" />
        Voltar para clientes
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={client.name} src={client.avatarUrl} size="xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {client.name}
                </h1>
                {!client.active ? <Badge tone="danger">Inativo</Badge> : null}
                {subscription ? (
                  <Badge tone="accent">
                    <Sparkles className="size-3" />
                    {subscription.planName}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {client.email}
                {client.phone ? ` · ${formatPhone(client.phone)}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Cliente desde {formatDate(client.createdAt, shop.timezone)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {client.phone ? (
              <Button asChild size="sm" variant="secondary">
                <a href={`https://wa.me/55${client.phone}`} target="_blank" rel="noreferrer">
                  <Phone className="size-4" />
                  WhatsApp
                </a>
              </Button>
            ) : null}
            <ClientFormDialog
              client={{
                id: client.id,
                name: client.name,
                email: client.email,
                phone: client.phone,
                notes: client.notes,
                active: client.active,
              }}
            />
          </div>
        </div>

        {client.notes ? (
          <div className="mt-5 rounded-lg border border-dashed border-[var(--border-strong)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Observacoes internas
            </p>
            <p className="mt-1 text-sm">{client.notes}</p>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Atendimentos"
          value={totals._count}
          hint={noShows > 0 ? `${noShows} falta(s)` : "sem faltas"}
          icon={CalendarDays}
          tone={noShows > 1 ? "warning" : "neutral"}
        />
        <StatCard
          label="Receita gerada"
          value={formatMoney(totals._sum.totalCents ?? 0)}
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Descontos de plano"
          value={formatMoney(totals._sum.discountCents ?? 0)}
          icon={Sparkles}
          tone="accent"
        />
        <StatCard
          label="Profissional preferido"
          value={favorite?.user.name.split(" ")[0] ?? "—"}
          hint={favoriteBarber[0] ? `${favoriteBarber[0]._count} atendimentos` : undefined}
          icon={Star}
        />
      </div>

      {subscription ? (
        <Card className="p-5">
          <SectionTitle>Assinatura ativa</SectionTitle>
          <div className="flex flex-wrap items-center gap-6">
            <DataItem label="Plano">{subscription.planName}</DataItem>
            <DataItem label="Mensalidade">{formatMoney(subscription.priceCents)}</DataItem>
            <DataItem label="Ciclo atual">
              {formatDate(subscription.currentPeriodStart, shop.timezone)} a{" "}
              {formatDate(subscription.currentPeriodEnd, shop.timezone)}
            </DataItem>
            <DataItem label="Saldo">
              {subscription.credits
                .map((credit) =>
                  credit.total < 0
                    ? `${credit.serviceName}: ilimitado`
                    : `${credit.serviceName}: ${Math.max(0, credit.total - credit.used)}/${credit.total}`,
                )
                .join(" · ") || "sem franquia"}
            </DataItem>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <SectionTitle>Historico de atendimentos</SectionTitle>
          {client.appointments.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Nenhum atendimento registrado.</p>
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
              {client.appointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-3 bg-[var(--surface-raised)] px-4 py-3"
                >
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium">
                      {formatDate(appointment.startsAt, shop.timezone)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatTime(appointment.startsAt, shop.timezone)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {appointment.services.map((s) => s.name).join(" + ")}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {appointment.barber.user.name}
                    </p>
                  </div>
                  <Badge
                    tone={APPOINTMENT_STATUS_TONE[appointment.status as AppointmentStatus] as never}
                    size="sm"
                  >
                    {APPOINTMENT_STATUS_LABEL[appointment.status as AppointmentStatus]}
                  </Badge>
                  <span className="w-20 text-right text-sm font-medium">
                    {appointment.totalCents === 0 ? "Plano" : formatMoney(appointment.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          {client.reviews.length > 0 ? (
            <section>
              <SectionTitle>Avaliacoes deixadas</SectionTitle>
              <div className="space-y-2">
                {client.reviews.map((review) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: review.rating }).map((_, index) => (
                          <Star key={index} className="size-3.5 fill-brass-400 text-brass-400" />
                        ))}
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatRelative(review.createdAt)}
                      </span>
                    </div>
                    {review.comment ? (
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">{review.comment}</p>
                    ) : null}
                    <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                      sobre {review.barber.user.name}
                    </p>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}

          {client.invoices.length > 0 ? (
            <section>
              <SectionTitle>Faturas</SectionTitle>
              <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-xl border border-[var(--border-subtle)]">
                {client.invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center gap-3 bg-[var(--surface-raised)] px-4 py-2.5 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{invoice.description}</span>
                    <Badge
                      tone={invoice.status === "PAID" ? "success" : "warning"}
                      size="sm"
                    >
                      {invoice.status === "PAID" ? "Paga" : "Em aberto"}
                    </Badge>
                    <span className="font-medium">{formatMoney(invoice.amountCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
