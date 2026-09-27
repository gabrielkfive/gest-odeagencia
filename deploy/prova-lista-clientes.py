# -*- coding: utf-8 -*-
"""Prova da Lista de Clientes no molde da V3 (26/09/2026). Uso: python deploy/prova-lista-clientes.py [url-base].
Local: carteira FICTÍCIA (repositório público). Abas, busca, cartões e lista em claro, escuro e celular."""
import sys, json, time, threading, http.server, socketserver, functools, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5199), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5199'
sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'user': {'id': '0', 'email': 'dono@agencia.exemplo'}}
CLI = [{'id': 'aurora', 'nm': 'Café Aurora', 'plano': 'Crescimento', 'tipo': 'ARK', 'status': 'gr', 'valor': 1800, 'cap': 1, 'meta': 'Cardápio de primavera em produção.'},
       {'id': 'petfeliz', 'nm': 'Pet Feliz', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'y', 'valor': 2200, 'cap': 0, 'meta': 'Ajustar o calendário de outubro.'},
       {'id': 'pilates', 'nm': 'Studio Pilates Leve', 'plano': 'Squad', 'tipo': 'Alpha', 'status': 'gr', 'valor': 0, 'cap': 0, 'meta': ''},
       {'id': 'burger', 'nm': 'Burger do Bairro', 'plano': 'Crescimento', 'tipo': 'ARK', 'status': 'r', 'valor': 1500, 'cap': 2, 'meta': 'Cobrança atrasada.'},
       {'id': 'otica', 'nm': 'Ótica Nova Visão', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'gr', 'valor': 1000, 'cap': 0, 'meta': ''},
       {'id': 'antigo', 'nm': 'Bar Antigo', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'churn', 'valor': 900, 'cap': 0, 'meta': ''}]
SEED = ("() => { const c = %s; CLIENTES.length = 0; c.forEach(x => CLIENTES.push(x)); "
        "SPRINTS.forEach(s => s.clis = []); SPRINTS[0].clis = ['otica']; SPRINTS[3].clis = ['aurora']; SPRINTS[7].clis = ['petfeliz','burger']; "
        "state.cobranca = { aurora: { cobradoMes: cobMesKey() } }; WFA_MEMBER = {id:'m1', role:'admin', full_name:'Dono'}; try{applyAccess();}catch(e){} try{renderClientesKPIs();}catch(e){} try{cliListaRender();}catch(e){} }") % json.dumps(CLI)
local = srv is not None
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1000})
        sj = ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);" % json.dumps(json.dumps(sess))) if local else ''
        ctx.add_init_script("try{%slocalStorage.setItem('wfa-theme','%s');localStorage.removeItem('wfa-cli-vista');}catch(e){}" % (sj, tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        print(tema, 'marcador:', p.evaluate("async () => { const t = await (await fetch(location.href,{cache:'no-store'})).text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
        if local: p.evaluate(SEED)
        p.evaluate("() => document.querySelector('[data-nav=lista-clientes]').click()"); p.wait_for_timeout(500)
        p.evaluate("() => cliListaRender()"); p.wait_for_timeout(300)
        print('  sub:', p.evaluate("() => document.getElementById('cl-sub').textContent"), '| abas:', p.evaluate("() => [...document.querySelectorAll('#cl-abas button')].map(b=>b.textContent).join(', ')"))
        print('  cartoes:', p.evaluate("() => document.querySelectorAll('.cl-card').length"), '| primeiro:', p.evaluate("() => (document.querySelector('.cl-card .cl-nm b')||{}).textContent"), '| saude visivel:', p.evaluate("() => getComputedStyle(document.getElementById('cli-health')).display"), '| mapa:', p.evaluate("() => getComputedStyle(document.getElementById('climap-card')).display"))
        if local: p.screenshot(path=f'deploy/prova-lista-cartoes-{tema}.png', full_page=False)
        for aba in ['onboarding', 'jornada', 'atencao', 'churn']:
            p.evaluate("(a) => document.querySelector('[data-cl-aba=' + a + ']').click()", aba); p.wait_for_timeout(200)
            print('   aba', aba, '->', p.evaluate("() => [...document.querySelectorAll('.cl-card .cl-nm b')].map(e=>e.textContent).join(', ')"))
        p.evaluate("() => document.querySelector('[data-cl-aba=todos]').click()")
        p.fill('#cl-busca', 'aurora'); p.wait_for_timeout(200)
        print('  busca aurora ->', p.evaluate("() => [...document.querySelectorAll('.cl-card .cl-nm b')].map(e=>e.textContent).join(', ')"))
        p.fill('#cl-busca', ''); p.evaluate("() => document.querySelector('[data-cl-vista=lista]').click()"); p.wait_for_timeout(300)
        print('  lista linhas:', p.evaluate("() => document.querySelectorAll('.cl-tab tbody tr').length"))
        if local: p.screenshot(path=f'deploy/prova-lista-tabela-{tema}.png', full_page=False)
        p.evaluate("() => document.querySelector('.cl-tab tbody tr').click()"); p.wait_for_timeout(500)
        print('  clique abre ficha:', p.evaluate("() => { const m = document.getElementById('modal-cli-det') || document.querySelector('.modal-bg.open'); return !!(m && (m.classList.contains('open') || getComputedStyle(m).display !== 'none')); }"))
        if tema == 'dark':
            p.evaluate("() => { document.querySelectorAll('.modal-bg.open').forEach(m=>m.classList.remove('open')); document.querySelector('[data-cl-vista=cartoes]').click(); }")
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(700)
            print('  celular largura:', p.evaluate("() => document.documentElement.scrollWidth"))
            if local: p.screenshot(path='deploy/prova-lista-celular.png', full_page=True)
        print('  erros de pagina:', erros or 'nenhum')
        ctx.close()
    b.close()
if srv: srv.shutdown()
