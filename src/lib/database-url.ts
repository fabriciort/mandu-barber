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
  /**
   * Variaveis que existem no ambiente mas estao vazias.
   *
   * Vale ouro no diagnostico: no painel da Vercel a linha DATABASE_URL aparece
   * na lista, entao quem olha jura que configurou. Dizer "nao definida" manda a
   * pessoa procurar a linha errada; dizer "definida, porem vazia" manda ela
   * abrir a linha certa e colar o valor.
   */
  emptyNames: string[];
};

export function resolveDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): ResolvedDatabaseUrl {
  const emptyNames: string[] = [];

  for (const name of CANDIDATES) {
    const raw = env[name];
    const value = raw?.trim();
    if (value) return { url: value, source: name, emptyNames };
    // Definida como string vazia: para conectar e o mesmo que ausente, mas para
    // explicar o erro e uma situacao bem diferente.
    if (raw !== undefined) emptyNames.push(name);
  }

  return { url: null, source: null, emptyNames };
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
