import { describe, expect, it } from "vitest";

import {
  addDaysISO,
  dayBoundaries,
  diffInDaysISO,
  formatDuration,
  formatMonthShort,
  isValidDateKey,
  minutesOfDay,
  toDateKey,
  weekdayOf,
  zonedDateTime,
} from "../time";
import { formatMoney, parseMoneyToCents, formatPhone, slugify } from "../format";

const TZ = "America/Sao_Paulo";

describe("conversao de fuso", () => {
  it("converte horário local da loja para UTC", () => {
    // Sao Paulo esta em UTC-3 o ano todo desde 2019.
    const utc = zonedDateTime("2026-08-13", 9 * 60 + 30, TZ);
    expect(utc.toISOString()).toBe("2026-08-13T12:30:00.000Z");
  });

  it("volta de UTC para minutos locais sem perder o valor", () => {
    const utc = zonedDateTime("2026-08-13", 14 * 60 + 45, TZ);
    expect(minutesOfDay(utc, TZ)).toBe(14 * 60 + 45);
  });

  it("mantem a data local correta perto da meia-noite", () => {
    const utc = zonedDateTime("2026-08-13", 23 * 60 + 30, TZ);
    // 23:30 local = 02:30 UTC do dia seguinte; a chave local segue 13/08.
    expect(utc.toISOString()).toBe("2026-08-14T02:30:00.000Z");
    expect(toDateKey(utc, TZ)).toBe("2026-08-13");
  });

  it("calcula o dia da semana no fuso da loja", () => {
    expect(weekdayOf(zonedDateTime("2026-08-13", 12 * 60, TZ), TZ)).toBe(4); // quinta
    expect(weekdayOf(zonedDateTime("2026-08-16", 12 * 60, TZ), TZ)).toBe(0); // domingo
  });

  it("delimita o dia local em instantes UTC", () => {
    const { start, end } = dayBoundaries("2026-08-13", TZ);
    expect(start.toISOString()).toBe("2026-08-13T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-14T03:00:00.000Z");
  });
});

describe("aritmetica de datas ISO", () => {
  it("soma dias atravessando a virada de mês", () => {
    expect(addDaysISO("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysISO("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("soma dias atravessando ano bissexto", () => {
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("mede a diferenca em dias", () => {
    expect(diffInDaysISO("2026-08-13", "2026-08-20")).toBe(7);
    expect(diffInDaysISO("2026-08-20", "2026-08-13")).toBe(-7);
  });

  it("valida chaves de data", () => {
    expect(isValidDateKey("2026-08-13")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("13/08/2026")).toBe(false);
  });
});

describe("formatacao", () => {
  it("formata duração em linguagem de balcão", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(60)).toBe("1 h");
    expect(formatDuration(90)).toBe("1 h 30 min");
  });

  it("resume mes e ano no fuso da loja", () => {
    // 1o de janeiro as 01:00 UTC ainda e 31 de dezembro em Sao Paulo: o mes
    // curto tem de sair do calendario da loja, nao do UTC.
    expect(formatMonthShort(new Date("2026-08-04T15:00:00Z"), TZ)).toBe("ago/2026");
    expect(formatMonthShort(new Date("2027-01-01T01:00:00Z"), TZ)).toBe("dez/2026");
  });

  it("formata dinheiro em centavos", () => {
    expect(formatMoney(7000)).toMatch(/70,00/);
    expect(formatMoney(0)).toMatch(/0,00/);
  });

  it("le o que o gestor digita no campo de preço", () => {
    expect(parseMoneyToCents("70,00")).toBe(7000);
    expect(parseMoneyToCents("R$ 1.234,50")).toBe(123450);
    expect(parseMoneyToCents("70")).toBe(7000);
    expect(parseMoneyToCents("abc")).toBeNull();
  });

  it("aplica mascara de telefone", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("gera slug sem acento", () => {
    expect(slugify("Barba Terapia & Navalha")).toBe("barba-terapia-navalha");
    expect(slugify("Corte Mandú")).toBe("corte-mandu");
  });
});
