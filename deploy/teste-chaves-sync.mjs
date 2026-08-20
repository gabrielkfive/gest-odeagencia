/*
 Guarda de INVARIANTE entre as duas listas de chaves do sync.

 A regra: toda chave que o cliente PODE empurrar pra nuvem tem que estar liberada no
 servidor. Cliente = WFA_CLOUD_KEYS menos WFA_NO_PUSH (public/workflowark.html).
 Servidor = STATE_KEYS (src/routes/api/workflowark.state.ts).

 Por que isto existe: em 20/08/2026 descobrimos que `wfa-notif-read` estava na lista do
 cliente, NAO estava em WFA_NO_PUSH e NAO estava no STATE_KEYS. Todo save dela voltava
 "Bloco invalido" e a fila do cliente descartava em silencio. O cliente ainda tinha o
 codigo de UNIAO pra essa chave, que nunca rodava porque nada conseguia escrever no
 servidor. Efeito pro usuario: marcar notificacao como lida nunca atravessava de aparelho
 e o sino voltava cheio, exatamente o problema que a sessao de 27/07 achou ter resolvido.

 Uma linha esquecida numa lista, semanas de sintoma, zero mensagem de erro.

 Uso: node deploy/teste-chaves-sync.mjs
*/
import { readFile } from 'fs/promises';

const html = await readFile('public/workflowark.html', 'utf8');
const srv = await readFile('src/routes/api/workflowark.state.ts', 'utf8');

// Regex literal de proposito: construir com new RegExp exige escapar as barras duas
// vezes, e uma delas se perde facil na escrita do arquivo (aconteceu ao criar este teste).
const RE_CLOUD_KEYS = /const WFA_CLOUD_KEYS\s*=\s*\[([\s\S]*?)\]/;
const RE_NO_PUSH = /const WFA_NO_PUSH\s*=\s*new Set\(\[([\s\S]*?)\]\)/;

function chavesDe(regex, nome) {
  const m = html.match(regex);
  if (!m) throw new Error('nao achei ' + nome + ' no workflowark.html');
  return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

const cloudKeys = chavesDe(RE_CLOUD_KEYS, 'WFA_CLOUD_KEYS');
const noPush = chavesDe(RE_NO_PUSH, 'WFA_NO_PUSH');

const i = srv.indexOf('const STATE_KEYS = new Set([');
if (i < 0) throw new Error('nao achei STATE_KEYS no state.ts');
const bloco = srv.slice(i, srv.indexOf(']);', i));
const stateKeys = new Set([...bloco.matchAll(/"([^"]+)"/g)].map((x) => x[1]));

const empurraveis = [...cloudKeys].filter((k) => !noPush.has(k));
const orfas = empurraveis.filter((k) => !stateKeys.has(k));

console.log(`cliente empurra ${empurraveis.length} chaves; servidor libera ${stateKeys.size}`);

if (orfas.length) {
  console.log('TESTE DE CHAVES FALHOU: o cliente empurra chave que o servidor recusa.');
  console.log('Cada uma destas volta "Bloco invalido" e e DESCARTADA, sem sincronizar:');
  orfas.forEach((k) => console.log('  - ' + k));
  console.log('');
  console.log('Conserto: adicione a chave em STATE_KEYS (src/routes/api/workflowark.state.ts),');
  console.log('ou em WFA_NO_PUSH (public/workflowark.html) se ela for mesmo so de leitura.');
  process.exit(1);
}
console.log('OK: toda chave que o cliente empurra esta liberada no servidor.');
