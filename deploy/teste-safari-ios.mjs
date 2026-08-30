/*
 Teste do sistema no motor do Safari (WebKit), em duas telas: MacBook e iPhone.

 Existe porque a equipe inteira usa Apple e o desenvolvimento acontece no Windows,
 entao bug de Safari so aparecia na mao do usuario. WebKit aqui e o mesmo motor do
 Safari do Mac e do iPhone (no iOS todo navegador usa WebKit, ate o Chrome).

 O que ele mede, tudo com evidencia e nao com achismo:
   1. Erro de JS e requisicao falhada no boot
   2. Zoom automatico ao focar campo (iOS da zoom quando a fonte do input e < 16px)
   3. Rolagem horizontal (tela nao cabe no aparelho)
   4. Altura viva (100vh contra a barra do Safari que come a tela)
   5. Area segura do iPhone (notch e barra de gestos)
   6. Popup e download bloqueados (Apresentacao, Relatorio, Baixar HTML)
   7. Drawer do menu no celular

 Uso:
   node deploy/teste-safari-ios.mjs                                  # arquivo local
   node deploy/teste-safari-ios.mjs https://URL/workflowark.html     # producao

 Requisito: navegador webkit do Playwright instalado
   npx playwright@1.61.1 install webkit
*/
import { webkit, devices } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';
import fs from 'fs';

const alvo = process.argv[2]
  ? process.argv[2]
  : pathToFileURL(path.resolve('public/workflowark.html')).href;

const OUT = path.resolve('deploy/_saida-safari');
fs.mkdirSync(OUT, { recursive: true });

// Sessao falsa, mesmo esquema do teste-mobile-drawer: a guarda no <head> manda pro
// /auth sem token. O teste aqui e de layout e compatibilidade, nao de login.
const semearSessao = () => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local',
      refresh_token: 'teste-local',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
  } catch (e) {}
};

const achados = [];
const nota = (tela, nivel, msg) => achados.push({ tela, nivel, msg });

async function roda(nomeTela, contextOpts, ehCelular) {
  const browser = await webkit.launch({ headless: true });
  const ctx = await browser.newContext(contextOpts);
  await ctx.addInitScript(semearSessao);
  const page = await ctx.newPage();

  const erros = [];
  page.on('pageerror', (e) => erros.push('JS: ' + String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', (r) => erros.push('rede: ' + r.url().slice(0, 120) + ' :: ' + (r.failure()?.errorText || '')));

  await page.goto(alvo, { waitUntil: 'load' });
  await page.waitForTimeout(3500); // boot, animacoes de entrada e sync

  // 1. Boot de verdade
  const boot = await page.evaluate(() => ({
    mes: (document.getElementById('tb-month') || {}).textContent || '',
    nome: (document.getElementById('side-nm') || {}).textContent || '',
    temRender: typeof window.renderMeuDia === 'function',
  }));
  if (!boot.temRender) nota(nomeTela, 'CRITICO', 'o JS nao terminou de carregar (renderMeuDia nao existe)');
  if (/Carregando/i.test(boot.nome)) nota(nomeTela, 'CRITICO', 'sidebar presa em "Carregando..."');

  // 2. Zoom automatico do iOS ao focar campo
  const camposPequenos = await page.evaluate(() => {
    const alvos = [...document.querySelectorAll('input,select,textarea')];
    const ruins = alvos.filter((el) => {
      if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'hidden') return false;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      return fs && fs < 16;
    });
    const amostra = ruins.slice(0, 5).map((el) => (el.id || el.className || el.tagName) + ' @' + getComputedStyle(el).fontSize);
    return { total: alvos.length, ruins: ruins.length, amostra };
  });
  if (ehCelular && camposPequenos.ruins) {
    nota(nomeTela, 'ALTO', `${camposPequenos.ruins} de ${camposPequenos.total} campos com fonte < 16px: o iPhone da zoom sozinho ao focar e nao volta. Ex: ${camposPequenos.amostra.join(', ')}`);
  }

  // 3. Rolagem horizontal
  const overflow = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
    culpados: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 2 && getComputedStyle(el).position !== 'fixed')
      .slice(0, 5)
      .map((el) => (el.id ? '#' + el.id : el.tagName + '.' + String(el.className).split(' ')[0]) + ' ate ' + Math.round(el.getBoundingClientRect().right) + 'px'),
  }));
  if (overflow.doc > overflow.win + 2) {
    nota(nomeTela, 'ALTO', `pagina mais larga que a tela (${overflow.doc}px em ${overflow.win}px): ${overflow.culpados.join(', ') || 'origem nao identificada'}`);
  }

  // 4. Altura viva e 5. area segura
  const alturas = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const cs = app ? getComputedStyle(app) : null;
    return {
      alturaApp: cs ? cs.height : null,
      innerHeight: window.innerHeight,
      suportaDvh: CSS.supports('height', '100dvh'),
      usaEnvSafe: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((r) => /env\(safe-area/.test(r.cssText)); } catch (e) { return false; } }),
    };
  });
  if (ehCelular && !alturas.usaEnvSafe) {
    nota(nomeTela, 'MEDIO', 'nenhuma regra usa env(safe-area-inset): no iPhone com notch e barra de gestos, topo e rodape ficam colados na borda e o ultimo item some atras da barra');
  }

  // 6. Popup e download (Apresentacao, Relatorio, Baixar HTML)
  const popup = await page.evaluate(() => {
    const r = { abriu: false, erro: null };
    try {
      const w = window.open('about:blank', '_blank');
      r.abriu = !!w;
      if (w) w.close();
    } catch (e) { r.erro = String(e.message); }
    return r;
  });
  if (!popup.abriu) {
    nota(nomeTela, ehCelular ? 'ALTO' : 'MEDIO', 'window.open fora de clique direto foi bloqueado: os botoes Apresentacao, Relatorio e "Abrir em tela cheia" nao abrem nada');
  }
  const downloadOk = await page.evaluate(() => 'download' in document.createElement('a'));
  if (ehCelular && !downloadOk) {
    nota(nomeTela, 'ALTO', 'o atributo download nao funciona: "Baixar HTML" do planejamento nao salva arquivo no iPhone');
  }

  // 7. Drawer do menu
  if (ehCelular) {
    const inicial = await page.evaluate(() => {
      const s = document.querySelector('.side');
      return s ? { visivel: s.getBoundingClientRect().right > 1 } : { semSidebar: true };
    });
    if (inicial.semSidebar) nota(nomeTela, 'CRITICO', 'sidebar nao encontrada');
    else if (inicial.visivel) nota(nomeTela, 'ALTO', 'sidebar comeca aberta e cobre a tela no celular');
  }

  await page.screenshot({ path: path.join(OUT, `${nomeTela}.png`), fullPage: false });

  for (const e of [...new Set(erros)].slice(0, 8)) nota(nomeTela, 'ERRO', e);

  await browser.close();
  return { boot, camposPequenos, overflow, alturas, popup };
}

const iphone = devices['iPhone 14 Pro'] || devices['iPhone 13'];
const macbook = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

console.log('Alvo:', alvo, '\n');
const rMac = await roda('macbook-safari', macbook, false);
const rIphone = await roda('iphone-safari', { ...iphone }, true);

console.log('=== MACBOOK (Safari) ===');
console.log('  boot:', rMac.boot.temRender ? 'ok' : 'FALHOU', '| mes:', rMac.boot.mes.trim(), '| usuario:', rMac.boot.nome.trim());
console.log('=== IPHONE (Safari) ===');
console.log('  boot:', rIphone.boot.temRender ? 'ok' : 'FALHOU', '| campos com fonte pequena:', rIphone.camposPequenos.ruins + '/' + rIphone.camposPequenos.total);
console.log('  largura da pagina:', rIphone.overflow.doc + 'px em tela de ' + rIphone.overflow.win + 'px');

console.log('\n=== ACHADOS ===');
const ordem = { CRITICO: 0, ALTO: 1, MEDIO: 2, ERRO: 3 };
achados.sort((a, b) => (ordem[a.nivel] ?? 9) - (ordem[b.nivel] ?? 9));
if (!achados.length) console.log('nenhum problema encontrado.');
for (const a of achados) console.log(`[${a.nivel}] (${a.tela}) ${a.msg}`);
console.log('\nScreenshots em', OUT);
