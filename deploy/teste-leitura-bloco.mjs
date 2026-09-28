/*
 Guarda: toda leitura de bloco escolhido pelo navegador passa pela regra de Ver (28/09/2026).

 O GET ?key= já recusava cobrança, acerto e extratos para quem não vê essas abas, mas a ação
 POST "load-key" lia qualquer bloco de STATE_KEYS sem checar nada: um membro "viewer" pegava o
 wfa-acerto (Pix e valores da equipe) com um POST. Este teste lê o código do servidor e falha se
 algum caminho que recebe a chave do corpo ou da URL consultar o banco sem podeVerBloco.

 Uso: node deploy/teste-leitura-bloco.mjs
*/
import { readFile } from 'node:fs/promises';

const ARQ = 'src/routes/api/workflowark.state.ts';
const src = await readFile(ARQ, 'utf8');
let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

// 1. Cada ação do POST que pega body.key e consulta o banco por essa chave.
const blocos = src.split(/if \(action === "/).slice(1).map((b) => ({ nome: b.slice(0, b.indexOf('"')), corpo: b }));
const leemChave = blocos.filter((b) => /String\(body\.key/.test(b.corpo) && /\.eq\("key", key\)/.test(b.corpo));
ok(leemChave.some((b) => b.nome === 'load-key'), 'a ação load-key foi encontrada no servidor');
for (const b of leemChave) {
  const i = b.corpo.indexOf('.eq("key", key)');
  const antes = b.corpo.slice(0, i);
  ok(/podeVerBloco|podeEditarBloco/.test(antes), `ação ${b.nome} checa a permissão antes de ler o bloco`);
}

// 2. GET ?key= continua checando.
const get = src.slice(src.indexOf('if (soKey) {'));
const iGet = get.indexOf('.eq("key", soKey)');
ok(iGet > 0 && /podeVerBloco\(/.test(get.slice(0, iGet)), 'GET ?key= checa a permissão antes de ler o bloco');

// 3. wfa-gcal (agenda Google de cada membro): só a própria entrada, em todo caminho de leitura.
const lk = blocos.find((b) => b.nome === 'load-key');
ok(!!lk && /return json\(soDoMembro\(key,/.test(lk.corpo), 'load-key devolve só a agenda do próprio membro');
ok(/\[soKey\]: soDoMembro\(soKey,/.test(get), 'GET ?key= devolve só a agenda do próprio membro');
ok(/\[row\.key, soDoMembro\(row\.key,/.test(src), 'load geral devolve só a agenda do próprio membro');
const fn = src.match(/function soDoMembro\([\s\S]*?\n\}/);
ok(!!fn && /"wfa-gcal"/.test(fn[0]) && /\[memberId\]/.test(fn[0]), 'soDoMembro filtra o wfa-gcal pelo id do membro');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
