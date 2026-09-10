/*
 Preview local do Kanban de Atividades com dado sintetico (revisao Apple, 10/09/2026).

 Sobe public/ num servidor HTTP local e, ao abrir /workflowark.html, injeta a mesma semente
 das capturas e do teste (sessao falsa, carteira sintetica, tema pedido) antes do app rodar.
 Nao fala com a API de producao com dado real: a sessao e falsa, e o que o app tentar
 gravar na nuvem sera recusado pelo servidor (fica "Salvando..." no aparelho, como sem rede).

 Uso: npm run preview:apple            # abre em http://127.0.0.1:4173/workflowark.html
      node deploy/apple-review-preview.mjs 5000 dark
 Para trocar de tema: ?tema=light ou ?tema=dark na URL. Ctrl+C encerra.
*/
import http from 'http';
import fs from 'fs';
import path from 'path';
import { SEMENTE, semear } from './apple-review-ambiente.mjs';

const porta = Number(process.argv[2]) || 4173;
const temaPadrao = process.argv[3] === 'dark' ? 'dark' : 'light';
const raiz = path.resolve('public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  const [caminho, query = ''] = decodeURIComponent(req.url || '/').split('?');
  const arq = path.join(raiz, caminho === '/' ? 'workflowark.html' : caminho);
  if (!arq.startsWith(raiz) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.statusCode = 404; res.end('nao achei'); return; }
  res.setHeader('Content-Type', MIME[path.extname(arq).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  if (path.basename(arq) === 'workflowark.html') {
    const tema = /tema=dark/.test(query) ? 'dark' : /tema=light/.test(query) ? 'light' : temaPadrao;
    const semente = JSON.stringify({ ...SEMENTE, tema });
    const injecao = `<script>(${semear.toString()})(${semente});</script>`;
    const html = fs.readFileSync(arq, 'utf8').replace('<body', injecao + '\n<body');
    res.end(html); return;
  }
  fs.createReadStream(arq).pipe(res);
}).listen(porta, '127.0.0.1', () => {
  console.log(`Preview local: http://127.0.0.1:${porta}/workflowark.html  (tema ${temaPadrao}; ?tema=dark ou ?tema=light)`);
  console.log('Dado sintetico, sessao falsa. Ctrl+C encerra.');
});
