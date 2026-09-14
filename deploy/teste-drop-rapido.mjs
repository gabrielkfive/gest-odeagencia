// Arrasto RAPIDO com mouse de verdade (Playwright): pressiona no cartao, cruza para a
// coluna num movimento so e solta na hora. Reproduz o "primeira vez nao vai" de 14/09/2026:
// sem dragenter cancelado, o navegador recusava o drop e so vinha o dragend.
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';
const alvo = process.argv[2] ? (process.argv[2].startsWith('http') ? process.argv[2] : pathToFileURL(path.resolve(process.argv[2])).href) : pathToFileURL(path.resolve('public/workflowark.html')).href;
const TAREFAS = [
  { id: 't1', title: 'Tarefa A', status: 'iniciar', resp: 'Ana', clienteId: 'c1', prio: 'media', data: '2026-09-01', ord: 0 },
  { id: 't2', title: 'Tarefa B', status: 'iniciar', resp: 'Ana', clienteId: 'c1', prio: 'media', data: '2026-09-02', ord: 1 },
  { id: 't3', title: 'Tarefa C', status: 'andamento', resp: 'Ana', clienteId: 'c1', prio: 'media', data: '2026-09-03', ord: 0 },
];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.addInitScript((t) => {
  localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({ access_token: 'teste-local', refresh_token: 'x', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' } }));
  localStorage.setItem('wfa-tarefas', JSON.stringify(t));
}, TAREFAS);
page.on('pageerror', (e) => { (globalThis.__e = globalThis.__e || []).push(String(e.message)); });
await page.goto(alvo);
await page.waitForTimeout(3200);
await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
await page.waitForTimeout(600);
let ok = 0, falhas = 0;
for (let n = 0; n < 6; n++) {
  const de = n % 2 ? 'andamento' : 'iniciar', para = n % 2 ? 'iniciar' : 'andamento';
  await page.evaluate(() => { const c = document.querySelector('.task-card[data-tid="t1"]'); c && c.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(150);
  const c = await page.locator('.task-card[data-tid="t1"]').boundingBox();
  if (!c) { console.log('  FALHOU cartao t1 nao esta na tela: ' + await page.evaluate(() => [...document.querySelectorAll('.task-card')].length + ' cartoes; erros=' + (window.__erros||[]).join('|'))); falhas++; break; }
  const d = await page.locator('.task-col[data-status="' + para + '"]').boundingBox();
  await page.mouse.move(c.x + c.width / 2, c.y + 12);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width / 2 + 10, c.y + 20, { steps: 2 });     // sai do lugar (inicia o drag)
  await page.mouse.move(d.x + d.width / 2, d.y + d.height / 2, { steps: 1 }); // cruza num pulo so
  await page.mouse.up();                                                     // solta NA HORA
  await page.waitForTimeout(250);
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('wfa-tarefas')).find(t => t.id === 't1').status);
  const dom = await page.evaluate(() => document.querySelector('.task-card[data-tid="t1"]')?.closest('.task-list')?.dataset.list);
  const bom = st === para && dom === para;
  bom ? ok++ : falhas++;
  console.log((bom ? '  ok  ' : '  FALHOU ') + `arrasto rapido ${de} -> ${para}: estado=${st} tela=${dom}`);
  if (!bom) { await page.evaluate((p) => { const t = JSON.parse(localStorage.getItem('wfa-tarefas')); t.find(x => x.id === 't1').status = p; localStorage.setItem('wfa-tarefas', JSON.stringify(t)); state.tarefas = t; renderTarefas(); }, para); await page.waitForTimeout(200); }
}
// Cenario 2: o navegador ENGOLE o drop (so dragend, com a posicao do mouse sobre a coluna).
{
  const r = await page.evaluate(() => {
    const card = document.querySelector('.task-card[data-tid="t1"]');
    const de = card.closest('.task-list').dataset.list;
    const para = de === 'iniciar' ? 'andamento' : 'iniciar';
    const col = document.querySelector('.task-col[data-status="' + para + '"]');
    const b = col.getBoundingClientRect();
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt, clientX: b.x + b.width / 2, clientY: b.y + b.height / 2 }));
    const st = JSON.parse(localStorage.getItem('wfa-tarefas')).find(t => t.id === 't1').status;
    const dom = document.querySelector('.task-card[data-tid="t1"]')?.closest('.task-list')?.dataset.list;
    return { para, st, dom };
  });
  const bom = r.st === r.para && r.dom === r.para;
  bom ? ok++ : falhas++;
  console.log((bom ? '  ok  ' : '  FALHOU ') + `dragend sem drop (navegador engoliu) -> ${r.para}: estado=${r.st} tela=${r.dom}`);
}
await browser.close();
console.log(falhas ? `RESULTADO: ${falhas} de ${ok + falhas} arrastos rapidos falharam` : `Tudo certo: ${ok} arrastos rapidos, todos soltaram na primeira`);
process.exit(falhas ? 1 : 0);
