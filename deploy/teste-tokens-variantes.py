# -*- coding: utf-8 -*-
"""Variantes coloridas de cartão continuam coloridas depois dos tokens (lote 2, 27/09/2026).
Uso: python deploy/teste-tokens-variantes.py   (sai 1 se alguma variante virar cartão neutro)
Nos dois temas, .kpi.green, .kpi.red, .kpi.yel, .card.yel e .mdw.nota-y precisam diferir do
cartão neutro no fundo ou na borda. A seção de tokens no fim do CSS não pode apagar isso."""
import sys, os, json, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(('127.0.0.1', 5191), functools.partial(Q, directory='public'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
        'user': {'id': '0', 'email': 't@l', 'user_metadata': {}}}
VARIANTES = [('kpi', 'kpi green'), ('kpi', 'kpi red'), ('kpi', 'kpi yel'), ('card', 'card yel'), ('mdw', 'mdw nota-y')]
falhas = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ('light', 'dark'):
        c = b.new_context(viewport={'width': 1440, 'height': 900})
        c.add_init_script("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','%s');" % (json.dumps(json.dumps(sess)), tema))
        p = c.new_page(); p.goto('http://127.0.0.1:5191/workflowark.html'); p.wait_for_timeout(3000)
        r = p.evaluate("""([tema, vs]) => {
          document.body.classList.toggle('aura-dark', tema === 'dark'); document.body.classList.toggle('aura-light', tema === 'light');
          const box = document.createElement('div'); document.querySelector('.main, body').appendChild(box);
          const st = cls => { const e = document.createElement('div'); e.className = cls; box.appendChild(e); const s = getComputedStyle(e); return s.backgroundImage + '|' + s.backgroundColor + '|' + s.borderTopColor; };
          return vs.map(([base, cls]) => [cls, st(base), st(cls)]);
        }""", [tema, VARIANTES])
        for cls, neutro, var in r:
            if neutro == var:
                falhas.append('%s: .%s ficou igual ao cartão neutro (%s)' % (tema, cls.replace(' ', '.'), var))
        c.close()
    b.close()
srv.shutdown()
if falhas:
    print('FALHA'); [print(' -', f) for f in falhas]; sys.exit(1)
print('OK: %d variantes seguem coloridas nos 2 temas' % len(VARIANTES))
