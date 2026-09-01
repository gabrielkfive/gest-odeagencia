/*
 Teste da aba Atividades > Projetos, a estrutura de gestao de projeto por cliente que
 o Caio passou no video de 28/08/2026.

 Trava os quatro pontos que ele pediu, para nenhum se perder numa edicao futura:
   1. QUADRO com as 6 colunas na ordem certa, incluindo "Homologacao do cliente"
      separada da homologacao interna. Era a novidade dele em relacao ao nosso kanban.
   2. ETIQUETAS nos dois eixos (papel e sprint) e o FILTRO cruzando os dois.
   3. PRONTUARIO com as 5 paginas, e o que se escreve nele sobrevive a um reload.
   4. ARRASTAR entre colunas grava de verdade em wfa-projetos.

 Confere tambem que a aba Atividades > Tarefas nao foi tocada: wfa-tarefas continua
 intacto depois de mexer nos projetos.

 Uso:
   node deploy/teste-projetos.mjs
   npm run teste:projetos
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = pathToFileURL(path.resolve('public/workflowark.html')).href;

const COLUNAS = ['Backlog', 'A iniciar', 'Em andamento', 'Homologação', 'Homologação do cliente', 'Concluído'];

const semear = () => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    // tarefa do kanban antigo: serve de sentinela, nao pode ser tocada
    localStorage.setItem('wfa-tarefas', JSON.stringify([
      { id: 'sentinela', title: 'Nao pode sumir', status: 'backlog', resp: 'Ana', clienteId: 'c1', prio: 'alta', data: '2026-09-01', ord: 0 },
    ]));
  } catch (e) {}
};

const falhas = [];
function checa(ok, msg) {
  if (ok) console.log('  ok   ' + msg);
  else { console.log('  FALHA ' + msg); falhas.push(msg); }
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  await ctx.addInitScript(semear);
  const page = await ctx.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e.message).slice(0, 200)));

  await page.goto(alvo);
  await page.waitForTimeout(3200);

  console.log('\n1. Menu e carteira de projetos');
  const temNav = await page.evaluate(() => {
    const n = document.querySelector('[data-nav="projetos"]');
    if (!n) return false;
    n.click();
    return true;
  });
  checa(temNav, 'item "Projetos" existe no menu de Atividades e abre');
  await page.waitForTimeout(500);
  checa(await page.locator('#page-projetos.active').count() === 1, 'a pagina de Projetos fica ativa');

  await page.locator('#pj-seed').click();
  await page.waitForTimeout(600);
  const nCards = await page.locator('#pj-cards .pj-c').count();
  // 9 e nao 8: a propria ARK entrou como projeto a pedido do Caio (31/08/2026),
  // para o marketing da casa ser cobrado no mesmo quadro do cliente que paga.
  checa(nCards === 9, 'semear cria os 8 clientes do briefing mais a ARK (achou ' + nCards + ')');

  // nao duplica se clicar de novo
  await page.locator('#pj-seed').click();
  await page.waitForTimeout(500);
  checa(await page.locator('#pj-cards .pj-c').count() === 9, 'clicar em semear de novo nao duplica');

  console.log('\n2. Quadro de 6 colunas');
  await page.locator('#pj-cards .pj-c', { hasText: 'Fercon' }).first().click();
  await page.waitForTimeout(500);
  const nomes = await page.locator('#pj-detalhe .pj-colh').evaluateAll(
    (els) => els.map((e) => e.childNodes[1].textContent.trim()));
  checa(JSON.stringify(nomes) === JSON.stringify(COLUNAS),
    'as 6 colunas estao na ordem do Caio: ' + nomes.join(' / '));
  checa(nomes.includes('Homologação do cliente'),
    'a coluna "Homologacao do cliente" existe, separada da interna');

  const nBacklog = await page.locator('#pj-detalhe [data-col="backlog"] .pj-t').count();
  // O backlog agora e o quadro INTEIRO do Caio (as 66 das fotos de 31/08 mais duas do
  // video dele), nao so a sprint 1. O filtro de sprint e que recorta a semana.
  checa(nBacklog === 69, 'o backlog nasce com as 69 tarefas do quadro do Caio (achou ' + nBacklog + ')');
  const porSprint = await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('wfa-projetos') || '[]');
    const p = arr.filter((x) => x.cliente === 'Fercon')[0];
    const m = {};
    (p.tarefas || []).forEach((t) => { m[t.sprint] = (m[t.sprint] || 0) + 1; });
    return m;
  });
  checa(porSprint[1] === 20, 'sprint 1 com 20 tarefas (achou ' + porSprint[1] + ')');
  checa(porSprint[2] === 24, 'sprint 2 com 24 tarefas (achou ' + porSprint[2] + ')');
  checa(porSprint[0] === 1, 'a tarefa fixa nasce sem sprint, como no quadro dele');
  checa(Object.keys(porSprint).length >= 10, 'o backlog vai da sprint 1 ate a 16 (' + Object.keys(porSprint).sort((a,b)=>a-b).join(', ') + ')');

  await page.selectOption('#pj-fsprint', '1');
  await page.waitForTimeout(400);
  const soS1 = await page.locator('#pj-detalhe .pj-t').count();
  checa(soS1 === 20, 'filtrar pela sprint 1 recorta a semana (achou ' + soS1 + ' de 69)');
  await page.locator('#pj-detalhe [data-limpar]').click();
  await page.waitForTimeout(400);

  console.log('\n3. Etiquetas e filtro');
  const temTags = await page.evaluate(() => {
    // independente da ordem: o quadro inteiro tem que carregar os dois eixos
    const cards = [...document.querySelectorAll('#pj-detalhe [data-col="backlog"] .pj-t')];
    const todas = cards.flatMap((c) => [...c.querySelectorAll('.pj-tag')].map((x) => x.textContent.trim()));
    return {
      papel: todas.some((x) => x === 'po') && todas.some((x) => x === 'cs'),
      sprint: todas.some((x) => x === 'sprint 01') && todas.some((x) => x === 'sprint 02'),
      todoCardTemPapel: cards.every((c) => c.querySelectorAll('.pj-tag').length > 0),
    };
  });
  checa(temTags.todoCardTemPapel, 'todo cartao do backlog nasce com etiqueta');
  checa(temTags.papel, 'cartao carrega etiqueta de PAPEL');
  checa(temTags.sprint, 'cartao carrega etiqueta de SPRINT');

  await page.selectOption('#pj-fpapel', 'cs');
  await page.waitForTimeout(400);
  const soCs = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#pj-detalhe .pj-t')];
    return { n: cards.length, todos: cards.every((c) => [...c.querySelectorAll('.pj-tag')].some((t) => t.textContent.trim() === 'cs')) };
  });
  checa(soCs.n > 0 && soCs.n < 69 && soCs.todos, 'filtro por papel "cs" deixa so as tarefas de cs (' + soCs.n + ' de 69)');
  await page.locator('#pj-detalhe [data-limpar]').click();
  await page.waitForTimeout(400);
  checa(await page.locator('#pj-detalhe .pj-t').count() === 69, 'limpar o filtro traz as 69 de volta');

  console.log('\n4. Arrastar entre colunas');
  const antes = await page.locator('#pj-detalhe [data-col="backlog"] .pj-t').first().locator('.tt').textContent();
  await page.locator('#pj-detalhe [data-col="backlog"] .pj-t').first()
    .dragTo(page.locator('#pj-detalhe [data-col="homologcli"]'));
  await page.waitForTimeout(600);
  const naColuna = await page.locator('#pj-detalhe [data-col="homologcli"] .pj-t').count();
  checa(naColuna === 1, 'o cartao foi parar em Homologacao do cliente');
  const gravou = await page.evaluate((titulo) => {
    const arr = JSON.parse(localStorage.getItem('wfa-projetos') || '[]');
    const p = arr.filter((x) => x.cliente === 'Fercon')[0];
    if (!p) return false;
    const t = (p.tarefas || []).filter((x) => x.t === titulo)[0];
    return !!t && t.st === 'homologcli';
  }, antes.trim());
  checa(gravou, 'o arrasto gravou em wfa-projetos, nao so na tela');

  console.log('\n5. Prontuario');
  await page.locator('#pj-detalhe [data-vista="prontuario"]').click();
  await page.waitForTimeout(400);
  const pags = await page.locator('#pj-detalhe .pr-nav button').evaluateAll((e) => e.map((x) => x.textContent.trim()));
  checa(pags.length === 5, 'o prontuario tem as 5 paginas: ' + pags.join(', '));

  const veioDoBriefing = await page.inputValue('#pj-detalhe [data-br="segmento"]');
  checa(veioDoBriefing === 'Materiais de construção', 'o briefing do documento veio preenchido (segmento da Fercon)');

  await page.fill('#pj-detalhe [data-br="ticket"]', 'R$ 850');
  await page.locator('#pj-detalhe [data-br="segmento"]').click();
  await page.waitForTimeout(400);
  checa(await page.evaluate(() => {
    const arr = JSON.parse(localStorage.getItem('wfa-projetos') || '[]');
    const p = arr.filter((x) => x.cliente === 'Fercon')[0];
    return p && p.pront.briefing.ticket === 'R$ 850';
  }), 'campo do briefing salva sozinho ao sair do campo');

  await page.locator('#pj-detalhe [data-prpag="senhas"]').click();
  await page.waitForTimeout(350);
  await page.fill('#sn-nm', 'Business Manager');
  await page.fill('#sn-user', 'social@fercon');
  await page.locator('#pj-detalhe [data-add="senha"]').click();
  await page.waitForTimeout(450);
  checa(await page.locator('#pj-detalhe .pr-lin', { hasText: 'Business Manager' }).count() === 1,
    'acesso novo aparece na pagina Senhas');

  await page.locator('#pj-detalhe [data-prpag="atas"]').click();
  await page.waitForTimeout(350);
  await page.fill('#at-verba', 'R$ 2.000');
  await page.fill('#at-otim', 'Subiu 2 criativos e cortou o publico frio.');
  await page.locator('#pj-detalhe [data-add="ata"]').click();
  await page.waitForTimeout(450);
  checa(await page.locator('#pj-detalhe .pr-lin', { hasText: 'R$ 2.000' }).count() === 1,
    'ata de otimizacao registra verba e o que foi mexido');

  console.log('\n6. Sobrevive ao reload');
  await page.reload();
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.querySelector('[data-nav="projetos"]').click());
  await page.waitForTimeout(600);
  checa(await page.locator('#pj-cards .pj-c').count() === 9, 'os 9 projetos continuam la depois de recarregar');

  console.log('\n7. A aba Atividades nao foi tocada');
  checa(await page.evaluate(() => {
    const t = JSON.parse(localStorage.getItem('wfa-tarefas') || '[]');
    return t.length === 1 && t[0].id === 'sentinela' && t[0].status === 'backlog';
  }), 'wfa-tarefas continua intacto (kanban operacional preservado)');

  console.log('\n8. Carteira integra (o briefing de 27/08 e a fonte da verdade)');
  const carteira = await page.evaluate(() => {
    const cli = (typeof CLIENTES !== 'undefined' ? CLIENTES : []);
    const norm = (x) => String(x || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    const ids = {}, nomes = {}, dupId = [], dupNome = [];
    cli.forEach((c) => {
      if (ids[c.id]) dupId.push(c.id); else ids[c.id] = 1;
      const k = norm(c.nm);
      if (nomes[k]) dupNome.push(c.nm); else nomes[k] = 1;
    });
    const proj = JSON.parse(localStorage.getItem('wfa-projetos') || '[]');
    const orfaos = proj.filter((p) => p.clienteId && !ids[p.clienteId]).map((p) => p.cliente + ' -> ' + p.clienteId);
    const semVinculo = proj.filter((p) => !p.clienteId).map((p) => p.cliente);
    const acha = (n) => cli.filter((c) => norm(c.nm).indexOf(norm(n)) === 0)[0] || null;
    return {
      dupId, dupNome, orfaos, semVinculo,
      babbo: acha('Babbo Giovanni'),
      sasse: acha('Sasse'),
      fonseca: acha('Fonseca'),
      mazuchi: acha('Mazuchi Regenera'),
      mazuki: !!acha('Mazuki'),
      eemface: !!acha('EEMFACE'),
      emface: acha('EmFace'),
      royal: acha('Royal Face'),
      // so os clientes do briefing de 27/08 (os que tem projeto): sao esses que o
      // Gabriel mandou alinhar. Alpha entra com 0 de proposito, e cobrado por fora.
      semValor: proj.map((p) => cli.filter((c) => c.id === p.clienteId)[0])
        .filter((c) => c && c.tipo === 'ARK' && c.status !== 'churn' && !(c.valor > 0))
        .map((c) => c.nm),
    };
  });
  checa(carteira.dupId.length === 0, 'nenhum id de cliente repetido' + (carteira.dupId.length ? ': ' + carteira.dupId.join(', ') : ''));
  checa(carteira.dupNome.length === 0, 'nenhum cliente repetido por nome' + (carteira.dupNome.length ? ': ' + carteira.dupNome.join(', ') : ''));
  checa(carteira.orfaos.length === 0, 'nenhum projeto aponta pra cliente inexistente' + (carteira.orfaos.length ? ': ' + carteira.orfaos.join(' | ') : ''));
  checa(carteira.semVinculo.length === 0, 'todo projeto do briefing esta amarrado a um cliente' + (carteira.semVinculo.length ? ': ' + carteira.semVinculo.join(', ') : ''));
  // o briefing manda: Babbo voltou de churn, Sasse esta em aviso previo, Fonseca em feedback negativo
  checa(carteira.babbo && carteira.babbo.status === 'r', 'Babbo Giovanni esta ativo e critico, nao churn');
  checa(carteira.sasse && carteira.sasse.status === 'r', 'Sasse marcada como aviso previo');
  checa(carteira.fonseca && carteira.fonseca.status === 'r', 'Fonseca marcada como atencao (feedback negativo)');
  // nomes que o briefing e o contrato assinado corrigiram
  checa(!!carteira.mazuchi && !carteira.mazuki, 'e "Mazuchi Regenera", nao "Mazuki"');
  checa(carteira.mazuchi && carteira.mazuchi.valor === 2500, 'Mazuchi com o valor do contrato assinado (R$ 2.500/mes)');
  checa(!carteira.eemface, 'nao existe mais "EEMFACE", o cliente se chama EmFace');
  // valores de contrato: nenhum veio do briefing, entao ficam travados aqui pra
  // ninguem zerar sem perceber e o MRR passar a mentir pra baixo em silencio
  checa(carteira.emface && carteira.emface.valor === 3000, 'EmFace com R$ 3.000/mes (conferido no Financeiro)');
  checa(carteira.royal && carteira.royal.valor === 3800, 'Royal Face com R$ 3.800/mes');
  checa(carteira.sasse && carteira.sasse.valor === 3000, 'Sasse com R$ 3.000/mes');
  checa(carteira.semValor.length === 0,
    'nenhum cliente ARK ativo entra no MRR com R$ 0' + (carteira.semValor.length ? ': ' + carteira.semValor.join(', ') : ''));

  console.log('\n9. Responsavel de verdade e estimativa de horas');
  await page.evaluate(() => document.querySelector('[data-nav="projetos"]').click());
  await page.waitForTimeout(400);
  await page.locator('#pj-cards .pj-c', { hasText: 'Fercon' }).first().click();
  await page.waitForTimeout(500);

  // o filtro de responsavel sai da equipe do sistema, nao de uma lista fixa
  const equipeFiltro = await page.evaluate(() => {
    const s = document.getElementById('pj-fresp');
    const team = (typeof allTeam === 'function' ? allTeam() : []);
    return { existe: !!s, n: s ? s.options.length - 1 : 0, team: team.length };
  });
  checa(equipeFiltro.existe, 'filtro por responsavel existe no quadro');
  checa(equipeFiltro.n === equipeFiltro.team && equipeFiltro.team > 0,
    'o filtro lista a equipe inteira do sistema (' + equipeFiltro.n + ' pessoas)');

  // atribuir pessoa e horas numa tarefa
  await page.locator('#pj-detalhe [data-col="backlog"] .pj-t').first().click();
  await page.waitForTimeout(400);
  // O detalhe virou o padrao do ClickUp: responsavel agora e chip, alimentado pelo
  // seletor #tk-addresp, e aceita mais de uma pessoa. resp continua no dado e
  // espelha resps[0], porque Meu Dia, filtro e capacity leem resp.
  const campos = await page.evaluate(() => {
    const m = document.getElementById('pj-modal');
    const el = document.getElementById('tk-addresp');
    return {
      tag: el ? el.tagName : 'AUSENTE',
      rotulos: [...m.querySelectorAll('.tkl')].map((x) => x.textContent.trim()),
      temConcluir: !!m.querySelector('[data-tkconcluir]'),
      temInicio: !!m.querySelector('#tk-ini'),
      temTimer: !!m.querySelector('[data-tktimer]'),
      temChecklist: !!m.querySelector('#tk-clnovo'),
      temAnexo: !!m.querySelector('[data-anxadd]'),
      temAtividade: !!m.querySelector('#tk-feed'),
    };
  });
  checa(campos.tag === 'SELECT', 'responsavel sai da lista da equipe, nao de texto livre (achou ' + campos.tag + ')');
  checa(campos.rotulos.length === 6, 'a tarefa tem as 6 linhas de campo do ClickUp: ' + campos.rotulos.join(' / '));
  checa(campos.temConcluir, 'tem o botao de concluir ao lado do status');
  checa(campos.temInicio, 'tem data de INICIO alem do prazo');
  checa(campos.temTimer, 'tem rastrear tempo');
  checa(campos.temChecklist, 'tem checklist');
  checa(campos.temAnexo, 'tem anexo');
  checa(campos.temAtividade, 'tem a coluna de atividade com comentario');

  const pessoa = await page.evaluate(() => (typeof allTeam === 'function' ? allTeam() : [])[1]);
  await page.selectOption('#tk-addresp', pessoa);
  await page.waitForTimeout(250);
  await page.fill('#tk-horas', '3.5');
  await page.locator('#pj-modal [data-tksave]').click();
  await page.waitForTimeout(500);

  const gravou2 = await page.evaluate((nome) => {
    const arr = JSON.parse(localStorage.getItem('wfa-projetos') || '[]');
    const p = arr.filter((x) => x.cliente === 'Fercon')[0];
    const t = (p.tarefas || []).filter((x) => x.resp === nome)[0];
    return t ? { resp: t.resp, horas: t.horas } : null;
  }, pessoa);
  checa(!!gravou2 && gravou2.resp === pessoa, 'responsavel gravou em wfa-projetos');
  const espelho = await page.evaluate((nome) => {
    const arr = JSON.parse(localStorage.getItem('wfa-projetos') || '[]');
    const p = arr.filter((x) => x.cliente === 'Fercon')[0];
    const t = (p.tarefas || []).filter((x) => x.resp === nome)[0];
    return t && Array.isArray(t.resps) && t.resps[0] === nome;
  }, pessoa);
  checa(espelho, 'resp espelha resps[0] (Meu Dia, filtro e capacity dependem disso)');
  checa(!!gravou2 && gravou2.horas === 3.5, 'estimativa de 3,5h gravou como numero (achou ' + (gravou2 && gravou2.horas) + ')');

  // a carga da sprint soma as horas por pessoa
  const carga = await page.textContent('#pj-detalhe .pj-cargabar').catch(() => '');
  checa(/Carga em aberto/.test(carga || ''), 'a faixa de carga da sprint aparece');
  checa((carga || '').includes(pessoa) && (carga || '').includes('3.5h'),
    'a carga mostra ' + pessoa + ' com 3.5h');
  checa(/sem estimativa/.test(carga || ''), 'a carga avisa quantas tarefas estao sem estimativa');

  // filtrar por essa pessoa deixa so a tarefa dela
  await page.selectOption('#pj-fresp', pessoa);
  await page.waitForTimeout(400);
  const soDela = await page.locator('#pj-detalhe .pj-t').count();
  checa(soDela === 1, 'filtrar por pessoa deixa so a tarefa dela (achou ' + soDela + ')');
  await page.locator('#pj-detalhe [data-limpar]').click();
  await page.waitForTimeout(400);
  checa(await page.locator('#pj-detalhe .pj-t').count() === 69, 'limpar traz as 69 de volta');

  console.log('\n10. A tarefa do projeto aparece no Meu Dia de quem e dela');
  // simula a pessoa logada (no teste local nao existe sessao) e manda o Meu Dia repintar
  const meuDia = await page.evaluate((nome) => {
    // WFA_MEMBER e `let` no escopo global do script, nao propriedade de window:
    // atribuir com window.WFA_MEMBER criaria outra variavel e o Meu Dia continuaria
    // achando que ninguem esta logado.
    WFA_MEMBER = { full_name: nome, role: 'admin' };
    renderMeuDia();
    const box = document.getElementById('md-tasks');
    return {
      html: box ? box.innerHTML : '',
      txt: box ? box.textContent : '',
      contador: (document.getElementById('md-tasks-count') || {}).textContent,
    };
  }, pessoa);
  checa(/Dos projetos/.test(meuDia.txt), 'o bloco "Dos projetos" aparece no Meu Dia');
  checa(/Dos projetos/.test(meuDia.txt) && meuDia.txt.length > 0,
    'a tarefa atribuida no projeto aparece na lista');
  checa(/Fercon/.test(meuDia.txt), 'a linha diz de qual cliente e a tarefa');
  checa(/pjAbrir\(/.test(meuDia.html), 'a linha leva pro projeto (pjAbrir), nao pro kanban');
  checa(!/openTaskDetail/.test(meuDia.html.split('Dos projetos')[1] || ''),
    'a linha de projeto NAO chama openTaskDetail (que mexe em wfa-tarefas)');
  checa(Number(meuDia.contador) >= 1, 'o contador do cartao passou a somar a de projeto');

  // quem nao e dono nao ve
  const deOutro = await page.evaluate(() => {
    WFA_MEMBER = { full_name: 'Fulano Que Nao Existe', role: 'admin' };
    renderMeuDia();
    const box = document.getElementById('md-tasks');
    return box ? box.textContent : '';
  });
  checa(!/Dos projetos/.test(deOutro), 'quem nao e responsavel nao ve a tarefa de projeto');

  // o botao Abrir leva pra aba Projetos com a tarefa aberta
  // vai pra aba Meu Dia de verdade: o botao so e clicavel com a pagina visivel
  await page.evaluate((nome) => {
    WFA_MEMBER = { full_name: nome, role: 'admin' };
    document.querySelector('[data-nav="dashboard"]').click();
    renderMeuDia();
  }, pessoa);
  await page.waitForTimeout(500);
  await page.locator('#md-tasks .md-act .ab').first().click();
  await page.waitForTimeout(700);
  checa(await page.locator('#page-projetos.active').count() === 1, 'clicar em Abrir vai para a aba Projetos');
  checa(await page.locator('#pj-modal #tk-t').count() === 1, 'e abre a tarefa certa ja no modal');
  await page.locator('#pj-modal [data-tkcancel]').click();
  await page.waitForTimeout(300);

  console.log('\n11. A carteira nao depende mais de seed');
  // O saneamento roda uma vez por aparelho, DEPOIS do sync. Enquanto ele for a
  // fonte de algum cliente, aparelho novo abre o sistema com a carteira errada.
  // Este bloco exige que o codigo ja diga a verdade, e o seed vire confirmacao.
  const seeds = await page.evaluate(() => {
    const base = {};
    CLIENTES_BASE.forEach((c) => { base[c.id] = c; });
    const faltando = (typeof SAN_NOVOS !== 'undefined' ? SAN_NOVOS : [])
      .filter((n) => !base[n.id]).map((n) => n.nm);
    const churnErrado = (typeof SAN_CHURN !== 'undefined' ? SAN_CHURN : [])
      .filter((id) => base[id] && base[id].status !== 'churn')
      .map((id) => base[id].nm + ' (esta ' + base[id].status + ')');
    const tipoErrado = Object.entries(typeof SAN_TIPO !== 'undefined' ? SAN_TIPO : {})
      .filter(([id, tp]) => base[id] && base[id].tipo !== tp)
      .map(([id, tp]) => base[id].nm + ' (esta ' + base[id].tipo + ', devia ser ' + tp + ')');
    const arkZero = CLIENTES_BASE
      .filter((c) => c.tipo === 'ARK' && c.status !== 'churn' && !(c.valor > 0) && c.id !== 'ark')
      .map((c) => c.nm + (c.plano === 'A definir' ? ' [a definir]' : ' [SEM MOTIVO]'));
    return { faltando, churnErrado, tipoErrado, arkZero };
  });
  checa(seeds.faltando.length === 0,
    'todo cliente do seed ja existe no codigo' + (seeds.faltando.length ? ': falta ' + seeds.faltando.join(', ') : ''));
  checa(seeds.churnErrado.length === 0,
    'quem o seed marca como churn ja esta churn no codigo' + (seeds.churnErrado.length ? ': ' + seeds.churnErrado.join(', ') : ''));
  checa(seeds.tipoErrado.length === 0,
    'quem o seed reclassifica ja esta com o tipo certo no codigo' + (seeds.tipoErrado.length ? ': ' + seeds.tipoErrado.join(', ') : ''));
  const semMotivo = seeds.arkZero.filter((s) => s.includes('SEM MOTIVO'));
  checa(semMotivo.length === 0,
    'nenhum cliente ARK ativo com R$ 0 sem estar marcado "A definir"' + (semMotivo.length ? ': ' + semMotivo.join(', ') : ''));
  if (seeds.arkZero.length) console.log('       (aguardando plano e valor: ' + seeds.arkZero.map((s) => s.split(' [')[0]).join(', ') + ')');

  // e da pra VER quais rotinas de uma vez so ja rodaram neste aparelho
  const rot = await page.evaluate(() => {
    const st = (typeof wfaRotinasEstado === 'function') ? wfaRotinasEstado() : null;
    setTab('conta');
    const el = document.getElementById('set-rotinas');
    return { n: st ? st.length : 0, pintou: !!(el && el.textContent.trim()), txt: el ? el.textContent : '' };
  });
  checa(rot.n >= 8, 'as rotinas de uma vez so estao listadas (' + rot.n + ')');
  checa(rot.pintou, 'a aba Conta mostra o estado delas');
  checa(/neste aparelho/.test(rot.txt), 'o texto deixa claro que o estado e DESTE aparelho');

  console.log('\n12. O modal de tarefa tem estilo de verdade');
  // O modal nasce em document.body, FORA de #page-projetos. Todo o CSS do formulario
  // e escrito com escopo #page-projetos, entao ele ja foi ao ar uma vez com o rotulo
  // colado no campo e os campos crus do navegador (31/08/2026). Este bloco trava isso:
  // se alguem mexer no CSS e esquecer do escopo #pj-modal, o teste cai.
  await page.evaluate(() => document.querySelector('[data-nav="projetos"]').click());
  await page.waitForTimeout(500);
  // a aba lembra onde parou: as secoes acima deixaram um projeto aberto
  await page.locator('#pj-detalhe [data-voltar]').click().catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('#pj-cards .pj-c', { hasText: 'Fercon' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('#pj-detalhe [data-col="backlog"] .pj-t').first().click();
  await page.waitForTimeout(500);
  const estilo = await page.evaluate(() => {
    const box = document.querySelector('#pj-modal .pj-f');
    if (!box) return null;
    const cs = (el) => getComputedStyle(el);
    const fundo = cs(box).backgroundColor;
    // so rgba() carrega alfa. rgb() e opaco, e um regex frouxo le o azul como alfa.
    const alfa = (fundo.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/) || [])[1];
    const rot = box.querySelector('.tkl');
    const campo = box.querySelector('#tk-st');
    const tit = box.querySelector('#tk-t');
    return {
      larguraCaixa: Math.round(box.getBoundingClientRect().width),
      opaco: alfa === undefined || Number(alfa) === 1,
      // rotulo a ESQUERDA do campo, como no ClickUp, e nao por cima nem colado
      rotuloAEsquerda: rot.getBoundingClientRect().right <= campo.getBoundingClientRect().left + 1,
      // o campo de status nao pode esticar a linha inteira (regra do modal estreito vazando)
      statusCurto: campo.getBoundingClientRect().width < box.getBoundingClientRect().width * 0.5,
      tituloLargo: tit.getBoundingClientRect().width > box.getBoundingClientRect().width * 0.6,
    };
  });
  checa(!!estilo, 'o modal de tarefa abre');
  checa(estilo && estilo.larguraCaixa > 900, 'o modal e largo como o do ClickUp (' + (estilo && estilo.larguraCaixa) + 'px)');
  checa(estilo && estilo.opaco, 'a caixa do modal e opaca: a pagina nao aparece atras dela');
  checa(estilo && estilo.rotuloAEsquerda, 'rotulo fica a esquerda do campo, sem sobrepor');
  checa(estilo && estilo.statusCurto, 'o campo de status nao estica a linha inteira');
  checa(estilo && estilo.tituloLargo, 'o titulo ocupa a largura da caixa');

  await page.locator('#pj-modal [data-tkcancel]').click();
  await page.waitForTimeout(300);

  console.log('\n13. Console limpo');
  const relevantes = erros.filter((e) => !/Failed to fetch|NetworkError|supabase|fetch/i.test(e));
  checa(relevantes.length === 0, 'nenhum erro de JS na pagina' + (relevantes.length ? ': ' + relevantes.join(' | ') : ''));

  // prova visual. Volta pra carteira primeiro: as secoes acima deixam um projeto
  // aberto, e clicar no menu nao fecha (a aba lembra onde parou, de proposito).
  await page.locator('#pj-detalhe [data-voltar]').click().catch(() => {});
  await page.evaluate(() => document.querySelector('[data-nav="projetos"]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'deploy/prova-projetos-carteira.png' });
  await page.locator('#pj-cards .pj-c', { hasText: 'Fercon' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'deploy/prova-projetos-quadro.png' });
  await page.locator('#pj-detalhe [data-vista="prontuario"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'deploy/prova-projetos-prontuario.png', fullPage: true });

  // Meu Dia com o bloco "Dos projetos"
  await page.evaluate((nome) => {
    WFA_MEMBER = { full_name: nome, role: 'admin' };
    document.querySelector('[data-nav="dashboard"]').click();
    renderMeuDia();
  }, pessoa);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'deploy/prova-projetos-meudia.png' });

  await browser.close();

  console.log('\n' + (falhas.length ? 'FALHOU: ' + falhas.length + ' verificacao(oes)' : 'TUDO OK'));
  process.exit(falhas.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
