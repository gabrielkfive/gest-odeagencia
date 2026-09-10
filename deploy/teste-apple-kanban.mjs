/*
 Kanban de Atividades no shape de app (revisao Apple, 10/09/2026), no navegador, com
 servidor local e rede externa bloqueada (deploy/apple-review-ambiente.mjs).

 Prova, em 390, 430 e 1440 px e nos dois temas:
   1. a pagina nao rola de lado e a barra de ferramentas nao se sobrepoe ao titulo;
   2. o quadro nasce dentro da tela (a barra compacta nao empurra o Kanban pra baixo da dobra);
   3. no celular os filtros abrem pelo botao e o botao conta quantos estao ativos;
   4. o cartao abre pelo teclado (Enter) e Esc fecha gravando o autosave pendente;
   5. o detalhe cabe na tela e no celular rola numa area so;
   6. mover com o mouse persiste depois de recarregar e de trocar de aba;
   7. o cronometro corre no cartao e no detalhe;
   8. "Mais" chama as acoes raras e volta pro rotulo;
   9. nenhum erro de JS fora do ruido de rede bloqueada.

 Uso: node deploy/teste-apple-kanban.mjs            # public/ deste checkout
      node deploy/teste-apple-kanban.mjs <pasta>    # outra pasta public (ex.: build do HEAD, pra provar que o teste reprova a versao antiga)
*/
import { chromium } from 'playwright-core';
import path from 'path';
import { servidorLocal, bloqueiaRedeExterna, SEMENTE, semear } from './apple-review-ambiente.mjs';

const raiz = path.resolve(process.argv[2] || 'public');
const falhas = [];
const ok = [];
const checa = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));
setTimeout(() => { console.log('WATCHDOG: o teste travou (240s)'); process.exit(2); }, 240000).unref();

const RUIDO = /Failed to fetch|Load failed|net::ERR|CORS|blocked|NetworkError/i;
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

const srv = await servidorLocal(raiz);
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const larguras = [
  { w: 1440, h: 900, nome: '1440' },
  { w: 430, h: 932, nome: '430', mobile: true },
  { w: 390, h: 844, nome: '390', mobile: true },
];

for (const tema of ['light', 'dark']) {
  for (const L of larguras) {
    const rot = `[${tema} ${L.nome}]`;
    const ctx = await browser.newContext({ viewport: { width: L.w, height: L.h }, isMobile: !!L.mobile, hasTouch: !!L.mobile, colorScheme: tema });
    await bloqueiaRedeExterna(ctx);
    await ctx.addInitScript(semear, { ...SEMENTE, tema });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));
    const abre = async () => {
      await page.goto(srv.url + '/workflowark.html', { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
      await page.waitForTimeout(600);
    };
    await abre();

    // 1. sem rolagem lateral, sem sobreposicao na barra
    const geo = await page.evaluate(() => {
      const pg = document.getElementById('page-tarefas'), view = document.getElementById('view');
      const h1 = pg.querySelector('.page-title h1'), ac = pg.querySelector('.tf-acoes'), board = document.getElementById('task-board');
      const r = (el) => el ? el.getBoundingClientRect() : null;
      return {
        docW: document.documentElement.scrollWidth, innerW: innerWidth,
        viewOver: view ? view.scrollWidth - view.clientWidth : 0,
        pgOver: pg.scrollWidth - pg.clientWidth,
        h1: r(h1), ac: r(ac), board: r(board), temAcoes: !!ac,
        temaEscuro: document.body.classList.contains('aura-dark'),
      };
    });
    checa(geo.temAcoes, `${rot} barra de ferramentas compacta presente (.tf-acoes)`);
    checa(geo.docW <= geo.innerW + 1 && geo.viewOver <= 1 && geo.pgOver <= 1, `${rot} pagina sem rolagem lateral (doc ${geo.docW}/${geo.innerW}, view +${geo.viewOver}, pagina +${geo.pgOver})`);
    if (geo.h1 && geo.ac) checa(geo.h1.right <= geo.ac.left + 1, `${rot} titulo nao invade as acoes (h1 ate ${Math.round(geo.h1.right)}, acoes desde ${Math.round(geo.ac.left)})`);
    checa(geo.temaEscuro === (tema === 'dark'), `${rot} tema aplicado (${geo.temaEscuro ? 'escuro' : 'claro'})`);
    // 2. quadro dentro da tela
    checa(geo.board && geo.board.top < L.h * 0.6, `${rot} quadro comeca na primeira dobra (topo em ${geo.board ? Math.round(geo.board.top) : '?'} px de ${L.h})`);
    // cartoes sem chip de prioridade solto e com titulo primeiro
    const card = await page.evaluate(() => {
      const c = document.querySelector('.task-card[data-tid="t-capa"]'); if (!c) return null;
      const chips = c.querySelectorAll('.tc-chips').length, prio = c.querySelector('.tc-prio'), t = c.querySelector('.tc-title');
      const primeiroTexto = [...c.children].find((el) => (el.textContent || '').trim() && !el.classList.contains('tc-capa') && !el.classList.contains('tc-kebab'));
      return { chips, prio: prio ? prio.textContent : '', tituloPrimeiro: primeiroTexto === t, run: !!c.querySelector('.tc-badge.run'), foco: c.getAttribute('tabindex') };
    });
    checa(card && card.chips === 0 && card.tituloPrimeiro, `${rot} cartao: titulo vem primeiro e nao ha fileira de chips no topo`);
    checa(card && card.prio === 'Alta', `${rot} cartao: prioridade alta como acento discreto no rodape`);
    checa(card && card.run, `${rot} cartao: relogio correndo aparece (.tc-badge.run)`);
    checa(card && card.foco === '0', `${rot} cartao: focavel pelo teclado`);

    // 3. filtros no celular
    if (L.mobile) {
      const f = await page.evaluate(() => {
        const bar = document.getElementById('tf-filtros'), btn = document.getElementById('tf-filtros-btn');
        const antes = bar ? getComputedStyle(bar).display : 'x';
        btn && btn.click();
        const depois = bar ? getComputedStyle(bar).display : 'x';
        const sel = document.getElementById('filt-prio'); sel.value = 'alta'; aplicarFiltros();
        const n = document.getElementById('tf-filtros-n');
        const badge = n ? n.textContent : '', tem = btn ? btn.classList.contains('tem') : false;
        const visiveis = [...document.querySelectorAll('#task-board .task-card')].map((c) => c.dataset.tid);
        sel.value = ''; aplicarFiltros();
        const badge2 = n ? n.textContent : '', tem2 = btn ? btn.classList.contains('tem') : false;
        btn && btn.click();
        const fechado = bar ? getComputedStyle(bar).display : 'x';
        return { antes, depois, badge, tem, badge2, tem2, visiveis, fechado };
      });
      checa(f.antes === 'none' && f.depois === 'flex' && f.fechado === 'none', `${rot} filtros comecam escondidos, abrem e fecham pelo botao (${f.antes} > ${f.depois} > ${f.fechado})`);
      checa(f.badge === '1' && f.tem && f.badge2 === '0' && !f.tem2, `${rot} botao Filtros conta os ativos (${f.badge} com filtro, ${f.badge2} sem)`);
      checa(f.visiveis.every((id) => ['t-capa', 't6', 't8'].includes(id)) && f.visiveis.length === 3, `${rot} filtro de prioridade continua filtrando (${f.visiveis.join(',')})`);
    }

    // 8. "Mais" chama as acoes raras (com stub, pra nao abrir confirmacao)
    const mais = await page.evaluate(() => {
      let chamou = ''; const orig = window.adiarAtrasadas; window.adiarAtrasadas = () => { chamou = 'adiar'; };
      const sel = document.getElementById('tf-mais'); if (!sel) return { chamou: 'sem select' };
      sel.value = 'adiar'; sel.dispatchEvent(new Event('change', { bubbles: true }));
      const volta = sel.value; window.adiarAtrasadas = orig;
      return { chamou, volta, opcoes: [...sel.options].map((o) => o.value).join(',') };
    });
    checa(mais.chamou === 'adiar' && mais.volta === '', `${rot} "Mais" chama Adiar atrasadas e volta pro rotulo (opcoes: ${mais.opcoes})`);

    // 4. teclado: Enter abre, Esc fecha gravando
    await page.evaluate(() => { const c = document.querySelector('.task-card[data-tid="t2"]'); c.focus(); c.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
    await page.waitForTimeout(500);
    const abriu = await page.evaluate(() => { const m = document.getElementById('pj-modal'); const f = m && m.querySelector('.pj-f'); return { on: !!m && m.style.display !== 'none' && !!document.getElementById('tk-t'), role: f ? f.getAttribute('role') : '' }; });
    checa(abriu.on && abriu.role === 'dialog', `${rot} Enter no cartao abre o detalhe como dialogo`);
    // 5. detalhe cabe na tela
    if (!abriu.on) await page.evaluate(() => openTaskDetail('t2')); // versao antiga sem Enter: abre pelo clique pra seguir medindo
    await page.waitForTimeout(400);
    const mod = await page.evaluate(() => {
      const f = document.querySelector('#pj-modal .pj-f'), w = f && f.querySelector('.tkwrap'), main = f && f.querySelector('.tkmain');
      if (!f || !w || !main) return { dentro: false, largura: 0, wrapOver: 0, mainOverflow: 'sem modal', wrapOverflow: 'sem modal' };
      const r = f.getBoundingClientRect();
      return { dentro: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1, largura: Math.round(r.width), wrapOver: w.scrollWidth - w.clientWidth, mainOverflow: getComputedStyle(main).overflowY, wrapOverflow: getComputedStyle(w).overflowY };
    });
    checa(mod.dentro && mod.wrapOver <= 1, `${rot} detalhe cabe na tela (${mod.largura}px, sem rolagem lateral)`);
    if (L.mobile) checa(mod.mainOverflow === 'visible' && /auto|scroll/.test(mod.wrapOverflow), `${rot} celular: o detalhe rola numa area so (main ${mod.mainOverflow}, wrap ${mod.wrapOverflow})`);
    // etiquetas fechadas por padrao: so as ligadas e o "+ etiqueta"; abre ao clicar (10/09/2026, pedido do Gabriel)
    const et = await page.evaluate(() => {
      const box = document.getElementById('tk-papeis'); if (!box) return { sem: true };
      const antes = !!box.querySelector('.tkpp-lista'), tg = box.querySelector('[data-pptoggle]');
      tg && tg.click();
      const depois = !!box.querySelector('.tkpp-lista');
      const nomes = [...box.querySelectorAll('.tkpp-lista [data-pp]')].map((b) => b.textContent.trim());
      const minusc = nomes.filter((n) => n && n[0] !== n[0].toUpperCase());
      box.querySelector('[data-pptoggle]').click();
      return { antes, depois, fechou: !box.querySelector('.tkpp-lista'), total: nomes.length, minusc };
    });
    checa(!et.sem && !et.antes && et.depois && et.fechou && et.total > 0 && et.minusc.length === 0, `${rot} etiquetas fechadas por padrao, abrem no clique e vem com inicial maiuscula (${et.total} no catalogo, minusculas: ${(et.minusc || []).join(',') || 'nenhuma'})`);
    await page.evaluate(() => { const i = document.getElementById('tk-t'); i.value = 'Relatório semanal v2'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(100);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const fechou = await page.evaluate(() => ({ fechado: document.getElementById('pj-modal').style.display === 'none', titulo: (state.tarefas.find((t) => t.id === 't2') || {}).title }));
    checa(fechou.fechado && fechou.titulo === 'Relatório semanal v2', `${rot} Esc fecha o detalhe e grava o pendente (titulo: "${fechou.titulo}")`);

    // 7. cronometro no detalhe anda (t3 tem 20 min, entao o mostrador ainda exibe segundos)
    await page.evaluate(() => openTaskDetail('t3'));
    await page.waitForTimeout(300);
    await page.evaluate(() => { const b = document.querySelector('#pj-modal [data-tktimer]'); b && b.click(); });
    const g1 = await page.evaluate(() => (document.getElementById('tk-gasto') || {}).textContent);
    await page.waitForTimeout(2200);
    const g2 = await page.evaluate(() => ({ txt: (document.getElementById('tk-gasto') || {}).textContent, ligado: !!(state.tarefas.find((t) => t.id === 't3') || {}).timerSince }));
    checa(g1 && g2.txt && g1 !== g2.txt && g2.ligado, `${rot} cronometro anda no detalhe e persiste na hora (${g1} > ${g2.txt}, timerSince ${g2.ligado ? 'gravado' : 'ausente'})`);
    await page.evaluate(() => { const b = document.querySelector('#pj-modal [data-tktimer]'); b && b.click(); });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 6. mover persiste apos recarregar e apos trocar de aba (so no desktop, o mouse e o caminho de la)
    if (!L.mobile) {
      checa((await page.evaluate(ARRASTA, { idCartao: 't3', destino: 'andamento' })) === '', `${rot} arrasto t3 para Em andamento executou`);
      await page.waitForTimeout(300);
      await page.evaluate(() => { const n = document.querySelector('[data-nav="projetos"]'); n && n.click(); }); await page.waitForTimeout(400);
      await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(400);
      const naTela = await page.evaluate(() => [...document.querySelectorAll('.task-list[data-list="andamento"] .task-card')].map((c) => c.dataset.tid));
      checa(naTela.includes('t3'), `${rot} trocar de aba e voltar: t3 segue em Em andamento`);
      await page.reload(); await page.waitForTimeout(3000);
      await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); }); await page.waitForTimeout(500);
      const dep = await page.evaluate(() => ({ st: (state.tarefas.find((t) => t.id === 't3') || {}).status, tela: [...document.querySelectorAll('.task-list[data-list="andamento"] .task-card')].map((c) => c.dataset.tid) }));
      checa(dep.st === 'andamento' && dep.tela.includes('t3'), `${rot} depois de recarregar: t3 continua em Em andamento`);
      const badge = await page.evaluate(() => (document.getElementById('sync-status') || {}).textContent || '');
      checa(/Salvando|Salvo|Não salvou/.test(badge), `${rot} indicador de gravacao visivel na barra (badge: "${badge}")`);
    }

    for (const e of [...new Set(erros)]) if (!RUIDO.test(e)) falhas.push(`${rot} erro de JS: ${e}`);
    await ctx.close();
  }
}
await browser.close();
srv.fecha();

console.log('Raiz:', raiz, '\n=== PASSOU ===');
for (const o of ok) console.log('  ok  ' + o);
if (falhas.length) { console.log('\n=== FALHOU ==='); for (const f of falhas) console.log('  X   ' + f); process.exit(1); }
console.log(`\nTudo certo: ${ok.length} verificacoes em 3 larguras e 2 temas.`);
