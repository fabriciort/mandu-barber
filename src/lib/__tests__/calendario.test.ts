import { describe, expect, it } from "vitest";

import { linkGoogleAgenda, montarICS, nomeArquivoICS } from "../calendario";

const EVENTO = {
  id: "abc123",
  titulo: "Corte Mandu + Barba Terapia · mr. mandu",
  inicio: new Date("2026-08-21T19:30:00Z"),
  fim: new Date("2026-08-21T20:40:00Z"),
  descricao: "Código: MB-7K3QD\nProfissional: João Vitor Mandu",
  local: "Rua São Paulo, 100 - Centro, Embu-Guaçu/SP",
  url: "https://exemplo.com/minha-conta/agendamentos/abc123",
};

describe("link do Google Agenda", () => {
  it("leva o periodo no formato compacto em UTC", () => {
    const url = new URL(linkGoogleAgenda(EVENTO));
    expect(url.searchParams.get("dates")).toBe("20260821T193000Z/20260821T204000Z");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
  });

  it("leva titulo, local e a pagina do agendamento", () => {
    const url = new URL(linkGoogleAgenda(EVENTO));
    expect(url.searchParams.get("text")).toBe(EVENTO.titulo);
    expect(url.searchParams.get("location")).toBe(EVENTO.local);
    expect(url.searchParams.get("details")).toContain(EVENTO.url);
  });

  it("omite campo vazio em vez de mandar em branco", () => {
    const url = new URL(linkGoogleAgenda({ titulo: "Corte", inicio: EVENTO.inicio, fim: EVENTO.fim }));
    expect(url.searchParams.has("location")).toBe(false);
    expect(url.searchParams.has("details")).toBe(false);
  });
});

describe("arquivo .ics", () => {
  const ics = montarICS(EVENTO, new Date("2026-08-20T10:00:00Z"));

  it("abre e fecha o envelope que as agendas esperam", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("termina toda linha em CRLF — o formato exige, nao e preferencia", () => {
    const semCRLF = ics.split("\r\n").filter((l) => l.includes("\n"));
    expect(semCRLF).toEqual([]);
  });

  it("escapa virgula, que separa valores no formato", () => {
    // "Rua São Paulo, 100" tem virgula: sem escapar, a agenda leria dois locais.
    expect(ics).toContain("Rua São Paulo\\, 100");
  });

  it("vira quebra de linha em \\n dentro do campo", () => {
    // Desdobra primeiro: a descricao e longa e sai partida em varias linhas.
    const desdobrado = ics.replace(/\r\n /g, "");
    const descricao = desdobrado
      .split("\r\n")
      .find((l) => l.startsWith("DESCRIPTION:Código"));

    expect(descricao).toBeDefined();
    // A quebra virou os dois caracteres \ e n — nenhuma quebra de verdade
    // sobrou dentro do valor, que encerraria o campo antes da hora.
    expect(descricao).toContain("Código: MB-7K3QD\\nProfissional:");
    expect(descricao).not.toMatch(/[\r\n]/);
  });

  it("dobra as linhas longas em 75 octetos, contando bytes e nao caracteres", () => {
    for (const linha of ics.split("\r\n")) {
      expect(Buffer.from(linha, "utf8").length, linha).toBeLessThanOrEqual(75);
    }
  });

  it("nao parte um caractere acentuado ao dobrar", () => {
    // Se a dobra cortasse no meio de um caractere de dois bytes, o texto voltaria
    // com o caractere de substituicao.
    const redobrado = ics.replace(/\r\n /g, "");
    expect(redobrado).not.toContain("�");
    expect(redobrado).toContain("Embu-Guaçu");
  });

  it("usa o id do agendamento como UID, para remarcar substituir em vez de duplicar", () => {
    expect(ics).toContain("UID:abc123@mr-mandu-barber");
  });

  it("leva um aviso duas horas antes dentro do proprio evento", () => {
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT2H");
  });

  it("marca inicio e fim em UTC", () => {
    expect(ics).toContain("DTSTART:20260821T193000Z");
    expect(ics).toContain("DTEND:20260821T204000Z");
  });
});

describe("nome do arquivo", () => {
  it("sai sem acento, espaco ou maiuscula", () => {
    expect(nomeArquivoICS("MB-7K3QD")).toBe("mr-mandu-mb-7k3qd.ics");
  });
});
