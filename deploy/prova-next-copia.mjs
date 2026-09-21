/*
 Prova visual da COPIA do WorkFlowArk com skin Next (public/workflowark-next.html).
 Mesmo ambiente das capturas Apple: servidor local de public/, rede externa barrada,
 carteira sintetica no localStorage. Tira Meu Dia e Kanban em 1440 e 390 (escuro), e
 confere no celular que a sidebar comeca escondida.
 Uso: node deploy/prova-next-copia.mjs
 Sai: deploy/prova-next-copia-<tela>-<largura>.png
*/
import { chromium } from 'playwright-core';
import { servidorLocal, bloqueiaRedeExterna, SEMENTE, semear } from './apple-review-ambiente.mjs';

const srv = await servidorLocal();
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas++; };
for (const L of [{ w: 1440, h: 900 }, { w: 390, h: 844, mobile: true }]) {
  const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h }, isMobile: !!L.mobile, hasTouch: !!L.mobile, deviceScaleFactor: L.mobile ? 2 : 1 });
  await bloqueiaRedeExterna(ctx);
  await ctx.addInitScript(semear, { ...SEMENTE, tema: 'dark' });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
  await page.goto(srv.url + '/workflowark-next.html', { waitUntil: 'load' });
  await page.waitForTimeout(3200);
  console.log(`Largura ${L.w}`);
  ok(await page.evaluate(() => document.body.classList.contains('next')), 'body.next presente');
  ok(await page.evaluate(() => !!document.querySelector('link[href^="workflowark-next-"]')), 'skin carregada');
  ok(await page.evaluate(() => document.querySelectorAll('[data-nav]').length) === 44, '44 entradas de navegacao preservadas (43 + crm)');
  ok(await page.evaluate(() => document.querySelectorAll('[data-toggle]').length) >= 6, 'grupos da sidebar original preservados');
  if (L.mobile) {
    const r = await page.evaluate(() => document.querySelector('.side').getBoundingClientRect().right);
    ok(r <= 0, `sidebar escondida no celular (right=${Math.round(r)})`);
  }
  await page.screenshot({ path: `deploy/prova-next-copia-meudia-${L.w}.png`, fullPage: false });
  await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
  await page.waitForTimeout(700);
  if (L.mobile) await page.evaluate(() => { try { document.body.classList.remove('nav-open'); toggleSide(false); } catch (e) {} });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('page-tarefas').classList.contains('active')), 'Atividades abre pela sidebar nova');
  await page.screenshot({ path: `deploy/prova-next-copia-kanban-${L.w}.png`, fullPage: false });
  await page.evaluate(() => openTaskDetail('t-capa'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `deploy/prova-next-copia-detalhe-${L.w}.png`, fullPage: false });
  ok(erros.length === 0, 'sem erro de JS' + (erros.length ? ': ' + [...new Set(erros)].join(' | ') : ''));
  await ctx.close();
}
await browser.close();
srv.fecha();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
