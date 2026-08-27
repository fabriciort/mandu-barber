import { NextResponse } from "next/server";

import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getShopConfig, formatAddress } from "@/server/services/settings";
import { formatMoney, formatPhone } from "@/lib/format";
import { linkGoogleAgenda, montarICS, nomeArquivoICS, type EventoAgenda } from "@/lib/calendario";

export const dynamic = "force-dynamic";

/**
 * Leva o horario para a agenda do cliente.
 *
 *   ?d=google  -> desvia para o Google Agenda com o evento pronto
 *   ?d=ics     -> devolve o arquivo .ics (iPhone, Outlook, agendas de mesa)
 *
 * Uma rota com dois destinos, e nao dois links montados na tela, por dois
 * motivos: o evento e montado UMA vez a partir do banco (titulo, endereco e
 * horario nunca divergem entre um caminho e outro), e a pagina que oferece o
 * botao so precisa saber o id do agendamento — nada mais.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const destino = new URL(request.url).searchParams.get("d") ?? "ics";

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ erro: "Faça login para continuar." }, { status: 401 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      services: true,
      barber: { include: { user: { select: { name: true } } } },
    },
  });

  // Mesma regra da pagina de detalhe: o cliente so alcanca o proprio horario.
  if (!appointment || (appointment.clientId !== user.id && user.role === "CLIENT")) {
    return NextResponse.json({ erro: "Agendamento não encontrado." }, { status: 404 });
  }

  // Horario cancelado nao vai para agenda nenhuma.
  if (appointment.status === "CANCELED") {
    return NextResponse.json({ erro: "Este agendamento foi cancelado." }, { status: 409 });
  }

  const shop = await getShopConfig();
  const servicos = appointment.services.map((s) => s.name).join(" + ");
  const endereco = formatAddress(shop);

  const descricao = [
    `Código do agendamento: ${appointment.code}`,
    `Profissional: ${appointment.barber.user.name}`,
    appointment.totalCents === 0
      ? "Coberto pelo seu plano de assinatura."
      : `Valor: ${formatMoney(appointment.totalCents)}`,
    shop.phone ? `Contato: ${formatPhone(shop.phone)}` : null,
    `Precisa desmarcar? Cancele em até ${shop.cancellationWindowHours}h antes pelo site.`,
  ]
    .filter(Boolean)
    .join("\n");

  const evento: EventoAgenda = {
    id: appointment.id,
    titulo: `${servicos} · ${shop.name}`,
    inicio: appointment.startsAt,
    fim: appointment.endsAt,
    descricao,
    local: endereco || undefined,
    url: new URL(`/minha-conta/agendamentos/${appointment.id}`, request.url).toString(),
  };

  if (destino === "google") {
    return NextResponse.redirect(linkGoogleAgenda(evento), {
      // 302: o evento e montado a cada pedido, e um dia pode mudar (remarcacao,
      // troca de profissional). Cachear o desvio congelaria o horario antigo.
      status: 302,
      headers: { "Cache-Control": "no-store" },
    });
  }

  return new NextResponse(montarICS(evento), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      // `attachment` e o que faz o iPhone entregar o arquivo ao Calendario em
      // vez de mostrar o texto cru na tela do Safari.
      "Content-Disposition": `attachment; filename="${nomeArquivoICS(appointment.code)}"`,
      "Cache-Control": "no-store",
    },
  });
}
