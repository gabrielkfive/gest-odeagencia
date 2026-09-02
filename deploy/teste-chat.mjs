/*
 Teste do CHAT INTERNO (02/09/2026): aba Chat, Geral + grupos, nao lidas, badge no menu,
 render das mensagens (minha x dos outros, imagem, dia), modal de grupo, envio otimista.

 Roda SEM servidor: injeta o estado pelo gancho window.__chatDebug e confere a tela.
 O envio real (chat-send) e o poll (chat-poll) exigem sessao; aqui o envio falha de
 proposito e o teste confere que a mensagem fica marcada como "nao enviou".

 Uso:
   node deploy/teste-chat.mjs
   node deploy/teste-chat.mjs https://workflowark.arkcontent.workers.dev/workflowark
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = process.argv[2] ? process.argv[2] : pathToFileURL(path.resolve('public/workflowark.html')).href;
const falhas = [], ok = [];
const checa = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));

const semear = () => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    localStorage.removeItem('wfa-chat-cache');
  } catch (e) {}
};

const ESTADO = {
  eu: { id: 'm-eu', email: 'eu@ark.com', nome: 'Gabriel Andrade' },
  equipe: [
    { id: 'm-eu', email: 'eu@ark.com', full_name: 'Gabriel Andrade' },
    { id: 'm-da', email: 'danilo@ark.com', full_name: 'Danilo de Lima' },
    { id: 'm-lu', email: 'lucas@ark.com', full_name: 'Lucas Rosi' },
  ],
  canais: [{ id: 'g-edicao', nome: 'Edição', membros: ['eu@ark.com', 'danilo@ark.com'], criadoPor: 'eu@ark.com', em: '2026-09-01T10:00:00.000Z' }],
  lido: { geral: '2026-09-02T12:00:00.000Z' },
  msgs: [
    { id: 'a1', canal: 'geral', texto: 'Bom dia, time! Daily às 9h30.', anexos: [], autor: { id: 'm-eu', nome: 'Gabriel Andrade', email: 'eu@ark.com' }, em: '2026-09-02T11:30:00.000Z' },
    { id: 'a2', canal: 'geral', texto: 'Fechado. Segue o print da campanha https://ark.com/x', anexos: [{ nome: 'print.jpg', url: 'https://example.com/print.jpg', tipo: 'imagem' }], autor: { id: 'm-da', nome: 'Danilo de Lima', email: 'danilo@ark.com' }, em: '2026-09-02T12:10:00.000Z' },
    { id: 'a3', canal: 'geral', texto: 'Vi aqui, top.', anexos: [], autor: { id: 'm-lu', nome: 'Lucas Rosi', email: 'lucas@ark.com' }, em: '2026-09-02T12:11:00.000Z' },
    { id: 'b1', canal: 'g-edicao', texto: 'Reel da Vivenda tá em homologação', anexos: [], autor: { id: 'm-da', nome: 'Danilo de Lima', email: 'danilo@ark.com' }, em: '2026-09-02T12:20:00.000Z' },
  ],
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(semear);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));

  await page.goto(alvo);
  await page.waitForTimeout(3200);

  // 1. Menu tem Chat com badge; injeta estado e confere nao lidas
  const nav = await page.evaluate(() => ({ item: !!document.querySelector('[data-nav="chat"]'), badge: !!document.getElementById('chat-badge'), api: typeof __chatDebug === 'function' && typeof chatEnviar === 'function' && typeof chatNovoGrupo === 'function' }));
  checa(nav.item && nav.badge, 'menu lateral tem a aba Chat com badge');
  checa(nav.api, 'módulo do chat carregou (funções globais presentes)');
  await page.evaluate((e) => { __chatDebug(e); }, ESTADO);
  await page.waitForTimeout(150);
  const bd = await page.evaluate(() => ({ txt: document.getElementById('chat-badge').textContent, vis: document.getElementById('chat-badge').style.display !== 'none' }));
  checa(bd.vis && bd.txt === '3', 'badge soma não lidas: 2 no Geral (depois do lido) + 1 no grupo = 3 (foi ' + bd.txt + ')');

  // 2. Abre a aba: lista de canais, mensagens, minha x dos outros, imagem, link
  await page.evaluate(() => { document.querySelector('[data-nav="chat"]').click(); });
  await page.waitForTimeout(400);
  const tela = await page.evaluate(() => ({
    ativa: document.getElementById('page-chat').classList.contains('active'),
    canais: [...document.querySelectorAll('#ch-side .ch-can')].map((c) => c.dataset.canal),
    naoLidasGrupo: (document.querySelector('#ch-side .ch-can[data-canal="g-edicao"] .ch-n') || {}).textContent || '',
    msgs: document.querySelectorAll('#ch-msgs .ch-m').length,
    minhas: document.querySelectorAll('#ch-msgs .ch-m.eu').length,
    img: !!document.querySelector('#ch-msgs .ch-anxs img'),
    link: !!document.querySelector('#ch-msgs .ch-tx a[href="https://ark.com/x"]'),
    dia: document.querySelectorAll('#ch-msgs .ch-dia').length,
    head: (document.querySelector('#ch-head b') || {}).textContent,
    badgeDepois: document.getElementById('chat-badge').textContent,
  }));
  checa(tela.ativa, 'aba Chat abre');
  checa(tela.canais.join(',') === 'geral,g-edicao', 'lista mostra Geral e o grupo Edição (' + tela.canais.join(',') + ')');
  checa(tela.msgs === 3 && tela.minhas === 1, 'Geral mostra 3 mensagens, 1 minha (foi ' + tela.msgs + '/' + tela.minhas + ')');
  checa(tela.img && tela.link, 'imagem vira miniatura e link vira clicável');
  checa(tela.dia === 1, 'separador de dia aparece uma vez');
  checa(tela.head === 'Geral', 'cabeçalho mostra o canal atual');
  checa(tela.naoLidasGrupo === '1', 'grupo Edição mostra 1 não lida');
  checa(tela.badgeDepois === '1', 'abrir o Geral zera as não lidas dele; badge cai pra 1 (foi ' + tela.badgeDepois + ')');
  await page.screenshot({ path: 'deploy/prova-chat-geral.png', fullPage: false });

  // 3. Troca pro grupo: cabecalho com membros e botoes; badge zera
  await page.evaluate(() => { document.querySelector('#ch-side .ch-can[data-canal="g-edicao"]').click(); });
  await page.waitForTimeout(200);
  const gr = await page.evaluate(() => ({
    head: (document.querySelector('#ch-head b') || {}).textContent,
    membros: (document.querySelector('#ch-head span') || {}).textContent,
    btns: [...document.querySelectorAll('#ch-head .ch-head-act button')].map((b) => b.textContent),
    msgs: document.querySelectorAll('#ch-msgs .ch-m').length,
    badge: document.getElementById('chat-badge').style.display,
  }));
  checa(gr.head === 'Edição', 'cabeçalho muda para o grupo');
  checa(/Gabriel Andrade/.test(gr.membros) && /Danilo de Lima/.test(gr.membros), 'cabeçalho lista os membros pelo nome');
  checa(gr.btns.join(',') === 'Membros,Sair,Apagar', 'quem criou vê Membros, Sair e Apagar (' + gr.btns.join(',') + ')');
  checa(gr.msgs === 1, 'grupo mostra só a mensagem dele');
  checa(gr.badge === 'none', 'badge some depois de ler tudo');

  // 4. Modal de grupo: lista a equipe com quem já participa marcado
  await page.evaluate(() => chatEditarGrupo('g-edicao'));
  await page.waitForTimeout(200);
  const md = await page.evaluate(() => ({
    aberto: document.getElementById('modal-chat-grupo').classList.contains('open'),
    nome: document.getElementById('chg-nome').value,
    marcados: [...document.querySelectorAll('#chg-lista input:checked')].map((i) => i.value),
    total: document.querySelectorAll('#chg-lista input').length,
  }));
  checa(md.aberto && md.nome === 'Edição', 'modal de membros abre com o nome do grupo');
  checa(md.total === 3 && md.marcados.sort().join(',') === 'danilo@ark.com,eu@ark.com', 'equipe listada e membros atuais marcados (' + md.marcados.join(',') + ')');
  await page.evaluate(() => closeModal('modal-chat-grupo'));

  // 5. Envio otimista: Enter manda; sem servidor, fica marcada como nao enviada
  await page.evaluate(() => { document.querySelector('#ch-side .ch-can[data-canal="geral"]').click(); });
  await page.waitForTimeout(150);
  await page.fill('#ch-texto', 'Mensagem de teste');
  await page.press('#ch-texto', 'Enter');
  await page.waitForTimeout(250);
  const env = await page.evaluate(() => ({ n: document.querySelectorAll('#ch-msgs .ch-m').length, ultima: (document.querySelector('#ch-msgs .ch-m:last-child .ch-tx') || {}).textContent, vazio: document.getElementById('ch-texto').value === '' }));
  checa(env.n === 4 && env.ultima === 'Mensagem de teste' && env.vazio, 'Enter envia: mensagem aparece na hora e o campo limpa');
  await page.waitForTimeout(3500);
  const dep = await page.evaluate(() => ({ err: (document.querySelector('#ch-msgs .ch-m:last-child .ch-err') || {}).textContent || '' }));
  checa(/não enviou/.test(dep.err), 'sem servidor, a mensagem fica marcada como "não enviou" (foi "' + dep.err + '")');

  // 6. Som: botao alterna e persiste
  const som = await page.evaluate(() => { const a = document.getElementById('chat-som').textContent; chatToggleSom(); const b = document.getElementById('chat-som').textContent; const ls = localStorage.getItem('wfa-chat-som'); chatToggleSom(); return { a, b, ls }; });
  checa(/ligado/.test(som.a) && /desligado/.test(som.b) && som.ls === '0', 'botão de som alterna e grava a preferência');

  // 7. Mobile: lista primeiro, conversa depois do toque, botao voltar
  await page.setViewportSize({ width: 390, height: 780 });
  await page.waitForTimeout(200);
  await page.evaluate(() => chatVoltar());
  const mob1 = await page.evaluate(() => ({ side: getComputedStyle(document.getElementById('ch-side')).display, main: getComputedStyle(document.querySelector('#page-chat .ch-main')).display }));
  checa(mob1.side !== 'none' && mob1.main === 'none', 'no celular começa na lista de canais');
  await page.evaluate(() => { document.querySelector('#ch-side .ch-can[data-canal="geral"]').click(); });
  await page.waitForTimeout(150);
  const mob2 = await page.evaluate(() => ({ side: getComputedStyle(document.getElementById('ch-side')).display, main: getComputedStyle(document.querySelector('#page-chat .ch-main')).display, back: getComputedStyle(document.querySelector('#ch-head .ch-back')).display }));
  checa(mob2.side === 'none' && mob2.main !== 'none' && mob2.back !== 'none', 'tocar no canal abre a conversa com botão voltar');
  await page.screenshot({ path: 'deploy/prova-chat-mobile.png', fullPage: false });

  checa(erros.length === 0, 'sem erro de JS na página' + (erros.length ? ': ' + erros.join(' | ') : ''));
  await browser.close();

  console.log('\nPASSOU (' + ok.length + '):'); ok.forEach((m) => console.log('  ✓ ' + m));
  if (falhas.length) { console.log('\nFALHOU (' + falhas.length + '):'); falhas.forEach((m) => console.log('  ✗ ' + m)); process.exit(1); }
  console.log('\nTUDO CERTO');
})().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(2); });
