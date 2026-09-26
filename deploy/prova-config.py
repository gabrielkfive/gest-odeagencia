# -*- coding: utf-8 -*-
"""Prova das Configurações no molde da V3 (26/09/2026). Uso: python deploy/prova-config.py [url-base].
Abre cada seção como admin (claro e escuro), confere que operação só vê Conta e mede o celular."""
import sys, json, time, threading, http.server, socketserver, functools, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5197), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5197'
sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'user': {'id': '0', 'email': 'dono@agencia.exemplo'}}
local = srv is not None
SECOES = ['marca', 'equipe', 'clientes', 'integracoes', 'planos', 'automacoes', 'assinatura', 'cobranca', 'conta']
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1000})
        ctx.add_init_script("try{%slocalStorage.setItem('wfa-theme','%s');}catch(e){}" % ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);" % json.dumps(json.dumps(sess)) if local else '', tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        print(tema, 'marcador:', p.evaluate("async () => { const t = await (await fetch(location.href,{cache:'no-store'})).text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
        p.evaluate("() => { WFA_MEMBER = {id:'m1', role:'admin', full_name:'Dono da Agência', email:'dono@agencia.exemplo'}; WFA_MEMBERS=[WFA_MEMBER]; openSettings(); }"); p.wait_for_timeout(500)
        print('  inicial:', p.evaluate("() => document.querySelector('#modal-settings .set-pane.active').dataset.stp"))
        for sec in SECOES:
            p.evaluate("(s) => setTab(s)", sec); p.wait_for_timeout(250)
            ativo = p.evaluate("() => document.querySelector('#modal-settings .set-pane.active').dataset.stp")
            alt = p.evaluate("() => document.querySelector('#modal-settings .set-pane.active').offsetHeight")
            print('   ', sec, '->', ativo, '| altura', alt)
            if local and sec in ('marca', 'clientes', 'automacoes', 'conta'):
                p.locator('#modal-settings .modal').screenshot(path=f'deploy/prova-config-{sec}-{tema}.png')
        print('  antigas: perfil ->', p.evaluate("() => { setTab('perfil'); return document.querySelector('#modal-settings .set-pane.active').dataset.stp; }"), '| sistema ->', p.evaluate("() => { setTab('sistema'); return document.querySelector('#modal-settings .set-pane.active').dataset.stp; }"))
        p.evaluate("() => { closeModal('modal-settings'); WFA_MEMBER = {id:'m2', role:'operacao', full_name:'Ana'}; openSettings(); }"); p.wait_for_timeout(400)
        print('  operacao ve:', p.evaluate("() => [...document.querySelectorAll('#modal-settings .set-tab')].filter(b=>b.style.display!=='none').map(b=>b.dataset.st).join(',')"), '| ativa:', p.evaluate("() => document.querySelector('#modal-settings .set-pane.active').dataset.stp"))
        if tema == 'dark':
            p.evaluate("() => { WFA_MEMBER = {id:'m1', role:'admin', full_name:'Dono'}; openSettings(); }")
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(600)
            print('  celular largura:', p.evaluate("() => document.documentElement.scrollWidth"))
            if local: p.screenshot(path='deploy/prova-config-celular.png')
        print('  erros de pagina:', erros or 'nenhum')
        ctx.close()
    b.close()
if srv: srv.shutdown()
