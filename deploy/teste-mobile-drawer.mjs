/*
 Teste de fumaça do menu mobile (drawer) do workflowark.html.
 Nasceu do incidente de jul/26: a coreografia de entrada do tema escuro
 (animation ... both) congelou transform:none e prendeu a sidebar aberta
 no celular. Este teste garante que isso nunca volta.

 Uso:
   node deploy/teste-mobile-drawer.mjs                     # testa o arquivo local public/workflowark.html
   node deploy/teste-mobile-drawer.mjs https://URL/workflowark.html   # testa produção

 Requisito: npm i (playwright-core está nas devDependencies; usa o Chrome instalado).
*/
import { chromium } from 'playwright-core';
import { pathToFileURL } from 'url';
import path from 'path';

const alvo = process.argv[2]
  ? process.argv[2]
  : pathToFileURL(path.resolve('public/workflowark.html')).href;

const falhas = [];

async function testaTema(tema) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript((t) => {
    try { localStorage.setItem('wfa-theme', t); } catch (e) {}
  }, tema);
  await page.goto(alvo);
  await page.waitForTimeout(3000); // boot + animações de entrada

  const estado = () => page.evaluate(() => {
    const s = document.querySelector('.side');
    if (!s) return { semSidebar: true };
    const rect = s.getBoundingClientRect();
    return { visivel: rect.right > 1, open: s.classList.contains('open') };
  });

  const checa = (cond, msg) => { if (!cond) falhas.push('[' + tema + '] ' + msg); };

  const inicial = await estado();
  checa(!inicial.semSidebar, 'sidebar não encontrada na página');
  if (inicial.semSidebar) { await browser.close(); return; }
  checa(!inicial.visivel, 'sidebar deveria começar ESCONDIDA no celular, mas está visível (presa)');

  // abre pelo hamburger
  await page.evaluate(() => toggleSide(true));
  await page.waitForTimeout(400);
  const aberto = await estado();
  checa(aberto.visivel && aberto.open, 'sidebar não abriu pelo menu hamburger');

  // seta de voltar do celular tem que FECHAR o menu e continuar na página
  await page.goBack();
  await page.waitForTimeout(500);
  const depois = await estado();
  checa(!depois.semSidebar, 'seta de voltar saiu da página em vez de fechar o menu');
  if (!depois.semSidebar) checa(!depois.visivel, 'seta de voltar não fechou o menu');

  await browser.close();
}

await testaTema('dark');
await testaTema('light');

if (falhas.length) {
  console.error('TESTE MOBILE FALHOU:');
  for (const f of falhas) console.error(' - ' + f);
  process.exit(1);
}
console.log('OK: drawer mobile escondido no boot, abre pelo menu e fecha na seta de voltar (dark e light).');
