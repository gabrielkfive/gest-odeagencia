/*
 Prova visual do modal da tarefa (tela 4 do plano do doc 11, 28/09/2026).
 Serve public/ num servidor local, abre uma tarefa de Atividades com descricao, checklist,
 anexo, historico e comentarios, e tira captura em desktop 1440x900 (claro e escuro) e
 celular 390x844. Tambem mede se o modal cabe na tela e quantas areas de rolagem tem.

 Uso: node deploy/prova-modal-tarefa.mjs antes|depois
 Sai em deploy/prova-modal-tarefa-<rotulo>-<vista>.png
*/
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const rotulo = process.argv[2] || 'depois';
const raiz = path.resolve('public');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(raiz, p === '/' ? 'workflowark.html' : p);
  if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port + '/workflowark.html';

// Foto de teste (circulo amarelo com "G"), em data: porque a rede desta maquina e fechada.
const FOTO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#3b5bdb"/><circle cx="32" cy="25" r="12" fill="#ffd8a8"/><path d="M10 64a22 22 0 0 1 44 0z" fill="#ffd8a8"/></svg>');
const agora = Date.now();
const iso = (min) => new Date(agora - min * 60000).toISOString();
const TAREFAS = [{
  id: 't1', title: 'Roteiro dos Reels de outubro', status: 'andamento', resp: 'Ana', resps: ['Ana', 'Gabriel Andrade'],
  clienteId: 'c1', prio: 'alta', data: '2026-10-03', ini: '2026-09-28', ord: 0, funcao: 'Account Manager', tags: ['criativo'],
  desc: 'Três roteiros de 30s para os Reels da semana. Gancho nos 2 primeiros segundos, prato em close e chamada para reserva no fim.',
  checklist: [{ id: 'c1', text: 'Levantar pratos da semana com o chef', done: true }, { id: 'c2', text: 'Escrever os três roteiros', done: false }, { id: 'c3', text: 'Mandar para aprovação do cliente', done: false }],
  attachments: [{ id: 'a1', name: 'Briefing de outubro', url: 'https://exemplo.com/briefing' }],
  comments: [
    { id: 'm1', author: 'Ana', text: 'Subi o briefing, falta a lista de pratos.', at: iso(180) },
    { id: 'm2', author: 'Gabriel Andrade', text: 'Pratos confirmados, pode seguir com os roteiros.', at: iso(40) },
  ],
  hist: [{ em: iso(300), txt: 'Ana criou a tarefa' }, { em: iso(120), txt: 'Movida para Em andamento' }],
  timeSpent: 2700, timerSince: null, up: iso(40),
}];

const semear = (a) => {
  try {
    localStorage.setItem('wfa-theme', a.tema);
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local', user_metadata: { full_name: 'Gabriel Andrade', avatar_url: a.foto } },
    }));
    localStorage.setItem('wfa-tarefas', JSON.stringify(a.tarefas));
  } catch (e) {}
};

const VISTAS = [
  { nome: 'desktop-claro', tema: 'light', vp: { width: 1440, height: 900 } },
  { nome: 'desktop-escuro', tema: 'dark', vp: { width: 1440, height: 900 } },
  { nome: 'celular', tema: 'light', vp: { width: 390, height: 844 }, mobile: true },
];

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
for (const v of VISTAS) {
  const ctx = await browser.newContext({ viewport: v.vp, deviceScaleFactor: v.mobile ? 2 : 1, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  await ctx.addInitScript(semear, { tema: v.tema, foto: FOTO, tarefas: TAREFAS });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    try { if (typeof WFA_MEMBER !== 'undefined' && !WFA_MEMBER) WFA_MEMBER = { full_name: 'Gabriel Andrade', role: 'admin' }; } catch (e) {}
    try { if (!CLIENTES.find((c) => c.id === 'c1')) CLIENTES.push({ id: 'c1', nm: 'Cantina Exemplo' }); } catch (e) {}
    const n = document.querySelector('[data-nav="tarefas"]'); n && n.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => openTaskDetail('t1'));
  await page.waitForTimeout(700);
  const med = await page.evaluate(() => {
    const f = document.querySelector('#pj-modal .pj-f');
    if (!f) return { semModal: true };
    const r = f.getBoundingClientRect();
    const rolam = [...f.querySelectorAll('*')].concat([f]).filter((el) => {
      const cs = getComputedStyle(el);
      return /auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1 && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT';
    }).map((el) => (el.className || el.id || el.tagName) + ' ' + el.scrollHeight + '/' + el.clientHeight);
    const caixaAlta = [...f.querySelectorAll('*')].filter((el) => el.childElementCount === 0 && el.textContent.trim() && getComputedStyle(el).textTransform === 'uppercase').map((el) => el.textContent.trim().slice(0, 30));
    const fotos = f.querySelectorAll('#tk-feed .tkcm img').length;
    return { largura: Math.round(r.width), altura: Math.round(r.height), topo: Math.round(r.top), base: Math.round(r.bottom), rolam, caixaAlta, fotosComentario: fotos };
  });
  console.log(v.nome, JSON.stringify(med));
  await page.screenshot({ path: `deploy/prova-modal-tarefa-${rotulo}-${v.nome}.png` });
  if (v.mobile) {
    // celular: rola ate o fim para mostrar a atividade com os comentarios e o rodape
    await page.evaluate(() => { const w = document.querySelector('#pj-modal .tkwrap'); if (w) w.scrollTop = w.scrollHeight; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `deploy/prova-modal-tarefa-${rotulo}-${v.nome}-fim.png` });
  }
  await ctx.close();
}
await browser.close();
srv.close();
