/*
 Teste do All Hands de fechamento de setembro/2026.

 Abre o app local com dados de exemplo (ou com o dump real passado em ALLHANDS_DADOS),
 confere que a contagem de entregas ao vivo bate com a regra do painel de metricas
 (Kanban por concluidaEm + Projetos pelo registro de conclusao no hist) e tira print
 de cada slide em deploy/prova-allhands/.

 Uso:
   node deploy/teste-allhands.mjs
   ALLHANDS_DADOS=caminho/dados.json node deploy/teste-allhands.mjs
     (dados.json = {"wfa-tarefas":[...],"wfa-projetos":[...],"wfa-agenda-events":[...]})
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const alvo = pathToFileURL(path.resolve('public/workflowark.html')).href;
const saida = path.resolve('deploy/prova-allhands');
fs.mkdirSync(saida, { recursive: true });

const exemplo = {
  'wfa-tarefas': [
    { id: 'k1', title: 'Arte no prazo', status: 'concluido', resps: ['Darman'], data: '2026-09-10', concluidaEm: '2026-09-09T12:00:00Z', clienteId: 'fercon' },
    { id: 'k2', title: 'Relatorio atrasado', status: 'concluido', resps: ['Danilo de Lima', 'Guilherme'], data: '2026-09-05', concluidaEm: '2026-09-08T12:00:00Z', clienteId: 'vivenda' },
    { id: 'k3', title: 'De agosto', status: 'concluido', resps: ['Lucas Rosi'], data: '2026-08-10', concluidaEm: '2026-08-12T12:00:00Z' },
    { id: 'k4', title: 'Aberta', status: 'andamento', resps: ['Saulo'] },
  ],
  'wfa-projetos': [
    { id: 'p1', cliente: 'Fercon', clienteId: 'fercon', tarefas: [
      { id: 'pt1', t: 'Roteiro', st: 'concluido', resps: ['Lucas Rosi'], hist: [{ em: '2026-09-20T10:00:00Z', txt: 'Lucas mudou o status para Concluído' }] },
      { id: 'pt2', t: 'Velha', st: 'concluido', resps: ['Lucas Rosi'], hist: [{ em: '2026-07-20T10:00:00Z', txt: 'mudou o status para Concluído' }] },
      { id: 'pt3', t: 'Aberta', st: 'homolog', resps: ['Darman'], hist: [] },
    ] },
  ],
};
const dados = process.env.ALLHANDS_DADOS ? JSON.parse(fs.readFileSync(process.env.ALLHANDS_DADOS, 'utf8')) : exemplo;
const esperado = process.env.ALLHANDS_DADOS ? null : { total: 3, kanban: 2, proj: 1, prazoOk: 1, prazoN: 2, trafego: 1, sucesso: 1, criacao: 1 };

const falhas = [];
const checa = (ok, msg) => { console.log((ok ? '  ok   ' : '  FALHA ') + msg); if (!ok) falhas.push(msg); };

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((d) => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    Object.entries(d).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
  } catch (e) {}
}, dados);
const page = await ctx.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));
await page.goto(alvo);
await page.waitForTimeout(3500);

const r = await page.evaluate(() => {
  const e = ahEntregasMes('2026-09');
  return { total: e.total, kanban: e.kanban, proj: e.proj, prazoOk: e.prazoOk, prazoN: e.prazoN, area: e.area, n: ahBuildSlides(false).length };
});
console.log('\nContagem de setembro', JSON.stringify(r));
if (esperado) {
  checa(r.total === esperado.total, 'total de entregas ' + r.total);
  checa(r.kanban === esperado.kanban && r.proj === esperado.proj, 'kanban e projetos separados');
  checa(r.prazoOk === esperado.prazoOk && r.prazoN === esperado.prazoN, 'pontualidade 1 de 2');
  checa(r.area['Tráfego'] === esperado.trafego, 'dois nomes da mesma área contam uma vez');
  checa(r.area['Sucesso do cliente'] === esperado.sucesso && r.area['Criação'] === esperado.criacao, 'área por responsável');
}
checa(r.n === 22, 'deck com 22 slides (' + r.n + ')');

await page.evaluate(() => {
  document.querySelectorAll('.page').forEach((x) => x.classList.remove('active'));
  document.getElementById('page-allhands')?.classList.add('active');
  renderAllhands();
});
await page.waitForTimeout(1500);
const slides = await page.$$('#allhands-stage .ahd');
checa(slides.length === r.n, 'palco renderizou todos os slides');
for (let i = 0; i < slides.length; i++) {
  await slides[i].evaluate((el) => { el.classList.add('vis'); el.scrollIntoView(); });
  await page.waitForTimeout(150);
  await slides[i].screenshot({ path: path.join(saida, 'slide-' + String(i + 1).padStart(2, '0') + '.png') });
}
const texto = await page.evaluate(() => document.getElementById('allhands-stage')?.innerText || '');
checa(!/[—–─━]/.test(texto), 'sem traço ou travessão no texto do deck');
checa(!/Agosto em uma tela|Caio e Guilherme/.test(texto), 'nada do deck de agosto sobrou');
checa(erros.length === 0, 'sem erro de página ' + erros.join(' | '));

await browser.close();
console.log(falhas.length ? '\n' + falhas.length + ' FALHA(S)' : '\nTudo certo. Prints em ' + saida);
process.exit(falhas.length ? 1 : 0);
