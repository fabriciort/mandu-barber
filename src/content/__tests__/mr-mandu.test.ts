import { describe, expect, it } from "vitest";

import { EMPRESA, EQUIPE, PENDENCIAS, anosDeCasa, urlMaps } from "../mr-mandu";
import { CATEGORIAS, GALERIA } from "../galeria";

describe("dados da empresa", () => {
  it("guarda os telefones so com digitos, para virar link tel: e mascara", () => {
    for (const numero of EMPRESA.telefones) {
      expect(numero).toMatch(/^\d{10,11}$/);
    }
  });

  it("monta o link do mapa a partir do endereco, sem coordenada chutada", () => {
    const url = urlMaps();
    expect(url.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    // O CEP tem de estar na busca: e ele que desambigua "Rua São Paulo" numa
    // cidade da Grande São Paulo.
    expect(decodeURIComponent(url)).toContain(EMPRESA.endereco.cep);
    expect(decodeURIComponent(url)).toContain(EMPRESA.endereco.cidade);
  });

  it("conta anos completos de casa, nao diferenca de ano civil", () => {
    // Abertura em 05/03/2020.
    expect(anosDeCasa(new Date("2021-03-04T12:00:00Z"))).toBe(0);
    expect(anosDeCasa(new Date("2021-03-05T12:00:00Z"))).toBe(1);
    expect(anosDeCasa(new Date("2026-01-10T12:00:00Z"))).toBe(5);
    expect(anosDeCasa(new Date("2026-08-23T12:00:00Z"))).toBe(6);
  });

  it("nunca devolve idade negativa", () => {
    expect(anosDeCasa(new Date("2019-01-01T12:00:00Z"))).toBe(0);
  });
});

describe("equipe", () => {
  it("so quem corta tem agenda — a recepcao fica fora do agendamento", () => {
    const recepcao = EQUIPE.find((p) => p.cargo.startsWith("Recepção"));
    expect(recepcao).toBeDefined();
    expect(recepcao?.agenda).toBe(false);
  });

  it("o primeiro nome e mesmo um prefixo do nome completo", () => {
    for (const pessoa of EQUIPE) {
      expect(pessoa.nome.startsWith(pessoa.primeiroNome)).toBe(true);
    }
  });
});

describe("pendencias", () => {
  it("toda pendencia traz a pergunta a fazer, nao so um sinalizador", () => {
    for (const [chave, p] of Object.entries(PENDENCIAS)) {
      expect(p.pergunta.length, `${chave} sem pergunta util`).toBeGreaterThan(20);
      expect(p.pergunta.trim().endsWith("?") || p.pergunta.trim().endsWith("."), chave).toBe(true);
    }
  });
});

describe("galeria", () => {
  it("carrega e resolve o caminho publico de cada foto", () => {
    expect(GALERIA.length).toBeGreaterThan(0);
    for (const item of GALERIA) {
      expect(item.src).toBe(`/gallery/${item.arquivo}`);
    }
  });

  it("nao aceita categoria fora da lista", () => {
    for (const item of GALERIA) {
      expect(CATEGORIAS).toContain(item.categoria);
    }
  });

  it("exige alt em toda foto — galeria sem alt nao existe para leitor de tela", () => {
    for (const item of GALERIA) {
      expect(item.alt.trim().length, item.arquivo).toBeGreaterThan(0);
      // O alt descreve a imagem; repetir o titulo nao acrescenta nada a quem
      // nao a ve.
      expect(item.alt.trim()).not.toBe(item.titulo.trim());
    }
  });

  it("nao repete nome de arquivo", () => {
    const nomes = GALERIA.map((i) => i.arquivo);
    expect(new Set(nomes).size).toBe(nomes.length);
  });
});
