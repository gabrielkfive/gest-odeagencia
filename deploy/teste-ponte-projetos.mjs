/*
 Teste da PONTE Projetos <-> Atividades <-> Jornada (pedido do Gabriel, 02/09/2026).

 Regra que ele pediu na reuniao:
   - tarefa de projeto em BACKLOG fica na Jornada do Cliente, na sprint dela;
   - tarefa de projeto fora do backlog aparece no kanban de Atividades (a iniciar,
     em andamento, homologacoes, concluido) como cartao ligado, sem copia;
   - arrastar la move no projeto; abrir la abre o mesmo detalhe do projeto;
   - botao "Remover duplicadas" junta cartao repetido;
   - estimativa em horas + minutos (0,5h vira 30min);
   - busca por nome no seletor de responsavel.

 Uso:
   node deploy/teste-ponte-projetos.mjs          # arquivo local public/workflowark.html
   node deploy/teste-ponte-projetos.mjs https://workflowark.arkcontent.workers.dev/workflowark.html
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = process.argv[2]
  ? process.argv[2]
  : pathToFileURL(path.resolve('public/workflowark.html')).href;

const falhas = [];
const ok = [];
const checa = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));

const TAREFAS = [
  // igual a pt1 do projeto (mesmo titulo, mesmo cliente): e a repetida que o botao junta
  { id: 'n1', title: 'Roteirizar 8 vídeos', status: 'andamento', resp: 'Gabriel Andrade', clienteId: 'vivenda', prio: 'media', data: '2026-09-04', criadaEm: '2026-09-01T10:00:00.000Z', horas: 2 },
  { id: 'n2', title: 'Tarefa própria do kanban', status: 'backlog', resp: 'Danilo de Lima', clienteId: 'vivenda', prio: 'alta', data: '2026-09-09', criadaEm: '2026-09-01T11:00:00.000Z' },
];
const PROJETOS = [{
  id: 'pjteste', clienteId: 'vivenda', cliente: 'Farmácia Vivenda', temp: 'gr',
  sprint: 7, sprintIni: '2026-09-01', sprintDias: 7, criadoEm: '2026-08-30', atualizadoEm: '2026-09-01', tplV: 2,
  pront: { briefing: {}, arquivos: [], senhas: [], atas: [], licoes: [] },
  tarefas: [
    { id: 'pt1', t: 'Roteirizar 8 vídeos',            st: 'iniciar',   papeis: ['rot'],    sprint: 7, venc: '2026-09-05', resp: 'Gabriel Andrade', resps: ['Gabriel Andrade'], horas: 0.5, obs: '', checklist: [], anexos: [], coments: [], hist: [] },
    { id: 'pt2', t: 'Marcar reunião de kick-off',     st: 'backlog',   papeis: ['cs'],     sprint: 7, venc: '', resp: '', resps: [], horas: '', obs: '' },
    { id: 'pt3', t: 'Fazer 15 estáticas para Google', st: 'backlog',   papeis: ['design'], sprint: 7, venc: '', resp: '', resps: [], horas: 1.2, obs: '' },
    { id: 'pt4', t: 'Editar reel da inauguração',     st: 'homolog',   papeis: ['editor'], sprint: 6, venc: '2026-09-03', resp: 'Saulo', resps: ['Saulo'], horas: 1.75, obs: '' },
    { id: 'pt5', t: 'Onboarding feito',               st: 'concluido', papeis: ['cs'],     sprint: 1, venc: '2026-08-20', resp: 'Lucas Rosi', resps: ['Lucas Rosi'], horas: '', fim: '2026-09-02', obs: '' },
  ],
}];

const semear = (d) => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    localStorage.setItem('wfa-tarefas', JSON.stringify(d.tarefas));
    localStorage.setItem('wfa-projetos', JSON.stringify(d.projetos));
    localStorage.removeItem('wfa-jornada');
  } catch (e) {}
};

// Arrasto de mouse (HTML5 drag) sintetico, igual ao do teste de arrastar.
const ARRASTA = (args) => {
  const { idCartao, seletorDestino } = args;
  const card = document.querySelector('.task-card[data-tid="' + idCartao + '"]');
  const lista = document.querySelector(seletorDestino);
  if (!card) return { erro: 'cartao nao esta na tela' };
  if (!lista) return { erro: 'coluna de destino nao encontrada' };
  const m = new Map();
  const dt = { effectAllowed: 'move', dropEffect: 'move', setData: (k, v) => m.set(String(k), String(v)), getData: (k) => m.get(String(k)) || '', setDragImage: () => {} };
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

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(semear, { tarefas: TAREFAS, projetos: PROJETOS });
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));

  await page.goto(alvo);
  await page.waitForTimeout(3200);
  await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
  await page.waitForTimeout(700);

  // 1. Cartoes ligados nas colunas certas, backlog do projeto FORA do kanban
  const cols = await page.evaluate(() => ({
    backlog: [...document.querySelectorAll('.task-list[data-list="backlog"] .task-card')].map((c) => c.dataset.tid),
    iniciar: [...document.querySelectorAll('.task-list[data-list="iniciar"] .task-card')].map((c) => c.dataset.tid),
    aprovacao: [...document.querySelectorAll('.task-list[data-list="aprovacao"] .task-card')].map((c) => c.dataset.tid),
    concluido: [...document.querySelectorAll('.task-list[data-list="concluido"] .task-card')].map((c) => c.dataset.tid),
    ctIniciar: document.getElementById('ct-iniciar').textContent,
    kpiAtivas: document.getElementById('kpi-total').textContent,
    badge: document.getElementById('tarefas-badge').textContent,
  }));
  checa(cols.iniciar.includes('pj:pjteste:pt1'), 'tarefa de projeto "A iniciar" aparece na coluna A iniciar');
  checa(cols.aprovacao.includes('pj:pjteste:pt4'), 'tarefa de projeto em Homologação aparece na coluna Homologação');
  checa(cols.concluido.includes('pj:pjteste:pt5'), 'tarefa de projeto concluída aparece em Concluído');
  checa(!cols.backlog.some((id) => id.startsWith('pj:')), 'backlog do projeto NÃO aparece no backlog de Atividades');
  checa(cols.backlog.includes('n2'), 'tarefa própria do backlog continua no backlog');
  checa(cols.ctIniciar === '1', 'contador da coluna A iniciar conta o cartão ligado (foi ' + cols.ctIniciar + ')');
  checa(cols.kpiAtivas === '4', 'KPI Ativas soma próprias + ligadas: n1, n2, pt1, pt4 = 4 (foi ' + cols.kpiAtivas + ')');
  checa(cols.badge === '4', 'badge do menu bate com o KPI (foi ' + cols.badge + ')');

  // 2. Estimativa em h + min no cartao
  const badges = await page.evaluate(() => ({
    pt1: document.querySelector('.task-card[data-tid="pj:pjteste:pt1"]').textContent,
    pt4: document.querySelector('.task-card[data-tid="pj:pjteste:pt4"]').textContent,
    n1: document.querySelector('.task-card[data-tid="n1"]').textContent,
  }));
  checa(badges.pt1.includes('30min') && !badges.pt1.includes('0.5h'), 'cartão mostra 0,5h como 30min');
  checa(badges.pt4.includes('1h 45min'), 'cartão mostra 1,75h como 1h 45min');
  checa(/⏳ 2h(?!\s*\d)/.test(badges.n1), 'cartão próprio mostra 2h');
  checa(badges.pt1.includes('Projeto') && badges.pt1.includes('sprint 07'), 'cartão ligado tem etiqueta Projeto · sprint 07');
  checa(badges.pt1.includes('Vivenda'), 'cartão ligado mostra o cliente');

  // 3. Arrastar cartao ligado: muda no PROJETO
  let r = await page.evaluate(ARRASTA, { idCartao: 'pj:pjteste:pt1', seletorDestino: '.task-list[data-list="andamento"]' });
  await page.waitForTimeout(400);
  checa(!r.erro, 'arrasto do cartão ligado executou (' + (r.erro || 'ok') + ')');
  let est = await page.evaluate(() => ({ st: JSON.parse(localStorage.getItem('wfa-projetos'))[0].tarefas.find((t) => t.id === 'pt1').st, tela: [...document.querySelectorAll('.task-list[data-list="andamento"] .task-card')].map((c) => c.dataset.tid) }));
  checa(est.st === 'andamento', 'no projeto, pt1 virou "andamento" (foi ' + est.st + ')');
  checa(est.tela.includes('pj:pjteste:pt1'), 'na tela, pt1 está na coluna Em andamento');

  // arrastar para Homologação: mapeia aprovacao -> homolog
  r = await page.evaluate(ARRASTA, { idCartao: 'pj:pjteste:pt1', seletorDestino: '.task-list[data-list="aprovacao"]' });
  await page.waitForTimeout(400);
  est = await page.evaluate(() => JSON.parse(localStorage.getItem('wfa-projetos'))[0].tarefas.find((t) => t.id === 'pt1').st);
  checa(est === 'homolog', 'Homologação de Atividades vira "homolog" no projeto (foi ' + est + ')');
  r = await page.evaluate(ARRASTA, { idCartao: 'pj:pjteste:pt1', seletorDestino: '.task-list[data-list="andamento"]' });
  await page.waitForTimeout(400);

  // arrastar pra Backlog: volta pro backlog do projeto e some do kanban
  r = await page.evaluate(ARRASTA, { idCartao: 'pj:pjteste:pt4', seletorDestino: '.task-list[data-list="backlog"]' });
  await page.waitForTimeout(400);
  est = await page.evaluate(() => ({ st: JSON.parse(localStorage.getItem('wfa-projetos'))[0].tarefas.find((t) => t.id === 'pt4').st, naTela: !!document.querySelector('.task-card[data-tid="pj:pjteste:pt4"]') }));
  checa(est.st === 'backlog', 'soltar em Backlog devolve pt4 ao backlog do projeto (foi ' + est.st + ')');
  checa(!est.naTela, 'pt4 saiu do kanban de Atividades');

  // 4. Abrir o detalhe do cartao ligado SEM trocar de aba; salvar estimativa em h+min
  await page.evaluate(() => openTaskDetail('pj:pjteste:pt1'));
  await page.waitForTimeout(300);
  const det = await page.evaluate(() => {
    const m = document.getElementById('pj-modal');
    return {
      aberto: !!m && m.style.display !== 'none',
      titulo: (document.getElementById('tk-t') || {}).value,
      h: (document.getElementById('tk-horas-h') || {}).value, min: (document.getElementById('tk-horas-m') || {}).value,
      ini: !!document.getElementById('tk-ini') && document.getElementById('tk-ini').type === 'date',
      venc: !!document.getElementById('tk-venc') && document.getElementById('tk-venc').type === 'date',
      abaAtiva: document.querySelector('.page.active') && document.querySelector('.page.active').id,
      buscaPessoa: !!document.querySelector('#pj-modal .pp-wrap input'),
    };
  });
  checa(det.aberto, 'detalhe da tarefa de projeto abriu a partir de Atividades');
  checa(det.titulo === 'Roteirizar 8 vídeos', 'detalhe mostra o título certo');
  checa(String(det.h) === '0' && String(det.min) === '30', 'detalhe mostra 0,5h como 0h 30min (foi ' + det.h + 'h ' + det.min + 'min)');
  checa(det.ini && det.venc, 'datas de início e fim são campos de calendário (type=date)');
  checa(det.abaAtiva === 'page-tarefas', 'continua na aba Atividades, não pulou pra Projetos (foi ' + det.abaAtiva + ')');
  checa(det.buscaPessoa, 'seletor "+ pessoa" do detalhe virou busca por nome');
  await page.evaluate(() => { document.getElementById('tk-horas-h').value = '1'; document.getElementById('tk-horas-m').value = '15'; document.querySelector('[data-tksave]').click(); });
  await page.waitForTimeout(400);
  est = await page.evaluate(() => JSON.parse(localStorage.getItem('wfa-projetos'))[0].tarefas.find((t) => t.id === 'pt1'));
  checa(est.horas === 1.25, 'salvou 1h 15min como 1,25h no projeto (foi ' + est.horas + ')');
  checa((est.hist || []).some((h) => /estimou em 1h 15min/.test(h.txt)), 'histórico registra "estimou em 1h 15min"');
  checa((est.hist || []).some((h) => /pela aba Atividades/.test(h.txt)), 'histórico registra a mudança de status feita pela aba Atividades');

  // 5. Detalhe da tarefa PROPRIA: campos h/min + inicio
  await page.evaluate(() => openTaskDetail('n1'));
  await page.waitForTimeout(250);
  const detN = await page.evaluate(() => ({
    h: document.getElementById('td-horas-h').value, min: document.getElementById('td-horas-m').value,
    ini: !!document.getElementById('td-ini'), cmp: document.getElementById('td-est-cmp').textContent,
    respBusca: !!document.querySelector('#modal-detail .pp-wrap input'),
    respHidden: document.getElementById('td-resp').style.display === 'none',
    respVal: document.getElementById('td-resp').value,
    respInput: document.querySelector('#modal-detail .pp-wrap input').value,
  }));
  checa(detN.h === '2' && detN.min === '0', 'detalhe próprio mostra 2h como 2h 0min');
  checa(detN.ini, 'detalhe próprio ganhou campo Início');
  checa(/Estimado 2h/.test(detN.cmp), 'detalhe próprio compara estimado x gasto (' + detN.cmp + ')');
  checa(detN.respBusca && detN.respHidden, 'responsável do detalhe próprio virou busca por nome');
  checa(detN.respVal === 'Gabriel Andrade' && detN.respInput === 'Gabriel Andrade', 'campo de busca mostra o responsável atual');
  await page.evaluate(() => { document.getElementById('td-horas-h').value = '0'; document.getElementById('td-horas-m').value = '45'; document.getElementById('td-ini').value = '2026-09-02'; saveTaskDetail(); });
  await page.waitForTimeout(300);
  est = await page.evaluate(() => state.tarefas.find((t) => t.id === 'n1'));
  checa(est.horas === 0.75 && est.ini === '2026-09-02', 'tarefa própria salvou 45min (0,75h) e início (foi ' + est.horas + ', ' + est.ini + ')');

  // 6. Busca de pessoa na Nova tarefa: digitar filtra e Enter escolhe
  await page.evaluate(() => openNovaTarefa('iniciar'));
  await page.waitForTimeout(250);
  const inp = page.locator('#modal-nova .pp-wrap input').first();
  await inp.click();
  await inp.fill('dani');
  await page.waitForTimeout(150);
  const dd = await page.evaluate(() => [...document.querySelectorAll('.pp-dd:not([hidden]) .pp-it')].map((x) => x.textContent));
  checa(dd.length >= 1 && dd.every((x) => /dani/i.test(x)), 'digitar "dani" filtra a lista para quem tem "dani" (' + dd.join(', ') + ')');
  await inp.press('Enter');
  await page.waitForTimeout(150);
  const escolhido = await page.evaluate(() => document.getElementById('nt-resp').value);
  checa(escolhido === 'Danilo de Lima', 'Enter escolhe Danilo de Lima (foi ' + escolhido + ')');
  const ntCampos = await page.evaluate(() => ({ ini: !!document.getElementById('nt-ini'), h: !!document.getElementById('nt-horas-h'), m: !!document.getElementById('nt-horas-m') }));
  checa(ntCampos.ini && ntCampos.h && ntCampos.m, 'Nova tarefa tem Início e estimativa em h/min');
  await page.evaluate(() => closeModal('modal-nova'));

  // 7. Remover duplicadas: n1 repete pt1 (mesmo titulo, mesmo cliente)
  await page.evaluate(() => { window.confirm = () => true; removerDuplicadas(); });
  await page.waitForTimeout(500);
  const dup = await page.evaluate(() => ({
    n1: !!state.tarefas.find((t) => t.id === 'n1'),
    n2: !!state.tarefas.find((t) => t.id === 'n2'),
    pt1: JSON.parse(localStorage.getItem('wfa-projetos'))[0].tarefas.find((t) => t.id === 'pt1'),
    naTela: [...document.querySelectorAll('#task-board .task-card')].map((c) => c.dataset.tid),
  }));
  checa(!dup.n1, 'tarefa própria repetida (n1) saiu');
  checa(dup.n2, 'tarefa própria sem repetição (n2) ficou');
  checa(dup.pt1 && dup.pt1.st === 'andamento', 'a do projeto ficou e continua em andamento');
  checa(!dup.naTela.includes('n1') && dup.naTela.includes('pj:pjteste:pt1'), 'na tela só sobrou o cartão do projeto');

  // 8. Vistas: Calendario/Painel/Relatorio foram para o "Mais"
  const vistas = await page.evaluate(() => ({
    more: !!document.getElementById('tv-more'),
    btnCal: !!document.querySelector('#task-views .tv-btn[data-tv="calendario"]'),
    semQaddConcluido: !document.querySelector('[data-qadd="concluido"]'),
    btnDup: !!document.querySelector('#page-tarefas button[onclick="removerDuplicadas()"]'),
  }));
  checa(vistas.more && !vistas.btnCal, 'Calendário saiu da barra e está no "Mais…"');
  checa(vistas.semQaddConcluido, 'coluna Concluído sem "+ Adicionar cartão"');
  checa(vistas.btnDup, 'botão "Remover duplicadas" no topo da aba');
  await page.evaluate(() => tarefaSetView('calendario'));
  await page.waitForTimeout(200);
  const cal = await page.evaluate(() => ({ vis: document.getElementById('task-calendario').style.display !== 'none', sel: document.getElementById('tv-more').value }));
  checa(cal.vis && cal.sel === 'calendario', 'escolher Calendário no "Mais…" abre a vista e marca o seletor');
  await page.evaluate(() => tarefaSetView('kanban'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'deploy/prova-ponte-atividades.png', fullPage: false });

  // 9. Jornada: backlog do projeto por sprint, e "puxar" para A iniciar
  await page.evaluate(() => { const n = document.querySelector('[data-nav="jornada"]'); n && n.click(); });
  await page.waitForTimeout(600);
  const jor = await page.evaluate(() => {
    const card = document.querySelector('.sprint-card[data-cli="vivenda"]');
    return { existe: !!card, sp: card && card.dataset.sp, txt: card && card.textContent };
  });
  checa(jor.existe, 'Vivenda está na Jornada');
  checa(/2 no backlog/.test(jor.txt || ''), 'card da Vivenda mostra "2 no backlog" da sprint dela (' + String(jor.txt || '').trim().replace(/\s+/g, ' ') + ')');
  await page.evaluate(() => openSprint(7, 'vivenda'));
  await page.waitForTimeout(400);
  const modal = await page.evaluate(() => ({
    pjb0: !!document.getElementById('pjb-0'), pjb1: !!document.getElementById('pjb-1'),
    pjbChecked: document.getElementById('pjb-0') && document.getElementById('pjb-0').checked,
    atv0: document.getElementById('atv-0') && document.getElementById('atv-0').checked,
    txt: document.getElementById('modal-sprint-list').textContent,
    busca: document.querySelectorAll('#modal-sprint-list .pp-wrap input').length,
  }));
  checa(modal.pjb0 && modal.pjb1, 'modal da sprint lista as 2 tarefas do backlog do projeto');
  checa(modal.pjbChecked === true, 'tarefas do projeto vêm marcadas');
  checa(modal.atv0 === false, 'sugestões padrão vêm desmarcadas quando há backlog de projeto');
  checa(/Backlog do projeto/.test(modal.txt) && /1h 12min/.test(modal.txt), 'modal mostra a seção e a estimativa 1,2h como 1h 12min');
  checa(modal.busca >= 2, 'seletores de responsável do modal têm busca por nome');
  await page.evaluate(() => {
    document.getElementById('pjb-resp-0').value = 'Danilo de Lima';
    document.getElementById('pjb-data-0').value = '2026-09-06';
    document.getElementById('pjb-1').checked = false;
    criarAtividadesSelecionadas();
  });
  await page.waitForTimeout(500);
  const pux = await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('wfa-projetos'))[0];
    return { pt2: p.tarefas.find((t) => t.id === 'pt2'), pt3: p.tarefas.find((t) => t.id === 'pt3'), proprias: state.tarefas.length };
  });
  checa(pux.pt2.st === 'iniciar' && pux.pt2.resp === 'Danilo de Lima' && pux.pt2.venc === '2026-09-06', 'pt2 foi puxada para A iniciar com responsável e prazo');
  checa(pux.pt3.st === 'backlog', 'pt3 (desmarcada) continua no backlog');
  checa(pux.proprias === 1, 'nenhuma tarefa própria nova foi criada (sugestões desmarcadas)');
  await page.evaluate(() => { const n = document.querySelector('[data-nav="tarefas"]'); n && n.click(); });
  await page.waitForTimeout(500);
  const dep = await page.evaluate(() => [...document.querySelectorAll('.task-list[data-list="iniciar"] .task-card')].map((c) => c.dataset.tid));
  checa(dep.includes('pj:pjteste:pt2'), 'pt2 apareceu em A iniciar no kanban de Atividades');
  await page.evaluate(() => { const n = document.querySelector('[data-nav="jornada"]'); n && n.click(); });
  await page.waitForTimeout(400);
  const jor2 = await page.evaluate(() => (document.querySelector('.sprint-card[data-cli="vivenda"]') || {}).textContent || '');
  checa(/1 no backlog/.test(jor2), 'card da Vivenda agora mostra "1 no backlog"');
  await page.evaluate(() => openSprint(7, 'vivenda'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'deploy/prova-ponte-jornada.png', fullPage: false });

  checa(erros.length === 0, 'sem erro de JS na página' + (erros.length ? ': ' + erros.join(' | ') : ''));

  await browser.close();

  console.log('\nPASSOU (' + ok.length + '):');
  ok.forEach((m) => console.log('  ✓ ' + m));
  if (falhas.length) {
    console.log('\nFALHOU (' + falhas.length + '):');
    falhas.forEach((m) => console.log('  ✗ ' + m));
    process.exit(1);
  }
  console.log('\nTUDO CERTO');
})().catch((e) => { console.error('ERRO NO TESTE:', e); process.exit(2); });
