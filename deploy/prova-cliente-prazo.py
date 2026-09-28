# -*- coding: utf-8 -*-
"""Prova da aba Prazo e das bolinhas de stories na página do cliente (28/09/2026).
Uso: python deploy/prova-cliente-prazo.py
Local: public/ com cliente e tarefas FICTÍCIAS (o repositório é público). Artes são SVG gerados
pelo próprio servidor da prova. Claro, escuro e celular (390 px). Saída: deploy/prova-cliente-prazo-*.png"""
import sys, json, time, threading, http.server, socketserver, functools, io
from datetime import date, timedelta
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

CORES = ['#FFC700', '#f472b6', '#60a5fa', '#4ade80', '#a78bfa', '#fb923c', '#22d3ee', '#f87171']
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.startswith('/__arte/'):
            n = int(''.join(c for c in self.path.split('/')[-1] if c.isdigit()) or 0)
            svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="%s"/>'
                   '<circle cx="200" cy="230" r="90" fill="rgba(0,0,0,.18)"/></svg>') % CORES[n % len(CORES)]
            b = svg.encode()
            self.send_response(200); self.send_header('Content-Type', 'image/svg+xml'); self.send_header('Content-Length', str(len(b)))
            self.end_headers(); self.wfile.write(b); return
        return super().do_GET()
srv = socketserver.TCPServer(('127.0.0.1', 5199), functools.partial(Q, directory='public'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = 'http://127.0.0.1:5199'

d = lambda n: (date.today() + timedelta(days=n)).isoformat()
agora = lambda dias: (date.today() + timedelta(days=dias)).isoformat() + 'T10:00:00Z'
arte = lambda n: [{'url': base + '/__arte/%d.svg' % n, 'nome': 'arte-%d.svg' % n, 'tipo': 'imagem'}]
sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'user': {'id': '0', 'email': 'dono@agencia.exemplo'}}
CLI = [{'id': 'aurora', 'nm': 'Café Aurora', 'plano': 'Crescimento', 'tipo': 'ARK', 'status': 'gr', 'valor': 1800, 'cap': 1, 'meta': ''},
       {'id': 'petfeliz', 'nm': 'Pet Feliz', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'y', 'valor': 2200, 'cap': 0, 'meta': ''}]
A = 'aurora'
T = [
    {'id': 'p1', 'title': 'Reel do cappuccino gelado', 'clienteId': A, 'status': 'andamento', 'formato': 'reel', 'data': d(-4), 'resp': 'Ana'},
    {'id': 'p2', 'title': 'Carrossel do cardápio de primavera', 'clienteId': A, 'status': 'backlog', 'formato': 'carrossel', 'data': d(-1)},
    {'id': 'p3', 'title': 'Post do bolo da semana', 'clienteId': A, 'status': 'iniciar', 'formato': 'estatico', 'data': d(0), 'resp': 'Bruno'},
    {'id': 'p4', 'title': 'Roteiro da captação de outubro', 'clienteId': A, 'status': 'aprovacao', 'data': d(3)},
    {'id': 'p5', 'title': 'Reel dos bastidores da torra', 'clienteId': A, 'status': 'andamento', 'formato': 'reel', 'data': d(6), 'publicarEm': d(8) + 'T18:00'},
    {'id': 'p6', 'title': 'Post do aniversário da casa', 'clienteId': A, 'status': 'backlog', 'formato': 'estatico', 'data': d(15)},
    {'id': 'p7', 'title': 'Revisar a bio do perfil', 'clienteId': A, 'status': 'backlog', 'data': ''},
    {'id': 'c1', 'title': 'Carrossel dos grãos especiais', 'clienteId': A, 'status': 'homologcli', 'formato': 'carrossel', 'data': d(1), 'aprovacaoEm': agora(-5), 'attachments': arte(1), 'publicarEm': d(2) + 'T12:00'},
    {'id': 'c2', 'title': 'Post do café da manhã', 'clienteId': A, 'status': 'homologcli', 'formato': 'estatico', 'data': d(2), 'enviadoClienteEm': agora(-1), 'attachments': arte(2), 'publicarEm': d(4) + 'T12:00'},
    {'id': 'f1', 'title': 'Post da inauguração', 'clienteId': A, 'status': 'concluido', 'formato': 'estatico', 'data': d(-10), 'publicarEm': d(-8) + 'T12:00', 'attachments': arte(3)},
    {'id': 'f2', 'title': 'Reel do barista', 'clienteId': A, 'status': 'concluido', 'formato': 'reel', 'data': d(-6), 'publicarEm': d(-5) + 'T19:00', 'attachments': arte(4)},
    {'id': 'f3', 'title': 'Post do brunch', 'clienteId': A, 'status': 'concluido', 'formato': 'estatico', 'data': d(-3), 'publicarEm': d(1) + 'T12:00', 'attachments': arte(5)},
    {'id': 's1', 'title': 'Story enquete do sabor', 'clienteId': A, 'status': 'concluido', 'formato': 'story', 'publicarEm': d(1) + 'T09:00', 'attachments': arte(6)},
    {'id': 's2', 'title': 'Story bastidores', 'clienteId': A, 'status': 'andamento', 'formato': 'story', 'data': d(2)},
    {'id': 's3', 'title': 'Story promoção', 'clienteId': A, 'status': 'homologcli', 'formato': 'story', 'publicarEm': d(3) + 'T11:00', 'attachments': arte(7)},
    {'id': 's4', 'title': 'Story antigo publicado', 'clienteId': A, 'status': 'concluido', 'formato': 'story', 'publicarEm': d(-3) + 'T11:00', 'attachments': arte(0)},
    {'id': 'x1', 'title': 'Reel banho e tosa', 'clienteId': 'petfeliz', 'status': 'andamento', 'formato': 'reel', 'data': d(-3)},
]
for t in T: t['up'] = 1
SEED = ("() => { const c = %s; CLIENTES.length = 0; c.forEach(x => CLIENTES.push(x)); state.tarefas = %s; "
        "WFA_MEMBER = {id:'m1', role:'admin', full_name:'Dono'}; try{applyAccess();}catch(e){} }") % (json.dumps(CLI), json.dumps(T))
falhas = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1000})
        ctx.add_init_script("try{localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','%s');}catch(e){}"
                            % (json.dumps(json.dumps(sess)), tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        print(tema, 'marcador:', p.evaluate("async () => { const t = await (await fetch(location.href,{cache:'no-store'})).text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
        p.evaluate(SEED)
        print('  modulo carregado:', p.evaluate("() => !!(window.WFA_CLIPRAZO && WFA_CLIPRAZO.agruparPrazoCliente)"))
        p.evaluate("() => criadorAbrir('aurora')"); p.wait_for_timeout(500)
        p.evaluate("() => nxCliAba('prazo')"); p.wait_for_timeout(500)
        secoes = p.evaluate("() => [...document.querySelectorAll('.pz-sec h3')].map(h => h.textContent.trim()).join(' | ')")
        atraso = p.evaluate("() => [...document.querySelectorAll('.pz-etq.late')].map(e => e.textContent).join(', ')")
        aba = p.evaluate("() => [...document.querySelectorAll('.nxc-tab')].map(e => e.textContent.trim()).find(x => x.startsWith('Prazo'))")
        print('  aba:', aba, '| secoes:', secoes, '| atraso:', atraso)
        if 'Atrasado' not in secoes or 'Com o cliente' not in secoes: falhas.append(tema + ': secoes do Prazo')
        p.screenshot(path=f'deploy/prova-cliente-prazo-{tema}.png', full_page=True)
        abriu = p.evaluate("() => { let x=null; const o=window.openTaskDetail; window.openTaskDetail=id=>{x=id}; document.querySelector('.pz-linha').click(); window.openTaskDetail=o; return x; }")
        print('  clique na primeira linha abre:', abriu)
        if abriu != 'p1': falhas.append(tema + ': clique abre tarefa')
        p.evaluate("() => nxCliAba('feed')"); p.wait_for_timeout(800)
        bolas = p.evaluate("() => [...document.querySelectorAll('.st-bola .st-data')].map(e => e.textContent).join(', ')")
        grade = p.evaluate("() => document.querySelectorAll('.feed-item').length")
        print('  stories:', bolas, '| celulas da grade:', grade)
        if not bolas or grade < 1: falhas.append(tema + ': feed')
        p.screenshot(path=f'deploy/prova-cliente-feed-{tema}.png', full_page=True)
        if tema == 'dark':
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(600)
            for aba2 in ['prazo', 'feed']:
                p.evaluate("(a) => nxCliAba(a)", aba2); p.wait_for_timeout(500)
                larg = p.evaluate("() => document.documentElement.scrollWidth")
                print('  celular', aba2, 'largura:', larg)
                if larg > 390: falhas.append('celular ' + aba2 + ': rolagem lateral ' + str(larg))
                p.screenshot(path=f'deploy/prova-cliente-{aba2}-celular.png', full_page=True)
        print('  erros de pagina:', erros or 'nenhum')
        if erros: falhas.append(tema + ': erros de pagina')
        ctx.close()
    b.close()
srv.shutdown()
print('\nFALHAS: ' + '; '.join(falhas) if falhas else '\ntudo certo')
sys.exit(1 if falhas else 0)
