/*
 Teste do painel do Modo Criador no app original (src/lib/criador.js), 26/09/2026.
 Conta por cliente o que espera o cliente, o que está em revisão interna e o que passou do
 prazo, lendo só as tarefas que já existem. Uso: node deploy/teste-criador.mjs
*/
import { readFileSync } from 'node:fs';
import { resumoCriador, tarefasDoCliente } from '../src/lib/criador.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

const clientes = [
  { id: 'a', nm: 'Café Aurora', plano: 'Crescimento', status: 'gr' },
  { id: 'b', nm: 'Pet Feliz', plano: 'Essencial', status: 'y' },
  { id: 'c', nm: 'Antigo', status: 'churn' },
  { id: 'd', nm: 'Studio Leve', status: 'gr' },
];
const hoje = '2026-09-26';
const tarefas = [
  { id: 1, clienteId: 'a', status: 'homologcli', formato: 'reel', data: '2026-09-28' },
  { id: 2, clienteId: 'a', status: 'homologcli', formato: 'estatico', data: '2026-09-20' },
  { id: 3, clienteId: 'a', status: 'aprovacao', formato: 'story', publicarEm: '2026-09-27', data: '2026-09-24' },
  { id: 4, clienteId: 'a', status: 'concluido', formato: 'carrossel', data: '2026-09-02' },
  { id: 5, clienteId: 'b', status: 'andamento', data: '2026-09-10' },
  { id: 6, title: 'Roteiro Pet Feliz semana 4', status: 'backlog', data: '2026-09-30' },
  { id: 7, clienteId: 'c', status: 'andamento', data: '2026-09-01' },
  { id: 8, clienteId: 'a', status: 'andamento', formato: 'reel', data: '2026-10-03' },
  { id: 9, clienteId: 'a', status: 'backlog', data: '' },
];

ok(tarefasDoCliente(clientes[1], tarefas).map((t) => t.id).join() === '5,6', 'tarefa sem clienteId entra pelo nome do cliente no título');

const r = resumoCriador(clientes, tarefas, hoje, '2026-09');
ok(!r.clientes.some((c) => c.id === 'c'), 'cliente em churn fica fora');
const a = r.clientes.find((c) => c.id === 'a');
ok(a.esperando === 2 && a.revisao === 1, 'conta esperando o cliente (homologcli) e revisão interna (aprovacao)');
ok(a.atrasados === 1, 'atrasado = tarefa da equipe com data vencida (concluído, com o cliente e sem data não contam)');
ok(a.posts === 2 && a.reels === 1 && a.stories === 1, 'formatos do mês: estático e carrossel são posts; tarefa de outubro fica fora');
ok(a.noMes === 4, 'conteúdos do mês contam só o que tem formato e cai no mês');
const b = r.clientes.find((c) => c.id === 'b');
ok(b.atrasados === 1 && b.esperando === 0, 'Pet Feliz tem 1 atrasado pelo clienteId');
ok(r.totais.esperando === 2 && r.totais.revisao === 1 && r.totais.atrasados === 2, 'totais somam os clientes ativos');
ok(r.clientes[0].id === 'a' && r.clientes[r.clientes.length - 1].id === 'd', 'quem pede atenção vem primeiro, cliente sem pendência no fim');
ok(resumoCriador([], [], hoje, '2026-09').clientes.length === 0, 'sem clientes, lista vazia');

const s1 = readFileSync(new URL('../src/lib/criador.js', import.meta.url), 'utf8');
const s2 = readFileSync(new URL('../public/workflowark-criador-20260926a.js', import.meta.url), 'utf8');
ok(s1 === s2, 'cópia do navegador idêntica à do servidor');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
