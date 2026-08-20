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
import { readFile } from 'fs/promises';

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

if (falhas.length) {
  console.log('TESTE DE SEGREDOS FALHOU:');
  falhas.forEach((f) => console.log('  - ' + f));
  console.log('');
  console.log('Token de link publico so pode vir de crypto.randomUUID ou crypto.getRandomValues.');
  console.log('Se nenhum existir, falhe: link fraco e permanente e pior do que link nenhum.');
  process.exit(1);
}
console.log('OK: tokens de link publico saem so de gerador criptografico.');
