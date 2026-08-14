/**
 * Preparo do banco durante o build.
 *
 * Roda antes do `next build` e faz duas coisas: aplica as migracoes e, se o
 * banco estiver vazio, popula a barbearia de demonstracao.
 *
 * Regra importante: NUNCA derruba o build. Se o banco estiver mal configurado,
 * falhar aqui faria a Vercel descartar a publicacao e continuar servindo o
 * deploy anterior — ou seja, a pessoa redeploya, ve a mesma tela quebrada e nao
 * tem como descobrir por que. Preferimos publicar o codigo novo (que inclui o
 * diagnostico em /api/saude) e gritar no log do build.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";

import { describeDatabaseTarget, resolveDatabaseUrl } from "../src/lib/database-url";

function log(message: string) {
  console.log(`[deploy] ${message}`);
}

/**
 * Na Vercel as variaveis chegam pelo ambiente; na maquina de quem desenvolve
 * elas moram no .env. Como este script roda antes do Next (que carregaria o
 * arquivo sozinho), lemos o .env aqui para o build local se comportar igual.
 * Valores ja presentes no ambiente tem precedencia.
 */
function loadDotEnv(file = ".env") {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function migrateDeploy() {
  // Captura a saida para conseguir inspecionar o codigo de erro do Prisma,
  // e a repassa para o log do build.
  const output = execFileSync("npx", ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(output);
}

function isSchemaNotEmpty(error: unknown): boolean {
  const details = error as { stdout?: string; stderr?: string; message?: string };
  const text = `${details?.stdout ?? ""}${details?.stderr ?? ""}${details?.message ?? ""}`;
  return text.includes("P3005") || text.includes("schema is not empty");
}

function listMigrations(): string[] {
  const dir = "prisma/migrations";
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function main() {
  loadDotEnv();
  const { url, source } = resolveDatabaseUrl();

  if (!url) {
    log("NENHUMA variavel de conexao encontrada (DATABASE_URL, POSTGRES_URL...).");
    log("O site vai subir, mas toda pagina que le dados vai falhar.");
    log("Defina DATABASE_URL nas variaveis de ambiente e publique de novo.");
    log("Depois do deploy, abra /api/saude para confirmar.");
    return;
  }

  log(`Usando ${source} -> ${describeDatabaseTarget(url)}`);

  // O Prisma CLI le apenas DATABASE_URL; se a string veio de outro nome,
  // normalizamos aqui para os comandos abaixo enxergarem.
  process.env.DATABASE_URL = url;

  try {
    log("Aplicando migracoes...");
    migrateDeploy();
  } catch (error) {
    // P3005: o banco ja tem as tabelas mas nao tem historico de migracao —
    // tipico de quem criou o schema com `prisma db push`. Nesse caso as tabelas
    // existem e o certo e registrar a migracao como aplicada (baseline), nao
    // tentar cria-las de novo.
    if (isSchemaNotEmpty(error)) {
      log("Banco ja tem as tabelas, mas sem historico de migracao. Registrando baseline...");
      try {
        for (const migration of listMigrations()) {
          execFileSync("npx", ["prisma", "migrate", "resolve", "--applied", migration], {
            stdio: "inherit",
          });
        }
        migrateDeploy();
        log("Baseline concluido.");
      } catch {
        log("FALHA ao registrar o baseline. Abra /api/saude para ver o diagnostico.");
        return;
      }
    } else {
      log("FALHA ao aplicar as migracoes. As tabelas podem nao existir.");
      log("Abra /api/saude depois do deploy para ver o diagnostico.");
      return;
    }
  }

  try {
    const { bootstrap } = await import("./bootstrap");
    await bootstrap();
  } catch (error) {
    log(`Nao foi possivel popular o banco: ${error instanceof Error ? error.message : error}`);
  }
}

main()
  .catch((error) => {
    log(`Erro inesperado: ${error instanceof Error ? error.message : error}`);
  })
  .then(() => {
    // Sempre 0: o build precisa seguir.
    process.exit(0);
  });
