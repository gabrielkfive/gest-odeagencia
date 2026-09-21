/*
 Teste do cálculo puro do Início do /next (public/workflowark-next-calc-<data>.js).
 Carteira sintética com regras conhecidas; cada número esperado está explicado ao lado.
 Uso: node deploy/teste-next-inicio.mjs
*/
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// package.json tem "type":"module": o require carrega o arquivo como ESM e a API cai em globalThis
const carregado = require('../public/workflowark-next-calc-20260921b.js');
const NX = carregado && carregado.inicio ? carregado : globalThis.NX_CALC;

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas++; };

const HOJE = '2026-09-21';
const d = (n) => { const x = new Date(HOJE + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

const clientes = [
  { id: 'vivenda', nm: 'Vivenda', status: 'gr' },
  { id: 'fercon', nm: 'Fercon', status: 'y' },
  { id: 'moenda', nm: 'Moenda', status: 'gr' },
  { id: 'antigo', nm: 'Antigo', status: 'churn' },
];
const tarefas = [
  // Vivenda: tudo em dia, com entrega no mês
  { id: 'v1', title: 'Reel café', status: 'andamento', clienteId: 'vivenda', data: d(2), publicarEm: HOJE + 'T18:00', resp: 'Saulo' },
  { id: 'v2', title: 'Story', status: 'concluido', clienteId: 'vivenda', data: d(-3), concluidaEm: d(-4) + 'T10:00:00.000Z', publicarEm: d(-4) + 'T12:00', resp: 'Maria' },
  // Fercon: 2 atrasadas + aprovação parada há 5 dias
  { id: 'f1', title: 'Relatório', status: 'backlog', clienteId: 'fercon', data: d(-2), resp: 'Lucas' },
  { id: 'f2', title: 'Pixel', status: 'andamento', clienteId: 'fercon', data: d(-1), resp: 'Lucas' },
  { id: 'f3', title: 'Landing', status: 'aprovacao', clienteId: 'fercon', data: d(3), aprovacaoEm: d(-5) + 'T09:00:00.000Z', resp: 'Danilo' },
  // Moenda: nada no mês (sinal "sem entrega"), uma homologação recente
  { id: 'm1', title: 'Proposta', status: 'homologcli', clienteId: 'moenda', data: d(40), aprovacaoEm: d(-1) + 'T09:00:00.000Z', resp: 'Gabriel' },
  // Concluída fora do prazo (conta no "no prazo" como não ok)
  { id: 'x1', title: 'Atrasou', status: 'concluido', clienteId: 'vivenda', data: d(-6), concluidaEm: d(-2) + 'T10:00:00.000Z', resp: 'Bruno' },
  // Vence hoje
  { id: 'h1', title: 'Hoje', status: 'iniciar', clienteId: 'vivenda', data: HOJE, resp: 'Bruno', publicarEm: d(3) + 'T10:00' },
];
const editorial = [{ clienteId: 'vivenda', titulo: 'Carrossel', formato: 'carrossel', status: 'agendado', data: d(5) }];

const r = NX.inicio({ tarefas, clientes, editorial, hoje: HOJE });

console.log('KPIs');
ok(r.kpis.hoje === 1, `vencem hoje = 1 (h1), veio ${r.kpis.hoje}`);
ok(r.kpis.atrasadas === 2, `atrasadas = 2 (f1, f2), veio ${r.kpis.atrasadas}`);
ok(r.kpis.aprovacao === 2, `em aprovação = 2 (f3, m1), veio ${r.kpis.aprovacao}`);
ok(r.kpis.publicamSemana === 2, `publicam na semana = 2 (v1 hoje, h1 em 3 dias; v2 já passou), veio ${r.kpis.publicamSemana}`);

console.log('Saúde da carteira');
ok(r.saude.total === 3, `clientes ativos = 3 (churn fora), veio ${r.saude.total}`);
ok(r.saude.verdes === 1, `verdes = 1 (só Vivenda), veio ${r.saude.verdes}`);
ok((r.saude.sinais.fercon || []).length === 2, `Fercon tem 2 sinais (atraso, aprovação parada), veio ${(r.saude.sinais.fercon || []).length}`);
ok((r.saude.sinais.moenda || []).length === 1 && r.saude.sinais.moenda[0].rotulo === 'Sem entrega no mês', `Moenda tem só "Sem entrega no mês", veio ${JSON.stringify(r.saude.sinais.moenda)}`);
ok(!r.saude.sinais.antigo, 'cliente churn não entra nos sinais');

console.log('Entregas no prazo');
ok(r.prazo.total === 2 && r.prazo.ok === 1 && r.prazo.pct === 50, `2 concluídas no mês com prazo, 1 no prazo = 50%, veio ${JSON.stringify(r.prazo)}`);
const vazio = NX.inicio({ tarefas: [], clientes, editorial: [], hoje: HOJE });
ok(vazio.prazo.pct === null, 'sem concluída no mês: pct é null (nunca inventa)');
ok(vazio.saude.verdes === 0 && vazio.saude.total === 3, 'sem tarefa nenhuma: ninguém está verde (todos "sem entrega no mês")');

console.log('Linha do mês');
const dias = r.linha.map((p) => p.dia).sort();
ok(r.linha.length === 4, `4 pontos no mês (v1, v2, h1 e o editorial), veio ${r.linha.length}: ${dias.join(', ')}`);
ok(r.linha.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.dia) && p.cor && p.titulo), 'cada ponto tem dia, cor e título');
ok(r.linha.find((p) => p.titulo === 'Story').cor === 'ok', 'concluída é verde (ok)');
ok(r.linha.find((p) => p.titulo === 'Reel café').cor === 'andamento', 'em andamento é amarelo (andamento)');

console.log('Atenção');
ok(r.atencao.length === 2, `2 clientes pedem atenção (Fercon, Moenda), veio ${r.atencao.length}`);
ok(r.atencao[0].id === 'fercon' && r.atencao[0].n === 2, `Fercon primeiro com 2 atrasadas, veio ${JSON.stringify(r.atencao[0])}`);
ok(r.atencao[1].id === 'moenda' && r.atencao[1].rotulo === 'sem entrega no mês', `Moenda com "sem entrega no mês", veio ${JSON.stringify(r.atencao[1])}`);

console.log('Filtro por pessoa');
const meu = NX.inicio({ tarefas, clientes, editorial, hoje: HOJE, nome: 'Lucas Rosi' });
ok(meu.kpis.atrasadas === 2 && meu.kpis.hoje === 0, `KPIs de Lucas: 2 atrasadas, 0 hoje, veio ${JSON.stringify(meu.kpis)}`);
ok(meu.saude.total === 3, 'saúde da carteira não é filtrada por pessoa');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
