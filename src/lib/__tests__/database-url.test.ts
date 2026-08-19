import { describe, expect, it } from "vitest";

import { describeDatabaseTarget, resolveDatabaseUrl } from "../database-url";

const URL_OK = "postgresql://usuario:senha@ep-abc.neon.tech/mandubarber?sslmode=require";

describe("resolveDatabaseUrl", () => {
  it("aceita DATABASE_URL", () => {
    const { url, source } = resolveDatabaseUrl({ DATABASE_URL: URL_OK });
    expect(url).toBe(URL_OK);
    expect(source).toBe("DATABASE_URL");
  });

  it("aceita o nome que o provedor usar quando DATABASE_URL nao existe", () => {
    const { url, source } = resolveDatabaseUrl({ POSTGRES_URL: URL_OK });
    expect(url).toBe(URL_OK);
    expect(source).toBe("POSTGRES_URL");
  });

  it("prefere a conexao com pool", () => {
    const { source } = resolveDatabaseUrl({
      POSTGRES_PRISMA_URL: URL_OK,
      DATABASE_URL_UNPOOLED: URL_OK,
    });
    expect(source).toBe("POSTGRES_PRISMA_URL");
  });

  // O deploy que quebrou tinha DATABASE_URL definida com string vazia: para
  // conectar e o mesmo que ausente, mas o diagnostico precisa separar os dois.
  it("trata variavel vazia como ausente, mas registra o nome", () => {
    const { url, source, emptyNames } = resolveDatabaseUrl({ DATABASE_URL: "" });
    expect(url).toBeNull();
    expect(source).toBeNull();
    expect(emptyNames).toEqual(["DATABASE_URL"]);
  });

  it("trata variavel so com espacos como vazia", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "   " }).emptyNames).toEqual(["DATABASE_URL"]);
  });

  it("usa a alternativa preenchida mesmo com a principal vazia", () => {
    const { url, source, emptyNames } = resolveDatabaseUrl({
      DATABASE_URL: "",
      POSTGRES_URL: URL_OK,
    });
    expect(url).toBe(URL_OK);
    expect(source).toBe("POSTGRES_URL");
    expect(emptyNames).toEqual(["DATABASE_URL"]);
  });

  it("nao inventa nome vazio quando a variavel nunca foi definida", () => {
    const { url, emptyNames } = resolveDatabaseUrl({});
    expect(url).toBeNull();
    expect(emptyNames).toEqual([]);
  });
});

describe("describeDatabaseTarget", () => {
  it("mostra host e banco", () => {
    expect(describeDatabaseTarget(URL_OK)).toBe("ep-abc.neon.tech/mandubarber");
  });

  // O diagnostico e publico: a senha nao pode vazar de jeito nenhum.
  it("nunca inclui usuario nem senha", () => {
    const saida = describeDatabaseTarget(URL_OK);
    expect(saida).not.toContain("senha");
    expect(saida).not.toContain("usuario");
  });

  it("nao quebra com string mal formada", () => {
    expect(describeDatabaseTarget("isto nao e uma url")).toMatch(/formato inesperado/);
  });
});
