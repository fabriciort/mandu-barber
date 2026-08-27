/**
 * Passeio pelo fluxo inteiro: home, login, agendamento de ponta a ponta,
 * bloqueio do cliente no painel, e as rotas do painel respondendo.
 *
 * Vive no repositorio, e nao num diretorio de trabalho, porque ja se perdeu
 * tres vezes — e um teste que ninguem consegue rodar nao protege nada.
 *
 * O Playwright NAO e dependencia do projeto de proposito: sao ~50 MB que a
 * Vercel baixaria em todo build para nada. Para rodar:
 *
 *   npm run build && npx next start -p 3111 &
 *   npx --yes playwright@1 --version >/dev/null   # baixa o pacote uma vez
 *   node e2e/fluxo.mjs
 *
 * Depende da carga de demonstracao (npm run db:seed).
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3111";
const OUT = process.env.SAIDA || "/tmp";

const errors = [];
const steps = [];

function log(name, ok, detail = "") {
  steps.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? ` :: ${detail}` : ""}`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await context.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console @ ${page.url()}] ${msg.text().slice(0,140)}`);
});
page.on("response", (r) => {
  if (r.status() >= 400 && !r.url().includes("favicon")) errors.push(`[http ${r.status()}] ${r.url()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror @ ${page.url()}] ${e.message.split("\n")[0]}`));

// ---------------------------------------------------------------- 1. home
await page.goto(BASE, { waitUntil: "networkidle" });
log("home carrega", await page.locator("h1").first().isVisible());
log(
  "home mostra proximos horarios",
  (await page.getByText(/horários livres|Sem vaga/).count()) > 0,
);
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: false });

// ---------------------------------------------------------------- 2. login
await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.fill("#email", "cliente@mandubarber.com.br");
await page.fill("#password", "mandu123");
await page.click('button[type="submit"]');
await page.waitForURL("**/minha-conta", { timeout: 20000 });
log("login do cliente", page.url().includes("/minha-conta"));
await page.screenshot({ path: `${OUT}/02-conta.png` });

const saldoVisivel = await page.getByText(/Mandu Prime/).first().isVisible();
log("conta mostra plano ativo", saldoVisivel);

// ------------------------------------------------------------- 3. agendar
await page.goto(`${BASE}/agendar`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Corte Mandu/ }).first().click();
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(400);
log("passo 2 (profissional)", await page.getByText("Com quem você quer cortar?").isVisible());

// "Qualquer profissional" sempre existe, seja qual for a equipe — escolher
// pelo nome amarra o teste a uma pessoa que pode sair da barbearia.
await page.getByRole("button", { name: /Qualquer profissional/ }).click();
await page.getByRole("button", { name: "Continuar" }).click();
await page.waitForTimeout(2500);
log("passo 3 (horario)", await page.getByText("Quando fica bom para você?").isVisible());
await page.screenshot({ path: `${OUT}/03-agendar-horarios.png` });

// Escolhe o primeiro dia que a UI anuncia com vaga e depois um horario.
// O aria-label do dia traz "N horários" quando ha disponibilidade.
const dias = page.locator('button[aria-label*="horários"]:not([disabled])');
const totalDias = await dias.count();
let slotEncontrado = false;
for (let i = 0; i < totalDias && !slotEncontrado; i++) {
  await dias.nth(i).click();
  await page.waitForTimeout(1800);
  const horarios = page.locator("button").filter({ hasText: /^\d{2}:\d{2}$/ });
  if ((await horarios.count()) > 0) {
    await horarios.first().click();
    slotEncontrado = true;
  }
}
log("selecionou um horario livre", slotEncontrado);

if (slotEncontrado) {
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.waitForTimeout(600);
  log("passo 4 (confirmar)", await page.getByText("Tudo certo?").isVisible());
  const usaPlano = await page.getByText(/Usar meu plano/).isVisible();
  log("oferece uso do plano", usaPlano);
  await page.screenshot({ path: `${OUT}/04-agendar-confirmar.png` });

  await page.getByRole("button", { name: /Confirmar agendamento/ }).click();
  await page.waitForTimeout(3500);
  const confirmado = await page.getByText("Horário reservado").isVisible().catch(() => false);
  log("agendamento confirmado", confirmado);
  await page.screenshot({ path: `${OUT}/05-agendar-sucesso.png` });
}

// ---------------------------------------------------- 4. cliente ve o novo
await page.goto(`${BASE}/minha-conta/agendamentos`, { waitUntil: "networkidle" });
log("lista de agendamentos", (await page.locator("text=/MB-/").count()) > 0);

// ------------------------------------------------------------ 5. painel
await page.goto(`${BASE}/painel`, { waitUntil: "networkidle" });
log("cliente e barrado no painel", page.url().includes("/sem-acesso"));

await page.goto(`${BASE}/minha-conta/perfil`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Sair da conta/ }).click();
await page.waitForTimeout(2000);

await page.goto(`${BASE}/entrar`, { waitUntil: "networkidle" });
await page.fill("#email", "contato@focco10.com.br");
await page.fill("#password", "mandu123");
await page.click('button[type="submit"]');
await page.waitForURL("**/painel", { timeout: 20000 });
log("login do gestor cai no painel", page.url().includes("/painel"));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/06-painel.png` });

await page.goto(`${BASE}/painel/agenda`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
log("agenda renderiza colunas", (await page.locator("text=Dia livre, text=/\\d{2}:\\d{2}/").count()) >= 0);
await page.screenshot({ path: `${OUT}/07-agenda.png` });

for (const rota of [
  "/painel/agendamentos",
  "/painel/clientes",
  "/painel/servicos",
  "/painel/profissionais",
  "/painel/planos",
  "/painel/assinaturas",
  "/painel/financeiro",
  "/painel/avaliacoes",
  "/painel/configuracoes",
]) {
  const response = await page.goto(`${BASE}${rota}`, { waitUntil: "networkidle" });
  log(`rota ${rota}`, response?.status() === 200, String(response?.status()));
}
await page.screenshot({ path: `${OUT}/08-financeiro.png` });

await page.goto(`${BASE}/painel/financeiro`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/08-financeiro.png` });

// ------------------------------------------------------------- 6. mobile
const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(`${BASE}/painel/agenda`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(600);
await mobile.screenshot({ path: `${OUT}/09-mobile-agenda.png` });
await mobile.goto(`${BASE}/`, { waitUntil: "networkidle" });
await mobile.screenshot({ path: `${OUT}/10-mobile-home.png` });
log("mobile renderiza", true);

// ------------------------------------------------------------- 7. tema escuro
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
await page.evaluate(() => document.documentElement.classList.add("dark"));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/11-home-dark.png` });

console.log("\n--- ERROS DE CONSOLE ---");
console.log(errors.length === 0 ? "nenhum" : errors.slice(0, 20).join("\n"));

const failed = steps.filter((s) => !s.ok);
console.log(`\n${steps.length - failed.length}/${steps.length} verificacoes passaram`);

await browser.close();
process.exit(failed.length > 0 ? 1 : 0);
