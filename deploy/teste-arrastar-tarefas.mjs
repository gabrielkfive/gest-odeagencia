/*
 Teste do arrastar do Kanban de Atividades, com filtro ligado, nos dois motores.

 Nasceu do bug de campo relatado pelo Gabriel em 30/08/2026: "o arrastar na aba de
 atividades buga por cliente, por funcionario, as vezes some e reaparece".

 Eram duas causas somadas, e o teste cobre as duas:
   1. O comparador de ordem nao era transitivo (ord definido contra ord nulo caia na
      prioridade). Sort assim devolve ordem DIFERENTE a cada repintada com o mesmo
      dado: o cartao parecia sumir e reaparecer em outro lugar da coluna.
   2. Ao soltar, o codigo numerava so os cartoes VISIVEIS. Com filtro por cliente ou
      por funcionario, esses numeros colidiam com os das tarefas escondidas, e a
      coluna embaralhava quando o filtro saia.

 Cobre tambem o arrasto com o dedo (iPhone e iPad), que antes nao existia: o HTML5
 drag-and-drop e de mouse e no iOS nao dispara nada.

 Uso:
   node deploy/teste-arrastar-tarefas.mjs          # arquivo local public/workflowark.html
   npm run teste:arrastar

 Requisito: npx playwright@1.61.1 install webkit (o chromium usa o Chrome instalado).
*/
import { webkit, chromium, devices } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = process.argv[2]
  ? process.argv[2]
  : pathToFileURL(path.resolve('public/workflowark.html')).href;

const falhas = [];
const ok = [];
const checa = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));

// Carteira sintetica: duas pessoas, dois clientes, ord de proposito baguncado
// (alguns nulos) pra reproduzir o comparador nao transitivo do bug.
const TAREFAS = [
  { id: 't1', title: 'Backlog Ana 1',     status: 'backlog',   resp: 'Ana',   clienteId: 'c1', prio: 'media', data: '2026-09-01', ord: 0 },
  { id: 't2', title: 'Backlog Bruno 1',   status: 'backlog',   resp: 'Bruno', clienteId: 'c2', prio: 'alta',  data: '2026-09-02', ord: 1 },
  { id: 't3', title: 'Backlog Ana 2',     status: 'backlog',   resp: 'Ana',   clienteId: 'c1', prio: 'baixa', data: '2026-09-03', ord: null },
  { id: 't4', title: 'Backlog Bruno 2',   status: 'backlog',   resp: 'Bruno', clienteId: 'c2', prio: 'media', data: '2026-09-04', ord: 3 },
  { id: 't5', title: 'Andamento Ana 1',   status: 'andamento', resp: 'Ana',   clienteId: 'c1', prio: 'media', data: '2026-09-05', ord: 0 },
  { id: 't6', title: 'Andamento Bruno 1', status: 'andamento', resp: 'Bruno', clienteId: 'c2', prio: 'media', data: '2026-09-06', ord: null },
  { id: 't7', title: 'Aprovacao Ana 1',   status: 'aprovacao', resp: 'Ana',   clienteId: 'c1', prio: 'media', data: '2026-09-07', ord: 0 },
  { id: 't8', title: 'Backlog Ana 3',     status: 'backlog',   resp: 'Ana',   clienteId: 'c1', prio: 'alta',  data: '2026-09-08', ord: null },
];

const semear = (tarefas) => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    localStorage.setItem('wfa-tarefas', JSON.stringify(tarefas));
  } catch (e) {}
};

// Arrasto com o dedo, do jeito que o aparelho faz: segura, move em passos, solta.
const ARRASTA_COM_DEDO = async (args) => {
  const { idCartao, seletorDestino, cancelar } = args;
  const disp = (el, tipo, x, y, fim) => {
    let ev;
    const dados = { identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y };
    try {
      const t = new Touch(dados);
      ev = new TouchEvent(tipo, { bubbles: true, cancelable: true, touches: fim ? [] : [t], changedTouches: [t] });
    } catch (e) {
      ev = new Event(tipo, { bubbles: true, cancelable: true });
      ev.touches = fim ? [] : [dados];
      ev.changedTouches = [dados];
    }
    el.dispatchEvent(ev);
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  const card = document.querySelector('.task-card[data-tid="' + idCartao + '"]');
  if (!card) return { erro: 'cartao nao esta na tela' };
  const destino = document.querySelector(seletorDestino);
  if (!destino) return { erro: 'coluna de destino nao encontrada' };

  // No iPhone as 4 colunas nao cabem lado a lado: sem trazer a coluna de destino pra
  // tela, o ponto de solta cai fora da viewport e elementFromPoint devolve null. Na
  // mao do usuario quem faz isso e a rolagem automatica da borda; aqui o teste
  // adianta esse passo pra medir o que importa, que e o soltar.
  if (!cancelar) { destino.scrollIntoView({ block: 'nearest', inline: 'center' }); await espera(280); }

  const rc = card.getBoundingClientRect();
  const rd = destino.getBoundingClientRect();
  const dentro = (v, max) => Math.max(8, Math.min(v, max - 8));

  const x0 = dentro(rc.left + rc.width / 2, innerWidth), y0 = dentro(rc.top + 12, innerHeight);
  disp(card, 'touchstart', x0, y0);
  await espera(320);                        // passa do tempo de segurar (200ms)

  const alvoX = cancelar ? 4 : dentro(rd.left + rd.width / 2, innerWidth);
  const alvoY = cancelar ? 4 : dentro(rd.top + 14, innerHeight);
  for (let i = 1; i <= 6; i++) {
    disp(card, 'touchmove', x0 + (alvoX - x0) * i / 6, y0 + (alvoY - y0) * i / 6);
    await espera(30);
  }
  disp(card, 'touchend', alvoX, alvoY, true);
  await espera(500);
  return { erro: null };
};

// Arrasto com MOUSE: dispara exatamente os eventos que o navegador dispara no desktop.
// E o caminho onde o bug do filtro aparecia (a coluna embaralhava ao limpar o filtro).
const ARRASTA_COM_MOUSE = (args) => {
  const { idCartao, seletorDestino } = args;
  const card = document.querySelector('.task-card[data-tid="' + idCartao + '"]');
  if (!card) return { erro: 'cartao nao esta na tela' };
  const lista = document.querySelector(seletorDestino);
  if (!lista) return { erro: 'coluna de destino nao encontrada' };
  const m = new Map();
  const dt = {
    effectAllowed: '', dropEffect: '', types: [],
    setData: (k, v) => m.set(String(k), String(v)),
    getData: (k) => m.get(String(k)) || '',
    setDragImage: () => {},
  };
  const manda = (el, tipo, y) => {
    const e = new Event(tipo, { bubbles: true, cancelable: true });
    Object.defineProperty(e, 'dataTransfer', { value: dt });
    e.clientX = 0; e.clientY = y || 0; e.relatedTarget = null;
    el.dispatchEvent(e);
  };
  const r = lista.getBoundingClientRect();
  manda(card, 'dragstart');
  manda(lista, 'dragover', r.top + 20);
  manda(lista, 'drop', r.top + 20);
  manda(card, 'dragend');
  return { erro: null };
};

const leEstado = () => {
  // taskCmp e da versao corrigida. Rodando contra uma versao antiga (controle), cai no
  // comparador que existia antes, pra dar pra comparar as duas de igual pra igual.
  const cmp = (typeof taskCmp === 'function') ? taskCmp : ((a, b) => {
    if (a.ord != null && b.ord != null && a.ord !== b.ord) return a.ord - b.ord;
    const w = { alta: 0, media: 1, baixa: 2 };
    const p = (w[a.prio] ?? 1) - (w[b.prio] ?? 1); if (p) return p;
    return String(a.data || '9999').localeCompare(String(b.data || '9999'));
  });
  const porStatus = {};
  ['backlog','andamento','aprovacao','concluido'].forEach(st => {
    porStatus[st] = state.tarefas
      .filter(t => t.status === st || (st === 'backlog' && !['backlog','andamento','aprovacao','concluido'].includes(t.status)))
      .sort(cmp)
      .map(t => ({ id: t.id, ord: t.ord }));
  });
  const naTela = {};
  document.querySelectorAll('#task-board .task-list').forEach(l => {
    naTela[l.dataset.list] = [...l.querySelectorAll('.task-card')].map(c => c.dataset.tid);
  });
  return { porStatus, naTela };
};

// Arrasto INTERROMPIDO por uma repintada no meio, que e o que a puxada da nuvem faz
// a cada poucos segundos. Reproduz o "vai e volta": o cartao ia pra coluna e voltava.
const ARRASTA_COM_REPINTADA = async (args) => {
  const { idCartao, seletorDestino } = args;
  const disp = (el, tipo, x, y, fim) => {
    let ev;
    const dados = { identifier: 1, target: el, clientX: x, clientY: y, pageX: x, pageY: y };
    try {
      const t = new Touch(dados);
      ev = new TouchEvent(tipo, { bubbles: true, cancelable: true, touches: fim ? [] : [t], changedTouches: [t] });
    } catch (e) {
      ev = new Event(tipo, { bubbles: true, cancelable: true });
      ev.touches = fim ? [] : [dados];
      ev.changedTouches = [dados];
    }
    el.dispatchEvent(ev);
  };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const card = document.querySelector('.task-card[data-tid="' + idCartao + '"]');
  if (!card) return { erro: 'cartao nao esta na tela' };
  const destino = document.querySelector(seletorDestino);
  if (!destino) return { erro: 'coluna de destino nao encontrada' };
  destino.scrollIntoView({ block: 'nearest', inline: 'center' });
  await espera(280);
  const rc = card.getBoundingClientRect(), rd = destino.getBoundingClientRect();
  const dentro = (v, max) => Math.max(8, Math.min(v, max - 8));
  const x0 = dentro(rc.left + rc.width / 2, innerWidth), y0 = dentro(rc.top + 12, innerHeight);
  const alvoX = dentro(rd.left + rd.width / 2, innerWidth), alvoY = dentro(rd.top + 14, innerHeight);

  disp(card, 'touchstart', x0, y0);
  await espera(320);
  disp(card, 'touchmove', (x0 + alvoX) / 2, (y0 + alvoY) / 2);
  await espera(60);
  renderTarefas();          // <<< a puxada da nuvem repinta bem no meio do arrasto
  await espera(60);
  disp(card, 'touchmove', alvoX, alvoY);
  await espera(60);
  disp(card, 'touchend', alvoX, alvoY, true);
  await espera(500);
  return { erro: null };
};

async function cenario(nomeMotor, motor, contexto, filtro, modo = 'toque') {
  const browser = await motor.launch({ headless: true, ...(motor === chromium ? { channel: 'chrome' } : {}) });
  const ctx = await browser.newContext(contexto);
  await ctx.addInitScript(semear, TAREFAS);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 160)));

  await page.goto(alvo);
  await page.waitForTimeout(3200);
  await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
  await page.waitForTimeout(600);

  // liga o filtro (por funcionario ou por cliente), que e onde o bug aparecia
  await page.evaluate((f) => {
    const el = document.getElementById(f.campo);
    if (el) {
      if (![...el.options].some((o) => o.value === f.valor)) el.add(new Option(f.valor, f.valor));
      el.value = f.valor;
    }
    aplicarFiltros();
  }, filtro);
  await page.waitForTimeout(400);

  const rotulo = nomeMotor + ' / ' + modo + ' / filtro ' + filtro.nome;

  const visiveis = await page.evaluate(() => [...document.querySelectorAll('.task-list[data-list="backlog"] .task-card')].map((c) => c.dataset.tid));
  checa(visiveis.length > 0 && !visiveis.includes('t2'), `[${rotulo}] filtro esconde o que e de outra pessoa ou cliente`);

  // 1. ORDEM ESTAVEL: repintar 3 vezes nao pode mudar a sequencia (o "some e reaparece")
  const seqs = [];
  for (let i = 0; i < 3; i++) {
    seqs.push(await page.evaluate(() => { renderTarefas(); return [...document.querySelectorAll('.task-list[data-list="backlog"] .task-card')].map((c) => c.dataset.tid).join(','); }));
    await page.waitForTimeout(120);
  }
  checa(seqs[0] === seqs[1] && seqs[1] === seqs[2], `[${rotulo}] ordem estavel entre repintadas (foi: ${seqs.join(' | ')})`);

  await page.evaluate(() => { window.TAREFAS_ANTES = JSON.parse(JSON.stringify(state.tarefas)); });

  // 2. ARRASTA COM O DEDO de Backlog para Em andamento
  const alvoId = visiveis[0];
  const r = modo === 'repintada'
    ? await page.evaluate(ARRASTA_COM_REPINTADA, { idCartao: alvoId, seletorDestino: '.task-list[data-list="andamento"]' })
    : modo === 'mouse'
    ? await page.evaluate(ARRASTA_COM_MOUSE, { idCartao: alvoId, seletorDestino: '.task-list[data-list="andamento"]' })
    : await page.evaluate(ARRASTA_COM_DEDO, { idCartao: alvoId, seletorDestino: '.task-list[data-list="andamento"]', cancelar: false });
  checa(!r.erro, `[${rotulo}] arrasto executou (${r.erro || 'ok'})`);

  const dep = await page.evaluate(leEstado);
  checa(dep.porStatus.andamento.some((t) => t.id === alvoId), `[${rotulo}] tarefa ${alvoId} mudou para Em andamento pelo toque`);

  // 3. ORD UNICO E SEQUENCIAL, contando tambem as tarefas ESCONDIDAS pelo filtro
  for (const st of ['backlog', 'andamento']) {
    const ords = dep.porStatus[st].map((t) => t.ord);
    checa(new Set(ords).size === ords.length, `[${rotulo}] coluna ${st} sem ord repetido (${ords.join(',')})`);
    checa(ords.every((o, i) => o === i), `[${rotulo}] coluna ${st} numerada 0..n sem buraco (${ords.join(',')})`);
  }

  // 4. Ao limpar o filtro a tela tem que bater com o estado (era aqui que embaralhava)
  await page.evaluate(() => {
    ['filt-busca', 'filt-prio', 'filt-resp', 'filt-cli', 'filt-data'].forEach((id) => { const e = document.getElementById(id); if (e) e.value = ''; });
    aplicarFiltros();
  });
  await page.waitForTimeout(300);
  const semFiltro = await page.evaluate(leEstado);
  const bate = ['backlog', 'andamento'].every((st) => (semFiltro.naTela[st] || []).join(',') === semFiltro.porStatus[st].map((t) => t.id).join(','));
  checa(bate, `[${rotulo}] ao limpar o filtro, a tela bate com o estado (tela: ${JSON.stringify(semFiltro.naTela.andamento)})`);

  // 5. ARRASTO CANCELADO: solta fora de qualquer coluna e o cartao volta pro lugar
  const alvo2 = semFiltro.naTela.backlog && semFiltro.naTela.backlog[0];
  if (alvo2 && modo === 'toque') {
    await page.evaluate(ARRASTA_COM_DEDO, { idCartao: alvo2, seletorDestino: '.task-list[data-list="andamento"]', cancelar: true });
    await page.waitForTimeout(500);
    const depoisC = await page.evaluate(leEstado);
    const continua = (depoisC.naTela.backlog || []).includes(alvo2) && depoisC.porStatus.backlog.some((t) => t.id === alvo2);
    checa(continua, `[${rotulo}] soltar fora de coluna nao move nem deixa cartao perdido na tela`);
  }

  // Rodando por file://, o app tenta falar com a API e o navegador barra por CORS.
  // Isso e do ambiente do teste, nao do sistema, entao nao conta como falha.
  const RUIDO = /access control checks|Not allowed to load local resource|Cross origin|Failed to fetch|Load failed/i;
  // 6. PUXADA VELHA: a nuvem responde com o estado de ANTES do arrasto (resposta que ja
  //    estava no ar quando a pessoa soltou). Isso nao pode desfazer o que acabou de mover.
  if (modo !== 'mouse') {
    const voltou = await page.evaluate((idAlvo) => {
      const antes = JSON.parse(JSON.stringify(TAREFAS_ANTES || []));
      if (!antes.length) return 'sem baseline';
      applyCloudState({ 'wfa-tarefas': antes });
      const t = state.tarefas.find((x) => x.id === idAlvo);
      return t ? t.status : 'sumiu';
    }, alvoId);
    checa(voltou === 'andamento', `[${rotulo}] puxada velha da nuvem nao desfaz o arrasto (ficou: ${voltou})`);
  }

  for (const e of [...new Set(erros)]) if (!RUIDO.test(e)) falhas.push(`[${rotulo}] erro de JS: ${e}`);
  await browser.close();
}

console.log('Alvo:', alvo, '\n');
const iphone = devices['iPhone 14 Pro'] || devices['iPhone 13'];
const desktopToque = { viewport: { width: 1440, height: 900 }, hasTouch: true };

await cenario('iphone-webkit', webkit, { ...iphone }, { nome: 'funcionario', campo: 'filt-resp', valor: 'Ana' });
await cenario('iphone-webkit', webkit, { ...iphone }, { nome: 'cliente', campo: 'filt-cli', valor: 'c1' });
await cenario('desktop-chrome', chromium, desktopToque, { nome: 'funcionario', campo: 'filt-resp', valor: 'Ana' });
await cenario('desktop-chrome', chromium, desktopToque, { nome: 'funcionario', campo: 'filt-resp', valor: 'Ana' }, 'mouse');
await cenario('iphone-webkit', webkit, { ...iphone }, { nome: 'funcionario', campo: 'filt-resp', valor: 'Ana' }, 'repintada');
await cenario('macbook-safari', webkit, { viewport: { width: 1440, height: 900 } }, { nome: 'cliente', campo: 'filt-cli', valor: 'c1' }, 'mouse');

console.log('=== PASSOU ===');
for (const o of ok) console.log('  ok  ' + o);
if (falhas.length) {
  console.log('\n=== FALHOU ===');
  for (const f of falhas) console.log('  X   ' + f);
  process.exit(1);
}
console.log('\nTudo certo: ordem estavel, ord unico por coluna mesmo com filtro, arrasto com o dedo funcionando e arrasto cancelado sem efeito colateral.');
