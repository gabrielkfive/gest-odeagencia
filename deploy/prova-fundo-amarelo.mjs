// Prova do fundo padrão "amarelo do login" na aba Atividades (02/10/2026).
// Servidor local, sessão falsa, rede barrada. Uso: node deploy/prova-fundo-amarelo.mjs <pasta-saida>
import { chromium } from 'playwright-core';
import path from 'node:path';
import fs from 'node:fs';
import { servidorLocal, bloqueiaRedeExterna, SEMENTE, semear } from './apple-review-ambiente.mjs';

const OUT = process.argv[2] || 'deploy';
fs.mkdirSync(OUT, { recursive: true });
const srv = await servidorLocal(path.resolve('public'));
const b = await chromium.launch({ channel: 'chrome', headless: true });
const res = {};
for (const tema of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await bloqueiaRedeExterna(ctx);
  await ctx.addInitScript(semear, { tema, tarefas: SEMENTE.tarefas, projetos: SEMENTE.projetos || [] });
  const p = await ctx.newPage();
  await p.goto(srv.url + '/workflowark.html');
  await p.waitForTimeout(3500);
  await p.evaluate(() => document.querySelector('[data-nav=tarefas]').click());
  await p.waitForTimeout(1500);
  res[tema] = await p.evaluate(() => {
    const pg = document.getElementById('page-tarefas');
    const pega = (sel) => { const e = document.querySelector(sel); return e ? getComputedStyle(e).color : null; };
    return { classe: pg.className, salvo: localStorage.getItem('wfa-quadro-fundo'), titulo: pega('#page-tarefas .page-title h1'),
      cabecalho: pega('#task-board .task-col-head h4'), contador: pega('#task-board .task-col-count'),
      cartao: pega('#task-board .task-card .tc-title') || pega('#task-board .task-card'), cartaoFundo: (() => { const e = document.querySelector('#task-board .task-card'); return e ? getComputedStyle(e).backgroundColor : null; })(),
      textos: [...document.querySelectorAll('.topbar h1, .topbar .crumbs .here, #task-board .task-col-head h4, #page-tarefas .filter-bar .form-input, #page-tarefas .filter-bar .form-select, #task-board .tc-add, #task-board .task-add, .topbar .tb-search input, #task-views .tv-btn, #task-views select')]
        .map((e) => { const r = e.getBoundingClientRect(); return { sel: e.tagName.toLowerCase() + '.' + [...e.classList].join('.'), txt: (e.value || e.placeholder || e.textContent || '').trim().slice(0, 24), cor: getComputedStyle(e).color, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((t) => t.w > 0 && t.h > 0 && t.x < 1440 && t.y < 900) };
  });
  await p.screenshot({ path: path.join(OUT, `atividades-${tema === 'light' ? 'claro' : 'escuro'}.png`) });
  await ctx.close();
}
fs.writeFileSync(path.join(OUT, 'medidas.json'), JSON.stringify(res, null, 1));
await b.close(); srv.fecha();
