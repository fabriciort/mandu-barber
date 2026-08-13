/**
 * Precificacao de um atendimento com plano de assinatura.
 *
 * Funcao pura: recebe os servicos, o saldo de franquia e as regras do plano, e
 * decide o que sai de graca, o que entra com desconto e quanto o cliente paga.
 * Sem banco no meio — e a regra que mais mexe no bolso do cliente e do dono.
 */

export type PriceableService = {
  id: string;
  name: string;
  priceCents: number;
  durationMinutes: number;
};

export type CreditBalance = {
  serviceId: string;
  /** -1 = ilimitado. */
  total: number;
  used: number;
};

export type PlanRules = {
  /** Desconto aplicado aos servicos que ficaram fora da franquia (0..100). */
  extraDiscountPercent: number;
};

export type ServiceCharge = {
  serviceId: string;
  name: string;
  /** Preco de tabela, sempre preservado para o cliente enxergar a economia. */
  listPriceCents: number;
  /** Quanto de fato entra na conta. */
  chargedCents: number;
  durationMinutes: number;
  coveredByPlan: boolean;
  discountCents: number;
};

export type PricingResult = {
  charges: ServiceCharge[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  /** Consumo por servico, para debitar a franquia. */
  creditsToConsume: { serviceId: string; quantity: number }[];
  usedPlan: boolean;
};

export function remainingCredits(balance: CreditBalance): number {
  if (balance.total < 0) return Number.POSITIVE_INFINITY;
  return Math.max(0, balance.total - balance.used);
}

/**
 * Aplica a franquia dos servicos mais caros primeiro.
 *
 * Se o cliente tem 1 credito e agendou corte (R$ 60) + barba (R$ 40), o credito
 * cobre o corte. E o resultado que qualquer pessoa consideraria justo, e evita
 * a reclamacao classica de "usei meu beneficio no item barato".
 */
export function priceAppointment(
  services: PriceableService[],
  credits: CreditBalance[],
  rules: PlanRules | null,
): PricingResult {
  const available = new Map<string, number>();
  for (const credit of credits) {
    available.set(credit.serviceId, remainingCredits(credit));
  }

  const order = services
    .map((service, index) => ({ service, index }))
    .sort((a, b) => b.service.priceCents - a.service.priceCents || a.index - b.index);

  const charges: ServiceCharge[] = new Array(services.length);
  const consumed = new Map<string, number>();
  const discountPercent = clampPercent(rules?.extraDiscountPercent ?? 0);

  for (const { service, index } of order) {
    const left = available.get(service.id) ?? 0;

    if (left > 0) {
      available.set(service.id, left - 1);
      consumed.set(service.id, (consumed.get(service.id) ?? 0) + 1);
      charges[index] = {
        serviceId: service.id,
        name: service.name,
        listPriceCents: service.priceCents,
        chargedCents: 0,
        durationMinutes: service.durationMinutes,
        coveredByPlan: true,
        discountCents: service.priceCents,
      };
      continue;
    }

    const discount = rules ? Math.round((service.priceCents * discountPercent) / 100) : 0;
    charges[index] = {
      serviceId: service.id,
      name: service.name,
      listPriceCents: service.priceCents,
      chargedCents: service.priceCents - discount,
      durationMinutes: service.durationMinutes,
      coveredByPlan: false,
      discountCents: discount,
    };
  }

  const subtotalCents = charges.reduce((sum, c) => sum + c.listPriceCents, 0);
  const discountCents = charges.reduce((sum, c) => sum + c.discountCents, 0);

  return {
    charges,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    creditsToConsume: [...consumed.entries()].map(([serviceId, quantity]) => ({
      serviceId,
      quantity,
    })),
    usedPlan: consumed.size > 0 || (rules !== null && discountCents > 0),
  };
}

/** Preco sem nenhum plano — caminho do cliente avulso. */
export function priceWithoutPlan(services: PriceableService[]): PricingResult {
  return priceAppointment(services, [], null);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Economia mensal estimada de um plano: o que a franquia cobriria pelo preco
 * cheio, menos a mensalidade. Alimenta o "você economiza R$ X" da vitrine.
 */
export function planSavings(
  planPriceCents: number,
  benefits: { quantityPerCycle: number; priceCents: number }[],
  assumedUsageForUnlimited = 4,
): { fullPriceCents: number; savingsCents: number; hasUnlimited: boolean } {
  let fullPriceCents = 0;
  let hasUnlimited = false;

  for (const benefit of benefits) {
    if (benefit.quantityPerCycle < 0) {
      hasUnlimited = true;
      fullPriceCents += benefit.priceCents * assumedUsageForUnlimited;
    } else {
      fullPriceCents += benefit.priceCents * benefit.quantityPerCycle;
    }
  }

  return {
    fullPriceCents,
    savingsCents: Math.max(0, fullPriceCents - planPriceCents),
    hasUnlimited,
  };
}
