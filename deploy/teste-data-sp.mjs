// Teste do dataSP/hojeSP (30/09/2026). O quadro de Atividades chama dataSP ~1.500 vezes por render
// (tarefaPassaFiltro calcula "hoje" e "daqui a 7 dias" por cartão). Com toLocaleDateString + timeZone
// o navegador monta um formatador Intl novo a cada chamada: ~54 ms por render, medido em produção.
// Garante: (1) mesma data de sempre, inclusive perto da meia-noite de São Paulo; (2) 1.500 chamadas rápidas.
// Rodar: node deploy/teste-data-sp.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../public/workflowark.html', import.meta.url), 'utf8');
const arq = html.match(/src="(workflowark-sync-[^"]+\.js)"/)[1];
const src = readFileSync(new URL('../public/' + arq, import.meta.url), 'utf8');
const ini = src.indexOf('function dataSP'), fim = src.indexOf('function hojeSP');
const trecho = src.slice(ini, src.indexOf('\n', fim) + 1);
const ctx = vm.createContext({ Date, Intl });
vm.runInContext(trecho, ctx);

const ref = d => d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
let falhas = 0;
const ok = (cond, msg) => { if (!cond) { falhas++; console.log('FALHOU:', msg); } };

// 1) equivalência: 5 mil instantes ao longo de 2026 e 2027, mais as viradas de meia-noite em SP (03:00 UTC)
for (let i = 0; i < 5000; i++) {
  const d = new Date(Date.UTC(2026, 0, 1) + Math.random() * 730 * 86400000);
  if (ctx.dataSP(d) !== ref(d)) { ok(false, 'data diferente em ' + d.toISOString()); break; }
}
for (const iso of ['2026-09-30T02:59:59.999Z', '2026-09-30T03:00:00.000Z', '2026-12-31T23:30:00Z', '2027-01-01T03:00:00Z']) {
  const d = new Date(iso);
  ok(ctx.dataSP(d) === ref(d), 'virada de meia-noite ' + iso + ': ' + ctx.dataSP(d) + ' x ' + ref(d));
}
ok(ctx.dataSP() === ref(new Date()), 'dataSP() sem argumento é hoje');
ok(ctx.hojeSP() === ref(new Date()), 'hojeSP() é hoje');
ok(/^\d{4}-\d{2}-\d{2}$/.test(ctx.hojeSP()), 'formato AAAA-MM-DD');

// 2) velocidade: o que um render do quadro faz
ctx.dataSP(new Date()); // aquece
const t0 = performance.now();
for (let i = 0; i < 1500; i++) ctx.dataSP(new Date(Date.now() + (i % 2) * 7 * 86400000));
const ms = performance.now() - t0;
console.log('1.500 chamadas de dataSP: ' + ms.toFixed(1) + ' ms');
ok(ms < 15, '1.500 chamadas levaram ' + ms.toFixed(1) + ' ms (limite 15 ms)');

console.log(falhas ? `\n${falhas} falha(s)` : '\nOK: dataSP igual e rápido');
process.exit(falhas ? 1 : 0);
