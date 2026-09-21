/*
 Prova do Início do /next no molde "instrumento" (doc 07, lote 1).
 Mesmo ambiente das capturas Apple (servidor local de public/, carteira sintética), com
 entregas datadas no mês pra linha do mês ter pontos. Rede externa barrada, salvo as
 fontes do Google (Doto entra na captura como em produção).
 Confere, em claro e escuro, 1440 e 390: bloco #nx-inicio, 4 KPIs, linha do mês com
 pontos, 2 cartões aurora, 3 clientes em atenção, herói antigo escondido, saudação
 visível, clique no cliente abre a página dele, sem erro de JS.
 Uso: node deploy/prova-next-inicio.mjs
 Sai: deploy/prova-next-inicio-<tema>-<largura>.png
*/
import { chromium } from 'playwright-core';
import { servidorLocal, SEMENTE, semear } from './apple-review-ambiente.mjs';

const DIA = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const mesAtual = (iso) => iso.slice(0, 7) === DIA(0).slice(0, 7);
// entregas com data de publicação no mês corrente (só as que caem no mês contam)
const extras = [
  { id: 'p1', title: 'Reel do café', status: 'concluido', resp: 'Saulo', clienteId: 'vivenda', data: DIA(-3), concluidaEm: new Date(Date.now() - 4 * 864e5).toISOString(), publicarEm: DIA(-4) + 'T12:00', up: new Date().toISOString() },
  { id: 'p2', title: 'Story da semana', status: 'andamento', resp: 'Maria Luiza', clienteId: 'vivenda', data: DIA(2), publicarEm: DIA(1) + 'T18:00', up: new Date().toISOString() },
  { id: 'p3', title: 'Carrossel Fercon', status: 'iniciar', resp: 'Lucas Rosi', clienteId: 'fercon', data: DIA(5), publicarEm: DIA(4) + 'T10:00', up: new Date().toISOString() },
].filter((t) => mesAtual(t.publicarEm));
const semente = { ...SEMENTE, tarefas: [...SEMENTE.tarefas, ...extras] };

const srv = await servidorLocal();
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas++; };

for (const tema of ['dark', 'light']) {
  for (const L of [{ w: 1440, h: 900 }, { w: 390, h: 844, mobile: true }]) {
    const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h }, isMobile: !!L.mobile, hasTouch: !!L.mobile, deviceScaleFactor: L.mobile ? 2 : 1 });
    await ctx.route('**/*', (rota) => {
      const u = rota.request().url();
      if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('https://fonts.googleapis.com') || u.startsWith('https://fonts.gstatic.com')) return rota.continue();
      return rota.abort('blockedbyclient');
    });
    await ctx.addInitScript(semear, { ...semente, tema });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
    await page.goto(srv.url + '/workflowark-next.html', { waitUntil: 'load' });
    await page.waitForTimeout(3200);
    console.log(`Tema ${tema}, largura ${L.w}`);
    ok(await page.evaluate((t) => document.body.classList.contains(t === 'light' ? 'aura-light' : 'aura-dark'), tema), `tema ${tema} aplicado`);
    ok(await page.$('#nx-inicio') !== null, 'bloco #nx-inicio presente depois do cabeçalho');
    ok((await page.$$eval('#nx-inicio .nxi-kpi', (e) => e.length)) === 4, '4 KPIs');
    const kpis = await page.$$eval('#nx-inicio .nxi-kpi', (els) => els.map((e) => e.querySelector('.n').textContent + ' ' + e.querySelector('.l').textContent));
    ok(kpis.some((k) => /^\d+ atrasadas?$/.test(k)) && kpis.some((k) => /vencem hoje/.test(k)), `KPIs legíveis (${kpis.join(' | ')})`);
    const pontos = await page.$$eval('#nx-inicio .nxi-tl .d', (e) => e.length);
    ok(pontos >= 1, `linha do mês com ${pontos} ponto(s) e marcador de hoje`);
    ok(await page.$('#nx-inicio .nxi-tl .hoje') !== null, 'marcador de hoje na linha');
    ok((await page.$$eval('#nx-inicio .nxi-aurora', (e) => e.length)) === 2, '2 cartões aurora (saúde da carteira, entregas no prazo)');
    const auroras = await page.$$eval('#nx-inicio .nxi-aurora', (els) => els.map((e) => e.className.replace('nxi-aurora ', '') + ':' + e.querySelector('.n').textContent));
    ok(auroras.every((a) => !/undefined|NaN/.test(a)), `auroras com número ou "sem dados" (${auroras.join(', ')})`);
    ok((await page.$$eval('#nx-inicio .nxi-mini', (e) => e.length)) >= 1, 'clientes em atenção (ou carteira sem alerta)');
    ok(await page.evaluate(() => { const h = document.querySelector('#page-dashboard .aura-hero-row'); return !h || getComputedStyle(h).display === 'none'; }), 'herói antigo escondido no /next');
    ok(await page.evaluate(() => getComputedStyle(document.getElementById('md-greet')).display !== 'none'), 'saudação do cabeçalho visível');
    ok(await page.evaluate(() => document.fonts.check('700 20px Doto')), 'fonte Doto carregada (numerais em matriz de pontos)');
    await page.screenshot({ path: `deploy/prova-next-inicio-${tema}-${L.w}.png`, fullPage: false });
    if (!L.mobile) {
      const mini = await page.$('#nx-inicio .nxi-mini:not(.tudo)');
      if (mini) {
        await mini.click();
        await page.waitForTimeout(500);
        ok(await page.evaluate(() => document.getElementById('page-cliente') && document.getElementById('page-cliente').classList.contains('active')), 'clicar no cliente em atenção abre a página do cliente');
        ok((await page.$$eval('.nxc-tab', (e) => e.length)) >= 8, 'página do cliente com as abas');
      }
    }
    ok(erros.length === 0, 'sem erro de JS' + (erros.length ? ': ' + [...new Set(erros)].join(' | ') : ''));
    await ctx.close();
  }
}
await browser.close();
srv.fecha();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
