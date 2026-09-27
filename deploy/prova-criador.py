# -*- coding: utf-8 -*-
"""Prova do Modo Criador no app original (26/09/2026). Uso: python deploy/prova-criador.py [url-base].
Local: public/ com carteira e tarefas FICTÍCIAS (o repositório é público). Mede o painel, abre um
cliente e volta; claro, escuro e celular. Saída: deploy/prova-criador-*.png"""
import sys, json, time, threading, http.server, socketserver, functools, io
from datetime import date, timedelta
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5198), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5198'
d = lambda n: (date.today() + timedelta(days=n)).isoformat()
sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600, 'user': {'id': '0', 'email': 'dono@agencia.exemplo'}}
CLI = [{'id': 'aurora', 'nm': 'Café Aurora', 'plano': 'Crescimento', 'tipo': 'ARK', 'status': 'gr', 'valor': 1800, 'cap': 1, 'meta': ''},
       {'id': 'petfeliz', 'nm': 'Pet Feliz', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'y', 'valor': 2200, 'cap': 0, 'meta': ''},
       {'id': 'pilates', 'nm': 'Studio Pilates Leve', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'gr', 'valor': 1200, 'cap': 0, 'meta': ''},
       {'id': 'burger', 'nm': 'Burger do Bairro', 'plano': 'Crescimento', 'tipo': 'ARK', 'status': 'r', 'valor': 1500, 'cap': 0, 'meta': ''},
       {'id': 'otica', 'nm': 'Ótica Nova Visão', 'plano': 'Essencial', 'tipo': 'ARK', 'status': 'gr', 'valor': 1000, 'cap': 0, 'meta': ''}]
T = [{'id': 't1', 'title': 'Reel cappuccino', 'clienteId': 'aurora', 'status': 'homologcli', 'formato': 'reel', 'data': d(2), 'up': 1},
     {'id': 't2', 'title': 'Post cardápio', 'clienteId': 'aurora', 'status': 'homologcli', 'formato': 'carrossel', 'data': d(1), 'up': 1},
     {'id': 't3', 'title': 'Story enquete', 'clienteId': 'aurora', 'status': 'aprovacao', 'formato': 'story', 'data': d(-2), 'up': 1},
     {'id': 't4', 'title': 'Post aniversário', 'clienteId': 'aurora', 'status': 'concluido', 'formato': 'estatico', 'data': d(-5), 'up': 1},
     {'id': 't5', 'title': 'Reel banho e tosa', 'clienteId': 'petfeliz', 'status': 'andamento', 'formato': 'reel', 'data': d(-3), 'up': 1},
     {'id': 't6', 'title': 'Post aula experimental', 'clienteId': 'pilates', 'status': 'aprovacao', 'formato': 'estatico', 'data': d(3), 'up': 1},
     {'id': 't7', 'title': 'Reel smash', 'clienteId': 'burger', 'status': 'backlog', 'formato': 'reel', 'data': d(-1), 'up': 1}]
local = srv is not None
SEED = ("() => { const c = %s; CLIENTES.length = 0; c.forEach(x => CLIENTES.push(x)); state.tarefas = %s; "
        "WFA_MEMBER = {id:'m1', role:'admin', full_name:'Dono'}; try{applyAccess();}catch(e){} }") % (json.dumps(CLI), json.dumps(T))
ATIVA = "() => (document.querySelector('.page.active')||{}).id"
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1000})
        sess_js = ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);" % json.dumps(json.dumps(sess))) if local else ''
        ctx.add_init_script("try{%slocalStorage.setItem('wfa-theme','%s');}catch(e){}" % (sess_js, tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        print(tema, 'marcador:', p.evaluate("async () => { const t = await (await fetch(location.href,{cache:'no-store'})).text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
        if local: p.evaluate(SEED)
        print('  menu Atividades:', p.evaluate("() => [...document.querySelectorAll('#atividades-menu .subitem span')].map(e=>e.textContent.trim()).join(', ')"))
        p.evaluate("() => document.querySelector('[data-nav=criador]').click()"); p.wait_for_timeout(600)
        print('  pagina ativa:', p.evaluate(ATIVA),
              '| kpis:', p.evaluate("() => [...document.querySelectorAll('#page-criador .cri-kpi-v')].map(e=>e.textContent).join('/')"),
              '| cartoes:', p.evaluate("() => document.querySelectorAll('#page-criador .cri-card').length"),
              '| primeiro:', p.evaluate("() => (document.querySelector('#page-criador .cri-nm b')||{}).textContent"))
        if local: p.screenshot(path=f'deploy/prova-criador-{tema}.png')
        p.evaluate("() => document.querySelector('[data-cri-abrir]').click()"); p.wait_for_timeout(900)
        print('  abriu cliente:', p.evaluate(ATIVA), '| voltar visivel:', p.evaluate("() => getComputedStyle(document.getElementById('cri-voltar')).display"),
              '| topo:', p.evaluate("() => { const g = document.getElementById('cli-portal-generic'); return g ? g.innerText.split(String.fromCharCode(10)).filter(Boolean).slice(0,6).join(' | ') : 'vazio'; }"))
        if local: p.screenshot(path=f'deploy/prova-criador-cliente-{tema}.png')
        p.evaluate("() => document.getElementById('cri-voltar').click()"); p.wait_for_timeout(400)
        print('  voltou para:', p.evaluate(ATIVA))
        p.evaluate("() => document.querySelector('[data-nav=lista-clientes]').click()"); p.wait_for_timeout(500)
        print('  lista: mapa escondido:', p.evaluate("() => getComputedStyle(document.getElementById('climap-card')).display"))
        p.evaluate("() => cliMapAbrir()"); p.wait_for_timeout(300)
        print('  depois do botao:', p.evaluate("() => getComputedStyle(document.getElementById('climap-card')).display"), p.evaluate("() => document.getElementById('climap-abrir').textContent"))
        if tema == 'dark':
            p.evaluate("() => document.querySelector('[data-nav=criador]').click()")
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(700)
            print('  celular largura:', p.evaluate("() => document.documentElement.scrollWidth"))
            if local: p.screenshot(path='deploy/prova-criador-celular.png', full_page=True)
        print('  erros de pagina:', erros or 'nenhum')
        ctx.close()
    b.close()
if srv: srv.shutdown()
