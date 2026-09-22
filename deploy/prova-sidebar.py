# -*- coding: utf-8 -*-
"""Prova da tarefa 08 (sidebar na ordem final). Uso: python deploy/prova-sidebar.py <antes|depois> [url-base]
Sem url: sobe public/ num servidor local. Sessao falsa com foto, carteira sintetica.
Captura: aberta (1440x900), recolhida, celular (390x844). Sai em deploy/prova-sidebar-<fase>-<estado>.png"""
import sys, json, time, threading, http.server, socketserver, functools, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

fase = sys.argv[1] if len(sys.argv) > 1 else 'depois'
base = sys.argv[2] if len(sys.argv) > 2 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5191), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5191'

hoje = date.today(); d = lambda n: (hoje + timedelta(days=n)).isoformat()
agora = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
FOTO = 'data:image/svg+xml;utf8,' + '%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2232%22 fill=%22%23F2A33A%22/%3E%3Ccircle cx=%2232%22 cy=%2226%22 r=%2211%22 fill=%22%23fff%22/%3E%3C/svg%3E'
sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer', 'expires_in': 3600,
        'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'teste@local',
                 'user_metadata': {'avatar_url': FOTO, 'full_name': 'Gabriel Andrade'}}}
tarefas = [
    {'id': 't1', 'title': 'Reel Cafe com Nutri', 'status': 'andamento', 'resp': 'Gabriel Andrade', 'clienteId': 'vivenda', 'data': d(1), 'up': agora},
    {'id': 't2', 'title': 'Story Novo Gama', 'status': 'homologcli', 'resp': 'Maria Luiza', 'clienteId': 'vivenda', 'data': d(0), 'up': agora},
    {'id': 't3', 'title': 'Relatorio de Ads', 'status': 'backlog', 'resp': 'Lucas Rosi', 'clienteId': 'fercon', 'data': d(-2), 'up': agora},
]
seed = ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);"
        "localStorage.setItem('wfa-theme','dark');"
        "localStorage.setItem('wfa-side-compact','0');"
        "localStorage.setItem('wfa-tarefas',%s);" % (json.dumps(json.dumps(sess)), json.dumps(json.dumps(tarefas))))

ORDEM = "() => { const side = document.querySelector('.side'); if (!side) return ['sem sidebar']; const linhas = []; if (side.querySelector('.crm-pill')) linhas.push('CRM Pipeline (pilula)'); side.querySelectorAll('.nav .navitem, .nav .subnav .subitem').forEach(el => { const t = (el.querySelector('span') || {}).textContent || ''; if (!t.trim()) return; linhas.push((el.classList.contains('subitem') ? '    - ' : '  ') + t.trim()); }); return linhas; }"

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script('try{%s}catch(e){}' % seed)
    p = ctx.new_page(); erros = []
    p.on('pageerror', lambda e: erros.append(str(e)[:140]))
    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
    marc = p.evaluate("async () => { const r = await fetch(location.href, {cache:'no-store'}); const t = await r.text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }")
    print('marcador:', marc or 'nao achado')
    print('--- ordem da sidebar ---')
    for linha in p.evaluate(ORDEM): print(linha)
    print('atividades:', p.evaluate("() => [...document.querySelectorAll('#atividades-menu .subitem span')].map(e=>e.textContent.trim()).join(', ')"))
    print('crm antes do Meu Dia:', p.evaluate("""() => {
      const s = document.querySelector('.side'); const crm = s.querySelector('.crm-pill');
      const md = s.querySelector('[data-nav=dashboard]');
      return !!(crm && md && (crm.compareDocumentPosition(md) & Node.DOCUMENT_POSITION_FOLLOWING));
    }"""))
    alvo = p.evaluate("() => { const its = [...document.querySelectorAll('#atividades-menu .subitem')]; const el = its.find(e => (e.querySelector('span')||{}).textContent.trim().toLowerCase().startsWith('gest')); if (!el) return 'nao existe'; el.click(); return 'clicado'; }")
    p.wait_for_timeout(600)
    print('gestao de clientes:', alvo, '| pagina ativa:', p.evaluate("() => (document.querySelector('.page.active')||{}).id || 'nenhuma'"))
    p.evaluate("() => document.querySelector('[data-nav=dashboard]').click()"); p.wait_for_timeout(400)
    p.locator('.side').screenshot(path=f'deploy/prova-sidebar-{fase}-aberta.png')
    p.evaluate("() => toggleSideCompact()"); p.wait_for_timeout(700)
    print('recolhida:', p.evaluate("() => document.querySelector('.side').classList.contains('compact')"),
          '| largura:', p.evaluate("() => Math.round(document.querySelector('.side').getBoundingClientRect().width)"))
    p.locator('.side').screenshot(path=f'deploy/prova-sidebar-{fase}-recolhida.png')
    p.evaluate("() => toggleSideCompact()"); p.wait_for_timeout(500)
    p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(800)
    p.evaluate("() => (typeof toggleSide === 'function') && toggleSide(true)"); p.wait_for_timeout(800)
    print('celular, sidebar visivel:', p.evaluate("() => { const r = document.querySelector('.side').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height) + ' left=' + Math.round(r.left); }"))
    p.screenshot(path=f'deploy/prova-sidebar-{fase}-celular.png')
    print('erros de pagina:', erros or 'nenhum')
    b.close()
if srv: srv.shutdown()
