/*
 Teste de fumaça da fila "Decisões de Hoje" do Meu Dia (workflowark.html).
 Simula um admin com estado real (tarefa atrasada, tarefa de hoje, plano mensal
 auto-gerado sem revisão, cliente com captações faltando) e verifica:
   1. a fila aparece com os cartões certos;
   2. a ordenação respeita a urgência (atrasada primeiro);
   3. aprovar plano cria a tarefa pro account e tira o cartão da fila;
   4. criar tarefa de captação funciona e não duplica.

 Uso: node deploy/teste-decisoes.mjs
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = pathToFileURL(path.resolve('public/workflowark.html')).href;
const falhas = [];
const checa = (cond, msg) => { if (!cond) falhas.push(msg); };

const hoje = new Date();
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const HOJE = ymd(hoje);
const ONTEM = ymd(new Date(Date.now() - 86400000));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.addInitScript(({ HOJE, ONTEM }) => {
  try {
    localStorage.setItem('wfa-theme', 'light');
    localStorage.setItem('wfa-tarefas', JSON.stringify([
      { id: 't-atrasada', title: 'Subir criativos novos do Stray', funcao: 'Gestor de Tráfego', clienteId: 'stray', resp: 'Gabriel Andrade', data: ONTEM, prio: 'alta', status: 'backlog', tags: [], checklist: [] },
      { id: 't-hoje', title: 'Editar Reels da Vivenda', funcao: 'Edição', clienteId: 'vivenda', resp: 'Gabriel Andrade', data: HOJE, prio: 'media', status: 'backlog', tags: [], checklist: [] },
    ]));
    localStorage.setItem('wfa-producao', JSON.stringify([])); // Vivenda cap=3 → gap
    localStorage.setItem('wfa-planejamento', JSON.stringify({
      fercon: { cliente: 'Fercon', periodo: 'Julho 2026', origem: 'auto-mensal',
        ideias: [{ tema: 'Prato da casa', formato: 'Reels', data: '' }], updatedAt: Date.now() },
    }));
  } catch (e) {}
}, { HOJE, ONTEM });

await page.goto(alvo);
await page.waitForTimeout(2500);

// injeta identidade de admin e roda o render direto (sem depender de login/nuvem)
await page.evaluate(() => {
  window.WFA_MEMBER = { full_name: 'Gabriel Andrade', role: 'admin' };
  window._decMotor = [];      // nuvem vazia neste teste
  window._decFila = [];
  window._decFetchTs = Date.now(); // impede fetch real
  state.tarefas = JSON.parse(localStorage.getItem('wfa-tarefas') || '[]');
  state.planejamento = JSON.parse(localStorage.getItem('wfa-planejamento') || '{}');
  mdRenderDecisoes();
});
await page.waitForTimeout(300);

// 1) a fila apareceu com os cartões esperados?
const fila = await page.evaluate(() => {
  const box = document.getElementById('md-decisoes');
  if (!box || box.style.display === 'none') return null;
  return [...box.querySelectorAll('.dec-card')].map(c => ({
    t: c.querySelector('.dec-t')?.textContent || '',
    urg: c.querySelector('.dec-urg')?.textContent || '',
  }));
});
checa(!!fila, 'bloco de Decisões não apareceu');
if (fila) {
  checa(fila.some(c => c.t.includes('Atrasada: Subir criativos')), 'cartão de tarefa ATRASADA não apareceu');
  checa(fila.some(c => c.t.includes('Hoje: Editar Reels')), 'cartão de tarefa de HOJE não apareceu');
  checa(fila.some(c => c.t.includes('Plano de Julho 2026 gerado pela IA')), 'cartão de PLANO auto-mensal não apareceu');
  checa(fila.some(c => c.t.includes('captações marcadas')), 'cartão de CAPTAÇÕES faltando não apareceu');
  // 2) ordenação: primeiro cartão tem que ser urgente e a atrasada vem antes da "hoje" (média)
  checa(fila[0] && fila[0].urg === 'urgente', 'primeiro cartão da fila não é urgente (veio: ' + (fila[0] && fila[0].urg) + ')');
  const iAtras = fila.findIndex(c => c.t.startsWith('Atrasada:'));
  const iHoje = fila.findIndex(c => c.t.startsWith('Hoje:'));
  checa(iAtras > -1 && iHoje > -1 && iAtras < iHoje, 'atrasada não veio antes da tarefa de hoje');
}

// 3) aprovar o plano: cria tarefa pro Lucas e some da fila
const aposAprovar = await page.evaluate(() => {
  decAprovarPlano('fercon');
  const temTarefa = state.tarefas.some(t => (t.title || '').includes('Enviar plano de Julho 2026 de Fercon'));
  const box = document.getElementById('md-decisoes');
  const aindaTemCard = [...box.querySelectorAll('.dec-t')].some(el => el.textContent.includes('Plano de Julho 2026'));
  return { temTarefa, aindaTemCard, revisado: !!state.planejamento.fercon.revisado };
});
checa(aposAprovar.temTarefa, 'aprovar o plano NÃO criou a tarefa pro account');
checa(!aposAprovar.aindaTemCard, 'cartão do plano continuou na fila depois de aprovado');
checa(aposAprovar.revisado, 'plano não foi marcado como revisado');

// 4) criar tarefa de captação: funciona e o cartão some (dedupe)
const aposCaptacao = await page.evaluate(() => {
  const antes = state.tarefas.length;
  decTarefaCaptacao('vivenda', 'Vivenda', 3);
  const criou = state.tarefas.length === antes + 1;
  const box = document.getElementById('md-decisoes');
  // o cartão de captação DA VIVENDA (mesmo cartão: cliente Vivenda + texto de captações)
  const aindaTemCard = [...box.querySelectorAll('.dec-card')].some(c =>
    (c.querySelector('.dec-cli')?.textContent.trim() === 'Vivenda') &&
    (c.querySelector('.dec-t')?.textContent.includes('captações marcadas')));
  return { criou, aindaTemCard };
});
checa(aposCaptacao.criou, 'criar tarefa de captação não criou a tarefa');
checa(!aposCaptacao.aindaTemCard, 'cartão de captação da Vivenda continuou na fila (dedupe falhou)');

await browser.close();

if (falhas.length) {
  console.error('TESTE DECISÕES FALHOU:');
  for (const f of falhas) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK: fila de Decisões monta os 4 tipos de cartão, ordena por urgência, aprovar plano cria tarefa e remove o cartão, captação com dedupe.');
