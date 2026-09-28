# -*- coding: utf-8 -*-
"""Prova do lote 2 (tokens) no /app, 27/09/2026.
Uso: python deploy/prova-tokens.py <fase> [url-base]
     python deploy/prova-tokens.py --diff <faseA> <faseB>     (conta pixels diferentes)
     python deploy/prova-tokens.py --lado <faseA> <faseB>     (monta antes | depois por tela)
Sem url: sobe public/ num servidor local. Sessão falsa, carteira sintética, sem nome de cliente real.
Saída: deploy/prova-tokens/<fase>-<tela>-<tema>.png"""
import sys, os, json, time, threading, http.server, socketserver, functools
from datetime import date, timedelta

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PASTA = 'deploy/prova-tokens'
os.makedirs(PASTA, exist_ok=True)
TELAS = ['inicio', 'kanban', 'tarefa', 'cliente', 'crm', 'config']


def pares(a, b):
    for n in sorted(os.listdir(PASTA)):
        if n.startswith(a + '-') and n.endswith('.png'):
            resto = n[len(a) + 1:]
            if os.path.exists(os.path.join(PASTA, b + '-' + resto)):
                yield resto, os.path.join(PASTA, n), os.path.join(PASTA, b + '-' + resto)


if sys.argv[1] in ('--diff', '--lado'):
    from PIL import Image, ImageChops, ImageDraw
    a, b = sys.argv[2], sys.argv[3]
    total = 0
    for resto, pa, pb in pares(a, b):
        ia, ib = Image.open(pa).convert('RGB'), Image.open(pb).convert('RGB')
        if sys.argv[1] == '--diff':
            if ia.size != ib.size:
                print(resto, 'TAMANHO DIFERENTE', ia.size, ib.size); total += 1; continue
            px = sum(1 for p in ImageChops.difference(ia, ib).getdata() if p != (0, 0, 0))
            total += px
            print('%-22s %8d px diferentes' % (resto, px))
        else:
            w, h = ia.width + ib.width + 24, max(ia.height, ib.height) + 40
            lado = Image.new('RGB', (w, h), (40, 40, 44))
            lado.paste(ia, (0, 40)); lado.paste(ib, (ia.width + 24, 40))
            d = ImageDraw.Draw(lado); d.text((12, 12), a.upper(), fill=(255, 255, 255)); d.text((ia.width + 36, 12), b.upper(), fill=(255, 199, 0))
            saida = os.path.join(PASTA, 'lado-' + resto)
            lado.save(saida); print(saida)
    if sys.argv[1] == '--diff':
        print('TOTAL', total)
    sys.exit(0)

from playwright.sync_api import sync_playwright
fase = sys.argv[1]
base = sys.argv[2] if len(sys.argv) > 2 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 5189), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5189'
hoje = date(2026, 9, 27); d = lambda n: (hoje + timedelta(days=n)).isoformat(); agora = '2026-09-27T12:00:00.000Z'
FOTO = 'data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2232%22 fill=%22%23F2A33A%22/%3E%3C/svg%3E'
sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'teste@local', 'user_metadata': {'avatar_url': FOTO, 'full_name': 'Equipe Demo'}}}
tarefas = [
    {'id': 't1', 'title': 'Reel de lançamento', 'status': 'andamento', 'resp': 'Ana Souza', 'clienteId': 'vivenda', 'data': d(1), 'publicarEm': d(2) + 'T18:00', 'formato': 'reel', 'up': agora, 'desc': 'Gravar na loja, 30 segundos.'},
    {'id': 't2', 'title': 'Story da semana', 'status': 'homologcli', 'resp': 'Bruno Lima', 'clienteId': 'vivenda', 'data': d(0), 'publicarEm': d(1) + 'T12:00', 'formato': 'story', 'up': agora},
    {'id': 't3', 'title': 'Carrossel de dicas', 'status': 'concluido', 'resp': 'Bruno Lima', 'clienteId': 'vivenda', 'data': d(-4), 'formato': 'carrossel', 'concluidaEm': d(-4) + 'T10:00:00.000Z', 'up': agora},
    {'id': 't4', 'title': 'Relatório de anúncios', 'status': 'backlog', 'resp': 'Carla Dias', 'clienteId': 'fercon', 'data': d(-2), 'up': agora},
]


def seed(tema):
    return ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','%s');"
            "localStorage.setItem('wfa-tarefas',%s);") % (json.dumps(json.dumps(sess)), tema, json.dumps(json.dumps(tarefas)))


def tema_certo(p, tema):
    p.evaluate("t => { const b = document.body; b.classList.toggle('aura-dark', t === 'dark'); b.classList.toggle('aura-light', t === 'light'); }", tema)
    p.wait_for_timeout(150)


def nav(p, nome):
    p.evaluate("n => { try { closeModal && document.querySelectorAll('.modal.open,.modal.show').forEach(m => m.classList.remove('open','show')); } catch (e) {} const el = document.querySelector('[data-nav=' + n + ']'); el && el.click(); }", nome)
    p.wait_for_timeout(700)


with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    erros = []
    for tema in ('dark', 'light'):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        ctx.add_init_script('try{%s}catch(e){}' % seed(tema))
        p = ctx.new_page(); p.on('pageerror', lambda e: erros.append(str(e)[:140]))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
        p.add_style_tag(content='*,*::before,*::after{transition:none!important;caret-color:transparent!important}')
        tema_certo(p, tema)
        if tema == 'dark':
            print('marcador:', p.evaluate("() => (document.documentElement.outerHTML.match(/build [0-9a-z-]+/)||[''])[0]"))
        def foto(tela):
            tema_certo(p, tema)
            p.screenshot(path='%s/%s-%s-%s.png' % (PASTA, fase, tela, tema))
        nav(p, 'dashboard'); foto('inicio')
        nav(p, 'tarefas'); foto('kanban')
        p.evaluate("() => { try { openTaskDetail('t1'); } catch (e) {} }"); p.wait_for_timeout(700); foto('tarefa')
        p.keyboard.press('Escape'); p.evaluate("() => { try { closeTaskDetail && closeTaskDetail(); } catch (e) {} }"); p.wait_for_timeout(300)
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3000)
        p.add_style_tag(content='*,*::before,*::after{transition:none!important;caret-color:transparent!important}')
        nav(p, 'cliente')
        p.evaluate("() => { const s = document.getElementById('cli-area-sel'); if (s) { s.value = 'vivenda'; if (typeof cliAreaSelect === 'function') cliAreaSelect('vivenda'); else s.dispatchEvent(new Event('change')); } }"); p.wait_for_timeout(600)
        foto('cliente')
        nav(p, 'crm'); foto('crm')
        p.evaluate("() => { try { openSettings(); } catch (e) {} }"); p.wait_for_timeout(600); foto('config')
        ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, reduced_motion='reduce')
    ctx.add_init_script('try{%s}catch(e){}' % seed('dark'))
    p = ctx.new_page(); p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
    p.add_style_tag(content='*,*::before,*::after{transition:none!important}')
    tema_certo(p, 'dark'); p.screenshot(path='%s/%s-inicio-celular.png' % (PASTA, fase))
    print('erros de JS:', erros or 'nenhum')
    b.close()
if srv: srv.shutdown()
