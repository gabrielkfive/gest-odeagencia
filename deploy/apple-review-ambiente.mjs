/*
 Ambiente compartilhado das capturas e do teste do Kanban (revisao Apple, 10/09/2026).

 Por que existe: rodar por file:// deixa o navegador esperando fontes do Google e o
 animejs do CDN, e o app tenta falar com a API de producao. Aqui:
   1. servidorLocal() serve public/ por HTTP num porto livre (sem CORS, sem file://);
   2. bloqueiaRedeExterna() aborta toda requisicao fora de localhost (fonte, CDN, API);
   3. SEMENTE e semear() colocam no localStorage uma carteira sintetica completa
      (cliente, etiqueta, checklist, comentario, anexo com imagem, relogio correndo,
      tarefa atrasada, tarefa de projeto ligada) e o tema pedido.

 Nada aqui toca dado real: a sessao e falsa e a rede de producao e barrada.
*/
import http from 'http';
import fs from 'fs';
import path from 'path';

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

export function servidorLocal(raiz = path.resolve('public')) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      let arq = path.join(raiz, url === '/' ? 'workflowark.html' : url);
      if (!arq.startsWith(raiz) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.statusCode = 404; res.end('nao achei'); return; }
      res.setHeader('Content-Type', MIME[path.extname(arq).toLowerCase()] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      fs.createReadStream(arq).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => {
      const porta = srv.address().port;
      resolve({ url: `http://127.0.0.1:${porta}`, fecha: () => srv.close() });
    });
  });
}

// Bloqueia tudo que nao e o servidor local. O app tolera: fonte cai no fallback do
// sistema, animejs e opcional, e a API falha rapido (fica "Salvando..." local, que e o
// comportamento esperado sem rede).
export async function bloqueiaRedeExterna(ctx) {
  await ctx.route('**/*', (rota) => {
    const u = rota.request().url();
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost') || u.startsWith('data:') || u.startsWith('blob:')) return rota.continue();
    return rota.abort('blockedbyclient');
  });
}

const DIA = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const HOJE = DIA(0);
const IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#ffc700"/><stop offset="1" stop-color="#ff7a3c"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="480" cy="120" r="70" fill="#fff" opacity=".35"/></svg>');
const AGORA = new Date().toISOString();

export const SEMENTE = {
  tema: 'light',
  tarefas: [
    { id: 't-capa', title: 'Criativos do Dia dos Pais para o feed', desc: 'Três artes estáticas e um Reel curto. Aprovar paleta com o cliente antes de fechar a arte final.', status: 'andamento', resp: 'Gabriel Andrade', resps: ['Gabriel Andrade', 'Maria Luiza'], clienteId: 'vivenda', prio: 'alta', data: DIA(1), ord: 0, tags: ['Design', 'Social'], horas: 6,
      checklist: [{ t: 'Briefing lido', done: true }, { t: 'Paleta aprovada', done: true }, { t: 'Arte 1', done: false }, { t: 'Reel', done: false }],
      comments: [{ autor: 'Maria Luiza', texto: 'Cliente pediu o amarelo mais fechado.', em: AGORA }],
      attachments: [{ nome: 'referencia.svg', url: IMG, tipo: 'imagem' }],
      hist: [{ em: AGORA, txt: 'Movida para Em Andamento' }],
      timeSpent: 5400, timerSince: AGORA, up: AGORA },
    { id: 't2', title: 'Relatório semanal de Google Ads', desc: 'Consolidar CPC, CTR e conversões da semana.', status: 'backlog', resp: 'Lucas Rosi', resps: ['Lucas Rosi'], clienteId: 'fercon', prio: 'media', data: DIA(-2), ord: 0, tags: ['Tráfego'], checklist: [{ t: 'Puxar dados', done: false }], timeSpent: 0, up: AGORA },
    { id: 't3', title: 'Landing page da campanha OAB', desc: '', status: 'backlog', resp: 'Danilo de Lima', resps: ['Danilo de Lima'], clienteId: 'fonseca', prio: 'baixa', data: DIA(5), ord: 1, tags: ['Site'], timeSpent: 1200, up: AGORA },
    { id: 't4', title: 'Roteiro do vídeo de brindes corporativos', desc: 'Formato 45 s, locução e legenda.', status: 'iniciar', resp: 'Bruno', resps: ['Bruno'], clienteId: 'sasse', prio: 'media', data: HOJE, ord: 0, tags: ['Vídeo', 'Roteiro'], comments: [{ autor: 'Bruno', texto: 'Aguardando o produto chegar.', em: AGORA }], timeSpent: 0, up: AGORA },
    { id: 't5', title: 'Post carrossel: bastidores do restaurante', status: 'iniciar', resp: 'Maria Luiza', resps: ['Maria Luiza'], clienteId: 'vaca', prio: 'baixa', data: DIA(3), ord: 1, tags: ['Social'], timeSpent: 0, up: AGORA },
    { id: 't6', title: 'Ajustar pixel e eventos de conversão', desc: 'Purchase e Lead duplicando no GTM.', status: 'andamento', resp: 'Lucas Rosi', resps: ['Lucas Rosi', 'Henrique'], clienteId: 'fercon', prio: 'alta', data: DIA(-1), ord: 1, tags: ['Tráfego'], checklist: [{ t: 'Mapear tags', done: true }, { t: 'Testar no Tag Assistant', done: false }], timeSpent: 3000, up: AGORA },
    { id: 't7', title: 'Edição do Reel da inauguração', status: 'aprovacao', resp: 'Saulo', resps: ['Saulo'], clienteId: 'vivenda', prio: 'media', data: DIA(0), ord: 0, tags: ['Vídeo'], attachments: [{ nome: 'v1.mp4', url: 'https://exemplo.local/v1.mp4' }], timeSpent: 7200, up: AGORA },
    { id: 't8', title: 'Proposta de renovação do plano Gold', desc: 'Atualizar escopo e valores.', status: 'homologcli', resp: 'Gabriel Andrade', resps: ['Gabriel Andrade'], clienteId: 'fonseca', prio: 'alta', data: DIA(2), ord: 0, tags: ['Comercial'], timeSpent: 0, up: AGORA },
    { id: 't9', title: 'Planejamento de conteúdo de setembro', status: 'concluido', resp: 'Maria Luiza', resps: ['Maria Luiza'], clienteId: 'ark', prio: 'media', data: DIA(-6), ord: 0, tags: ['Planejamento'], concluidaEm: AGORA, timeSpent: 9000, up: AGORA },
    { id: 't10', title: 'Sem cliente e sem responsável, só título', status: 'backlog', prio: 'media', ord: 2, timeSpent: 0, up: AGORA },
  ],
  projetos: [
    { id: 'pj-viv', cliente: 'Vivenda', clienteId: 'vivenda', sprint: 3, up: AGORA, tarefas: [
      { id: 'pt1', t: 'Captação de setembro na loja', st: 'andamento', resps: ['Nicolas'], resp: 'Nicolas', venc: DIA(4), horas: 8, papeis: [], up: AGORA },
      { id: 'pt2', t: 'Roteiro TikTok Shop', st: 'backlog', resps: ['Bruno'], resp: 'Bruno', venc: DIA(9), up: AGORA },
    ] },
  ],
};

// Roda dentro do navegador (addInitScript). Recebe a semente por parametro.
export const semear = (s) => {
  try {
    localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token', JSON.stringify({
      access_token: 'teste-local', refresh_token: 'teste-local', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: '00000000-0000-0000-0000-000000000000', email: 'teste@local' },
    }));
    localStorage.setItem('wfa-theme', s.tema === 'light' ? 'light' : 'dark');
    if (!localStorage.getItem('wfa-apple-semeado')) {
      localStorage.setItem('wfa-tarefas', JSON.stringify(s.tarefas));
      localStorage.setItem('wfa-projetos', JSON.stringify(s.projetos));
      localStorage.setItem('wfa-apple-semeado', '1');
    }
  } catch (e) {}
};
