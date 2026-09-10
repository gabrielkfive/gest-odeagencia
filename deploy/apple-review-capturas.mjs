/*
 Capturas do Kanban de Atividades e do detalhe da tarefa com dado sintetico, em tres
 larguras reais (1440, 430 e 390 px) e nos dois temas. Serve public/ por um servidor
 HTTP local e bloqueia toda rede externa (fontes do Google, CDN, API de producao), pra
 nao depender de internet nem tocar em dado real.

 Uso:
   node deploy/apple-review-capturas.mjs <rotulo> [pasta-de-saida]
   node deploy/apple-review-capturas.mjs antes ../../outputs
   node deploy/apple-review-capturas.mjs depois ../../outputs

 Sai: <pasta>/apple-review-<rotulo>-<tema>-<largura>-<tela>.png
 Requisito: Chrome instalado (playwright-core usa channel 'chrome').
*/
import { chromium } from 'playwright-core';
import { servidorLocal, bloqueiaRedeExterna, SEMENTE, semear } from './apple-review-ambiente.mjs';
import path from 'path';
import fs from 'fs';

const rotulo = process.argv[2] || 'captura';
const saida = path.resolve(process.argv[3] || 'deploy');
fs.mkdirSync(saida, { recursive: true });

const srv = await servidorLocal();
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const larguras = [
  { w: 1440, h: 900, nome: '1440' },
  { w: 430, h: 932, nome: '430', mobile: true },
  { w: 390, h: 844, nome: '390', mobile: true },
];
const geradas = [];

for (const tema of ['light', 'dark']) {
  for (const L of larguras) {
    const ctx = await browser.newContext({
      viewport: { width: L.w, height: L.h },
      deviceScaleFactor: L.mobile ? 2 : 1,
      isMobile: !!L.mobile,
      hasTouch: !!L.mobile,
      colorScheme: tema,
    });
    await bloqueiaRedeExterna(ctx);
    await ctx.addInitScript(semear, { ...SEMENTE, tema });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
    await page.goto(srv.url + '/workflowark.html', { waitUntil: 'load' });
    await page.waitForTimeout(3200);
    await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
    await page.waitForTimeout(700);
    // fecha o menu lateral no celular, se ficou aberto, pra fotografar o quadro
    if (L.mobile) await page.evaluate(() => { try { document.body.classList.remove('nav-open'); } catch (e) {} });
    await page.waitForTimeout(200);

    const nome = (tela) => path.join(saida, `apple-review-${rotulo}-${tema}-${L.nome}-${tela}.png`);
    await page.screenshot({ path: nome('kanban'), fullPage: false });
    geradas.push(nome('kanban'));

    // detalhe da tarefa (a mais completa da semente)
    await page.evaluate(() => openTaskDetail('t-capa'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: nome('detalhe'), fullPage: false });
    geradas.push(nome('detalhe'));

    if (erros.length) console.log(`  aviso ${tema}/${L.nome}: erros de JS: ${[...new Set(erros)].join(' | ')}`);
    await ctx.close();
  }
}
await browser.close();
srv.fecha();
console.log('Capturas geradas:');
for (const g of geradas) console.log('  ' + g);
