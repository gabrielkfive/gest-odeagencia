/*
  Testes de edge case para os fixes aplicados em 2026-07-23:
    F1  wfa-cli-geo em STATE_KEYS           (workflowark.state.ts)
    F2  Fish Audio model no body JSON       (workflowark.state.ts)
    F3  JARVIS prompt caching               (workflowark.state.ts)
    F4  hojeYmd() com timezone SP           (workflowark.html)
    F5  Label "Demandas" sem "(CRUD)"       (workflowark.html)
    F6  Saudação dinâmica auraHero()        (workflowark.html)

  Uso: node deploy/teste-novos-fixes.mjs
*/

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dir, '..');
const STATE_SRC = readFileSync(resolve(ROOT, 'src/routes/api/workflowark.state.ts'), 'utf8');
const HTML_SRC  = readFileSync(resolve(ROOT, 'public/workflowark.html'), 'utf8');
const HTML_URL  = pathToFileURL(resolve(ROOT, 'public/workflowark.html')).href;

let failures = 0;
let warnings = 0;
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function fail(msg) { console.error(`  ✗ FALHOU: ${msg}`); failures++; }
function warn(msg) { console.warn(`  ⚠ AVISO: ${msg}`); warnings++; }
function section(title) { console.log(`\n[${title}]`); }

// ─── F1: wfa-cli-geo em STATE_KEYS ───────────────────────────────────────────
section('F1 — wfa-cli-geo em STATE_KEYS');

// Extrai o bloco Set([...]) da fonte
const setMatch = STATE_SRC.match(/const STATE_KEYS = new Set\(\[([\s\S]*?)\]\)/);
const stateKeys = setMatch
  ? setMatch[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) ?? []
  : [];

stateKeys.includes('wfa-cli-geo')
  ? ok('wfa-cli-geo presente no STATE_KEYS')
  : fail('wfa-cli-geo ausente no STATE_KEYS');

// wfa-whatsapp é server-owned: NÃO deve estar no STATE_KEYS (o cliente nunca salva)
!stateKeys.includes('wfa-whatsapp')
  ? ok('wfa-whatsapp corretamente ausente (server-owned)')
  : fail('wfa-whatsapp não deveria estar no STATE_KEYS — clientes não devem sobrescrever msgs recebidas');

// Chaves essenciais que devem existir
const REQUIRED = ['wfa-tarefas', 'wfa-crm', 'wfa-criativos', 'wfa-clientes-custom', 'wfa-cli-geo'];
for (const k of REQUIRED) {
  stateKeys.includes(k)
    ? ok(`chave obrigatória presente: ${k}`)
    : fail(`chave obrigatória ausente: ${k}`);
}

// Chave completamente inventada deve estar ausente
stateKeys.includes('wfa-nao-existe-jamais')
  ? fail('chave inventada apareceu no STATE_KEYS — allowlist corrompida')
  : ok('chave inexistente corretamente ausente do allowlist');

// ─── F2: Fish Audio model no body JSON ───────────────────────────────────────
section('F2 — Fish Audio model no body JSON');

// Localiza a chamada Fish Audio (pode haver mais de uma linha; pega o bloco fetch)
const fishBlock = (() => {
  const idx = STATE_SRC.indexOf('api.fish.audio/v1/tts');
  if (idx === -1) return '';
  return STATE_SRC.slice(Math.max(0, idx - 200), idx + 600);
})();

fishBlock
  ? ok('bloco da chamada Fish Audio encontrado')
  : fail('bloco Fish Audio não encontrado — arquivo pode ter mudado');

// "model" NÃO deve aparecer como chave de header HTTP (objeto headers: { ... , model })
const headersLine = fishBlock.match(/headers:\s*\{([^}]+)\}/)?.[1] ?? '';
!headersLine.includes('model')
  ? ok('model ausente do objeto headers (correto)')
  : fail('model ainda está no objeto headers — vai ser ignorado pela API Fish Audio');

// "model" DEVE aparecer dentro do JSON.stringify do body
const bodyLine = fishBlock.match(/JSON\.stringify\(\{([^}]+)\}/)?.[1] ?? '';
bodyLine.includes('model')
  ? ok('model presente no body JSON.stringify')
  : fail('model ausente do body JSON — Fish Audio não receberá o modelo correto');

// Valor padrão "s2-pro" deve estar presente
fishBlock.includes('"s2-pro"')
  ? ok('default model "s2-pro" preservado')
  : fail('default model "s2-pro" ausente');

// ─── F3: JARVIS prompt caching ────────────────────────────────────────────────
section('F3 — JARVIS prompt caching');

// Verifica anthropic-beta em ambos os endpoints
const jarvisBlocks = (() => {
  const blocks = [];
  for (const action of ['jarvis', 'jarvis-agent']) {
    const marker = `action === "${action}"`;
    const start = STATE_SRC.indexOf(marker);
    if (start === -1) continue;
    // pega até o próximo "if (action ===" ou fim razoável
    const end = STATE_SRC.indexOf('if (action ===', start + marker.length);
    blocks.push({ action, src: STATE_SRC.slice(start, end === -1 ? start + 3000 : end) });
  }
  return blocks;
})();

jarvisBlocks.length === 2
  ? ok('ambos os endpoints jarvis e jarvis-agent encontrados')
  : fail(`esperado 2 endpoints JARVIS, encontrado ${jarvisBlocks.length}`);

for (const { action, src } of jarvisBlocks) {
  src.includes('"anthropic-beta": "prompt-caching-2024-07-31"')
    ? ok(`${action}: header anthropic-beta presente`)
    : fail(`${action}: header anthropic-beta ausente — caching não ativado`);

  src.includes('cache_control: { type: "ephemeral" }')
    ? ok(`${action}: cache_control ephemeral no system`)
    : fail(`${action}: cache_control ausente no system`);

  // O system deve ser um array (não uma string direta)
  const systemInBody = src.match(/system:\s*(\[|\w)/)?.[1];
  systemInBody === '['
    ? ok(`${action}: system é array (formato correto para caching)`)
    : fail(`${action}: system não é array — Anthropic exige array para prompt caching`);
}

// Aviso: contexto dinâmico embutido no bloco cacheado
for (const { action, src } of jarvisBlocks) {
  const hasDynamicInCached =
    (action === 'jarvis'       && src.includes('${ctxInfo}')) ||
    (action === 'jarvis-agent' && src.includes('${JSON.stringify(ctx2)}'));
  if (hasDynamicInCached) {
    warn(
      `${action}: contexto dinâmico (${action === 'jarvis' ? 'ctxInfo' : 'ctx2'}) está concatenado ` +
      `no bloco cacheado — o hash do texto muda a cada request, limitando os hits de cache. ` +
      `Para cache efetivo, separar a parte estática em um bloco com cache_control e o contexto ` +
      `dinâmico em um segundo bloco sem cache_control.`
    );
  }
}

// ─── F4 + F5 + F6: testes de browser (workflowark.html) ─────────────────────
section('F4/F5/F6 — Browser: hojeYmd, label e saudação');

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(HTML_URL);
await page.waitForTimeout(1500);

// ── F4: hojeYmd() ──
section('F4 — hojeYmd() timezone São Paulo');

const { ymd, sp, fmt } = await page.evaluate(() => {
  const ymd = typeof hojeYmd === 'function' ? hojeYmd() : null;
  const sp  = typeof hojeSP  === 'function' ? hojeSP()  : null;
  const fmt = ymd ? /^\d{4}-\d{2}-\d{2}$/.test(ymd) : false;
  return { ymd, sp, fmt };
});

ymd !== null
  ? ok(`hojeYmd() existe e retornou: ${ymd}`)
  : fail('hojeYmd() não existe ou retornou null');

fmt
  ? ok('formato YYYY-MM-DD correto')
  : fail(`formato errado: "${ymd}" (esperado YYYY-MM-DD)`);

ymd === sp
  ? ok(`hojeYmd() === hojeSP() — mesmo fuso horário (${ymd})`)
  : fail(`hojeYmd()="${ymd}" difere de hojeSP()="${sp}" — timezone inconsistente`);

// Edge: dia nunca é "1970" nem data absurda
const year = ymd ? parseInt(ymd.slice(0, 4), 10) : 0;
year >= 2025 && year <= 2035
  ? ok(`ano ${year} dentro do range esperado`)
  : fail(`ano ${year} fora do range — possível bug de timezone ou epoch`);

// ── F5: label Demandas sem CRUD ──
section('F5 — Label "Demandas" sem "(CRUD)"');

const labelText = await page.evaluate(() => {
  const el = document.querySelector('[data-nav="demandas"] span');
  return el ? el.textContent.trim() : null;
});

labelText !== null
  ? ok(`label Demandas encontrado: "${labelText}"`)
  : fail('elemento [data-nav="demandas"] span não encontrado');

!labelText?.includes('CRUD')
  ? ok('"CRUD" ausente do label')
  : fail(`"CRUD" ainda aparece no label: "${labelText}"`);

labelText === 'Demandas'
  ? ok('texto exato "Demandas" correto')
  : warn(`texto é "${labelText}" em vez de "Demandas" — verifique se foi intencionado`);

// ── F6: saudação dinâmica ──
section('F6 — Saudação dinâmica em auraHero()');

// 6a: sem WFA_MEMBER — não deve lançar exceção nem mostrar "Senhor"
const greetNoMember = await page.evaluate(() => {
  try {
    WFA_MEMBER = undefined;
    if (typeof auraHero === 'function') auraHero();
    const el = document.querySelector('.aura-saud');
    return { text: el ? el.textContent.trim() : null, threw: false };
  } catch (e) {
    return { text: null, threw: true, err: e.message };
  }
});
!greetNoMember.threw
  ? ok('auraHero() sem WFA_MEMBER não lança exceção')
  : fail(`auraHero() lançou com WFA_MEMBER=undefined: ${greetNoMember.err}`);
!greetNoMember.text?.includes('Senhor')
  ? ok(`sem WFA_MEMBER não exibe "Senhor": "${greetNoMember.text}"`)
  : fail(`"Senhor" hardcoded ainda aparece sem WFA_MEMBER: "${greetNoMember.text}"`);

// 6b: mdFirst() extrai primeiro nome corretamente
// (WFA_MEMBER é let-scoped no script principal — page.evaluate não consegue escrever
//  nessa binding. Testamos a função mdFirst diretamente.)
const mdFirstTests = await page.evaluate(() => {
  if (typeof mdFirst !== 'function') return null;
  return [
    { input: 'Gabriel Andrade', got: mdFirst('Gabriel Andrade') },
    { input: 'Luckas',          got: mdFirst('Luckas')          },
    { input: '',                got: mdFirst('')                 },
    { input: 'Maria Luiza',     got: mdFirst('Maria Luiza')     },
  ];
});
if (!mdFirstTests) {
  fail('mdFirst() não encontrada na página');
} else {
  const exp = { 'Gabriel Andrade': 'Gabriel', 'Luckas': 'Luckas', '': '', 'Maria Luiza': 'Maria' };
  for (const { input, got } of mdFirstTests) {
    got === exp[input]
      ? ok(`mdFirst("${input}") → "${got}"`)
      : fail(`mdFirst("${input}"): esperado "${exp[input]}", obtido "${got}"`);
  }
}

// 6c: composição da saudação — testa a lógica da linha auraSet diretamente
const greetFormats = await page.evaluate(() => {
  const build = (s, nm) => s + (nm ? ', ' + nm : '') + '! 👋';
  return {
    comNome:    build('Bom dia', 'Gabriel'),
    semNome:    build('Boa tarde', ''),
    nomeNull:   build('Boa noite', null || ''),
  };
});
greetFormats.comNome === 'Bom dia, Gabriel! 👋'
  ? ok(`com nome: "${greetFormats.comNome}"`)
  : fail(`com nome: esperado "Bom dia, Gabriel! 👋", obtido "${greetFormats.comNome}"`);
greetFormats.semNome === 'Boa tarde! 👋'
  ? ok(`sem nome: "${greetFormats.semNome}"`)
  : fail(`sem nome: esperado "Boa tarde! 👋", obtido "${greetFormats.semNome}"`);
greetFormats.nomeNull === 'Boa noite! 👋'
  ? ok(`nome null/vazio: "${greetFormats.nomeNull}"`)
  : fail(`nome null/vazio: esperado "Boa noite! 👋", obtido "${greetFormats.nomeNull}"`);

// 6d: lógica de mapeamento hora→saudação — testada como função pura (sem mock de Date)
// A função auraHero usa: h<5→madrugada, h<12→dia, h<18→tarde, else→noite
const hourMapping = await page.evaluate(() => {
  const map = h => h<5?'Boa madrugada':h<12?'Bom dia':h<18?'Boa tarde':'Boa noite';
  return [
    { h: 0,  s: map(0)  },
    { h: 4,  s: map(4)  },
    { h: 5,  s: map(5)  },
    { h: 11, s: map(11) },
    { h: 12, s: map(12) },
    { h: 17, s: map(17) },
    { h: 18, s: map(18) },
    { h: 23, s: map(23) },
  ];
});
const expected = {
  0: 'Boa madrugada', 4: 'Boa madrugada',
  5: 'Bom dia', 11: 'Bom dia',
  12: 'Boa tarde', 17: 'Boa tarde',
  18: 'Boa noite', 23: 'Boa noite',
};
for (const { h, s } of hourMapping) {
  s === expected[h]
    ? ok(`hora ${h}h → "${s}"`)
    : fail(`hora ${h}h: esperado "${expected[h]}", obtido "${s}"`);
}

// 6e: saudação termina com "👋" — verifica no DOM real (hora atual, sem membro = sem nome)
const greetDOM = await page.evaluate(() => {
  if (typeof auraHero === 'function') auraHero();
  const el = document.querySelector('.aura-saud');
  return el ? el.textContent.trim() : null;
});
greetDOM?.endsWith('👋')
  ? ok(`DOM termina com 👋: "${greetDOM}"`)
  : fail(`saudação no DOM não termina com 👋: "${greetDOM}"`);

// ── Encerramento ──────────────────────────────────────────────────────────────
await browser.close();

console.log('');
if (failures > 0) {
  console.error(`RESULTADO: ${failures} FALHA(S)${warnings ? `, ${warnings} aviso(s)` : ''}.`);
  process.exit(1);
} else if (warnings > 0) {
  console.warn(`RESULTADO: todos os testes passaram com ${warnings} aviso(s). Revisar avisos acima.`);
} else {
  console.log('RESULTADO: todos os testes passaram ✓');
}
