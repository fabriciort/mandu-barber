/**
 * Guarda contra vazamento horizontal no celular.
 *
 * Existe por causa de um bug real: no passo "Horario" do agendamento, um filho
 * de grid sem min-w-0 esticava a coluna para 848px numa tela de 390px. E o
 * `overflow-x: hidden` do body ESCONDIA o sintoma — em vez de rolar, a tela
 * cortava, entao nem dava para chegar no conteudo. Por isso o teste nao olha
 * scrollWidth: ele mede elemento por elemento e ignora quem esta dentro de um
 * container que rola de proposito.
 *
 * O Playwright NAO e dependencia do projeto de proposito: sao ~50 MB que a
 * Vercel baixaria em todo build para nada. Para rodar:
 *
 *   npm run build && npx next start -p 3111 &
 *   npx --yes playwright@1 --version >/dev/null   # baixa o pacote uma vez
 *   node e2e/mobile-overflow.mjs
 *
 * Se o Chromium do ambiente estiver em outro caminho, ajuste executablePath.
 */

import { chromium } from "playwright";
const B = process.env.BASE_URL || "http://localhost:3111";
const CHROMIUM = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
const b = await chromium.launch({ executablePath: CHROMIUM });
let falhas = 0;

const medir = () => ({
  vw: document.documentElement.clientWidth,
  maus: [...document.querySelectorAll("body *")].filter((el) => {
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return false;
    let pai = el.parentElement;
    while (pai && pai !== document.body) {
      const ov = getComputedStyle(pai).overflowX;
      if (ov === "auto" || ov === "scroll") return false;
      pai = pai.parentElement;
    }
    return box.right > document.documentElement.clientWidth + 1;
  }).map((el) => `${el.tagName.toLowerCase()}.${(el.className?.toString?.()||"").slice(0,40)}`).slice(0, 3),
});

// publicas
for (const w of [320, 360, 390, 412]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 } });
  const p = await ctx.newPage();
  for (const rota of ["/", "/planos", "/agendar", "/entrar", "/cadastro"]) {
    await p.goto(`${B}${rota}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(350);
    const r = await p.evaluate(medir);
    if (r.maus.length) { falhas++; console.log(`FALHA ${w}px ${rota}:`, r.maus.join(" | ")); }
  }
  await ctx.close();
}

// autenticadas + passo horario
for (const w of [320, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`${B}/agendar`, { waitUntil: "networkidle" });
  await p.getByRole("button", { name: /Corte Mandu/ }).first().click();
  await p.waitForTimeout(200);
  await p.getByRole("button", { name: /Continuar/ }).last().click();
  await p.waitForTimeout(400);
  await p.getByRole("button", { name: /Continuar/ }).last().click();
  await p.waitForTimeout(1600);
  let r = await p.evaluate(medir);
  if (r.maus.length) { falhas++; console.log(`FALHA ${w}px /agendar[horario]:`, r.maus.join(" | ")); }

  await p.goto(`${B}/entrar`, { waitUntil: "networkidle" });
  await p.fill("#email", "ricardo@mandubarber.com.br");
  await p.fill("#password", "mandu123");
  await p.click('button[type="submit"]');
  await p.waitForURL("**/painel", { timeout: 20000 });
  for (const rota of ["/painel", "/painel/clientes", "/painel/agendamentos", "/minha-conta"]) {
    await p.goto(`${B}${rota}`, { waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    r = await p.evaluate(medir);
    if (r.maus.length) { falhas++; console.log(`FALHA ${w}px ${rota}:`, r.maus.join(" | ")); }
  }
  await ctx.close();
}

console.log(falhas === 0 ? "\nSEM VAZAMENTO HORIZONTAL em 320/360/390/412px" : `\n${falhas} tela(s) vazando`);
await b.close();
