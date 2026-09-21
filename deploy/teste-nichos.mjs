/*
 Teste dos segmentos (nichos) do gerador de contratos e da esteira de propostas (21/09/2026):
 abre as duas paginas por servidor local sem rede externa, troca de segmento e confere que nao ha erro de JS.
 Uso: node deploy/teste-nichos.mjs
*/
import { chromium } from 'playwright-core';
import { servidorLocal, bloqueiaRedeExterna } from './apple-review-ambiente.mjs';
const srv = await servidorLocal();
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await bloqueiaRedeExterna(ctx);
const page = await ctx.newPage();
const erros = []; page.on('pageerror', (e) => erros.push(String(e.message)));
await page.goto(srv.url + '/propostas.html', { waitUntil: 'load' }); await page.waitForTimeout(1200);
let n = await page.$$eval('#segpick .opt', (e) => e.length); console.log('propostas segmentos:', n);
for (const seg of ['medicina', 'farmacia', 'servicos']) { await page.click(`#segpick .opt[data-seg="${seg}"]`); await page.waitForTimeout(400); console.log(seg, 'segAtual=', await page.evaluate(() => segAtual), 'cliente_tipo=', await page.evaluate(() => SEG[segAtual].cliente_tipo)); }
await page.goto(srv.url + '/contratos.html', { waitUntil: 'load' }); await page.waitForTimeout(800);
n = await page.$$eval('#segmento option', (e) => e.length); console.log('contratos segmentos:', n);
for (const seg of ['medicina', 'imobiliario', 'fitness']) { await page.selectOption('#segmento', seg); await page.waitForTimeout(300); console.log(seg, 'compliance=', await page.evaluate((s) => !!SEGMENTOS[s].compliance, seg)); }
console.log('erros JS:', erros.length ? erros : 'nenhum');
await b.close(); srv.fecha();
