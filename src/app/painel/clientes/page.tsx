import Link from "next/link";
import { Search, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPill } from "@/components/ui/filter-pill";
import { PageHeader } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { ClientFormDialog } from "./client-form-dialog";
import { requireStaff } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { formatMoney, formatPhone, pluralize } from "@/lib/format";
import { formatDate, formatRelative } from "@/lib/time";

export const metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; filtro?: string }>;
}) {
  const params = await searchParams;
  await requireStaff("/painel/clientes");
  const shop = await getShopConfig();

  const query = params.q?.trim();
  const page = Math.max(1, Number(params.pagina) || 1);
  const onlySubscribers = params.filtro === "assinantes";

  const where = {
    role: "CLIENT",
    ...(query
      ? {
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
          ],
        }
      : {}),
    ...(onlySubscribers
      ? { subscriptions: { some: { status: { in: ["ACTIVE", "PAST_DUE"] } } } }
      : {}),
  };

  const [clients, total, subscriberCount] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "PAST_DUE"] } },
          include: { plan: { select: { name: true } } },
          take: 1,
        },
        appointments: {
          where: { status: "COMPLETED" },
          orderBy: { startsAt: "desc" },
          take: 1,
          select: { startsAt: true },
        },
        _count: { select: { appointments: { where: { status: "COMPLETED" } } } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    prisma.subscription.count({ where: { status: { in: ["ACTIVE", "PAST_DUE"] } } }),
  ]);

  const spending = await prisma.appointment.groupBy({
    by: ["clientId"],
    where: { clientId: { in: clients.map((c) => c.id) }, status: "COMPLETED" },
    _sum: { totalCents: true },
  });
  const spendingMap = new Map(spending.map((row) => [row.clientId, row._sum.totalCents ?? 0]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description={`${pluralize(total, "cliente", "clientes")} · ${subscriberCount} com assinatura ativa.`}
        actions={<ClientFormDialog />}
      />

      <Card className="p-4">
        <form className="flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
          <div className="relative min-w-56 flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <Input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Buscar por nome, e-mail ou telefone"
              className="pl-10"
              aria-label="Buscar cliente"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterPill href="/painel/clientes" active={!onlySubscribers}>
              Todos
            </FilterPill>
            <FilterPill href="/painel/clientes?filtro=assinantes" active={onlySubscribers}>
              Assinantes
            </FilterPill>
            <Button type="submit" className="ml-auto sm:ml-0">
              Buscar
            </Button>
          </div>
        </form>
      </Card>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description={
            query
              ? "Tente outro termo de busca ou cadastre este cliente."
              : "Cadastre o primeiro cliente para começar a lancar atendimentos."
          }
          action={<ClientFormDialog />}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => {
              const subscription = client.subscriptions[0];
              const lastVisit = client.appointments[0]?.startsAt;

              return (
                <Link key={client.id} href={`/painel/clientes/${client.id}`}>
                  <Card interactive className="h-full p-4">
                    <div className="flex items-start gap-3">
                      <Avatar name={client.name} src={client.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{client.name}</p>
                        <p className="truncate text-sm text-[var(--text-muted)]">
                          {formatPhone(client.phone) || client.email}
                        </p>
                      </div>
                      {!client.active ? (
                        <Badge tone="dashed" size="sm">
                          Inativo
                        </Badge>
                      ) : subscription ? (
                        <Badge tone="solid" size="sm">
                          <Sparkles className="size-3" />
                          {subscription.plan.name.replace("Mandu ", "")}
                        </Badge>
                      ) : null}
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs">
                      <div>
                        <dt className="text-[var(--text-muted)]">Visitas</dt>
                        <dd className="mt-0.5 font-semibold">{client._count.appointments}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Total gasto</dt>
                        <dd className="mt-0.5 font-semibold">
                          {formatMoney(spendingMap.get(client.id) ?? 0)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--text-muted)]">Última visita</dt>
                        <dd className="mt-0.5 font-semibold">
                          {lastVisit ? formatRelative(lastVisit) : "—"}
                        </dd>
                      </div>
                    </dl>

                    {client.notes ? (
                      <p className="mt-3 line-clamp-2 rounded-md bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs text-[var(--text-muted)]">
                        {client.notes}
                      </p>
                    ) : null}
                  </Card>
                </Link>
              );
            })}
          </div>

          {pages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <p className="text-[var(--text-muted)]">
                Página {page} de {pages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/painel/clientes?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(onlySubscribers ? { filtro: "assinantes" } : {}), pagina: String(page - 1) })}`}
                    className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 transition-colors hover:border-[var(--accent)]"
                  >
                    Anterior
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link
                    href={`/painel/clientes?${new URLSearchParams({ ...(query ? { q: query } : {}), ...(onlySubscribers ? { filtro: "assinantes" } : {}), pagina: String(page + 1) })}`}
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

      <p className="text-xs text-[var(--text-muted)]">
        Cadastro feito no balcão recebe senha provisória — o cliente troca no primeiro acesso.
        Fuso da agenda: {shop.timezone}. Última atualização: {formatDate(new Date(), shop.timezone)}.
      </p>
    </div>
  );
}
