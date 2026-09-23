/*
 Teste do nucleo puro do modo agencia (public/workflowark-agencia-20260923a.js).
 O arquivo roda no navegador; aqui ele e carregado num contexto sem document, onde so o
 nucleo (window.WFA_AGENCIA) e montado. Uso: node deploy/teste-agencia.mjs
*/
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as M from '../src/lib/modo-agencia.js';

const src = readFileSync(new URL('../public/workflowark-agencia-20260923a.js', import.meta.url), 'utf8');
const ctx = { window: {}, console };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const A = ctx.window.WFA_AGENCIA;

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

ok(!!A, 'nucleo exposto em window.WFA_AGENCIA');

// 1) modo: a ARK nunca cai no modo agencia sem pedir
const modo = (host, busca, salvo) => A.decidirModo({ host, busca: busca || '', salvo: salvo || null });
ok(modo('workflowark.arkcontent.workers.dev') === 'ark', 'producao da ARK = ark');
ok(modo('8b67eec9-workflowark.arkcontent.workers.dev') === 'ark', 'previa de versao da ARK = ark');
ok(modo('localhost') === 'ark', 'localhost = ark');
ok(modo('127.0.0.1') === 'ark', '127.0.0.1 = ark');
ok(modo('') === 'ark', 'arquivo aberto direto (file://) = ark');
ok(modo('agencia-z.workers.dev') === 'agencia', 'outro dominio (instancia da agencia) = agencia');
ok(modo('workflowark.arkcontent.workers.dev', '?agencia=1') === 'agencia', '?agencia=1 liga na ARK (demonstracao)');
ok(modo('agencia-z.workers.dev', '?agencia=0') === 'ark', '?agencia=0 desliga');
ok(modo('workflowark.arkcontent.workers.dev', '', 'agencia') === 'agencia', 'escolha salva vale');
ok(modo('workflowark.arkcontent.workers.dev', '?agencia=0', 'agencia') === 'ark', 'endereco vence o salvo');
ok(modo('workflowark.arkcontent.workers.dev', '', 'lixo') === 'ark', 'valor salvo invalido e ignorado');

// 2) passos do primeiro dia, derivados do estado real
const vazio = A.passos({ marca: {}, clientes: [], membros: [], tarefas: [] });
ok(vazio.length === 4, '4 passos obrigatorios');
ok(vazio.map(p => p.id).join(',') === 'marca,cliente,equipe,tarefa', 'ordem: marca, cliente, equipe, tarefa');
ok(vazio.every(p => !p.feito), 'base vazia: nenhum passo feito');

const marcaSoNome = A.passos({ marca: { name: 'Agência Z' }, clientes: [], membros: [], tarefas: [] });
ok(!marcaSoNome[0].feito, 'marca so com nome ainda nao conta (falta o logo)');
const marcaArk = A.passos({ marca: { name: 'ARK Content', logo: '/ark-mark.png' }, clientes: [], membros: [], tarefas: [] });
ok(!marcaArk[0].feito, 'nome e logo da ARK nao contam como marca da agencia');
const cheio = A.passos({
  marca: { name: 'Agência Z', logo: 'data:image/png;base64,AAAA' },
  clientes: [{ id: 'padaria', nm: 'Padaria' }],
  membros: [{ email: 'dono@z.com' }, { email: 'social@z.com' }],
  tarefas: [{ id: 't1', title: 'Post' }],
});
ok(cheio.every(p => p.feito), 'tudo preenchido: 4 de 4');
const soDono = A.passos({ marca: {}, clientes: [], membros: [{ email: 'dono@z.com' }], tarefas: [] });
ok(!soDono[2].feito, 'equipe so com o dono nao conta');
const exemplo = A.passos({ marca: {}, clientes: [], membros: [], tarefas: [{ id: 'ex-1', _ex: true }] });
ok(!exemplo[3].feito, 'tarefa de exemplo nao conta como primeira tarefa');
const interno = A.passos({ marca: {}, clientes: [{ id: 'ark', nm: 'ARK Content' }], membros: [], tarefas: [] });
ok(!interno[1].feito, 'o cliente interno da base nao conta como primeiro cliente');

const pr = A.progresso(A.passos({ marca: {}, clientes: [{ id: 'x' }], membros: [], tarefas: [{ id: 't' }] }));
ok(pr.feitos === 2 && pr.total === 4 && !pr.completo, 'progresso 2 de 4');
ok(A.progresso(cheio).completo, 'progresso completo com 4 de 4');

// 3) o que some no modo agencia
ok(A.abasOcultas('ark').length === 0, 'modo ark nao esconde nada');
const oc = A.abasOcultas('agencia');
['chat', 'alpha', 'whatsapp'].forEach(n => ok(oc.includes(n), 'modo agencia esconde ' + n));
ok(!oc.includes('tarefas') && !oc.includes('lista-clientes') && !oc.includes('agentes'), 'modo agencia mantem o essencial');

// 4) sementes da ARK
ok(A.sementesDaArk().includes('wfaSeedClientesV1'), 'lista de sementes da ARK inclui clientes');
ok(A.sementesDaArk().includes('wfaSeedRotinasV1'), 'lista de sementes da ARK inclui rotinas');

// 5) logo por arquivo
ok(A.logoValido('https://x.com/a.png') && A.logoValido('/a.png') && A.logoValido('data:image/png;base64,AA'), 'logo aceita https, caminho e imagem do computador');
ok(!A.logoValido('javascript:alert(1)') && !A.logoValido('data:text/html,oi') && !A.logoValido('ftp://x'), 'logo recusa endereco perigoso');

// 6) dados de exemplo da ARK saem, os da agencia ficam
const lista = [{ id: 'seed1' }, { id: 'seed2' }, { id: 'seed1695000000' }, { id: 'ae1' }, { id: 'ae17000' }, { id: 'al-brisa' }, { id: 'meu' }];
const limpa = A.semSementes(lista, ['seed1', 'seed2', 'ae1', 'al-brisa']);
ok(limpa.map(x => x.id).join(',') === 'seed1695000000,ae17000,meu', 'remove so os ids exatos de exemplo da ARK');
ok(A.semSementes(null, ['x']).length === 0, 'lista vazia ou quebrada vira lista vazia');

const jor = A.jornadaSo({ 0: ['vivenda', 'padaria'], 1: ['fercon'], 2: [] }, ['ark', 'padaria']);
ok(JSON.stringify(jor) === '{"0":["padaria"],"1":[],"2":[]}', 'jornada fica so com os clientes da agencia');
ok(JSON.stringify(A.jornadaSo('lixo', ['x'])) === '{}', 'jornada quebrada vira vazia');
ok(A.idDeExemploDaArk('set26-c-viv1') && A.idDeExemploDaArk('ago26-r-fon') && !A.idDeExemploDaArk('ev-1695'), 'agenda: ids de exemplo da ARK reconhecidos pelo prefixo');

// 7) a regra das telas React concorda com a do sistema, e o flag sobrevive ao redirect
const casos = [['workflowark.arkcontent.workers.dev', ''], ['129acb62-workflowark.arkcontent.workers.dev', ''],
  ['129acb62-workflowark.arkcontent.workers.dev', '?agencia=1'], ['agencia-z.test', ''], ['agencia-z.test', '?agencia=0'], ['', '']];
casos.forEach(([h, b]) => ok(M.decidirModo({ host: h, busca: b }) === A.decidirModo({ host: h, busca: b }), 'mesma regra nas duas pontas: ' + (h || 'file') + b));
const mem = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); } }; };
const st = mem();
ok(M.lerEGuardarModo({ hostname: '129acb62-workflowark.arkcontent.workers.dev', search: '?agencia=1' }, st) === 'agencia', 'entrada com ?agencia=1 liga');
ok(M.lerEGuardarModo({ hostname: '129acb62-workflowark.arkcontent.workers.dev', search: '' }, st) === 'agencia', 'depois do redirect pro /auth sem parametro continua agencia');
ok(M.lerEGuardarModo({ hostname: '129acb62-workflowark.arkcontent.workers.dev', search: '?code=abc' }, st) === 'agencia', 'volta do Google (/app?code=) continua agencia');
ok(M.lerEGuardarModo({ hostname: '129acb62-workflowark.arkcontent.workers.dev', search: '?agencia=0' }, st) === 'ark', '?agencia=0 desliga e grava');
ok(M.lerEGuardarModo({ hostname: 'workflowark.arkcontent.workers.dev', search: '' }, mem()) === 'ark', 'ARK sem nada salvo = ark');
const quebrado = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
ok(M.lerEGuardarModo({ hostname: 'agencia-z.test', search: '?agencia=1' }, quebrado) === 'agencia', 'storage bloqueado nao derruba');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
