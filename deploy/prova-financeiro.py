# -*- coding: utf-8 -*-
"""Prova do Financeiro no molde da V3 (26/09/2026).
Uso: python deploy/prova-financeiro.py [url-base]
Sem url: sobe public/ local e injeta planilha FICTÍCIA (nenhum cliente real).
Com url de produção: só abre e mede (dados reais não são fotografados, só contados).
Captura cada aba em claro e escuro (1440) e celular (390) em deploy/prova-fin-*.png."""
import sys, json, time, threading, http.server, socketserver, functools, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5194), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5194'

sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer', 'expires_in': 3600,
        'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'dono@agencia.exemplo', 'user_metadata': {'full_name': 'Dono da Agência'}}}
def mes(i, mk, nome, fator):
    rec = [{'nome': 'Café Aurora', 'valor': round(1800 * fator), 'custo': 600}, {'nome': 'Burger do Bairro', 'valor': 1500, 'custo': 400},
           {'nome': 'Pet Feliz', 'valor': round(2200 * fator), 'custo': 900}, {'nome': 'Studio Pilates Leve', 'valor': 1200, 'custo': 0}]
    pag = [{'nome': 'Designer', 'valor': 2200}, {'nome': 'Editor de vídeo', 'valor': 1800}, {'nome': 'Simples Nacional', 'valor': 420},
           {'nome': 'CEO pró-labore', 'valor': 1500}, {'nome': 'Assinatura ferramentas', 'valor': 260}]
    return {'id': 'pm' + str(i), 'nome': nome, 'mk': mk, 'receitas': rec, 'pagar': pag}
meses = [mes(1, '2026-04', 'Abril Exemplo', .8), mes(2, '2026-05', 'Maio Exemplo', .9), mes(3, '2026-06', 'Junho Exemplo', 1),
         mes(4, '2026-07', 'Julho Exemplo', 1.05), mes(5, '2026-08', 'Agosto Exemplo', 1.1), mes(6, '2026-09', 'Setembro Exemplo', 1.2)]
plan = {'ativo': 'pm6', 'meses': meses, 'seeded': True}
cob = {'plan-cafe-aurora': {'_plan': True, '_nome': 'Café Aurora', 'cobradoMeses': {'2026-04': 1, '2026-05': 1, '2026-06': 1, '2026-07': 1, '2026-08': 1, '2026-09': 1}},
       'plan-burger-do-bairro': {'_plan': True, '_nome': 'Burger do Bairro', 'cobradoMeses': {'2026-04': 1, '2026-05': 1, '2026-06': 1, '2026-07': 1}},
       'plan-pet-feliz': {'_plan': True, '_nome': 'Pet Feliz', 'cobradoMeses': {'2026-04': 1, '2026-05': 1, '2026-06': 1, '2026-07': 1, '2026-08': 1}},
       'plan-studio-pilates-leve': {'_plan': True, '_nome': 'Studio Pilates Leve', 'cobradoMeses': {'2026-04': 1, '2026-05': 1, '2026-06': 1, '2026-07': 1, '2026-08': 1, '2026-09': 1}}}
ace = {'fin-designer': {'nome': 'Designer', 'pagoMeses': {'2026-09': 1}}, 'fin-simples-nacional': {'nome': 'Simples Nacional', 'pagoMeses': {'2026-09': 1}}}
seed_local = ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-planilha',%s);"
              "localStorage.setItem('wfa-cobranca',%s);localStorage.setItem('wfa-acerto',%s);") % (
    json.dumps(json.dumps(sess)), json.dumps(json.dumps(plan)), json.dumps(json.dumps(cob)), json.dumps(json.dumps(ace)))
local = srv is not None
IR = "() => { WFA_MEMBER = {id:'m1', role:'admin', email:'dono@agencia.exemplo', full_name:'Dono da Agência'}; try{applyAccess();}catch(e){} const n=document.querySelector('[data-nav=financeiro]'); n && n.click(); return !!window.WFA_FIN; }"

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1000})
        ctx.add_init_script("try{%slocalStorage.setItem('wfa-theme','%s');}catch(e){}" % (seed_local if local else '', tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        print(tema, 'marcador:', p.evaluate("async () => { const t = await (await fetch(location.href,{cache:'no-store'})).text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
        print('  modulo financeiro:', p.evaluate(IR)); p.wait_for_timeout(700)
        for aba in ['visao', 'receber', 'pagar', 'inad', 'dre', 'planilha']:
            p.evaluate("(a) => document.querySelector('[data-fx-aba=' + a + ']').click()", aba); p.wait_for_timeout(400)
            info = p.evaluate("() => { const c=document.getElementById('fx-corpo'); return {kpis: document.querySelectorAll('.fx-kpi').length, linhas: document.querySelectorAll('.fx-tabela tbody tr').length, svg: document.querySelectorAll('#fx-corpo svg').length, planilha: getComputedStyle(document.getElementById('fx-planilha')).display, larg: document.documentElement.scrollWidth}; }")
            print('  ', aba, info)
            if local:
                p.locator('#page-financeiro').screenshot(path=f'deploy/prova-fin-{aba}-{tema}.png')
        if local and tema == 'light':
            p.evaluate("() => document.querySelector('[data-fx-aba=receber]').click()"); p.wait_for_timeout(300)
            antes = p.evaluate("() => document.querySelectorAll('.fx-chip.ok').length")
            p.evaluate("() => document.querySelector('[data-fx-cob]:not(.fantasma)').click()"); p.wait_for_timeout(500)
            print('  marcar como recebido: recebidos', antes, '->', p.evaluate("() => document.querySelectorAll('.fx-chip.ok').length"))
        if tema == 'dark':
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(700)
            for aba in ['visao', 'receber', 'dre']:
                p.evaluate("(a) => document.querySelector('[data-fx-aba=' + a + ']').click()", aba); p.wait_for_timeout(400)
                print('  celular', aba, 'largura da pagina:', p.evaluate("() => document.documentElement.scrollWidth"))
                if local: p.screenshot(path=f'deploy/prova-fin-celular-{aba}.png', full_page=True)
        print('  erros de pagina:', erros or 'nenhum')
        ctx.close()
    b.close()
if srv: srv.shutdown()
