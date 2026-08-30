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
  checa(nCards === 8, 'semear cria os 8 clientes do briefing (achou ' + nCards + ')');

  // nao duplica se clicar de novo
  await page.locator('#pj-seed').click();
  await page.waitForTimeout(500);
  checa(await page.locator('#pj-cards .pj-c').count() === 8, 'clicar em semear de novo nao duplica');

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
  checa(nBacklog === 19, 'o template da sprint 1 nasce com 19 tarefas no backlog (achou ' + nBacklog + ')');

  console.log('\n3. Etiquetas e filtro');
  const temTags = await page.evaluate(() => {
    const c = document.querySelector('#pj-detalhe [data-col="backlog"] .pj-t');
    const t = [...c.querySelectorAll('.pj-tag')].map((x) => x.textContent.trim());
    return { papel: t.some((x) => x === 'po'), sprint: t.some((x) => x === 'sprint 01') };
  });
  checa(temTags.papel, 'cartao carrega etiqueta de PAPEL');
  checa(temTags.sprint, 'cartao carrega etiqueta de SPRINT');

  await page.selectOption('#pj-fpapel', 'cs');
  await page.waitForTimeout(400);
  const soCs = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#pj-detalhe .pj-t')];
    return { n: cards.length, todos: cards.every((c) => [...c.querySelectorAll('.pj-tag')].some((t) => t.textContent.trim() === 'cs')) };
  });
  checa(soCs.n > 0 && soCs.n < 19 && soCs.todos, 'filtro por papel "cs" deixa so as tarefas de cs (' + soCs.n + ' de 19)');
  await page.locator('#pj-detalhe [data-limpar]').click();
  await page.waitForTimeout(400);
  checa(await page.locator('#pj-detalhe .pj-t').count() === 19, 'limpar o filtro traz as 19 de volta');

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
  checa(await page.locator('#pj-cards .pj-c').count() === 8, 'os 8 projetos continuam la depois de recarregar');

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

  console.log('\n9. Console limpo');
  const relevantes = erros.filter((e) => !/Failed to fetch|NetworkError|supabase|fetch/i.test(e));
  checa(relevantes.length === 0, 'nenhum erro de JS na pagina' + (relevantes.length ? ': ' + relevantes.join(' | ') : ''));

  // prova visual
  await page.evaluate(() => document.querySelector('[data-nav="projetos"]').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'deploy/prova-projetos-carteira.png' });
  await page.locator('#pj-cards .pj-c', { hasText: 'Fercon' }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'deploy/prova-projetos-quadro.png' });
  await page.locator('#pj-detalhe [data-vista="prontuario"]').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'deploy/prova-projetos-prontuario.png', fullPage: true });

  await browser.close();

  console.log('\n' + (falhas.length ? 'FALHOU: ' + falhas.length + ' verificacao(oes)' : 'TUDO OK'));
  process.exit(falhas.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
