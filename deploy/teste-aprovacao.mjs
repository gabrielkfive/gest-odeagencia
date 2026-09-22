/*
 Teste do módulo puro de Aprovação dentro do /app (src/lib/aprovacao.js), tarefa 07 do doc 11.
 Uso: node deploy/teste-aprovacao.mjs
*/
import { derivarAprovacoes, marcarEnviadoAoCliente } from '../src/lib/aprovacao.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };
const AGORA = '2026-09-22T18:00:00.000Z';
const T = [
  { id: 'a', title: 'Reel Café', status: 'homologcli', clienteId: 'vivenda', formato: 'reel', publicarEm: '2026-09-24T12:00',
    legenda: 'Uma legenda bem comprida que passa dos cento e vinte e cinco caracteres pra testar o corte igual ao do Instagram, com o resto escondido atrás do mais.',
    attachments: [{ nome: 'capa.png', url: 'https://drive.google.com/capa.png' }, { nome: 'reel.mp4', url: 'https://drive.google.com/reel.mp4' }],
    aprovacaoEm: '2026-09-18T18:00:00.000Z' },
  { id: 'b', title: 'Post feed', status: 'homologcli', clienteId: 'vivenda', formato: 'post', legenda: 'Curta', attachments: [] },
  { id: 'c', title: 'Story', status: 'homologcli', clienteId: 'vivenda', formato: 'story', attachments: [{ nome: 'arte.jpg', url: 'https://drive.google.com/arte.jpg' }] },
  { id: 'd', title: 'Carrossel', status: 'homologcli', clienteId: 'vivenda', formato: 'carrossel', attachments: [{ nome: 'p1.jpg', url: 'https://drive.google.com/p1.jpg' }] },
  { id: 'e', title: 'Relatório Fercon', status: 'homologcli', clienteId: 'fercon' },
  { id: 'f', title: 'Reel já concluído', status: 'concluido', clienteId: 'vivenda' },
];

console.log('derivarAprovacoes');
const r = derivarAprovacoes(T, 'vivenda', AGORA);
ok(r.length === 4 && r.map((x) => x.id).join('') === 'abcd', `só homologcli do cliente (veio ${r.map((x) => x.id).join(',')})`);
const a = r[0];
ok(a.proporcao === '9:16', `reel enquadra 9:16 (veio ${a.proporcao})`);
ok(r[1].proporcao === '4:5' && r[2].proporcao === '9:16' && r[3].proporcao === '1:1', `post 4:5, story 9:16, carrossel 1:1 (veio ${r[1].proporcao}, ${r[2].proporcao}, ${r[3].proporcao})`);
ok(a.previa && a.previa.url === 'https://drive.google.com/capa.png' && a.previa.tipo === 'imagem', 'prévia é o primeiro anexo de imagem, não o vídeo');
ok(r[2].previa.url === 'https://drive.google.com/arte.jpg', 'story usa a arte anexada');
ok(r[1].previa === null && r[1].semArquivo === true, 'sem anexo: prévia nula e aviso de arquivo faltando');
ok(a.legendaCurta.length <= 128 && a.legendaCurta.endsWith('...') && a.legendaMais === true, `legenda corta em 125 com mais (veio ${a.legendaCurta.length})`);
ok(r[1].legendaCurta === 'Curta' && r[1].legendaMais === false, 'legenda curta não ganha corte');
ok(a.diasParado === 4, `dias parado conta desde aprovacaoEm (veio ${a.diasParado})`);
ok(r[1].diasParado === 0, 'sem aprovacaoEm: zero dia parado, sem erro');
ok(!JSON.stringify(r).includes('fercon'), 'nada de outro cliente vaza');
ok(derivarAprovacoes([], 'vivenda', AGORA).length === 0, 'sem tarefas: lista vazia');

console.log('marcarEnviadoAoCliente');
const e1 = marcarEnviadoAoCliente(T[0], AGORA);
ok(e1.enviadoClienteEm === AGORA && e1.up === AGORA, 'carimba envio e up');
ok(Array.isArray(e1.hist) && /[Ee]nviad/.test(e1.hist[e1.hist.length - 1].txt), 'escreve no histórico da tarefa');
ok(T[0].enviadoClienteEm === undefined, 'não muta a tarefa original');
const e2 = marcarEnviadoAoCliente(e1, '2026-09-22T21:00:00.000Z');
ok(e2.hist.length === e1.hist.length, 'reenvio no mesmo dia não duplica a linha do histórico');
ok(e2.enviadoClienteEm === '2026-09-22T21:00:00.000Z', 'reenvio atualiza o carimbo');
const e3 = marcarEnviadoAoCliente(e1, '2026-09-23T09:00:00.000Z');
ok(e3.hist.length === e1.hist.length + 1, 'envio em outro dia entra no histórico');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
