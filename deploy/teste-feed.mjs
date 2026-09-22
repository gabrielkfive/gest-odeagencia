/*
 Teste do módulo puro da Prévia do Feed (src/lib/feed.js), tela 5 do doc 11.
 Uso: node deploy/teste-feed.mjs
*/
import { derivarFeed } from '../src/lib/feed.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };
const AGORA = '2026-09-22T18:00:00.000Z';
const arte = (n) => [{ nome: n, url: 'https://drive.google.com/' + n }];
const T = [
  { id: '1', title: 'Post A', status: 'concluido', clienteId: 'vivenda', formato: 'estatico', publicarEm: '2026-09-20T12:00', attachments: arte('a.jpg') },
  { id: '2', title: 'Reel B', status: 'homologcli', clienteId: 'vivenda', formato: 'reel', publicarEm: '2026-09-24T18:00', attachments: arte('b.jpg') },
  { id: '3', title: 'Story C', status: 'concluido', clienteId: 'vivenda', formato: 'story', publicarEm: '2026-09-21T09:00', attachments: arte('c.jpg') },
  { id: '4', title: 'Post sem data', status: 'concluido', clienteId: 'vivenda', formato: 'estatico', attachments: arte('d.jpg') },
  { id: '5', title: 'Post de outro cliente', status: 'concluido', clienteId: 'fercon', formato: 'estatico', publicarEm: '2026-09-23T12:00', attachments: arte('e.jpg') },
  { id: '6', title: 'Backlog sem arte', status: 'backlog', clienteId: 'vivenda', formato: 'estatico', publicarEm: '2026-09-25T12:00' },
];

console.log('derivarFeed');
const f = derivarFeed(T, 'vivenda', AGORA);
ok(!f.some((x) => x.id === '3'), 'story fica fora do feed (não entra na grade do perfil)');
ok(!f.some((x) => x.id === '5'), 'nada de outro cliente entra');
ok(f.map((x) => x.id).join(',') === '2,1,4', `ordem do Instagram: mais novo primeiro, sem data por último (veio ${f.map((x) => x.id).join(',')})`);
ok(f[0].futuro === true && f[1].futuro === false, 'marca o que ainda vai publicar');
ok(f[0].previa && f[0].previa.url.endsWith('b.jpg'), 'leva a arte da tarefa');
ok(f.every((x) => x.previa), 'item sem arte não entra na grade');
ok(f[0].proporcao === '9:16' && f[1].proporcao === '4:5', 'reel 9:16, post 4:5 na abertura do item');
ok(derivarFeed(T, 'vivenda', AGORA, 2).length === 2, 'respeita o limite de itens');
ok(derivarFeed([], 'vivenda', AGORA).length === 0, 'sem tarefas: grade vazia, sem erro');
ok(f.every((x) => !('resp' in x)), 'nada de campo interno na grade do cliente');

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
