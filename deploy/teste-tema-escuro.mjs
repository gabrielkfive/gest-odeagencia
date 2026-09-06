/* GUARDA DO TEMA ESCURO E DO GATE DE POP (25/08/2026)
   Dois bugs que ja tinham sido consertados e VOLTARAM. Este teste trava os invariantes.

   1) ESPECIFICIDADE: regra clara escrita com ID (#page-tarefas .tl-table = 1 id + 1 classe)
      vence a regra de tema (body.aura-dark .tl-table = 0 id + 2 classes), porque id ganha de
      classe. Foi assim que a vista LISTA voltou a piscar branca no modo escuro.
   2) VARIAVEL INDEFINIDA: var(--x) sem fallback e nunca definida invalida a declaracao
      (background vira transparente, border-color vira currentColor).
   3) GATE DE POP: quando o gate recusa a conclusao, o cartao nao pode voltar em silencio nem
      levar toast de sucesso por cima do aviso.
*/
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'public/workflowark.html'), 'utf8');
// O monolito foi fatiado: parte do CSS (inclusive as :root{} vars) vive em arquivos .css
// linkados. Junta o HTML + todo CSS local linkado para as checagens de estilo continuarem
// valendo onde quer que o CSS esteja. Pula CDN (fontes).
let cssExterno = '';
for (const m of html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)) {
  if (/^https?:/.test(m[1])) continue;
  try { cssExterno += '\n' + readFileSync(join(raiz, 'public', m[1]), 'utf8'); } catch (e) {}
}
const fonte = html + cssExterno;

let falhas = 0;
const ok = (m) => console.log('  ✓ ' + m);
const nok = (m) => { falhas++; console.log('  ✗ FALHOU: ' + m); };

/* ---------- 1. variaveis CSS usadas sem fallback e nunca definidas ---------- */
console.log('\n[1] Variaveis CSS');
const usadas = new Set([...fonte.matchAll(/var\(\s*(--[\w-]+)\s*[),]/g)].map(m => m[1]));
const definidas = new Set([...fonte.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const semFallback = [...usadas].filter(v =>
  !definidas.has(v) && fonte.includes('var(' + v + ')'));
if (semFallback.length) nok('usadas sem fallback e nunca definidas: ' + semFallback.join(', '));
else ok('toda var() sem fallback esta definida');

/* ---------- 2. modo escuro da vista LISTA de tarefas ---------- */
console.log('\n[2] Modo escuro da vista Lista (#page-tarefas .tl-*)');
const claras = [...fonte.matchAll(/#page-tarefas (\.tl-[\w-]+(?::hover)?)\s*\{([^}]*)\}/g)];
const temFundoClaro = claras.filter(m => /background:\s*#(fff|fafafa|f0f0ee|fff3cd|e7f0ff|e6f8ec)/i.test(m[2]));
if (!temFundoClaro.length) nok('nao achei as regras claras da vista lista (o teste ficou cego)');
for (const m of temFundoClaro) {
  const sel = m[1].replace(':hover', '');
  const alvo = 'body.aura-dark #page-tarefas ' + sel;
  if (fonte.includes(alvo)) ok('#page-tarefas ' + m[1] + ' tem contraparte escura de especificidade maior');
  else nok('#page-tarefas ' + m[1] + ' pinta claro e NAO tem body.aura-dark #page-tarefas ' + sel);
}

/* ---------- 3. gate de POP nao pode reverter em silencio ---------- */
console.log('\n[3] Gate de POP');
// janela = do inicio do listener ate o fecho dele (indentacao de 4 espacos), nao ate o
// primeiro '});', que cai dentro do forEach de ordenacao e cegava o teste.
const iDrop = html.indexOf("list.addEventListener('drop'");
const fim = iDrop >= 0 ? html.indexOf('\n    });', iDrop) : -1;
if (iDrop < 0 || fim < 0) nok('handler de drop nao encontrado');
else {
  const d = html.slice(iDrop, fim);
  if (/bloqueado\s*=\s*true/.test(d) && /t\.status\s*=\s*origem/.test(d))
    ok('drop devolve o cartao pra coluna de ORIGEM quando o gate recusa');
  else nok('drop nao devolve o cartao pra coluna de origem quando o gate recusa');

  if (/if\(bloqueado\)[\s\S]{0,140}return;/.test(d))
    ok('drop nao emite toast de sucesso quando o gate recusa');
  else nok('drop pode emitir toast de sucesso por cima do aviso do POP');

  if (/taskStatusLabel\(t\.status\)/.test(d))
    ok('o toast informa o status REAL, nao a coluna de destino');
  else nok('o toast usa a coluna de destino em vez do status real (pode mentir)');

  if (/openTaskDetail\(id\)/.test(d))
    ok('drop abre o checklist que esta travando');
  else nok('drop nao abre o checklist que esta travando');
}
const mv = html.match(/function moveTask\([\s\S]{0,700}?\n\}/);
if (mv && /taskConcluir\(t\)\)\{renderTarefas\(\);setTimeout\(\(\)=>\{try\{openTaskDetail/.test(mv[0]))
  ok('moveTask abre o checklist quando o gate recusa');
else nok('moveTask so repinta e o cartao "pula de volta" sem explicacao');

console.log('\nRESULTADO: ' + (falhas ? falhas + ' FALHA(S)' : 'tudo certo'));
process.exit(falhas ? 1 : 0);
