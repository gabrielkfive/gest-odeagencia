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
  ok(await page.evaluate(() => document.querySelectorAll('[data-nav]').length) === 41, '41 entradas de navegacao (alpha, planejamentos e marcas fora, pedido do Gabriel)');
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
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (!L.mobile) {
    // pagina do cliente com abas (workflowark-next-<data>.js): abre Vivenda, ve abas, salva cartao de post
    await page.evaluate(() => { const n = document.querySelector('[data-nav="cliente"]'); n && n.click(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => { const s = document.getElementById('cli-area-sel'); if (s) { s.value = 'vivenda'; cliAreaSelect('vivenda'); } });
    await page.waitForTimeout(300);
    const abas = await page.$$eval('.nxc-tab', (els) => els.map((e) => e.textContent.trim().split(' ')[0]));
    ok(abas.length >= 8 && abas.includes('Posts') && abas.includes('Ficha') && abas.includes('Saúde'), `pagina do cliente com abas (${abas.join(', ')})`);
    await page.evaluate(() => nxCliAba('todas'));
    await page.waitForTimeout(200);
    const nCards = await page.$$eval('.nxc-card', (els) => els.length);
    ok(nCards >= 1, `tarefas da Vivenda no mes aparecem como cartoes (${nCards})`);
    await page.screenshot({ path: `deploy/prova-next-copia-cliente-${L.w}.png`, fullPage: false });
    const id = await page.$eval('.nxc-card .nxc-mini', (b) => b.getAttribute('onclick').match(/nxPost\('([^']+)'\)/)[1]);
    await page.evaluate((i) => nxPost(i), id);
    await page.waitForTimeout(200);
    await page.click('.nxc-fmt button[data-f="reel"]');
    await page.fill('#nxp-pub', '2026-09-25T18:30');
    await page.fill('#nxp-leg', 'Legenda de teste do cartao');
    await page.screenshot({ path: `deploy/prova-next-copia-cartao-${L.w}.png`, fullPage: false });
    await page.evaluate((i) => nxPostSalva(i), id);
    await page.waitForTimeout(700);
    const salvo = await page.evaluate((i) => { const t = JSON.parse(localStorage.getItem('wfa-tarefas') || '[]').find((x) => x.id === i); return t && t.formato === 'reel' && t.publicarEm === '2026-09-25T18:30' && t.legenda === 'Legenda de teste do cartao' && !!t.up; }, id);
    ok(salvo, 'cartao de post gravou formato, publicarEm, legenda e up na tarefa real');
    await page.evaluate(() => nxCliAba('reels'));
    await page.waitForTimeout(200);
    ok((await page.$$eval('.nxc-card', (els) => els.length)) >= 1, 'tarefa aparece na aba Reels depois de salvar');
  }
  ok(erros.length === 0, 'sem erro de JS' + (erros.length ? ': ' + [...new Set(erros)].join(' | ') : ''));
  await ctx.close();
}
await browser.close();
srv.fecha();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
