/**
 * Descobre a string de conexao do Postgres.
 *
 * Cada provedor batiza a variavel de um jeito: a integracao do Neon na Vercel
 * cria DATABASE_URL e DATABASE_URL_UNPOOLED; o Vercel Postgres cria POSTGRES_URL
 * e POSTGRES_PRISMA_URL; o Supabase costuma expor so POSTGRES_URL. Em vez de
 * exigir que a pessoa saiba disso e crie um alias na mao, aceitamos os nomes
 * conhecidos, em ordem de preferencia.
 *
 * Conexao com pool vem primeiro: em serverless, cada invocacao abre conexao, e
 * o pooler existe justamente para o banco nao esgotar os slots.
 */
const CANDIDATES = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_POSTGRES_URL",
] as const;

export type ResolvedDatabaseUrl = {
  url: string | null;
  /** Nome da variavel de onde veio — util no diagnostico. */
  source: string | null;
};

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): ResolvedDatabaseUrl {
  for (const name of CANDIDATES) {
    const value = env[name]?.trim();
    // Variavel definida como string vazia e o mesmo que ausente.
    if (value) return { url: value, source: name };
  }
  return { url: null, source: null };
}

/** Host e nome do banco, sem usuario nem senha — seguro para log e diagnostico. */
export function describeDatabaseTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return "string de conexao em formato inesperado";
  }
}
