/*
 Mescla por item do estado: servidor e cliente tem que CONCORDAR.

 Servidor: src/lib/merge-estado.js (importado aqui direto).
 Cliente:  wfaMergeById / wfaMergeTarefasProjeto / wfaMergeProjetos, extraidos do fonte de
           public/workflowark-sync-*.js e avaliados aqui (sao funcoes puras).

 Por que existe (10/09/2026): o save-state gravava a lista inteira e a ultima escrita
 apagava a dos outros. Com mescla nos dois lados, o mesmo caso tem que dar o mesmo
 resultado aqui e la, senao o cliente reempurra pra sempre ou perde dado em silencio.

 Chamado pelo CI (.github/workflows/deploy.yml) e por `npm run teste:merge`.
 Uso: node deploy/teste-merge-estado.mjs
*/
import { readFile } from 'fs/promises';
import { mesclarPorId, mesclarChave, CHAVES_MESCLA, CHAVES_LAPIDE } from '../src/lib/merge-estado.js';

const falhas = [];
const ok = [];
const checa = (cond, msg) => (cond ? ok.push(msg) : falhas.push(msg));
const ids = (arr) => arr.map((o) => o.id).sort().join(',');
const acha = (arr, id) => arr.find((o) => o.id === id);

// ---- cliente: pega as funcoes do fonte do sync, sem executar o resto do script ----
const html = await readFile('public/workflowark.html', 'utf8');
const syncNome = (html.match(/<script src="(workflowark-sync-[^"]+\.js)"/) || [])[1];
if (!syncNome) throw new Error('nao achei o script de sync no workflowark.html');
const sync = await readFile('public/' + syncNome, 'utf8');
function fonteDe(nome) {
  const i = sync.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('nao achei ' + nome + ' no ' + syncNome);
  let prof = 0, j = sync.indexOf('{', i);
  for (; j < sync.length; j++) {
    if (sync[j] === '{') prof++;
    else if (sync[j] === '}') { prof--; if (prof === 0) break; }
  }
  return sync.slice(i, j + 1);
}
const cliente = new Function(
  [fonteDe('wfaMergeById'), fonteDe('wfaMergeTarefasProjeto'), fonteDe('wfaMergeProjetos'), fonteDe('wfaJsonCanon'),
    'return {wfaMergeById, wfaMergeTarefasProjeto, wfaMergeProjetos, wfaJsonCanon};'].join(String.fromCharCode(10)),
)();

// Lista de chaves: cliente e servidor precisam concordar (mesmo padrao do teste de chaves)
const listaDe = (nome) => {
  const m = sync.match(new RegExp('const ' + nome + '\\s*=\\s*\\[([\\s\\S]*?)\\]'));
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
};
checa(listaDe('WFA_MERGE_KEYS').sort().join() === [...CHAVES_MESCLA].sort().join(), 'WFA_MERGE_KEYS (cliente) == CHAVES_MESCLA (servidor)');
checa(listaDe('WFA_TOMBSTONE_KEYS').sort().join() === [...CHAVES_LAPIDE].sort().join(), 'WFA_TOMBSTONE_KEYS (cliente) == CHAVES_LAPIDE (servidor)');

// ---- caso 1: duas pessoas movem cartoes DIFERENTES na mesma janela ----
{
  const base = [
    { id: 't1', title: 'LP Mazute', status: 'andamento', up: '2026-09-10T10:00:00.000Z' },
    { id: 't2', title: 'Post Vivenda', status: 'backlog', up: '2026-09-10T10:00:00.000Z' },
  ];
  const caio = [{ ...base[0], status: 'homologcli', up: '2026-09-10T10:00:05.000Z' }, base[1]];   // Caio manda a LP pra homologacao
  const gabriel = [base[0], { ...base[1], status: 'andamento', up: '2026-09-10T10:00:06.000Z' }]; // Gabriel puxa o post
  // servidor recebe o save do Caio e depois o do Gabriel (que partiu da base velha)
  const s1 = mesclarChave('wfa-tarefas', base, caio, []);
  const s2 = mesclarChave('wfa-tarefas', s1, gabriel, []);
  checa(acha(s2, 't1').status === 'homologcli', 'servidor: a LP do Caio continua em homologacao do cliente depois do save do Gabriel');
  checa(acha(s2, 't2').status === 'andamento', 'servidor: o post do Gabriel foi pra andamento');
  // o aparelho do Caio puxa o que o servidor tem e mescla com o local dele
  const c = cliente.wfaMergeById(s2, caio, false);
  checa(acha(c, 't1').status === 'homologcli' && acha(c, 't2').status === 'andamento', 'cliente: mesma foto que o servidor (nada volta pra tras)');
  checa(cliente.wfaJsonCanon(c.map((o) => ({ ...o }))) === cliente.wfaJsonCanon(s2.map((o) => ({ ...o }))), 'cliente e servidor convergem pro mesmo conteudo (sem reempurro eterno)');
}

// ---- caso 2: carimbo mais novo vence, nos dois lados ----
{
  const velho = { id: 'a', v: 1, up: '2026-09-10T10:00:00.000Z' };
  const novo = { id: 'a', v: 2, up: '2026-09-10T10:00:09.000Z' };
  checa(mesclarPorId([novo], [velho], []).find((o) => o.id === 'a').v === 2, 'servidor: save com carimbo velho NAO sobrescreve o mais novo');
  checa(mesclarPorId([velho], [novo], []).find((o) => o.id === 'a').v === 2, 'servidor: save com carimbo novo vence o velho');
  checa(cliente.wfaMergeById([novo], [velho], true).find((o) => o.id === 'a').v === 2, 'cliente: mesmo com o local autoritario, o remoto mais novo vence por item');
  checa(cliente.wfaMergeById([velho], [novo], false).find((o) => o.id === 'a').v === 2, 'cliente: local mais novo vence o remoto velho');
}

// ---- caso 3: sem carimbo dos dois lados, quem salva vence (era assim antes) ----
{
  const r = mesclarPorId([{ id: 'x', v: 'servidor' }], [{ id: 'x', v: 'cliente' }], []);
  checa(r[0].v === 'cliente', 'servidor: sem carimbo, o save vence (comportamento antigo preservado)');
}

// ---- caso 4: lapide apaga nos dois lados e id apagado nao volta ----
{
  const srv = mesclarChave('wfa-tarefas', [{ id: 'd1' }, { id: 'd2' }], [{ id: 'd2' }], ['d1']);
  checa(ids(srv) === 'd2', 'servidor: id na lapide sai da lista mesmo existindo so no servidor');
  const cli = cliente.wfaMergeById([{ id: 'd1' }, { id: 'd2' }], [{ id: 'd2' }], false).filter((o) => !new Set(['d1']).has(o.id));
  checa(ids(cli) === 'd2', 'cliente: mesma coisa');
}

// ---- caso 5: uniao: item que so existe de um lado sobrevive ----
{
  const srv = mesclarPorId([{ id: 'so-servidor' }], [{ id: 'so-cliente' }], []);
  checa(ids(srv) === 'so-cliente,so-servidor', 'servidor: uniao por id (nada some por falta)');
}

// ---- caso 6: PROJETO: tarefas diferentes do mesmo projeto, duas pessoas ----
{
  const base = { id: 'p-mazute', cliente: 'Mazute', up: '2026-09-10T10:00:00.000Z', tarefas: [
    { id: 'pt-lp', t: 'LP', st: 'andamento', up: '2026-09-10T10:00:00.000Z' },
    { id: 'pt-post', t: 'Post', st: 'backlog', up: '2026-09-10T10:00:00.000Z' },
  ] };
  const caio = { ...base, up: '2026-09-10T10:00:05.000Z', tarefas: [{ ...base.tarefas[0], st: 'homologcli', up: '2026-09-10T10:00:05.000Z' }, base.tarefas[1]] };
  const gabriel = { ...base, up: '2026-09-10T10:00:06.000Z', tarefas: [base.tarefas[0], { ...base.tarefas[1], st: 'iniciar', up: '2026-09-10T10:00:06.000Z' }] };
  const s1 = mesclarChave('wfa-projetos', [base], [caio], []);
  const s2 = mesclarChave('wfa-projetos', s1, [gabriel], []);
  const p = acha(s2, 'p-mazute');
  checa(acha(p.tarefas, 'pt-lp').st === 'homologcli', 'servidor/projeto: LP continua em homologacao do cliente (tarefa a tarefa, nao projeto inteiro)');
  checa(acha(p.tarefas, 'pt-post').st === 'iniciar', 'servidor/projeto: post do Gabriel tambem entrou');
  const c = cliente.wfaMergeProjetos(s2, [caio], false, new Set());
  const pc = acha(c, 'p-mazute');
  checa(acha(pc.tarefas, 'pt-lp').st === 'homologcli' && acha(pc.tarefas, 'pt-post').st === 'iniciar', 'cliente/projeto: mesma foto que o servidor');
  // tarefa de projeto excluida com lapide nao volta
  const semLp = mesclarChave('wfa-projetos', s2, [{ ...gabriel, tarefas: gabriel.tarefas.filter((t) => t.id !== 'pt-lp') }], ['pt-lp']);
  checa(!acha(acha(semLp, 'p-mazute').tarefas, 'pt-lp'), 'servidor/projeto: tarefa na lapide nao ressuscita');
  const semLpCli = cliente.wfaMergeProjetos(s2, [gabriel], false, new Set(['pt-lp']));
  checa(!acha(acha(semLpCli, 'p-mazute').tarefas, 'pt-lp'), 'cliente/projeto: tarefa na lapide nao ressuscita');
}

// ---- caso 7: chave fora da mescla ou valor que nao e lista: passa como veio ----
{
  checa(mesclarChave('wfa-regua', { a: 1 }, { b: 2 }, []).b === 2, 'chave nao-mesclavel: grava o que o cliente mandou');
  checa(mesclarChave('wfa-tarefas', [{ id: 'z' }], null, []) === null, 'null (delecao explicita) passa como veio');
}

console.log('=== PASSOU ===');
for (const o of ok) console.log('  ok  ' + o);
if (falhas.length) {
  console.log('');
  console.log('=== FALHOU ===');
  for (const f of falhas) console.log('  X   ' + f);
  process.exit(1);
}
console.log('');
console.log('Tudo certo: servidor e cliente mesclam do mesmo jeito, por item e por tarefa de projeto, respeitando a lapide.');
