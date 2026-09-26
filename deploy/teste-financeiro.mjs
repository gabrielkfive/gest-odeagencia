/*
 Teste do cálculo do Financeiro (src/lib/financeiro.js), 26/09/2026.
 O painel lê só o que já existe: meses da planilha (receitas e a pagar), cobrado e pago.
 Uso: node deploy/teste-financeiro.mjs
*/
import { readFileSync } from 'node:fs';
import { num, resumoMes, mesesOrdenados, serieMeses, inadimplencia, dre, variacao } from '../src/lib/financeiro.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };
const perto = (a, b) => Math.abs(a - b) < 0.001;

// 1. Número: aceita número e texto pt-BR, nunca infla número já convertido.
ok(num(2083.33) === 2083.33 && num('2.083,33') === 2083.33 && num('R$ 1.500') === 1500, 'num aceita número e texto pt-BR');
ok(num('') === 0 && num(null) === 0 && num('abc') === 0, 'vazio e lixo viram zero');

// 2. Resumo do mês.
const set = { id: 'a', nome: 'Setembro ARK', mk: '2026-09', receitas: [
  { nome: 'Cliente A', valor: 3000, custo: 1000 }, { nome: 'Cliente B', valor: '2.000,00', custo: 0 }, { nome: '', valor: 0 } ],
  pagar: [{ nome: 'Designer', valor: 1500 }, { nome: 'Simples Nacional', valor: 300 }, { nome: 'CEO', valor: 1000 }] };
const r = resumoMes(set, (n) => n === 'Cliente A', (n) => n === 'Designer');
ok(r.receita === 5000 && r.custo === 1000 && r.despesas === 2800, 'soma receita, custo e despesas');
ok(r.resultado === 2200 && perto(r.margem, 44), 'resultado = receita menos a pagar, margem em %');
ok(r.recebido === 3000 && r.aReceber === 2000 && r.pago === 1500 && r.aPagar === 1300, 'separa recebido, a receber, pago e a pagar');
ok(r.clientes === 2 && r.ticket === 2500, 'ticket médio só conta cliente com valor');
const vazio = resumoMes({ receitas: [], pagar: [] }, () => false, () => false);
ok(vazio.margem === null && vazio.ticket === null, 'mês vazio não divide por zero');

// 3. Meses ordenados e série.
const jul = { id: 'j', nome: 'Julho ARK', mk: '2026-07', receitas: [{ nome: 'Cliente A', valor: 2000 }], pagar: [{ nome: 'Designer', valor: 1000 }] };
const ago = { id: 'g', nome: 'Agosto ARK', mk: '2026-08', receitas: [{ nome: 'Cliente A', valor: 2500 }, { nome: 'Cliente C', valor: 500 }], pagar: [] };
const semMk = { id: 'x', nome: 'Rascunho', receitas: [], pagar: [] };
const copia = { id: 'c', nome: 'Setembro ARK (cópia)', mk: '2026-09', receitas: [], pagar: [] };
const ord = mesesOrdenados([set, semMk, jul, copia, ago]);
ok(ord.map((m) => m.id).join() === 'j,g,a,c,x', 'ordena por mês, sem data no fim, cópia depois do original');
const s = serieMeses([set, jul, ago, copia], 12);
ok(s.length === 3 && s[0].mk === '2026-07' && s[2].receita === 5000, 'série usa um mês por data, o primeiro lançado');

// 4. Inadimplência: meses anteriores sem baixa.
const cobradoEm = (nome, mk) => (mk === '2026-07') || (mk === '2026-08' && nome === 'Cliente A');
const inad = inadimplencia([set, jul, ago], cobradoEm, '2026-09');
ok(inad.length === 1 && inad[0].nome === 'Cliente C' && inad[0].valor === 500 && inad[0].mk === '2026-08', 'só o que ficou sem baixa em mês anterior');
ok(inadimplencia([set], () => false, '2026-09').length === 0, 'mês corrente não entra');
ok(inad[0].mesId === 'g' && inad[0].i === 1, 'item traz o mês e a linha para dar baixa');

// 5. DRE com categorias e comparação.
const classificar = (n) => (/ceo/i.test(n) ? 'socio' : /simples/i.test(n) ? 'fornecedor' : 'equipe');
const d = dre(set, ago, classificar);
ok(d.receita.atual === 5000 && d.receita.anterior === 3000, 'receita atual e anterior');
const eq = d.custos.find((c) => c.k === 'equipe');
ok(eq.atual === 1500 && eq.anterior === 0 && perto(eq.pctReceita, 30), 'custo por categoria com % da receita');
ok(d.custos.map((c) => c.k).join() === 'equipe,socio,fornecedor', 'categorias na ordem fixa');
ok(d.custoTotal.atual === 2800 && d.resultado.atual === 2200 && d.resultado.anterior === 3000, 'custo total e resultado');
ok(dre(set, null, classificar).receita.anterior === null, 'sem mês anterior, comparação vazia');
ok(perto(variacao(110, 100), 10) && variacao(5, 0) === null && variacao(5, null) === null, 'variação em % e sem base vira vazio');

// 6. Cópia do navegador idêntica.
const a = readFileSync(new URL('../src/lib/financeiro.js', import.meta.url), 'utf8');
const b = readFileSync(new URL('../public/workflowark-financeiro-20260926a.js', import.meta.url), 'utf8');
ok(a === b, 'cópia do navegador idêntica à do servidor');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
