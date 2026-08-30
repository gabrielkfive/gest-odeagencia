#!/usr/bin/env node
/**
 * Confere se a Central de Paginas (/paginas) esta em dia com o que a ARK tem no ar.
 *
 * O cadastro em public/paginas.html e MANUAL. Em 30/08/2026 havia 16 workers no ar e
 * so 10 cadastrados: proposta Mazuchi, site Moenda, plano EMFACE e os dois de roteiros
 * do Nutricao Brasil tinham ficado de fora, alguns ha semanas. Este script existe para
 * isso nao acontecer de novo.
 *
 * Descoberta do que esta no ar, em duas vias:
 *   1. Com CLOUDFLARE_API_TOKEN no ambiente, lista todos os Workers da conta pela API.
 *      E como roda no CI, que ja tem esse secret para o deploy.
 *   2. Sem token, varre os wrangler.jsonc/wrangler.toml das pastas de projeto locais.
 *      E como roda na maquina do Gabriel.
 *
 * Sai com codigo 0 mesmo achando pendencia. Isto e um aviso, nao um portao: a regra n1
 * do projeto e que nada bloqueia producao. Use --strict para sair 1 quando achar algo.
 *
 * Uso:
 *   node deploy/checa-paginas.mjs
 *   node deploy/checa-paginas.mjs --strict
 *   node deploy/checa-paginas.mjs --arquivo caminho/para/paginas.html
 */

import { readFileSync, existsSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTA = process.env.CLOUDFLARE_ACCOUNT_ID || 'e85057a4ce95cb115958cbf045f7457c';
const SUFIXO = '.arkcontent.workers.dev';
const TIMEOUT = 15000;

/**
 * Workers que existem mas nao entram na Central: duplicata ou versao superada.
 * Achados pela primeira rodada com a API em 30/08/2026. Valeria apagar os dois
 * la na Cloudflare, ai estas linhas somem.
 */
const NAO_E_PAGINA = new Set([
  // Deploy antigo do proprio WorkFlowArk, de antes do nome atual. Responde 307
  // igual ao workflowark.arkcontent.workers.dev, que e o que a equipe usa.
  'arkcontent',
  // Primeira versao da proposta da Mazuchi, substituida por proposta-mazuchi,
  // que e a que fechou o contrato e ja esta cadastrada.
  'proposta-taisa',
]);

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const idxArq = args.indexOf('--arquivo');
const ARQUIVO = idxArq >= 0 ? args[idxArq + 1] : join(RAIZ, 'public', 'paginas.html');

/** Pastas onde os projetos da ARK vivem nesta maquina, para o modo sem token. */
const PASTAS_LOCAIS = [
  join(homedir(), 'Documents', 'ARK CONTENT'),
  join(homedir(), 'Desktop'),
  RAIZ,
];

// ---------------------------------------------------------------- helpers

function log(...a) { console.log(...a); }

function resumo(md) {
  const f = process.env.GITHUB_STEP_SUMMARY;
  if (f) { try { appendFileSync(f, md + '\n'); } catch { /* summary e best effort */ } }
}

async function buscar(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeout || TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

// ------------------------------------------------- o que ja esta cadastrado

/**
 * Le o array PAGINAS de dentro do <script> do paginas.html.
 * Nao usa eval: casa os campos por regex, que basta para o formato do arquivo.
 */
function lerCadastradas(caminho) {
  if (!existsSync(caminho)) {
    throw new Error(`Nao achei ${caminho}`);
  }
  const html = readFileSync(caminho, 'utf8');
  const bloco = html.match(/var PAGINAS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!bloco) throw new Error('Nao achei o array PAGINAS em ' + caminho);

  const itens = [];
  const re = /\{nome:"([^"]+)", cliente:"[^"]*", tipo:"([a-z]+)"[\s\S]*?url:"([^"]+)"/g;
  let m;
  while ((m = re.exec(bloco[1])) !== null) {
    itens.push({ nome: m[1], tipo: m[2], url: m[3] });
  }
  if (itens.length === 0) throw new Error('PAGINAS existe mas veio vazio, regex desatualizada?');
  return itens;
}

/** Le os contextos validos do proprio paginas.html, para nao virar lista paralela. */
function lerTipos(caminho) {
  const html = readFileSync(caminho, 'utf8');
  const bloco = html.match(/var TIPOS\s*=\s*\[([\s\S]*?)\n\];/);
  if (!bloco) return [];
  return [...bloco[1].matchAll(/\{id:"([a-z]+)"/g)].map((m) => m[1]);
}

/** mazuchi.arkcontent.workers.dev/blog/ -> mazuchi */
function subdominio(url) {
  try {
    const h = new URL(url).hostname;
    return h.endsWith(SUFIXO) ? h.slice(0, -SUFIXO.length) : null;
  } catch { return null; }
}

// ------------------------------------------------------ o que esta no ar

async function viaApi(token) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CONTA}/workers/scripts`;
  const r = await buscar(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) {
    log(`  API da Cloudflare respondeu ${r.status}, caindo para a varredura local.`);
    return null;
  }
  const j = await r.json();
  if (!j.success || !Array.isArray(j.result)) return null;
  return j.result.map((s) => s.id).sort();
}

function nomeDoWrangler(caminho) {
  try {
    const t = readFileSync(caminho, 'utf8');
    const m = t.match(/"name"\s*:\s*"([^"]+)"/) || t.match(/^\s*name\s*=\s*"([^"]+)"/m);
    return m ? m[1] : null;
  } catch { return null; }
}

/** Varre as pastas de projeto atras de wrangler.jsonc/toml. Profundidade curta de proposito. */
function viaDisco() {
  const achados = new Set();
  const pular = new Set(['node_modules', '.git', '.output', '.wrangler', 'dist', '.claude']);

  function anda(dir, prof) {
    if (prof > 4) return;
    let itens;
    try { itens = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const it of itens) {
      if (it.isFile() && (it.name === 'wrangler.jsonc' || it.name === 'wrangler.toml' || it.name === 'wrangler.json')) {
        const n = nomeDoWrangler(join(dir, it.name));
        if (n) achados.add(n);
      } else if (it.isDirectory() && !pular.has(it.name) && !it.name.startsWith('.')) {
        anda(join(dir, it.name), prof + 1);
      }
    }
  }

  for (const p of PASTAS_LOCAIS) {
    try { if (statSync(p).isDirectory()) anda(p, 0); } catch { /* pasta pode nao existir nesta maquina */ }
  }
  return [...achados].sort();
}

/** Bate na URL e devolve status e <title>, para o card ja sair preenchido. */
async function sondar(nome) {
  const url = `https://${nome}${SUFIXO}/`;
  try {
    const r = await buscar(url);
    if (!(r.status >= 200 && r.status < 400)) return { nome, url, status: r.status, viva: false };
    const tipo = r.headers.get('content-type') || '';
    let titulo = '';
    if (tipo.includes('text/html')) {
      const html = await r.text();
      const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      titulo = m ? desescapa(m[1]) : '';
    }
    return { nome, url, status: r.status, viva: true, titulo, html: tipo.includes('text/html') };
  } catch (e) {
    return { nome, url, status: 0, viva: false, erro: String(e.message || e) };
  }
}

/** O <title> vem com entidade HTML: "Fonseca &amp; Cavalcanti" -> "Fonseca & Cavalcanti". */
function desescapa(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
}

async function emLotes(itens, fn, tamanho = 6) {
  const out = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    out.push(...await Promise.all(itens.slice(i, i + tamanho).map(fn)));
  }
  return out;
}

// ---------------------------------------------------------------- principal

async function main() {
  log('Central de Paginas: conferindo o que esta no ar contra o que esta cadastrado.\n');

  const cadastradas = lerCadastradas(ARQUIVO);
  const jaTem = new Set(cadastradas.map((p) => subdominio(p.url)).filter(Boolean));
  log(`  Cadastradas: ${cadastradas.length} cards, ${jaTem.size} subdominios distintos.`);

  // Card com contexto que nao existe em TIPOS renderiza com o id cru no lugar do
  // rotulo, e o filtro dele nunca aparece. Erro silencioso, entao vale avisar.
  const tiposValidos = new Set(lerTipos(ARQUIVO));
  const orfaos = tiposValidos.size
    ? cadastradas.filter((p) => p.tipo && !tiposValidos.has(p.tipo))
    : [];
  if (orfaos.length) {
    log(`  ATENCAO: ${orfaos.length} card(s) com contexto fora de TIPOS:`);
    orfaos.forEach((o) => log(`    ${o.nome} -> tipo:"${o.tipo}"`));
    resumo(`## Central de Paginas\n\n${orfaos.length} card(s) com contexto que nao existe em TIPOS: `
      + orfaos.map((o) => `\`${o.nome}\` (\`${o.tipo}\`)`).join(', '));
  }

  const token = process.env.CLOUDFLARE_API_TOKEN;
  let nomes = token ? await viaApi(token) : null;
  const via = nomes ? 'API da Cloudflare' : 'varredura dos wrangler locais';
  if (!nomes) nomes = viaDisco();
  nomes = nomes.filter((n) => !NAO_E_PAGINA.has(n));
  log(`  Descoberta por ${via}: ${nomes.length} workers candidatos.\n`);

  if (nomes.length === 0) {
    log('  Nada para conferir. Sem token e sem wrangler local, o script nao tem como saber o que existe.');
    return 0;
  }

  const sondas = await emLotes(nomes, sondar);
  const vivas = sondas.filter((s) => s.viva);
  const faltando = vivas.filter((s) => !jaTem.has(s.nome) && s.html);

  // O contrario tambem apodrece: card cadastrado apontando para pagina que morreu.
  const conferidas = await emLotes(
    cadastradas.filter((p) => subdominio(p.url)),
    async (p) => ({ ...p, r: await sondar(subdominio(p.url)) }),
  );
  const quebradas = conferidas.filter((p) => !p.r.viva);

  log(`  No ar: ${vivas.length} de ${nomes.length}.`);
  log(`  Fora da lista: ${faltando.length}.`);
  log(`  Cadastradas que nao respondem: ${quebradas.length}.\n`);

  if (faltando.length === 0 && quebradas.length === 0) {
    log('OK: a Central de Paginas esta em dia.');
    resumo('## Central de Paginas\n\nEm dia. Nenhuma pagina no ar fora da lista.');
    return 0;
  }

  let md = '## Central de Paginas\n';

  if (faltando.length) {
    log('PAGINAS NO AR QUE NAO ESTAO NA LISTA:\n');
    md += `\n### ${faltando.length} pagina(s) no ar fora da lista\n\n`;
    md += 'Cole o trecho abaixo em `public/paginas.html`, dentro de `var PAGINAS = [`:\n\n```js\n';
    for (const f of faltando) {
      const nome = f.titulo ? f.titulo.split(/[·|]/)[0].trim() : f.nome;
      const card =
        `  {nome:"${nome}", cliente:"A PREENCHER", tipo:"planejamento",\n` +
        `   url:"https://${f.nome}${SUFIXO}",\n` +
        `   desc:"A PREENCHER."},`;
      log(`  ${f.nome}${SUFIXO}`);
      log(`    titulo: ${f.titulo || '(sem title)'}`);
      log(card + '\n');
      md += card + '\n';
    }
    const tipos = lerTipos(ARQUIVO);
    const lista = tipos.length ? tipos.map((t) => '`' + t + '`').join(', ') : 'ver TIPOS em paginas.html';
    log(`  Contextos validos: ${tipos.join(', ') || '(nao consegui ler TIPOS)'}\n`);
    md += '```\n\nContextos validos: ' + lista + '.\n';
  }

  if (quebradas.length) {
    log('CARDS CADASTRADOS QUE NAO RESPONDEM:\n');
    md += `\n### ${quebradas.length} card(s) apontando para pagina que nao responde\n\n`;
    for (const q of quebradas) {
      const linha = `${q.nome} -> ${q.url} (status ${q.r.status}${q.r.erro ? ', ' + q.r.erro : ''})`;
      log('  ' + linha);
      md += `- ${linha}\n`;
    }
    log('');
  }

  resumo(md);
  log(STRICT ? 'Saindo 1 por causa do --strict.' : 'Isto e um aviso. O deploy nao foi bloqueado.');
  return STRICT ? 1 : 0;
}

main()
  .then((c) => process.exit(c))
  .catch((e) => {
    console.error('checa-paginas falhou:', e.message);
    // Falha do proprio script nunca derruba nada. Ele e um aviso.
    process.exit(0);
  });
