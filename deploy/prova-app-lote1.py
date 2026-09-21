# -*- coding: utf-8 -*-
"""Prova do lote 1 no /app (21/09). Uso: python deploy/prova-app-lote1.py <antes|depois> [url-base]
Sem url: sobe public/ num servidor local. Sessão falsa com foto no localStorage, carteira sintética.
Captura: inicio, rodape, cliente, sistema, menu. Sai em deploy/prova-app-lote1-<fase>-<tela>.png"""
import sys, json, time, threading, http.server, socketserver, os, functools
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
fase = sys.argv[1] if len(sys.argv) > 1 else 'depois'
base = sys.argv[2] if len(sys.argv) > 2 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5188), functools.partial(Q, directory='public')); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5188'
hoje = date.today(); d = lambda n: (hoje + timedelta(days=n)).isoformat(); agora = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
FOTO = 'data:image/svg+xml;utf8,' + '%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2232%22 fill=%22%23F2A33A%22/%3E%3Ccircle cx=%2232%22 cy=%2226%22 r=%2211%22 fill=%22%23fff%22/%3E%3C/svg%3E'
sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'teste@local', 'user_metadata': {'avatar_url': FOTO, 'full_name': 'Gabriel Andrade'}}}
tarefas = [
    {'id': 't1', 'title': 'Reel Café com Nutri', 'status': 'andamento', 'resp': 'Gabriel Andrade', 'clienteId': 'vivenda', 'data': d(1), 'publicarEm': d(2) + 'T18:00', 'formato': 'reel', 'up': agora},
    {'id': 't2', 'title': 'Story Novo Gama', 'status': 'homologcli', 'resp': 'Maria Luiza', 'clienteId': 'vivenda', 'data': d(0), 'publicarEm': d(1) + 'T12:00', 'formato': 'story', 'up': agora},
    {'id': 't3', 'title': 'Carrossel Semana do Consumidor', 'status': 'concluido', 'resp': 'Bruno', 'clienteId': 'vivenda', 'data': d(-4), 'publicarEm': d(-3) + 'T10:00', 'formato': 'carrossel', 'concluidaEm': d(-4) + 'T10:00:00.000Z', 'up': agora},
    {'id': 't4', 'title': 'Relatório de Ads', 'status': 'backlog', 'resp': 'Lucas Rosi', 'clienteId': 'fercon', 'data': d(-2), 'up': agora},
]
seed = "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','dark');localStorage.setItem('wfa-tarefas',%s);" % (json.dumps(json.dumps(sess)), json.dumps(json.dumps(tarefas)))
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}); ctx.add_init_script('try{%s}catch(e){}' % seed)
    p = ctx.new_page(); erros = []; p.on('pageerror', lambda e: erros.append(str(e)[:140]))
    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
    print('marcador:', p.evaluate("() => (document.documentElement.outerHTML.match(/build [0-9a-z-]+/)||[''])[0]"))
    p.screenshot(path=f'deploy/prova-app-lote1-{fase}-inicio.png')
    print('rodape:', p.evaluate("() => (document.getElementById('side-rl')||{}).textContent + ' | foto=' + !!document.querySelector('#side-av img')"))
    p.locator('.side-foot').screenshot(path=f'deploy/prova-app-lote1-{fase}-rodape.png')
    print('regua no menu:', p.evaluate("() => !!document.querySelector('[data-nav=regua]')"), '| novo meu dia:', p.evaluate("() => !!document.querySelector('a[href=\"/meu-dia\"]')"))
    print('decisoes titulo:', p.evaluate("() => (document.querySelector('#md-decisoes .dec-hd b')||{}).textContent"))
    p.evaluate("() => { const n = document.querySelector('[data-nav=cliente]'); n && n.click(); }"); p.wait_for_timeout(600)
    p.evaluate("() => { const s = document.getElementById('cli-area-sel'); if (s) { s.value = 'vivenda'; if (typeof cliAreaSelect === 'function') cliAreaSelect('vivenda'); else s.dispatchEvent(new Event('change')); } }"); p.wait_for_timeout(600)
    print('abas cliente:', p.evaluate("() => [...document.querySelectorAll('.nxc-tab')].map(e => e.textContent.trim().split(' ')[0]).join(', ') || 'nenhuma'"))
    p.screenshot(path=f'deploy/prova-app-lote1-{fase}-cliente.png')
    p.evaluate("() => { try { openSettings(); } catch (e) {} }"); p.wait_for_timeout(500)
    print('aba sistema:', p.evaluate("() => !!document.querySelector('.set-tab[data-st=sistema]')"))
    p.evaluate("() => { try { setTab('sistema'); } catch (e) {} }"); p.wait_for_timeout(300)
    p.screenshot(path=f'deploy/prova-app-lote1-{fase}-sistema.png')
    print('erros de JS:', erros or 'nenhum')
    b.close()
if srv: srv.shutdown()
