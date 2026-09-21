/*
 Teste do módulo puro de Entregas do portal (src/lib/entregas.js), lote 2 de 21/09.
 Uso: node deploy/teste-entregas.mjs
*/
import { derivarEntregas, aplicarDecisaoCliente } from '../src/lib/entregas.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) falhas++; };
const AGORA = '2026-09-21T18:00:00.000Z';
const T = [
  { id: 'a', title: 'Reel Café', status: 'concluido', clienteId: 'vivenda', formato: 'reel', publicarEm: '2026-09-18T12:00', concluidaEm: '2026-09-17T10:00:00.000Z', legenda: 'Legenda do reel', attachments: [{ nome: 'reel.mp4', url: 'https://drive.google.com/x' }] },
  { id: 'b', title: 'Post sem nada', status: 'concluido', clienteId: 'vivenda', concluidaEm: '2026-09-10T10:00:00.000Z' },
  { id: 'c', title: 'Story Novo Gama', status: 'homologcli', clienteId: 'vivenda', formato: 'story', publicarEm: '2026-09-22T12:00', briefing: 'Bastidores', attachments: [{ nome: 'story.png', url: 'https://drive.google.com/y' }], aprovacaoEm: '2026-09-20T18:40:00.000Z' },
  { id: 'd', title: 'Vivenda no título, outro id', status: 'concluido', clienteId: 'fercon', publicarEm: '2026-09-15T12:00', concluidaEm: '2026-09-15T10:00:00.000Z' },
  { id: 'e', title: 'Relatório Fercon', status: 'homologcli', clienteId: 'fercon' },
  { id: 'f', title: 'Antiga', status: 'concluido', clienteId: 'vivenda', publicarEm: '2026-06-01T12:00', concluidaEm: '2026-06-01T10:00:00.000Z' },
];

console.log('derivarEntregas');
const r = derivarEntregas(T, 'vivenda', AGORA);
ok(r.entregas.length === 1 && r.entregas[0].id === 'a', `entrega = concluída com mídia, legenda ou data de publicação, nos últimos 60 dias (veio ${r.entregas.map((x) => x.id)})`);
ok(r.entregas[0].links.length === 1 && r.entregas[0].links[0].url.startsWith('https://'), 'entrega leva os links dos anexos');
ok(r.entregas[0].legenda === 'Legenda do reel' && r.entregas[0].formato === 'reel', 'entrega leva legenda e formato');
ok(r.aprovacoes.length === 1 && r.aprovacoes[0].id === 'c', `aprovação = status homologcli do cliente (veio ${r.aprovacoes.map((x) => x.id)})`);
ok(r.aprovacoes[0].desde === '2026-09-20T18:40:00.000Z' && r.aprovacoes[0].briefing === 'Bastidores', 'aprovação leva desde quando espera e o briefing');
ok(!JSON.stringify(r).includes('fercon') && !JSON.stringify(r).includes('Relatório Fercon'), 'nada de outro cliente vaza');
ok(!('resp' in r.entregas[0]) && !('timeSpent' in r.entregas[0]), 'campos internos (responsável, horas) não vão pro cliente');
const vazio = derivarEntregas([], 'vivenda', AGORA);
ok(vazio.entregas.length === 0 && vazio.aprovacoes.length === 0, 'sem tarefas: listas vazias, sem erro');

console.log('aplicarDecisaoCliente');
const ap = aplicarDecisaoCliente(T[2], 'aprovar', '', AGORA);
ok(ap.status === 'concluido' && ap.concluidaEm === AGORA && ap.aprovadoClienteEm === AGORA && ap.up === AGORA, `aprovar: concluída agora, carimbo up (veio ${ap.status})`);
const aj = aplicarDecisaoCliente(T[2], 'ajustar', 'Trocar a foto 2', AGORA);
ok(aj.status === 'andamento' && aj.up === AGORA, `ajustar: volta pra andamento (veio ${aj.status})`);
ok(Array.isArray(aj.comments) && aj.comments[aj.comments.length - 1].texto === 'Trocar a foto 2' && aj.comments[aj.comments.length - 1].autor === 'Cliente', 'ajustar: comentário do cliente entra na tarefa');
ok(T[2].status === 'homologcli', 'não muta a tarefa original');
let erro = '';
try { aplicarDecisaoCliente(T[0], 'aprovar', '', AGORA); } catch (e) { erro = e.message; }
ok(/aprovação/.test(erro), 'só decide tarefa que está esperando o cliente');
try { erro = ''; aplicarDecisaoCliente(T[2], 'ajustar', '', AGORA); } catch (e) { erro = e.message; }
ok(/comentário/.test(erro), 'ajustar exige comentário');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
