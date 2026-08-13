import { describe, expect, it } from "vitest";

import { planSavings, priceAppointment, priceWithoutPlan, remainingCredits } from "../pricing";

const corte = { id: "corte", name: "Corte Mandu", priceCents: 7000, durationMinutes: 45 };
const barba = { id: "barba", name: "Barba Terapia", priceCents: 5000, durationMinutes: 30 };
const sobrancelha = { id: "sobrancelha", name: "Sobrancelha", priceCents: 2500, durationMinutes: 15 };

describe("priceAppointment sem plano", () => {
  it("cobra o preço de tabela", () => {
    const result = priceWithoutPlan([corte, barba]);
    expect(result.subtotalCents).toBe(12000);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(12000);
    expect(result.usedPlan).toBe(false);
    expect(result.creditsToConsume).toEqual([]);
  });
});

describe("priceAppointment com franquia", () => {
  it("zera o serviço coberto pelo plano", () => {
    const result = priceAppointment(
      [corte],
      [{ serviceId: "corte", total: 4, used: 1 }],
      { extraDiscountPercent: 15 },
    );
    expect(result.totalCents).toBe(0);
    expect(result.charges[0].coveredByPlan).toBe(true);
    expect(result.creditsToConsume).toEqual([{ serviceId: "corte", quantity: 1 }]);
  });

  it("aplica o crédito no serviço mais caro quando o saldo e limitado", () => {
    const result = priceAppointment(
      [sobrancelha, corte],
      [
        { serviceId: "corte", total: 1, used: 0 },
        { serviceId: "sobrancelha", total: 0, used: 0 },
      ],
      { extraDiscountPercent: 10 },
    );

    const cobrancaCorte = result.charges.find((c) => c.serviceId === "corte")!;
    const cobrancaSobrancelha = result.charges.find((c) => c.serviceId === "sobrancelha")!;

    expect(cobrancaCorte.coveredByPlan).toBe(true);
    expect(cobrancaCorte.chargedCents).toBe(0);
    expect(cobrancaSobrancelha.coveredByPlan).toBe(false);
    expect(cobrancaSobrancelha.chargedCents).toBe(2250); // 10% de desconto
    expect(result.totalCents).toBe(2250);
  });

  it("preserva a ordem original dos serviços no resultado", () => {
    const result = priceAppointment([sobrancelha, corte, barba], [], { extraDiscountPercent: 0 });
    expect(result.charges.map((c) => c.serviceId)).toEqual(["sobrancelha", "corte", "barba"]);
  });

  it("consome apenas o saldo restante e cobra o excedente com desconto", () => {
    const result = priceAppointment(
      [corte, { ...corte, id: "corte" }],
      [{ serviceId: "corte", total: 2, used: 1 }],
      { extraDiscountPercent: 20 },
    );

    expect(result.creditsToConsume).toEqual([{ serviceId: "corte", quantity: 1 }]);
    expect(result.charges.filter((c) => c.coveredByPlan)).toHaveLength(1);
    expect(result.totalCents).toBe(5600); // 7000 - 20%
  });

  it("trata franquia ilimitada", () => {
    const result = priceAppointment(
      [corte, barba],
      [
        { serviceId: "corte", total: -1, used: 99 },
        { serviceId: "barba", total: -1, used: 42 },
      ],
      { extraDiscountPercent: 25 },
    );
    expect(result.totalCents).toBe(0);
    expect(result.charges.every((c) => c.coveredByPlan)).toBe(true);
  });

  it("não aplica desconto negativo nem acima de 100%", () => {
    const acima = priceAppointment([corte], [], { extraDiscountPercent: 250 });
    expect(acima.totalCents).toBe(0);

    const abaixo = priceAppointment([corte], [], { extraDiscountPercent: -30 });
    expect(abaixo.totalCents).toBe(7000);
  });

  it("mantem o preço de tabela visível para mostrar a economia", () => {
    const result = priceAppointment([corte], [{ serviceId: "corte", total: 4, used: 0 }], {
      extraDiscountPercent: 15,
    });
    expect(result.charges[0].listPriceCents).toBe(7000);
    expect(result.subtotalCents).toBe(7000);
    expect(result.discountCents).toBe(7000);
  });
});

describe("remainingCredits", () => {
  it("nunca devolve saldo negativo", () => {
    expect(remainingCredits({ serviceId: "x", total: 2, used: 5 })).toBe(0);
  });

  it("ilimitado e infinito", () => {
    expect(remainingCredits({ serviceId: "x", total: -1, used: 100 })).toBe(Infinity);
  });
});

describe("planSavings", () => {
  it("calcula a economia do plano com franquia fixa", () => {
    const result = planSavings(21900, [
      { quantityPerCycle: 4, priceCents: 7000 },
      { quantityPerCycle: 2, priceCents: 5000 },
    ]);
    expect(result.fullPriceCents).toBe(38000);
    expect(result.savingsCents).toBe(16100);
    expect(result.hasUnlimited).toBe(false);
  });

  it("estima consumo para franquia ilimitada", () => {
    const result = planSavings(34900, [{ quantityPerCycle: -1, priceCents: 7000 }], 4);
    expect(result.hasUnlimited).toBe(true);
    expect(result.fullPriceCents).toBe(28000);
  });

  it("não devolve economia negativa", () => {
    expect(planSavings(50000, [{ quantityPerCycle: 1, priceCents: 7000 }]).savingsCents).toBe(0);
  });
});
