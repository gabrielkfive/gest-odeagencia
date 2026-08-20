/*
 Teste de fumaca da GUARDA DE SESSAO do workflowark.html.

 Nasceu da pendencia de seguranca aberta em 27/07 e fechada em 20/08: o arquivo e
 estatico em /public, entao abrir a URL direto pintava o painel inteiro a partir das
 chaves wfa-* do localStorage, sem login. O signOut do app pai limpava a sessao do
 Supabase mas nao limpava esse cache, entao os dados continuavam na tela depois de sair.

 O que este teste garante:
   1. SEM sessao: o app nao renderiza e o cache wfa-* e apagado do aparelho.
   2. COM sessao: o app renderiza normalmente (a guarda nao pode barrar quem tem login).

 Uso:
   node deploy/teste-guarda-sessao.mjs
   node deploy/teste-guarda-sessao.mjs https://URL/workflowark.html
*/
import { chromium } from 'playwright-core';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import path from 'path';

// SERVIDOR LOCAL: o teste NAO pode rodar em file://. A guarda manda pro /auth e, sob
// file://, a pagina cai numa origem opaca onde o localStorage estoura, entao nao da pra
// conferir se o cache foi mesmo apagado. Servindo por http a origem continua a mesma.
let servidor = null;
async function sobeServidor() {
  const html = await readFile(path.resolve('public/workflowark.html'));
  servidor = createServer((req, res) => {
    if (req.url && req.url.startsWith('/auth')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><title>login</title><p>tela de login</p>');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  return 'http://127.0.0.1:' + servidor.address().port + '/workflowark.html';
}

const alvo = process.argv[2] ? process.argv[2] : await sobeServidor();

const SB_KEY = 'sb-fxfnonozzekxnxddxsnh-auth-token';
const falhas = [];
const checa = (cond, msg) => { if (!cond) falhas.push(msg); };

function sessaoValida() {
  return JSON.stringify({
    access_token: 'teste-local',
    refresh_token: 'teste-local',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
  });
}

async function abre(semearSessao) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript((args) => {
    try {
      // SEMEIA UMA VEZ SO. addInitScript roda em TODA navegacao, inclusive no redirect
      // pro /auth que a guarda dispara. Sem esta trava, o cache era re-semeado DEPOIS da
      // limpeza e o teste acusava sobra que nao existe de verdade.
      if (sessionStorage.getItem('teste-semeado')) return;
      sessionStorage.setItem('teste-semeado', '1');
      // Cache de estado como se o aparelho ja tivesse sido usado logado.
      // Chaves que SINCRONIZAM: tem que sumir sem sessao (voltam da nuvem no proximo login).
      localStorage.setItem('wfa-cobranca', JSON.stringify([{ cliente: 'SIGILOSO', valor: 9999 }]));
      localStorage.setItem('wfa-crm', JSON.stringify([{ lead: 'SIGILOSO' }]));
      localStorage.setItem('wfa-tarefas', JSON.stringify([{ titulo: 'SIGILOSO' }]));
      // Chaves SO LOCAIS: tem que SOBREVIVER. Elas nao existem na nuvem, entao apagar seria
      // perda definitiva do trabalho, e bastava a sessao expirar da noite pro dia.
      localStorage.setItem('wfa-allhands', JSON.stringify({ nota: 'NARRACAO DO GABRIEL' }));
      localStorage.setItem('wfa-rotina-checks', JSON.stringify({ '2026-08-20': { conteudo: [1, 2] } }));
      localStorage.setItem('wfa-cons-chat-vivenda', JSON.stringify([{ m: 'historico do conselho' }]));
      // A lista que a guarda usa pra saber o que pode apagar, publicada pelo proprio app.
      localStorage.setItem('wfa-sync-keys', JSON.stringify(['wfa-cobranca', 'wfa-crm', 'wfa-tarefas']));
      if (args.semear) localStorage.setItem(args.chave, args.sessao);
      else localStorage.removeItem(args.chave);
    } catch (e) {}
  }, { semear: semearSessao, chave: SB_KEY, sessao: sessaoValida() });

  await page.goto(alvo);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const leu = (k) => { try { return localStorage.getItem(k); } catch (e) { return '?'; } };
    const side = document.querySelector('.side');
    return {
      sincronizadasRestantes: ['wfa-cobranca', 'wfa-crm', 'wfa-tarefas'].filter((k) => leu(k)),
      locaisPerdidas: ['wfa-allhands', 'wfa-rotina-checks', 'wfa-cons-chat-vivenda'].filter((k) => !leu(k)),
      renderizou: !!side,
      visivel: document.documentElement.style.visibility !== 'hidden',
      url: location.href,
    };
  });
  await browser.close();
  return r;
}

const sem = await abre(false);
checa(!sem.renderizou || !sem.visivel, 'SEM SESSAO: o painel apareceu, a guarda nao barrou');
checa(
  sem.sincronizadasRestantes.length === 0,
  `SEM SESSAO: cache sincronizado nao foi limpo, sobrou: ${sem.sincronizadasRestantes.join(', ')}`,
);
checa(
  sem.locaisPerdidas.length === 0,
  `SEM SESSAO: PERDA DE DADO. Chave que so existe no aparelho foi apagada e nao volta da nuvem: ${sem.locaisPerdidas.join(', ')}`,
);

const com = await abre(true);
checa(com.renderizou, 'COM SESSAO: o painel NAO renderizou, a guarda barrou quem tem login');
checa(com.visivel, 'COM SESSAO: a pagina ficou escondida');

if (servidor) servidor.close();

if (falhas.length) {
  console.log('TESTE DA GUARDA DE SESSAO FALHOU:');
  falhas.forEach((f) => console.log(' - ' + f));
  process.exit(1);
}
console.log('OK: sem sessao o painel nao abre, o cache sincronizado e limpo, o dado so-local sobrevive; com sessao o app renderiza normal.');
