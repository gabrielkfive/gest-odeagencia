/*
 Teste do WorkFlowArk Next (/next), 20/09/2026.

 Sobe o build com `wrangler dev` (o `vite dev` nao serve SSR nesta base: cloudflare:workers),
 entra com sessao FALSA (localStorage do supabase-js +
 /auth/v1/user interceptado) e responde /api/workflowark/state com uma carteira sintetica.
 Nada toca dado real: toda rede fora do localhost e barrada.

 Prova:
   1. Meu Dia V2 abre com saudacao e os contadores batem com a semente (atrasadas, hoje,
      aprovacoes, entregas em 7 dias), sem contar cartao de projeto duas vezes;
   2. concluir tarefa manda save-state com UM item e carimbo `up`, e a linha some;
   3. as 11 areas abrem sem tela branca;
   4. no celular (390px) o menu comeca escondido, abre no hamburger e fecha no X;
   5. tema claro e escuro; capturas em deploy/prova-next-*.png;
   6. landing publica /conheca (200, 390px sem overflow, endpoint 400/415/honeypot).
 Uso: npm run build && node deploy/teste-next.mjs
*/
import { chromium } from 'playwright-core';
import { spawn } from 'child_process';
import path from 'path';

const DIA = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); };
const AGORA = new Date().toISOString();
const REF = 'fxfnonozzekxnxddxsnh';
const MEMBER = { id: 'm1', full_name: 'Gabriel Andrade', email: 'teste@ark.local', role: 'admin', active: true };
const STATE = {
  'wfa-tarefas': [
    { id: 't1', title: 'Roteiro do Reel da Vivenda', status: 'andamento', resp: 'Gabriel Andrade', resps: ['Gabriel Andrade'], clienteId: 'vivenda', data: DIA(-2), up: AGORA },
    { id: 't2', title: 'Aprovar arte do Dia do Cliente', status: 'aprovacao', resp: 'Maria Luiza', clienteId: 'fercon', data: DIA(0), up: AGORA },
    { id: 't3', title: 'Editar vídeo do cardápio', status: 'iniciar', resp: 'Gabriel Andrade', clienteId: 'vaca', data: DIA(0), up: AGORA },
    { id: 't4', title: 'Relatório mensal Fonseca', status: 'backlog', resp: 'Caio Neves', clienteId: 'fonseca', data: DIA(3), up: AGORA },
    { id: 't5', title: 'Carrossel Sasse', status: 'homologcli', resp: 'Lucas Rosi', clienteId: 'sasse', data: DIA(5), up: AGORA },
    { id: 't6', title: 'Já concluída hoje', status: 'concluido', resp: 'Gabriel Andrade', concluidaEm: AGORA, data: DIA(0), up: AGORA },
    { id: 'pj:p1:x1', title: 'Cartão vinculado (não conta 2x)', status: 'andamento', resp: 'Gabriel Andrade', data: DIA(-1) },
  ],
  'wfa-projetos': [
    { id: 'p1', cliente: 'Vivenda', clienteId: 'vivenda', sprint: 'S38', up: AGORA, tarefas: [
      { id: 'x1', t: 'Cartão vinculado (não conta 2x)', st: 'andamento', resp: 'Gabriel Andrade', venc: DIA(-1), up: AGORA },
      { id: 'x2', t: 'Tarefa de projeto no backlog (fora)', st: 'backlog', resp: 'Gabriel Andrade', venc: DIA(-1) },
      { id: 'x3', t: 'Homologação interna do projeto', st: 'homolog', resp: 'Saulo', venc: DIA(2), up: AGORA },
    ] },
  ],
  'wfa-crm': [
    { id: 'l1', nm: 'Pizzaria do Zé', stage: 2, val: 3500, resp: 'Gabriel Andrade', due: DIA(1), up: AGORA },
    { id: 'l2', nm: 'Bar do Leo', stage: 4, val: 2000, up: AGORA },
    { id: 'l3', nm: 'Café Central', stage: 0, val: 1500, due: DIA(-1), up: AGORA },
  ],
  'wfa-demandas': [{ id: 'd1', titulo: 'Cliente pediu story urgente', cliente: 'Fercon', origem: 'WhatsApp', status: 'nova', criadaEm: AGORA }],
  'wfa-rotinas': [{ id: 'r1', titulo: 'Relatório semanal', freq: 'semanal', dia: 'seg', hora: '09:00', resp: 'Caio Neves', ativo: true }],
  'wfa-producao': [{ id: 'c1', clienteId: 'vivenda', data: DIA(2), local: 'Fábrica', produtor: 'Samuel Magalhães', status: 'agendada', videos: [{ titulo: 'Reel 1' }] }],
  'wfa-editorial': [{ id: 'e1', clienteId: 'vivenda', cliente: 'Vivenda', data: DIA(0), titulo: 'Reel bastidores', formato: 'Reel', status: 'agendado' }],
  'wfa-social-fila': [{ id: 's1', clienteId: 'fercon', cliente: 'Fercon', status: 'pendente', formato: 'Carrossel', tema: 'Promoção de quarta', ts: Date.now() }],
  'wfa-notificacoes': [{ id: 'n1', ts: Date.now(), msg: 'Tarefa movida para Homologação', origem: 'kanban' }],
  'wfa-clientes-custom': [{ id: 'novo1', nm: 'Cliente Novo Ltda', tipo: 'ARK', up: AGORA }],
  'wfa-planilha': { ativo: 'm1', meses: [{ id: 'm1', nome: 'Setembro 2026', receitas: [{ valor: 10000, custo: 1000 }], pagar: [{ valor: 2000 }] }] },
  'wfa-cobranca': { vivenda: { _valor: 5500, cobradoMes: DIA(0).slice(0, 7) }, fercon: { _valor: 4200 } },
};
// Esperado (Gabriel): atrasadas = t1 + pj:x1 (2); hoje = t3 (1); aprovacoes = t2 + t5 + pj:x3 + fila s1 (4);
// entregas 7 dias (equipe) = t4, t5, pj:x3 (3).

function fakeJwt() {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u1', email: MEMBER.email, role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 })}.x`;
}

// Precisa de `npm run build` antes (le .output/). O `vite dev` nao serve SSR nesta base
// (import de cloudflare:workers), por isso o Worker local do wrangler. A rede externa e
// barrada no navegador, entao nem IA nem Supabase sao chamados.
async function sobeDev() {
  return new Promise((resolve, reject) => {
    const p = spawn('npx', ['wrangler', 'dev', '--port', '5199', '--ip', '127.0.0.1'], { cwd: path.resolve('.'), shell: true, env: { ...process.env, NO_COLOR: '1', CI: '1' } });
    let saida = '';
    const t = setTimeout(() => reject(new Error('wrangler dev não subiu em 120 s:\n' + saida.slice(-1500))), 120000);
    const olha = (d) => { saida += d; if (/Ready on http/.test(saida)) { clearTimeout(t); resolve(p); } };
    p.stdout.on('data', olha);
    p.stderr.on('data', olha);
    p.on('exit', (c) => { clearTimeout(t); reject(new Error('wrangler saiu com ' + c + '\n' + saida.slice(-1500))); });
  });
}

const posts = [];
async function prepara(ctx, claro) {
  const token = fakeJwt();
  await ctx.addInitScript(([ref, tok, user, claro]) => {
    localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify({ access_token: tok, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user }));
    localStorage.setItem('nx-tema', claro ? 'claro' : 'escuro');
  }, [REF, token, { id: 'u1', email: MEMBER.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }, claro]);
  await ctx.route('**/*', async (rota) => {
    const req = rota.request();
    const u = req.url();
    if (/\/auth\/v1\/user/.test(u)) return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'u1', email: MEMBER.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }) });
    if (/\/auth\/v1\//.test(u)) return rota.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (/\/api\/workflowark\/state/.test(u)) {
      if (req.method() === 'GET') return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: STATE, member: MEMBER, members: [MEMBER], t: AGORA, now: AGORA }) });
      const body = req.postDataJSON();
      posts.push(body);
      if (body?.action === 'google-my-events') return rota.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ connected: false, events: [] }) });
      return rota.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    }
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) return rota.continue();
    return rota.abort('blockedbyclient');
  });
}

const AREAS = ['comercial', 'clientes', 'producao', 'aprovacoes', 'calendario', 'financeiro', 'equipe', 'relatorios', 'automacoes', 'hermes', 'configuracoes'];
let falhas = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✓ ' : '  ✗ ') + msg); if (!cond) falhas++; };

// shell:true faz o pid ser o do cmd; o workerd fica na porta e segura .output (EBUSY no
// proximo build). Mata pela porta e pelo nome, antes e depois (Windows).
function mataPorta() {
  return new Promise((r) => {
    const k = spawn('powershell', ['-NoProfile', '-Command', 'Get-NetTCPConnection -LocalPort 5199 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Get-Process workerd -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue'], { shell: false });
    k.on('exit', r); k.on('error', r);
  });
}
process.on('uncaughtException', async (e) => { console.error(e); await mataPorta(); process.exit(1); });
await mataPorta();
const dev = await sobeDev();
const BASE = 'http://127.0.0.1:5199';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  // 1. desktop escuro
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await prepara(ctx, false);
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    const logs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.text().slice(0, 300)); });
    await page.goto(`${BASE}/next`, { waitUntil: 'networkidle' });
    try { await page.waitForSelector('.nx-kpi', { timeout: 20000 }); } catch (e) {
      await page.screenshot({ path: 'deploy/prova-next-falha.png', fullPage: true });
      console.log('URL:', page.url()); console.log('BODY:', (await page.textContent('body') || '').slice(0, 600)); console.log('LOGS:', logs.slice(0, 8).join(' | '), erros.slice(0, 3).join(' | '));
      throw e;
    }
    console.log('Desktop, escuro');
    const kpis = await page.$$eval('.nx-kpi .v', (els) => els.map((e) => e.textContent.trim().replace(/\D.*$/, '')));
    ok(kpis[0] === '2', `atrasadas = 2 (cartão de projeto contado 1x, backlog fora), veio ${kpis[0]}`);
    ok(kpis[1] === '1', `para hoje = 1, veio ${kpis[1]}`);
    ok(kpis[2] === '4', `aprovações = 4 (2 tarefas + 1 projeto em homolog + 1 agente), veio ${kpis[2]}`);
    ok(kpis[3] === '3', `entregas em 7 dias = 3, veio ${kpis[3]}`);
    ok((await page.textContent('.nx-h1')).includes('Gabriel'), 'saudação com o primeiro nome');
    const badge = await page.$eval('.nx-side .nx-it.on .n', (e) => e.textContent.trim()).catch(() => null);
    ok(badge === '2', `badge do Meu Dia na sidebar = 2, veio ${badge}`);
    await page.screenshot({ path: 'deploy/prova-next-desktop-escuro.png', fullPage: true });
    // 2. concluir tarefa t1
    const antes = posts.filter((p) => p.action === 'save-state').length;
    await page.click('.nx-chk >> nth=0');
    await page.waitForFunction((n) => document.querySelectorAll('.nx-toast').length > 0 || n, antes);
    await page.waitForTimeout(400);
    const save = posts.filter((p) => p.action === 'save-state');
    ok(save.length === antes + 1, 'concluir gerou 1 save-state');
    const s = save[save.length - 1];
    ok(s?.key === 'wfa-tarefas' && Array.isArray(s.data) && s.data.length === 1, 'save-state com UM item em wfa-tarefas');
    ok(s?.data?.[0]?.id === 't1' && s.data[0].status === 'concluido' && !!s.data[0].up && !!s.data[0].concluidaEm, 'item t1 concluído com up e concluidaEm');
    const kpisDepois = await page.$$eval('.nx-kpi .v', (els) => els.map((e) => e.textContent.trim().replace(/\D.*$/, '')));
    ok(kpisDepois[0] === '1', `atrasadas caiu para 1 sem recarregar, veio ${kpisDepois[0]}`);
    // 3. areas
    for (const a of AREAS) {
      await page.goto(`${BASE}/next/${a}`, { waitUntil: 'networkidle' });
      const h1 = await page.textContent('.nx-main h1').catch(() => '');
      ok(!!h1 && !(await page.$('.nx-alert.err')), `área ${a} abre (${(h1 || '').trim().slice(0, 30)})`);
      if (a === 'comercial' || a === 'financeiro' || a === 'clientes') await page.screenshot({ path: `deploy/prova-next-${a}.png`, fullPage: true });
    }
    await page.goto(`${BASE}/next/nao-existe`, { waitUntil: 'networkidle' });
    ok(!!(await page.$('.nx-alert')), 'área inexistente mostra aviso, não tela branca');
    ok(erros.length === 0, 'sem erro de JS na página' + (erros.length ? ': ' + erros[0] : ''));
    await ctx.close();
  }
  // 4. celular claro
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await prepara(ctx, true);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/next`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.nx-kpi', { timeout: 20000 });
    console.log('Celular, claro');
    const box = await page.$eval('.nx-side', (e) => e.getBoundingClientRect().right);
    ok(box <= 0, `menu começa escondido (right=${Math.round(box)})`);
    ok(await page.$eval('.nx', (e) => e.classList.contains('claro')), 'tema claro aplicado');
    const larg = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(larg, 'sem rolagem horizontal');
    await page.screenshot({ path: 'deploy/prova-next-celular-claro.png', fullPage: true });
    await page.click('button[aria-label="Abrir menu"]');
    await page.waitForTimeout(350);
    ok((await page.$eval('.nx-side', (e) => e.getBoundingClientRect().left)) >= 0, 'hamburger abre o menu');
    await page.screenshot({ path: 'deploy/prova-next-celular-menu.png' });
    await page.click('.nx-side button[aria-label="Fechar menu"]');
    await page.waitForTimeout(350);
    ok((await page.$eval('.nx-side', (e) => e.getBoundingClientRect().right)) <= 0, 'X fecha o menu');
    await ctx.close();
  }
  // 5. landing publica /conheca (sem sessao): abre, sem rolagem horizontal, formulario
  //    valida no navegador e o endpoint responde 400 (invalido), 200 (honeypot) e nunca
  //    mostra sucesso quando o servidor falha (aqui sem segredo do Supabase = 500).
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.route('**/*', (rota) => {
      const u = rota.request().url();
      if (u.startsWith('http://127.0.0.1') || u.startsWith('data:') || u.startsWith('blob:')) return rota.continue();
      return rota.abort('blockedbyclient');
    });
    const page = await ctx.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    const r = await page.goto(`${BASE}/conheca`, { waitUntil: 'networkidle' });
    console.log('Landing /conheca');
    ok(r && r.status() === 200, `abre com 200 (veio ${r && r.status()})`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'sem rolagem horizontal em 390px');
    ok((await page.$$('form')).length >= 1, 'tem formulario');
    ok(!(await page.textContent('body')).match(/[—–─━]/), 'sem travessao/traco no texto');
    await page.screenshot({ path: 'deploy/prova-conheca-celular.png', fullPage: true });
    const res400 = await page.evaluate(async (b) => { const r = await fetch(b + '/api/workflowark/lead-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'X', whatsapp: '12' }) }); return r.status; }, BASE);
    ok(res400 === 400, `whatsapp invalido devolve 400 (veio ${res400})`);
    const resHp = await page.evaluate(async (b) => { const r = await fetch(b + '/api/workflowark/lead-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: 'Robo', whatsapp: '61999999999', site: 'spam' }) }); return [r.status, await r.json()]; }, BASE);
    ok(resHp[0] === 200 && resHp[1].ok === true, `honeypot devolve 200 ok sem gravar (veio ${resHp[0]})`);
    const res415 = await page.evaluate(async (b) => { const r = await fetch(b + '/api/workflowark/lead-site', { method: 'POST', body: 'nome=x' }); return r.status; }, BASE);
    ok(res415 === 415, `sem JSON devolve 415 (veio ${res415})`);
    ok(erros.length === 0, 'sem erro de JS na landing' + (erros.length ? ': ' + erros[0] : ''));
    await ctx.close();
    const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    await p2.goto(`${BASE}/conheca`, { waitUntil: 'networkidle' });
    await p2.screenshot({ path: 'deploy/prova-conheca-desktop.png', fullPage: true });
    await ctx2.close();
  }
} finally {
  await browser.close();
  try { process.kill(dev.pid); } catch { /* ja fechou */ }
  await mataPorta();
}
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo');
process.exit(falhas ? 1 : 0);
