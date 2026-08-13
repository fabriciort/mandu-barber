import { MessageSquare, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/misc";
import { ReplyReviewForm } from "./reply-form";
import { requireStaff, scopeToBarber } from "@/server/auth/guards";
import { prisma } from "@/server/db";
import { getShopConfig } from "@/server/services/settings";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Avaliacoes" };
export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const user = await requireStaff("/painel/avaliacoes");
  const shop = await getShopConfig();
  const scopedBarberId = scopeToBarber(user, null);

  const where = scopedBarberId ? { barberId: scopedBarberId } : {};

  const [reviews, aggregate, distribution] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        client: { select: { name: true, avatarUrl: true } },
        barber: { include: { user: { select: { name: true } } } },
        appointment: { select: { startsAt: true, services: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: true }),
    prisma.review.groupBy({ by: ["rating"], where, _count: true }),
  ]);

  const total = aggregate._count || 1;
  const pending = reviews.filter((review) => !review.reply).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Avaliacoes"
        description="O que os clientes escreveram depois do atendimento."
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <Card className="p-5">
          <div className="text-center">
            <p className="font-[family-name:var(--font-display)] text-5xl font-semibold">
              {(aggregate._avg.rating ?? 0).toFixed(1).replace(".", ",")}
            </p>
            <div className="mt-2 flex justify-center gap-0.5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={
                    index < Math.round(aggregate._avg.rating ?? 0)
                      ? "size-4 fill-brass-400 text-brass-400"
                      : "size-4 text-[var(--border-strong)]"
                  }
                />
              ))}
            </div>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              {aggregate._count} avaliacao(oes)
            </p>
          </div>

          <ul className="mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = distribution.find((d) => d.rating === rating)?._count ?? 0;
              return (
                <li key={rating} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-[var(--text-muted)]">{rating}</span>
                  <Star className="size-3 fill-brass-400 text-brass-400" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                    <div
                      className="h-full rounded-full bg-brass-400"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[var(--text-muted)]">{count}</span>
                </li>
              );
            })}
          </ul>

          {pending > 0 ? (
            <p className="mt-6 rounded-lg bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-secondary)]">
              {pending} avaliacao(oes) sem resposta. Responder mostra ao cliente que a critica foi
              lida.
            </p>
          ) : null}
        </Card>

        <div className="space-y-3">
          {reviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Nenhuma avaliacao ainda"
              description="Depois que os clientes avaliarem os atendimentos concluidos, as notas aparecem aqui."
            />
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={review.client.name} src={review.client.avatarUrl} size="sm" />
                    <div>
                      <p className="font-medium">{review.client.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {review.appointment.services.map((s) => s.name).join(" + ")} ·{" "}
                        {formatDate(review.appointment.startsAt, shop.timezone)} · com{" "}
                        {review.barber.user.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={index}
                          className={
                            index < review.rating
                              ? "size-4 fill-brass-400 text-brass-400"
                              : "size-4 text-[var(--border-strong)]"
                          }
                        />
                      ))}
                    </div>
                    {review.rating <= 3 ? (
                      <Badge tone="warning" size="sm">
                        Atencao
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {review.comment ? (
                  <p className="mt-3 text-[var(--text-secondary)]">{review.comment}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-[var(--text-muted)]">
                    Sem comentario escrito.
                  </p>
                )}

                {review.reply ? (
                  <div className="mt-4 rounded-lg bg-[var(--surface-muted)] p-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                      <MessageSquare className="size-3" />
                      Resposta da barbearia ·{" "}
                      {review.repliedAt ? formatDate(review.repliedAt, shop.timezone) : ""}
                    </p>
                    <p className="mt-1 text-sm">{review.reply}</p>
                  </div>
                ) : (
                  <ReplyReviewForm reviewId={review.id} />
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
