/*
 Teste da Lista de Clientes no molde da V3 (src/lib/clientes-lista.js), 26/09/2026.
 Junta cliente, etapa da jornada (sprint) e cobrança do mês; filtra por aba e busca.
 Uso: node deploy/teste-clientes-lista.mjs
*/
import { readFileSync } from 'node:fs';
import { montarLinhas, filtrar, contarAbas } from '../src/lib/clientes-lista.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

const clientes = [
  { id: 'a', nm: 'Café Aurora', tipo: 'ARK', plano: 'Crescimento', valor: 1800, status: 'gr' },
  { id: 'b', nm: 'Pet Feliz', tipo: 'ARK', plano: 'Essencial', valor: 2200, status: 'y' },
  { id: 'c', nm: 'Studio Leve', tipo: 'Alpha', plano: 'Squad', valor: 0, status: 'gr' },
  { id: 'd', nm: 'Antigo Bar', tipo: 'ARK', plano: 'Essencial', valor: 900, status: 'churn' },
  { id: 'e', nm: 'Burger do Bairro', tipo: 'ARK', plano: 'Crescimento', valor: 1500, status: 'r' },
];
const sprints = [{ n: 0, clis: ['a'] }, { n: 1, clis: [] }, { n: 3, clis: ['b', 'e'] }, { n: 20, clis: [] }];
const cobranca = { a: { cobradoMes: '2026-09' }, b: { cobradoMeses: { '2026-08': 1 } } };

const L = montarLinhas(clientes, sprints, cobranca, '2026-09');
const a = L.find((x) => x.id === 'a'), b = L.find((x) => x.id === 'b'), c = L.find((x) => x.id === 'c');
ok(a.sprint === 0 && a.etapa === 'onboarding', 'sprint 0 é onboarding');
ok(b.sprint === 3 && b.etapa === 'jornada' && b.progresso === 15, 'sprint 3 de 20 é jornada com 15% de progresso');
ok(c.sprint === null && c.etapa === 'sem', 'cliente fora dos sprints fica sem etapa');
ok(a.cobrado === true && b.cobrado === false, 'cobrado olha só o mês pedido');
ok(c.cobravel === false && a.cobravel === true, 'Squad Alpha e valor zero não entram na cobrança');
ok(b.atencao && L.find((x) => x.id === 'e').atencao && !a.atencao, 'atenção = status urgente ou em ajuste');

const n = contarAbas(L);
ok(n.todos === 4 && n.onboarding === 1 && n.jornada === 2 && n.atencao === 2 && n.churn === 1, 'contagem das abas (todos sem churn)');
ok(filtrar(L, 'todos', '').every((x) => x.status !== 'churn'), 'Todos esconde churn');
ok(filtrar(L, 'churn', '').map((x) => x.id).join() === 'd', 'aba Churn mostra só churn');
ok(filtrar(L, 'todos', 'aurora').map((x) => x.id).join() === 'a', 'busca por nome sem acento e sem caixa');
ok(filtrar(L, 'todos', 'squad').map((x) => x.id).join() === 'c', 'busca também pelo plano');
ok(filtrar(L, 'atencao', '')[0].id === 'e', 'na aba atenção o urgente vem antes do em ajuste');

const s1 = readFileSync(new URL('../src/lib/clientes-lista.js', import.meta.url), 'utf8');
const s2 = readFileSync(new URL('../public/workflowark-clientes-lista-20260926a.js', import.meta.url), 'utf8');
ok(s1 === s2, 'cópia do navegador idêntica à do servidor');
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
