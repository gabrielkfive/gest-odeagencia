/*
 Confiabilidade do Kanban de Atividades, no navegador, contra o arquivo local.

 Cobre os criterios de pronto da fila de 10/09/2026:
   1. mover cartao entre colunas persiste depois de recarregar a pagina;
   2. mandar pra "Homologacao do cliente" persiste depois de recarregar;
   3. busca acha "Darma" com e sem acento, e acha tarefa pelo responsavel ("caio");
   4. filtro por responsavel "Caio Neves" acha tarefa antiga gravada como "Caio";
   5. tela da tarefa grava sozinha (autosave) e ao fechar sem clicar em Salvar;
   6. cronometro anda ao vivo com a tela aberta e persiste ao pausar;
   7. indicador de gravacao aparece ("Salvando..." enquanto a nuvem nao confirma);
   8. trocar de aba do sistema e voltar nao mexe no cartao movido;
   9. nenhum erro de JS fora do ruido de rodar por file://.

 Chamado pelo CI (.github/workflows/deploy.yml) e por `npm run teste:confiabilidade`.
 Uso: node deploy/teste-confiabilidade.mjs            # arquivo local public/workflowark.html
      node deploy/teste-confiabilidade.mjs <url>      # contra uma URL (precisa de sessao valida)
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = process.argv[2] ? process.argv[2] : pathToFileURL(path.resolve('public/workflowark.html')).href;
const falhas = [];
const ok = [];
const checa = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));
setTimeout(() => { console.log('WATCHDOG: o teste travou (150s)'); process.exit(2); }, 150000);

// Carteira sintetica. t2 guarda "Caio" solto (dado antigo); o seletor de hoje diz "Caio Neves".
const TAREFAS = [
  { id: 't1', title: 'LP Mazute', status: 'backlog', resp: 'Ana', clienteId: 'c1', prio: 'media', data: '2026-09-01', ord: 0 },
  { id: 't2', title: 'Relatorio semanal', status: 'backlog', resp: 'Caio', clienteId: 'c2', prio: 'alta', data: '2026-09-02', ord: 1 },
  { id: 't3', title: 'Post da Darmã', status: 'andamento', resp: 'Darman', clienteId: 'c1', prio: 'baixa', data: '2026-09-03', ord: 0 },
  { id: 't4', title: 'Criativo Vivenda', status: 'backlog', resp: 'Caio Neves', clienteId: 'c2', prio: 'media', data: '2026-09-04', ord: 2 },
];

const semear = (tarefas) => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    if (!localStorage.getItem('wfa-confiab-semeado')) {
      localStorage.setItem('wfa-tarefas', JSON.stringify(tarefas));
      localStorage.setItem('wfa-confiab-semeado', '1');
    }
  } catch (e) {}
};

// Arrasto com MOUSE, os mesmos eventos do desktop (igual ao teste-arrastar-tarefas).
const ARRASTA = (args) => {
  const { idCartao, destino } = args;
  const card = document.querySelector('.task-card[data-tid="' + idCartao + '"]');
  const lista = document.querySelector('.task-list[data-list="' + destino + '"]');
  if (!card) return 'cartao nao esta na tela';
  if (!lista) return 'coluna nao encontrada';
  const m = new Map();
  const dt = { effectAllowed: '', dropEffect: '', types: [], setData: (k, v) => m.set(String(k), String(v)), getData: (k) => m.get(String(k)) || '', setDragImage: () => {} };
  const manda = (el, tipo, y) => { const e = new Event(tipo, { bubbles: true, cancelable: true }); Object.defineProperty(e, 'dataTransfer', { value: dt }); e.clientX = 0; e.clientY = y || 0; e.relatedTarget = null; el.dispatchEvent(e); };
  const r = lista.getBoundingClientRect();
  manda(card, 'dragstart'); manda(lista, 'dragover', r.top + 20); manda(lista, 'drop', r.top + 20); manda(card, 'dragend');
  return '';
};

const visiveis = (st) => [...document.querySelectorAll('.task-list[data-list="' + st + '"] .task-card')].map((c) => c.dataset.tid);
const estado = (id) => { const t = (state.tarefas || []).find((x) => x.id === id); return t ? { status: t.status, title: t.title, timeSpent: t.timeSpent || 0, timerSince: t.timerSince || null } : null; };
const RUIDO = /access control checks|Not allowed to load local resource|Cross origin|Failed to fetch|Load failed|net::ERR|CORS/i;

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(semear, TAREFAS);
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));

const abreAtividades = async () => {
  await page.goto(alvo);
  await page.waitForTimeout(3200);
  await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
  await page.waitForTimeout(600);
};
await abreAtividades();

// 1. mover entre colunas e recarregar
checa((await page.evaluate(ARRASTA, { idCartao: 't1', destino: 'andamento' })) === '', 'arrasto t1 -> Em andamento executou');
await page.waitForTimeout(300);
checa((await page.evaluate(estado, 't1')).status === 'andamento', 'estado em memoria: t1 em andamento');
const badge = await page.evaluate(() => (document.getElementById('sync-status') || {}).textContent || '');
checa(/Salvando|Salvo/.test(badge), `indicador de gravacao visivel apos mover (badge: "${badge}")`);
await page.reload(); await page.waitForTimeout(3200);
await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(600);
checa((await page.evaluate(estado, 't1')).status === 'andamento', 'depois de recarregar: t1 continua em andamento');
checa((await page.evaluate(visiveis, 'andamento')).includes('t1'), 'depois de recarregar: cartao t1 esta na coluna Em andamento');

// 2. homologacao do cliente e recarregar
checa((await page.evaluate(ARRASTA, { idCartao: 't1', destino: 'homologcli' })) === '', 'arrasto t1 -> Homologacao do cliente executou');
await page.waitForTimeout(300);
await page.reload(); await page.waitForTimeout(3200);
await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(600);
checa((await page.evaluate(estado, 't1')).status === 'homologcli', 'depois de recarregar: t1 continua em Homologacao do cliente');
checa((await page.evaluate(visiveis, 'homologcli')).includes('t1'), 'depois de recarregar: cartao t1 esta na coluna Homologacao do cliente');

// 8. trocar de aba do sistema e voltar
await page.evaluate(() => { const n = document.querySelector('[data-nav="projetos"]'); n && n.click(); }); await page.waitForTimeout(500);
await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(500);
checa((await page.evaluate(visiveis, 'homologcli')).includes('t1'), 'trocar de aba (Projetos) e voltar: t1 segue em Homologacao do cliente');

// 3. busca com e sem acento, e por responsavel
const busca = async (q) => page.evaluate((v) => { const el = document.getElementById('filt-busca'); el.value = v; aplicarFiltros(); return [...document.querySelectorAll('#task-board .task-card')].map((c) => c.dataset.tid); }, q);
checa((await busca('darma')).join() === 't3', 'busca "darma" (sem acento) acha "Post da Darmã"');
checa((await busca('Darmã')).join() === 't3', 'busca "Darmã" (com acento) acha "Post da Darmã"');
checa((await busca('darman')).join() === 't3', 'busca "darman" acha pela responsavel Darman');
const porCaio = await busca('caio');
checa(porCaio.includes('t2') && porCaio.includes('t4') && !porCaio.includes('t1'), `busca "caio" acha as tarefas do Caio pelo responsavel (achou: ${porCaio.join(',')})`);
await busca('');

// 4. filtro por responsavel canonico acha dado antigo
const filtroResp = await page.evaluate(() => {
  const el = document.getElementById('filt-resp');
  if (![...el.options].some((o) => o.value === 'Caio Neves')) el.add(new Option('Caio Neves', 'Caio Neves'));
  el.value = 'Caio Neves'; aplicarFiltros();
  const v = [...document.querySelectorAll('#task-board .task-card')].map((c) => c.dataset.tid);
  el.value = ''; aplicarFiltros();
  return v;
});
checa(filtroResp.includes('t2') && filtroResp.includes('t4') && !filtroResp.includes('t1'), `filtro "Caio Neves" acha t2 (gravada como "Caio") e t4 (achou: ${filtroResp.join(',')})`);

// 5. autosave na tela da tarefa
await page.evaluate(() => openTaskDetail('t1'));
await page.waitForTimeout(400);
checa(await page.evaluate(() => { const m = document.getElementById('pj-modal'); return !!m && m.style.display !== 'none' && !!document.getElementById('tk-t'); }), 'tela da tarefa abriu');
await page.evaluate(() => { const i = document.getElementById('tk-t'); i.value = 'LP Mazute v2'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(1700);
const ind = await page.evaluate(() => (document.getElementById('tk-autosave') || {}).textContent || '');
checa(/^Salvo/.test(ind), `autosave gravou sozinho 1,2s depois de digitar (rodape: "${ind}")`);
checa((await page.evaluate(estado, 't1')).title === 'LP Mazute v2', 'estado em memoria: titulo v2 gravado sem clicar em Salvar');
await page.evaluate(() => { const i = document.getElementById('tk-t'); i.value = 'LP Mazute v3'; i.dispatchEvent(new Event('input', { bubbles: true })); });
await page.waitForTimeout(100);
await page.evaluate(() => { const m = document.getElementById('pj-modal'); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); // clique fora, sem esperar o debounce
await page.waitForTimeout(300);
checa(await page.evaluate(() => document.getElementById('pj-modal').style.display === 'none'), 'clicar fora fechou a tela');
checa((await page.evaluate(estado, 't1')).title === 'LP Mazute v3', 'fechar sem Salvar gravou a alteracao pendente (v3)');
await page.reload(); await page.waitForTimeout(3200);
await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(600);
checa((await page.evaluate(estado, 't1')).title === 'LP Mazute v3', 'depois de recarregar: titulo v3 continua');
checa((await page.evaluate(estado, 't1')).status === 'homologcli', 'depois de recarregar: autosave nao mexeu no status (segue em Homologacao do cliente)');

// 6. cronometro ao vivo e persistente
await page.evaluate(() => openTaskDetail('t2'));
await page.waitForTimeout(400);
await page.evaluate(() => document.querySelector('#pj-modal [data-tktimer]').click());
await page.waitForTimeout(2400);
const gasto = await page.evaluate(() => (document.getElementById('tk-gasto') || {}).textContent || '');
checa(gasto !== '0m 00s' && gasto !== '', `cronometro anda com a tela aberta (mostra "${gasto}")`);
checa(!!(await page.evaluate(estado, 't2')).timerSince, 'play do cronometro persistiu na hora (timerSince gravado)');
await page.evaluate(() => document.querySelector('#pj-modal [data-tktimer]').click());
await page.waitForTimeout(200);
const t2 = await page.evaluate(estado, 't2');
checa(!t2.timerSince && t2.timeSpent >= 2, `pausar gravou o tempo (timeSpent=${Math.round(t2.timeSpent)}s)`);
// Zerar (Gabriel, 10/09: "a parte de zerar o tempo tambem ta bugando"): zera, persiste na hora e sobrevive ao reload
await page.evaluate(() => document.querySelector('#pj-modal [data-tktimer]').click()); // liga de novo, pra provar que zerar para o relogio
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('#pj-modal [data-tkzero]').click());
await page.waitForTimeout(300);
const z = await page.evaluate(estado, 't2');
checa(!z.timerSince && z.timeSpent === 0, `zerar parou o relogio e zerou o tempo na hora (timeSpent=${z.timeSpent}, timerSince=${z.timerSince})`);
checa((await page.evaluate(() => (document.getElementById('tk-gasto') || {}).textContent || '')) === '0m 00s', 'zerar mostra 0m 00s na tela');
await page.evaluate(() => { const m = document.getElementById('pj-modal'); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
await page.waitForTimeout(200);
await page.reload(); await page.waitForTimeout(3200);
await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(600);
const z2 = await page.evaluate(estado, 't2');
checa(!z2.timerSince && z2.timeSpent === 0, 'depois de recarregar: tempo continua zerado e relogio parado');
checa(await page.evaluate(() => !document.querySelector('.task-card[data-tid="t2"] .tc-badge.run')), 'depois de recarregar: cartao t2 nao mostra relogio correndo');

// 9. erros de JS
for (const e of [...new Set(erros)]) if (!RUIDO.test(e)) falhas.push('erro de JS: ' + e);

// 10. janela estreita (print do Gabriel, 10/09): nenhum filtro pode sair da barra de filtros
const estreita = await ctx.newPage();
await estreita.setViewportSize({ width: 430, height: 900 });
await estreita.goto(alvo); await estreita.waitForTimeout(3200);
await estreita.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
await estreita.waitForTimeout(600);
const fora = await estreita.evaluate(() => {
  const bar = document.querySelector('#page-tarefas .filter-bar') || document.querySelector('.filter-bar');
  if (!bar) return ['barra de filtros nao encontrada'];
  const r = bar.getBoundingClientRect();
  return [...bar.querySelectorAll('input,select,button,.pp-wrap')].filter((el) => el.offsetParent !== null).map((el) => {
    const b = el.getBoundingClientRect();
    return b.right > r.right + 1 || b.left < r.left - 1 ? (el.id || el.className) + ' (' + Math.round(b.left) + '..' + Math.round(b.right) + ' fora de ' + Math.round(r.left) + '..' + Math.round(r.right) + ')' : null;
  }).filter(Boolean);
});
checa(fora.length === 0, `janela de 430px: nenhum filtro sai da barra (fora: ${fora.join(' | ') || 'nenhum'})`);
await estreita.screenshot({ path: 'deploy/prova-filtros-estreito.png', fullPage: false });
await estreita.close();

await browser.close();
console.log('Alvo:', alvo);
console.log('=== PASSOU ===');
for (const o of ok) console.log('  ok  ' + o);
if (falhas.length) {
  console.log('');
  console.log('=== FALHOU ===');
  for (const f of falhas) console.log('  X   ' + f);
  process.exit(1);
}
console.log('');
console.log('Tudo certo: mover persiste, homologacao do cliente persiste, busca sem acento e por responsavel, autosave, cronometro e indicador de gravacao.');
process.exit(0);
