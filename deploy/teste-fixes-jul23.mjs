/*
 Teste de fumaça dos fixes de 23/07/2026:
   1. view inicial → page-dashboard (Meu Dia) ativo no boot
   2. debounce setCob → renderCobranca adiada 400ms (não dispara por keystroke)
   3. debounce setAcerto → renderAcerto adiada 400ms
   4. acrecSave → chama cloudSave após localStorage
   5. soft-delete delTask → tarefa sobrevive 3s + tap cancela + após 3s some de verdade

 Uso: node deploy/teste-fixes-jul23.mjs
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = pathToFileURL(path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/workflowark.html')).href;
const falhas = [];
const checa = (cond, msg) => { if (!cond) falhas.push(msg); };

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(() => {
  try {
    localStorage.setItem('wfa-theme', 'light');
    localStorage.setItem('wfa-tarefas', JSON.stringify([
      { id: 'del-test-1', title: 'Tarefa para soft-delete', resp: 'Gabriel', data: '', prio: 'media', status: 'backlog', tags: [], checklist: [] },
    ]));
    localStorage.setItem('wfa-cobranca', JSON.stringify({ 'cli-x': { resp: 'Joao', whatsapp: '', pix: '' } }));
    localStorage.setItem('wfa-acerto', JSON.stringify({ 'eq-x': { nome: 'Lucas', valor: 500 } }));
    localStorage.setItem('wfa-acertosrec', JSON.stringify({}));
    // garante que não há página salva (boot limpo)
    localStorage.removeItem('wfa-current-page');
  } catch (e) {}
});

await page.goto(alvo);
await page.waitForTimeout(2500); // boot + render inicial

// ─────────────────────────────────────────────────────────────────
// TESTE 1: view inicial é page-dashboard (Meu Dia), não page-painel
// ─────────────────────────────────────────────────────────────────
const viewInicial = await page.evaluate(() => ({
  dashboardAtivo: document.getElementById('page-dashboard')?.classList.contains('active'),
  painelAtivo: document.getElementById('page-painel')?.classList.contains('active'),
}));
checa(viewInicial.dashboardAtivo, 'FALHA 1a: page-dashboard NÃO está ativo no boot');
checa(!viewInicial.painelAtivo, 'FALHA 1b: page-painel ainda está ativo no boot (deveria estar inativo)');

// ─────────────────────────────────────────────────────────────────
// TESTE 2: debounce setCob — renderCobranca NÃO dispara de imediato
// ─────────────────────────────────────────────────────────────────
const debounceCobranca = await page.evaluate(async () => {
  let renders = 0;
  const orig = window.renderCobranca;
  window.renderCobranca = () => { renders++; if (orig) orig(); };

  // simula 5 keystrokes rápidos (< 400ms entre eles)
  setCob('cli-x', 'resp', 'a');
  setCob('cli-x', 'resp', 'ab');
  setCob('cli-x', 'resp', 'abc');
  setCob('cli-x', 'resp', 'abcd');
  setCob('cli-x', 'resp', 'abcde');

  const rendersImediatos = renders;

  // aguarda o debounce disparar
  await new Promise(r => setTimeout(r, 600));
  const rendersApos = renders;

  window.renderCobranca = orig;
  return { rendersImediatos, rendersApos };
});
checa(debounceCobranca.rendersImediatos === 0, `FALHA 2a: renderCobranca disparou ${debounceCobranca.rendersImediatos}x de imediato (esperado 0 — debounce não está funcionando)`);
checa(debounceCobranca.rendersApos === 1, `FALHA 2b: renderCobranca disparou ${debounceCobranca.rendersApos}x após debounce (esperado 1)`);

// ─────────────────────────────────────────────────────────────────
// TESTE 3: debounce setAcerto — renderAcerto NÃO dispara de imediato
// ─────────────────────────────────────────────────────────────────
const debounceAcerto = await page.evaluate(async () => {
  let renders = 0;
  const orig = window.renderAcerto;
  window.renderAcerto = () => { renders++; if (orig) orig(); };

  setAcerto('eq-x', 'nome', 'L');
  setAcerto('eq-x', 'nome', 'Lu');
  setAcerto('eq-x', 'nome', 'Luc');

  const rendersImediatos = renders;
  await new Promise(r => setTimeout(r, 600));
  const rendersApos = renders;

  window.renderAcerto = orig;
  return { rendersImediatos, rendersApos };
});
checa(debounceAcerto.rendersImediatos === 0, `FALHA 3a: renderAcerto disparou ${debounceAcerto.rendersImediatos}x de imediato (esperado 0)`);
checa(debounceAcerto.rendersApos === 1, `FALHA 3b: renderAcerto disparou ${debounceAcerto.rendersApos}x após debounce (esperado 1)`);

// ─────────────────────────────────────────────────────────────────
// TESTE 4: acrecSave chama cloudSave com 'wfa-acertosrec'
// ─────────────────────────────────────────────────────────────────
const cloudSaveChamado = await page.evaluate(() => {
  let chamadas = [];
  const orig = window.cloudSave;
  window.cloudSave = (key, val) => { chamadas.push(key); if (orig) orig(key, val); };

  acrecSave({ 'item-x': { enviadoYm: '2026-07' } });

  window.cloudSave = orig;
  return chamadas;
});
checa(cloudSaveChamado.includes('wfa-acertosrec'), `FALHA 4: acrecSave NÃO chamou cloudSave com 'wfa-acertosrec' (chamou: ${JSON.stringify(cloudSaveChamado)})`);

// ─────────────────────────────────────────────────────────────────
// TESTE 5a: soft-delete — tarefa sobrevive enquanto pending (< 3s)
// ─────────────────────────────────────────────────────────────────
const softDeletePending = await page.evaluate(() => {
  // garante que a tarefa está no state
  if (!state.tarefas.find(t => t.id === 'del-test-1')) {
    state.tarefas.push({ id: 'del-test-1', title: 'Tarefa para soft-delete', resp: 'Gabriel', data: '', prio: 'media', status: 'backlog', tags: [], checklist: [] });
  }
  delTask('del-test-1');
  const aindaExiste = !!state.tarefas.find(t => t.id === 'del-test-1');
  const pendente = _delPending.has('del-test-1');
  return { aindaExiste, pendente };
});
checa(softDeletePending.aindaExiste, 'FALHA 5a: delTask removeu a tarefa imediatamente (soft-delete não está funcionando)');
checa(softDeletePending.pendente, 'FALHA 5b: _delPending não registrou a tarefa como pendente');

// ─────────────────────────────────────────────────────────────────
// TESTE 5b: soft-delete — tap no cartão cancela a exclusão
// ─────────────────────────────────────────────────────────────────
const softDeleteCancelado = await page.evaluate(() => {
  // chama delTask novamente no mesmo id = cancela
  delTask('del-test-1');
  const aindaExiste = !!state.tarefas.find(t => t.id === 'del-test-1');
  const pendente = _delPending.has('del-test-1');
  return { aindaExiste, pendente };
});
checa(softDeleteCancelado.aindaExiste, 'FALHA 5c: cancelar o soft-delete removeu a tarefa mesmo assim');
checa(!softDeleteCancelado.pendente, 'FALHA 5d: _delPending ainda tem a tarefa após cancelamento');

// ─────────────────────────────────────────────────────────────────
// TESTE 5c: soft-delete — após 3s a tarefa some de verdade
// ─────────────────────────────────────────────────────────────────
await page.evaluate(() => {
  // reinicia o pending (estava cancelado no teste anterior)
  if (!state.tarefas.find(t => t.id === 'del-test-1')) {
    state.tarefas.push({ id: 'del-test-1', title: 'Tarefa para soft-delete', resp: 'Gabriel', data: '', prio: 'media', status: 'backlog', tags: [], checklist: [] });
  }
  delTask('del-test-1');
});
await page.waitForTimeout(3500); // espera o setTimeout de 3000ms disparar
const aposTimeout = await page.evaluate(() => ({
  existe: !!state.tarefas.find(t => t.id === 'del-test-1'),
  pendente: _delPending.has('del-test-1'),
}));
checa(!aposTimeout.existe, 'FALHA 5e: tarefa ainda existe após 3s (delete real não executou)');
checa(!aposTimeout.pendente, 'FALHA 5f: _delPending ainda tem a entrada após o delete real');

await browser.close();

if (falhas.length) {
  console.error('TESTE FIXES JUL-23 FALHOU:');
  for (const f of falhas) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log('OK: (1) view inicial = Meu Dia, (2) debounce setCob, (3) debounce setAcerto, (4) acrecSave cloudSave, (5a-c) soft-delete tarefa com cancel e execução real após 3s.');
