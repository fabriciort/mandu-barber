import { Scissors } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { ServiceFormDialog, ToggleServiceButton } from "./service-form-dialog";
import { requireOwner } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { formatMoney, pluralize } from "@/lib/format";
import { formatDuration } from "@/lib/time";
import { SERVICE_CATEGORY_LABEL, type ServiceCategory } from "@/lib/enums";

export const metadata = { title: "Serviços" };
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  await requireOwner("/painel/servicos");

  const [services, barbers] = await Promise.all([
    prisma.service.findMany({
      include: {
        barbers: { select: { barberId: true } },
        _count: { select: { appointments: true } },
      },
      orderBy: [{ active: "desc" }, { displayOrder: "asc" }],
    }),
    prisma.barberProfile.findMany({
      where: { active: true },
      include: { user: { select: { name: true } } },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const barberOptions = barbers.map((barber) => ({ id: barber.id, name: barber.user.name }));
  const grouped = new Map<string, typeof services>();
  for (const service of services) {
    const list = grouped.get(service.category) ?? [];
    list.push(service);
    grouped.set(service.category, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Serviços"
        description="O cardápio da casa. Preço, duração e quem está habilitado a executar."
        actions={<ServiceFormDialog barbers={barberOptions} />}
      />

      {services.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="Nenhum serviço cadastrado"
          description="Cadastre o primeiro serviço para liberar o agendamento online."
          action={<ServiceFormDialog barbers={barberOptions} />}
        />
      ) : (
        <div className="space-y-8">
          {[...grouped.entries()].map(([category, list]) => (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {SERVICE_CATEGORY_LABEL[category as ServiceCategory] ?? category}
              </h2>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((service) => (
                  <Card
                    key={service.id}
                    className={`flex flex-col p-4 ${service.active ? "" : "opacity-60"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-medium">{service.name}</h3>
                        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                          {formatMoney(service.priceCents)} · {formatDuration(service.durationMinutes)}
                          {service.bufferMinutes > 0 ? ` (+${service.bufferMinutes} min limpeza)` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {!service.active ? (
                          <Badge tone="dashed" size="sm">
                            Inativo
                          </Badge>
                        ) : service.featured ? (
                          <Badge tone="solid" size="sm">
                            Destaque
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    {service.description ? (
                      <p className="mt-2 line-clamp-2 flex-1 text-sm text-[var(--text-muted)]">
                        {service.description}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <div className="mt-3 flex flex-wrap gap-1">
                      {service.barbers.length === 0 ? (
                        <Badge tone="dashed" size="sm">
                          Sem profissional habilitado
                        </Badge>
                      ) : (
                        service.barbers.map((link) => {
                          const barber = barberOptions.find((b) => b.id === link.barberId);
                          return barber ? (
                            <Badge key={link.barberId} tone="outline" size="sm">
                              {barber.name.split(" ")[0]}
                            </Badge>
                          ) : null;
                        })
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                      <span className="text-xs text-[var(--text-muted)]">
                        {pluralize(service._count.appointments, "execução", "execuções")}
                      </span>
                      <div className="flex gap-1">
                        <ToggleServiceButton id={service.id} active={service.active} />
                        <ServiceFormDialog
                          barbers={barberOptions}
                          service={{
                            id: service.id,
                            name: service.name,
                            description: service.description,
                            category: service.category,
                            durationMinutes: service.durationMinutes,
                            bufferMinutes: service.bufferMinutes,
                            priceCents: service.priceCents,
                            active: service.active,
                            featured: service.featured,
                            barberIds: service.barbers.map((b) => b.barberId),
                          }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
