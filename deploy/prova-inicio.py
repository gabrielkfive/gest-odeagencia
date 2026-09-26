# -*- coding: utf-8 -*-
"""Prova do Início no molde da V3 (26/09/2026): Primeiros passos, Esperando sua aprovação e Este mês.
Uso: python deploy/prova-inicio.py [url-base]. Sem url: public/ local com dados fictícios.
Saída: deploy/prova-inicio-<tema>.png e deploy/prova-inicio-celular.png"""
import sys, json, time, threading, http.server, socketserver, functools, io, importlib.util
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5196), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5196'
sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': int(time.time()) + 3600,
        'user': {'id': '0', 'email': 'dono@agencia.exemplo'}}
rec = lambda f: [{'nome': 'Café Aurora', 'valor': round(1800 * f)}, {'nome': 'Burger do Bairro', 'valor': 1500}, {'nome': 'Pet Feliz', 'valor': 2200}]
plan = {'ativo': 'b', 'seeded': True, 'meses': [
    {'id': 'a', 'nome': 'Agosto Exemplo', 'mk': '2026-08', 'receitas': rec(1), 'pagar': [{'nome': 'Designer', 'valor': 2000}]},
    {'id': 'b', 'nome': 'Setembro Exemplo', 'mk': '2026-09', 'receitas': rec(1.2), 'pagar': [{'nome': 'Designer', 'valor': 2000}]}]}
cob = {'plan-cafe-aurora': {'_plan': True, '_nome': 'Café Aurora', 'cobradoMeses': {'2026-08': 1, '2026-09': 1}},
       'plan-pet-feliz': {'_plan': True, '_nome': 'Pet Feliz', 'cobradoMeses': {'2026-08': 1}}}
seed = ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-planilha',%s);localStorage.setItem('wfa-cobranca',%s);") % (
    json.dumps(json.dumps(sess)), json.dumps(json.dumps(plan)), json.dumps(json.dumps(cob)))
local = srv is not None
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1100})
        ctx.add_init_script("try{%slocalStorage.setItem('wfa-theme','%s');}catch(e){}" % (seed if local else '', tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        print(tema, 'marcador:', p.evaluate("async () => { const t = await (await fetch(location.href,{cache:'no-store'})).text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
        p.evaluate("() => { WFA_MEMBER = {id:'m1', role:'admin', full_name:'Dono da Agência'}; WFA_MEMBERS=[WFA_MEMBER]; try{localStorage.removeItem('wfa-ini-passos-ok-m1');}catch(e){} renderMeuDia(); }"); p.wait_for_timeout(800)
        print('  passos visiveis:', p.evaluate("() => getComputedStyle(document.getElementById('ini-passos')).display"),
              '| feitos:', p.evaluate("() => document.querySelectorAll('.ini-passo.ok').length"), 'de', p.evaluate("() => document.querySelectorAll('.ini-passo').length"),
              '| este mes:', p.evaluate("() => (document.getElementById('ini-mes').innerText||'').split(String.fromCharCode(10)).filter(Boolean).join(' | ').slice(0,160)"),
              '| titulo fila:', p.evaluate("() => (document.querySelector('#md-decisoes .dec-hd b')||{}).textContent"))
        p.screenshot(path=f'deploy/prova-inicio-{tema}.png', full_page=False)
        if tema == 'dark':
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(700)
            print('  celular largura:', p.evaluate("() => document.documentElement.scrollWidth"))
            p.screenshot(path='deploy/prova-inicio-celular.png', full_page=True)
        p.evaluate("() => document.querySelector('[data-ini-dispensar]') && document.querySelector('[data-ini-dispensar]').click()"); p.wait_for_timeout(300)
        print('  depois de dispensar, passos:', p.evaluate("() => getComputedStyle(document.getElementById('ini-passos')).display"))
        p.evaluate("() => { WFA_MEMBER = {id:'m2', role:'operacao', full_name:'Ana'}; renderMeuDia(); }"); p.wait_for_timeout(500)
        print('  operacao: passos', p.evaluate("() => getComputedStyle(document.getElementById('ini-passos')).display"), '| este mes', p.evaluate("() => getComputedStyle(document.getElementById('ini-mes')).display"))
        print('  erros de pagina:', erros or 'nenhum')
        ctx.close()
    b.close()
if srv: srv.shutdown()
