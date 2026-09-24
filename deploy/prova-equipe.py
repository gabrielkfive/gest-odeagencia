# -*- coding: utf-8 -*-
"""Prova da aba Equipe e papéis (tela Equipe da V3 no app original), 24/09/2026.
Uso: python deploy/prova-equipe.py [url-base]
Sem url: sobe public/ num servidor local e injeta equipe fictícia (sem nome de cliente real).
Captura claro e escuro (1440x1000) e celular (390x844) em deploy/prova-equipe-<tema>.png."""
import sys, json, time, threading, http.server, socketserver, functools, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5193), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5193'

sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer', 'expires_in': 3600,
        'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'dono@agencia.exemplo', 'user_metadata': {'full_name': 'Dono da Agência'}}}
membros = [
    {'id': 'm1', 'email': 'dono@agencia.exemplo', 'full_name': 'Dono da Agência', 'user_id': 'u1', 'role': 'admin', 'active': True, 'permissions': {}},
    {'id': 'm2', 'email': 'ana@agencia.exemplo', 'full_name': 'Ana Operação', 'user_id': 'u2', 'role': 'operacao', 'active': True, 'permissions': {'ajustes': {'crm': True}}},
    {'id': 'm3', 'email': 'bruno@agencia.exemplo', 'full_name': 'Bruno Comercial', 'user_id': 'u3', 'role': 'comercial', 'active': True, 'permissions': {}},
    {'id': 'm4', 'email': 'carla@agencia.exemplo', 'full_name': 'Carla', 'user_id': 'u4', 'role': 'viewer', 'active': False, 'permissions': {}},
    {'id': 'm5', 'email': 'novo@agencia.exemplo', 'full_name': None, 'user_id': None, 'role': 'marketing', 'active': True, 'permissions': {}, 'created_at': '2026-09-24T12:00:00Z'},
]
seed = "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);" % json.dumps(json.dumps(sess))
ABRIR = """(d) => { WFA_MEMBER = d.m[0]; WFA_MEMBERS = d.m; WFA_PERMISSOES = {financeiro:{atividades:{ver:true,editar:false}}};
  try{applyAccess();}catch(e){} openSettings(); setTab('equipe'); return !!window.WFA_PERM; }"""

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ['light', 'dark']:
        ctx = b.new_context(viewport={'width': 1440, 'height': 1000})
        ctx.add_init_script("try{%slocalStorage.setItem('wfa-theme','%s');}catch(e){}" % (seed, tema))
        p = ctx.new_page(); erros = []
        p.on('pageerror', lambda e: erros.append(str(e)[:160]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3000)
        print(tema, 'modulo de permissoes carregado:', p.evaluate(ABRIR, {'m': membros}))
        p.wait_for_timeout(500)
        print('  membros:', p.evaluate("() => document.querySelectorAll('.eq-membro').length"),
              '| convites:', p.evaluate("() => document.querySelectorAll('.eq-conv').length"),
              '| linhas da matriz:', p.evaluate("() => document.querySelectorAll('.eq-tabela tbody tr').length"),
              '| celulas Parte:', p.evaluate("() => document.querySelectorAll('.eq-chip.parte').length"))
        p.evaluate("() => { const c=document.querySelector('.eq-chip input[data-p=operacao][data-a=financeiro][data-x=ver]'); c.click(); }")
        print('  salvar habilitado depois de mudar:', p.evaluate("() => !document.getElementById('eq-salvar-matriz').disabled"))
        p.evaluate("() => document.querySelector('.eq-membro[data-id=m2] [data-mais]').click()"); p.wait_for_timeout(300)
        p.set_viewport_size({'width': 1440, 'height': 2600}); p.wait_for_timeout(300)
        p.evaluate("() => { const m=document.querySelector('#modal-settings .modal'); m.style.maxHeight='none'; m.querySelectorAll('*').forEach(e=>{ if(getComputedStyle(e).overflowY==='auto') e.style.maxHeight='none'; }); }")
        p.locator('#modal-settings .modal').screenshot(path=f'deploy/prova-equipe-{tema}.png')
        p.set_viewport_size({'width': 1440, 'height': 1000})
        if tema == 'dark':
            p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(600)
            larg = p.evaluate("() => document.documentElement.scrollWidth")
            print('  celular, largura da pagina:', larg)
            p.screenshot(path='deploy/prova-equipe-celular.png', full_page=False)
        print('  erros de pagina:', erros or 'nenhum')
        ctx.close()
    b.close()
if srv: srv.shutdown()
