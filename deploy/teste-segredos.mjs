/*
 Guarda: token de LINK PUBLICO so pode sair de gerador criptografico.

 O portal do cliente e a aprovacao de conteudo usam "a URL e o segredo": quem tem o link
 ve os dados daquele cliente sem login. No caso do portal o token e PERSISTENTE, gerado uma
 vez por cliente e reusado pra sempre.

 Ate 20/08/2026 havia um fallback silencioso:
     crypto.randomUUID?.() ?? (Date.now() + "" + Math.random())
 Math.random NAO e criptografico e Date.now e adivinhavel. Se o fallback disparasse uma
 unica vez, aquele cliente ficava com um link permanente que da pra adivinhar. Trocado por
 dois geradores criptograficos (randomUUID e getRandomValues) e falha explicita se nenhum
 existir: nao gerar o link e melhor do que gerar um fraco.

 Uso: node deploy/teste-segredos.mjs
*/
import { readFile, readdir } from 'fs/promises';

const ARQ = 'src/routes/api/workflowark.state.ts';
const src = await readFile(ARQ, 'utf8');
const linhas = src.split('\n');
const falhas = [];

// 1) Nenhuma linha que atribui um token pode encostar em Math.random ou Date.now.
linhas.forEach((l, i) => {
  const semComentario = l.replace(/\/\/.*$/, '');
  const atribuiToken = /\btoken\s*=/.test(semComentario) || /\bconst token\b/.test(semComentario);
  if (!atribuiToken) return;
  if (/Math\.random|Date\.now/.test(semComentario)) {
    falhas.push(`${ARQ}:${i + 1} gera token com fonte previsivel: ${l.trim().slice(0, 90)}`);
  }
});

// 2) O gerador tem que existir e nao pode ter fallback fraco dentro dele.
const m = src.match(/function novoTokenPublico\(\)[\s\S]*?\n\}/);
if (!m) {
  falhas.push('novoTokenPublico() sumiu. Era o gerador unico dos tokens de link publico.');
} else if (/Math\.random|Date\.now/.test(m[0])) {
  falhas.push('novoTokenPublico() voltou a ter fonte previsivel dentro dele.');
} else if (!/getRandomValues|randomUUID/.test(m[0])) {
  falhas.push('novoTokenPublico() nao usa gerador criptografico.');
}

// 3) As TRES rotas que devolvem estado precisam barrar as mesmas chaves reservadas.
//    Ate 20/08 a ponte era a mais frouxa e aceitava wfa-portal-tokens (o mapa de todos os
//    links de portal dos clientes) e wfa-backup-* (foto do estado inteiro do sistema).
//    Mesma armadilha das listas que precisam concordar e ninguem confere.
const RESERVADAS = ['wfa-portal-tokens', 'wfa-backup-'];
const ROTAS = [
  ['src/routes/api/workflowark.state.ts', 'state'],
  ['src/routes/api/mcp.ts', 'mcp'],
  ['src/routes/api/workflowark.bridge.ts', 'bridge'],
];
for (const [arq, rotulo] of ROTAS) {
  const txt = await readFile(arq, 'utf8');
  for (const r of RESERVADAS) {
    if (!txt.includes(r)) {
      falhas.push(rotulo + ' (' + arq + ') nao barra "' + r + '" nas chaves reservadas');
    }
  }
}

// 4) Endpoint externo nao pode ABRIR quando o segredo esta faltando.
//    O webhook do WhatsApp fazia "if (!secret) return true", ou seja, sem WEBHOOK_SECRET
//    configurado aceitava qualquer requisicao. Conferido em producao em 20/08: POST sem
//    token e com token errado, os dois respondiam 200. Falta de segredo tem que FECHAR.
const wa = await readFile('src/integrations/wa-webhook.server.ts', 'utf8');
// Tira os comentarios ANTES de checar: o proprio comentario que explica o conserto
// cita a frase antiga, e sem isto o teste se acusava sozinho.
const waCodigo = wa.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const semEspacos = waCodigo.replace(/\s+/g, ' ');
if (!wa.includes('export function webhookAuthorized')) {
  falhas.push('webhookAuthorized() sumiu de wa-webhook.server.ts');
} else if (semEspacos.includes('if (!secret) return true')) {
  falhas.push('webhookAuthorized() volta a ABRIR quando WEBHOOK_SECRET falta (deve recusar)');
}

// 5) Nenhuma rota pode ter segredo com VALOR PADRAO embutido no codigo.
//    O /api/ia/proxy tinha PROXY_KEY_PADRAO = uma chave fixa, usada quando IA_PROXY_KEY nao
//    estava configurada. Este repositorio e PUBLICO e o segredo nao estava configurado,
//    entao a chave que liberava o Claude da ARK estava publicada no GitHub. Conferido em
//    producao em 20/08: a chave do codigo passava pela autenticacao.
//    Segredo ausente tem que FECHAR, nunca cair num valor escrito no fonte.
const NL = String.fromCharCode(10);
// Padrao ESTREITO de proposito: leitura de variavel de ambiente caindo num literal longo.
// Heuristica larga demais gerava falso positivo em toda linha com a palavra "key" antes de
// um ||, o que treina a ignorar o teste, que e pior do que nao ter teste.
const LE_AMBIENTE = ['zapiEnv(', 'process.env', 'env?.', 'runSecret('];
const NOME_SEGREDO = /KEY|TOKEN|SECRET|SENHA|PASSWORD/i;
const LITERAL_LONGO = /["'][^"']{12,}["']/;
const DIR = 'src/routes/api';
for (const arq of await readdir(DIR)) {
  if (!arq.endsWith('.ts')) continue;
  const caminho = DIR + '/' + arq;
  const txt = await readFile(caminho, 'utf8');
  txt.split(NL).forEach((linha, i) => {
    const corte = linha.indexOf('//');
    const codigo = corte >= 0 ? linha.slice(0, corte) : linha;
    const op = codigo.indexOf('||');
    if (op < 0) return;
    const esquerda = codigo.slice(0, op);
    const direita = codigo.slice(op + 2);
    if (!LE_AMBIENTE.some((x) => esquerda.includes(x))) return;
    if (!NOME_SEGREDO.test(esquerda)) return;
    const lit = direita.match(LITERAL_LONGO);
    if (!lit) return;
    if (lit[0].includes('wfa-')) return; // nome de bloco de estado, nao segredo
    falhas.push(caminho + ':' + (i + 1) + ' segredo com valor padrao no codigo: ' + codigo.trim().slice(0, 70));
  });

  // O fallback nem sempre e um literal na MESMA linha: no caso real que originou este teste
  // era uma constante, `const PROXY_KEY_PADRAO = "ia-proxy-..."`, usada depois no ||.
  // Sem esta segunda checagem o teste passava nas duas versoes e nao guardava nada.
  txt.split(NL).forEach((linha, i) => {
    const corte = linha.indexOf('//');
    const codigo = corte >= 0 ? linha.slice(0, corte) : linha;
    const eq = codigo.indexOf('=');
    if (eq < 0 || !codigo.trim().startsWith('const ')) return;
    const nome = codigo.slice(0, eq);
    if (!NOME_SEGREDO.test(nome) && !/PADRAO|DEFAULT|FALLBACK/i.test(nome)) return;
    // So conta quando o lado direito e um literal PURO. `const key = zapiEnv("X_KEY")` e
    // leitura de ambiente, nao segredo embutido, e sinalizar isso enche o teste de ruido.
    const dir = codigo.slice(eq + 1).trim().replace(/;+$/, '');
    const puro = /^["'][^"']*["']$/.test(dir);
    if (!puro) return;
    const lit = dir.match(LITERAL_LONGO);
    if (!lit || lit[0].includes('wfa-')) return;
    falhas.push(caminho + ':' + (i + 1) + ' constante de segredo com valor no codigo: ' + codigo.trim().slice(0, 70));
  });
}

if (falhas.length) {
  console.log('TESTE DE SEGREDOS FALHOU:');
  falhas.forEach((f) => console.log('  - ' + f));
  console.log('');
  console.log('Token de link publico so pode vir de crypto.randomUUID ou crypto.getRandomValues.');
  console.log('Se nenhum existir, falhe: link fraco e permanente e pior do que link nenhum.');
  process.exit(1);
}
console.log('OK: tokens de link publico saem so de gerador criptografico.');
