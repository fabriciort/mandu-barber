import { NextResponse } from "next/server";
import { z } from "zod";

import { getDayAvailability, getRangeAvailability } from "@/server/services/availability";
import { getCurrentUser } from "@/server/auth/session";
import { isValidDateKey, diffInDaysISO } from "@/lib/time";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  modo: z.enum(["dia", "periodo"]).default("dia"),
  data: z.string().refine(isValidDateKey, "Data invalida.").optional(),
  ate: z.string().refine(isValidDateKey, "Data invalida.").optional(),
  servicos: z.string().min(1, "Informe os servicos."),
  profissional: z.string().optional(),
  ignorar: z.string().optional(),
});

/**
 * Grade de horarios consumida pelo assistente de agendamento.
 *
 * Sempre recalculada no servidor a partir do estado real da agenda: a UI nunca
 * decide sozinha o que esta livre, entao nao ha como "adivinhar" um horario
 * manipulando o cliente.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    modo: url.searchParams.get("modo") ?? "dia",
    data: url.searchParams.get("data") ?? undefined,
    ate: url.searchParams.get("ate") ?? undefined,
    servicos: url.searchParams.get("servicos") ?? "",
    profissional: url.searchParams.get("profissional") ?? undefined,
    ignorar: url.searchParams.get("ignorar") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { erro: parsed.error.errors[0]?.message ?? "Parametros invalidos." },
      { status: 400 },
    );
  }

  const { modo, data, ate, servicos, profissional, ignorar } = parsed.data;
  const serviceIds = servicos.split(",").filter(Boolean);
  if (serviceIds.length === 0) {
    return NextResponse.json({ erro: "Informe pelo menos um servico." }, { status: 400 });
  }

  // A equipe agenda fora da antecedencia minima; o cliente, nao.
  const user = await getCurrentUser();
  const isStaff = user?.role === "BARBER" || user?.role === "OWNER";

  if (modo === "periodo") {
    if (!data || !ate) {
      return NextResponse.json({ erro: "Informe o periodo." }, { status: 400 });
    }
    const span = diffInDaysISO(data, ate);
    if (span < 0 || span > 62) {
      return NextResponse.json({ erro: "Periodo invalido (maximo 62 dias)." }, { status: 400 });
    }

    const counts = await getRangeAvailability({
      fromISO: data,
      toISO: ate,
      serviceIds,
      barberId: profissional || null,
    });
    return NextResponse.json({ dias: counts });
  }

  if (!data) return NextResponse.json({ erro: "Informe a data." }, { status: 400 });

  const availability = await getDayAvailability({
    dateISO: data,
    serviceIds,
    barberId: profissional || null,
    excludeAppointmentId: ignorar,
    ignoreLeadTime: isStaff,
  });

  return NextResponse.json(availability);
}
