/* Prova visual do tema escuro na vista Lista, contra PRODUCAO.
   Bloqueia /api/ pra que a sessao e as tarefas de mentira nunca encostem na nuvem real. */
import { chromium } from 'playwright-core';
const alvo = process.argv[2];
const saida = process.argv[3];
const tema = process.argv[4] || 'dark';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// nada de rede pro backend: o ambiente de teste fica isolado
await page.route('**/api/**', r => r.abort());

await page.addInitScript((t) => {
  const set = Storage.prototype.setItem.bind(localStorage); // setItem NATIVO, antes do patch de nuvem
  set('wfa-theme', t);
  set('wfa-current-page', 'tarefas');
  set('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
    access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
  }));
  const hoje = new Date().toISOString();
  set('wfa-tarefas', JSON.stringify([
    {id:'v1',title:'Editar Reel da inauguracao',funcao:'Edicao',resp:'Maria Luiza',data:'2026-08-26',prio:'alta',status:'andamento',criadaEm:hoje},
    {id:'v2',title:'Aprovar carrossel do cliente',funcao:'Atendimento',resp:'Samuel',data:'2026-08-25',prio:'media',status:'aprovacao',criadaEm:hoje},
    {id:'v3',title:'Roteiro do proximo mes',funcao:'Criacao',resp:'Gabriel',data:'2026-09-01',prio:'baixa',status:'backlog',criadaEm:hoje},
    {id:'v4',title:'Publicar post de quarta',funcao:'Social',resp:'Maria Luiza',data:'2026-08-20',prio:'alta',status:'concluido',concluidaEm:hoje,criadaEm:hoje},
  ]));
}, tema);

await page.goto(alvo, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
await page.evaluate(() => { document.querySelector('[data-nav="tarefas"]')?.click(); });
await page.waitForTimeout(800);
await page.evaluate(() => { if (typeof tarefaSetView === 'function') tarefaSetView('lista'); });
await page.waitForTimeout(900);

const info = await page.evaluate(() => {
  const t = document.querySelector('#page-tarefas .tl-table');
  const pill = document.querySelector('#page-tarefas .tl-pill');
  const cs = (el) => el ? getComputedStyle(el) : null;
  return {
    temaNoBody: document.body.className.includes('aura-dark') ? 'escuro' : 'claro',
    listaVisivel: !!(t && t.offsetParent !== null),
    fundoTabela: cs(t)?.backgroundColor || null,
    fundoPagina: getComputedStyle(document.body).backgroundColor,
    corPilula: pill ? cs(pill).backgroundColor + ' / texto ' + cs(pill).color : 'nenhuma pilula',
    linhas: document.querySelectorAll('#page-tarefas .tl-row').length,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: saida, fullPage: false });
await browser.close();
