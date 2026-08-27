/**
 * "Adicionar a agenda", de ponta a ponta.
 *
 * O .ics e um formato cheio de armadilha — virgula que separa valores, quebra
 * de linha que encerra o campo, dobra em 75 OCTETOS (nao caracteres, e o
 * portugues tem acento de dois bytes). Um erro em qualquer uma delas nao da
 * erro em lugar nenhum: a agenda do cliente simplesmente recusa o convite, em
 * silencio. Por isso o arquivo e conferido de verdade aqui, e nao so "a rota
 * respondeu 200".
 *
 * Confere tambem quem pode baixar: sem sessao, e com a sessao de outro
 * cliente.
 *
 *   npm run build && npx next start -p 3111 &
 *   node e2e/agenda.mjs
 *
 * Depende da carga de demonstracao (npm run db:seed).
 */
import { chromium } from "playwright";
const OUT = process.env.SAIDA || "/tmp";
const B = "http://localhost:3111";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
let falhas = 0;
const ok = (n, v, d = "") => { if (!v) falhas++; console.log(`${v ? "PASS" : "FALHA"} — ${n}${d ? ` :: ${d}` : ""}`); };

const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const erros = [];
p.on("pageerror", (e) => erros.push(String(e).slice(0, 140)));

// ---- sem sessao, a rota nao entrega nada
{
  const anon = await b.newContext();
  const ap = await anon.newPage();
  const r = await ap.request.get(`${B}/api/agendamentos/qualquer/agenda?d=ics`);
  ok("sem login: 401", r.status() === 401, `status=${r.status()}`);
  await anon.close();
}

// ---- entra e acha um agendamento futuro
await p.goto(`${B}/entrar`, { waitUntil: "networkidle" });
await p.fill("#email", "andre.lopes@email.com");
await p.fill("#password", "mandu123");
await p.click('button[type="submit"]');
await p.waitForURL((u) => !u.pathname.includes("/entrar"), { timeout: 25000 });
await p.goto(`${B}/minha-conta/agendamentos`, { waitUntil: "networkidle" });
await p.waitForTimeout(700);

const href = await p.evaluate(() => {
  const a = [...document.querySelectorAll('a[href*="/minha-conta/agendamentos/"]')]
    .map((x) => x.getAttribute("href")).find((h) => h.split("/").length > 3);
  return a;
});
ok("achou um agendamento", Boolean(href), String(href));
const id = href.split("/").pop();

await p.goto(`${B}${href}`, { waitUntil: "networkidle" });
await p.waitForTimeout(600);

// ---- o botao existe e abre as duas opcoes
const botao = p.getByRole("button", { name: /Adicionar à agenda/ }).first();
ok("botao na pagina do agendamento", await botao.isVisible());
await botao.click();
await p.waitForTimeout(500);
const opcoes = await p.evaluate(() => [...document.querySelectorAll('[role="dialog"] a')].map((a) => ({
  txt: a.textContent.replace(/\s+/g, " ").trim().slice(0, 46), href: a.getAttribute("href"),
  recomendado: a.textContent.includes("recomendado"),
})));
console.log("  opcoes:", JSON.stringify(opcoes, null, 1));
ok("duas opcoes, google e ics", opcoes.length === 2 && opcoes.some((o) => o.href.includes("d=google")) && opcoes.some((o) => o.href.includes("d=ics")));
ok("marca de recomendado aparece em uma so", opcoes.filter((o) => o.recomendado).length === 1);
await p.screenshot({ path: `${OUT}/ag-folha.png` });

// ---- o .ics de verdade
const ics = await p.request.get(`${B}/api/agendamentos/${id}/agenda?d=ics`);
const corpo = await ics.text();
ok("ics: 200 e tipo certo", ics.status() === 200 && (ics.headers()["content-type"] || "").includes("text/calendar"), ics.headers()["content-type"]);
ok("ics: vem como anexo", (ics.headers()["content-disposition"] || "").includes("attachment"), ics.headers()["content-disposition"]);
ok("ics: envelope completo", corpo.startsWith("BEGIN:VCALENDAR") && corpo.trimEnd().endsWith("END:VCALENDAR"));
ok("ics: linhas dentro de 75 octetos", corpo.split("\r\n").every((l) => Buffer.from(l, "utf8").length <= 75));
ok("ics: sem caractere quebrado", !corpo.replace(/\r\n /g, "").includes("�"));
ok("ics: tem endereco da loja", corpo.includes("LOCATION:"), corpo.split("\r\n").find((l) => l.startsWith("LOCATION")) || "");
console.log("\n--- ics gerado ---\n" + corpo.replace(/\r\n/g, "\n"));

// ---- o desvio para o Google
const goog = await p.request.get(`${B}/api/agendamentos/${id}/agenda?d=google`, { maxRedirects: 0 });
const destino = goog.headers()["location"] || "";
ok("google: desvia 302", goog.status() === 302, `status=${goog.status()}`);
ok("google: aponta para o calendar", destino.startsWith("https://calendar.google.com/calendar/render"), destino.slice(0, 60));
const u = new URL(destino);
ok("google: leva periodo e titulo", /^\d{8}T\d{6}Z\/\d{8}T\d{6}Z$/.test(u.searchParams.get("dates") || "") && (u.searchParams.get("text") || "").length > 3,
   `${u.searchParams.get("dates")} | ${u.searchParams.get("text")}`);

// ---- agendamento de outra pessoa
{
  const outro = await b.newContext();
  const op = await outro.newPage();
  await op.goto(`${B}/entrar`, { waitUntil: "networkidle" });
  await op.fill("#email", "felipe.moreira@email.com");
  await op.fill("#password", "mandu123");
  await op.click('button[type="submit"]');
  await op.waitForURL((u) => !u.pathname.includes("/entrar"), { timeout: 25000 });
  const r = await op.request.get(`${B}/api/agendamentos/${id}/agenda?d=ics`);
  ok("agendamento de outro cliente: 404", r.status() === 404, `status=${r.status()}`);
  await outro.close();
}

ok("sem erro de pagina", erros.length === 0, erros.join(" | "));
console.log(falhas === 0 ? "\nAGENDA OK" : `\n${falhas} falha(s)`);
await b.close();
process.exit(falhas === 0 ? 0 : 1);
