/*
 Teste da aba Prazo e das bolinhas de stories na página do cliente (src/lib/cliente-prazo.js),
 28/09/2026, no molde da aba Prazo e do Feed do Modo Criador da V3.
 Uso: node deploy/teste-cliente-prazo.mjs
*/
import { readFileSync } from 'node:fs';
import { agruparPrazoCliente, proximosStoriesCliente } from '../src/lib/cliente-prazo.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

const hoje = '2026-09-28';
const agora = Date.parse('2026-09-28T15:00:00Z');
const tarefas = [
  { id: 'a1', status: 'andamento', data: '2026-09-25' },
  { id: 'a2', status: 'backlog', data: '2026-09-27' },
  { id: 'h1', status: 'iniciar', data: '2026-09-28' },
  { id: 's1', status: 'aprovacao', data: '2026-10-05' },
  { id: 's2', status: 'andamento', data: '2026-09-29' },
  { id: 'd1', status: 'backlog', data: '2026-10-06' },
  { id: 'n1', status: 'backlog', data: '' },
  { id: 'n2', status: 'andamento' },
  { id: 'c1', status: 'homologcli', data: '2026-09-20', aprovacaoEm: '2026-09-24T10:00:00Z' },
  { id: 'c2', status: 'homologcli', data: '2026-09-30', enviadoClienteEm: '2026-09-27T10:00:00Z' },
  { id: 'c3', status: 'homologcli', data: '2026-09-30' },
  { id: 'f1', status: 'concluido', data: '2026-09-01' },
  null,
];

const g = agruparPrazoCliente(tarefas, hoje, agora);
const ids = (l) => l.map((x) => x.id).join();
ok(ids(g.atrasado) === 'a1,a2', 'atrasado: prazo antes de hoje, mais antigo primeiro');
ok(g.atrasado[0].diasAtraso === 3 && g.atrasado[1].diasAtraso === 1, 'atrasado traz os dias de atraso');
ok(ids(g.hoje) === 'h1', 'vence hoje');
ok(ids(g.semana) === 's2,s1', 'próximos 7 dias, em ordem de data (hoje + 7 entra)');
ok(ids(g.depois) === 'd1', 'depois de 7 dias');
ok(ids(g.sem) === 'n1,n2', 'sem prazo');
ok(ids(g.comCliente) === 'c1,c2,c3', 'com o cliente fica à parte, quem espera há mais tempo primeiro');
ok(g.comCliente[0].diasEsperando === 4 && g.comCliente[1].diasEsperando === 1, 'dias esperando pelo aprovacaoEm ou enviadoClienteEm');
ok(g.comCliente[2].diasEsperando === null, 'sem carimbo, sem número inventado');
ok(!Object.values(g).flat().some((x) => x.id === 'c1' && g.atrasado.includes(x)), 'com o cliente não conta como atraso da equipe');
ok(!Object.values(g).flat().some((x) => x.id === 'f1'), 'concluído fica fora');
ok(g.total === 8, 'total conta só o que depende da equipe');
const vazio = agruparPrazoCliente(undefined, hoje, agora);
ok(vazio.total === 0 && vazio.comCliente.length === 0, 'sem tarefas, tudo vazio');

const st = [
  { id: 'x1', formato: 'story', status: 'backlog', publicarEm: '2026-10-02T10:00' },
  { id: 'x2', formato: 'stories', status: 'homologcli', data: '2026-09-30' },
  { id: 'x3', formato: 'Story', status: 'concluido', publicarEm: '2026-10-01T09:00' },
  { id: 'x4', formato: 'story', status: 'concluido', publicarEm: '2026-09-20T09:00' },
  { id: 'x5', formato: 'reel', status: 'backlog', publicarEm: '2026-09-29T09:00' },
  { id: 'x6', formato: 'story', status: 'andamento' },
];
const s = proximosStoriesCliente(st, '2026-09-28T12:00', 8);
ok(ids(s) === 'x2,x3,x1,x6', 'stories abertos ou agendados no futuro, por data, sem data no fim');
ok(s[0].quando === '2026-09-30' && s[1].quando === '2026-10-01T09:00', 'data de publicação, senão o prazo');
ok(!s.some((x) => x.id === 'x4' || x.id === 'x5'), 'story já publicado e reel ficam fora');
const muitos = Array.from({ length: 12 }, (_, i) => ({ id: 'm' + i, formato: 'story', status: 'backlog', data: '2026-10-' + String(10 + i) }));
ok(proximosStoriesCliente(muitos, '2026-09-28T12:00').length === 8, 'no máximo 8 bolinhas');

const s1 = readFileSync(new URL('../src/lib/cliente-prazo.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const s2 = readFileSync(new URL('../public/workflowark-cliente-prazo-20260928a.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
ok(s1 === s2, 'cópia do navegador idêntica à do servidor');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
