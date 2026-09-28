# -*- coding: utf-8 -*-
"""Aba Atividades no piloto aprovado (Liquid Glass 2, 28/09/2026).
Uso: python deploy/teste-quadro.py [url-base]    (sai 1 se alguma regra quebrar)

1. Sem escolha salva, o tema abre claro (sidebar continua preta).
2. O quadro abre com o gradiente do piloto (laranja, rosa e roxo); amarelo é opção.
3. Arrastar o fundo do quadro com o mouse rola na horizontal (rolagem livre, estilo Trello).
4. Arrastar a partir de um cartão NÃO rola o quadro (o arrasto do cartão é outro gesto).
5. Fundo escolhido fica salvo e volta depois de recarregar.
6. Colunas em vidro fosco (translúcidas com desfoque) e cartões sólidos.
"""
import sys, os, json, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 5201), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5201'

sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
        'user': {'id': '0', 'email': 'teste@local', 'user_metadata': {}}}
st = ['backlog', 'iniciar', 'andamento', 'aprovacao', 'homologcli', 'concluido']
tarefas = [{'id': 'q%d' % i, 'title': 'Tarefa %d' % i, 'status': st[i % 6], 'resp': 'Ana Souza', 'clienteId': 'vivenda',
            'data': '2026-09-30', 'up': '2026-09-28T12:00:00.000Z'} for i in range(36)]
falhas = []


def cor(c):
    import re
    return [float(x) for x in re.findall(r'[\d.]+', c)[:4]]


with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script("try{localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);if(!localStorage.getItem('wfa-tarefas'))localStorage.setItem('wfa-tarefas',%s);}catch(e){}"
                        % (json.dumps(json.dumps(sess)), json.dumps(json.dumps(tarefas))))
    p = ctx.new_page()
    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3000)
    classe = p.evaluate('document.body.className')
    if 'aura-light' not in classe:
        falhas.append('tema padrão não é claro (body: %s)' % classe)
    p.evaluate("() => document.querySelector('[data-nav=tarefas]').click()"); p.wait_for_timeout(900)
    fundo = p.evaluate("() => { const s = getComputedStyle(document.getElementById('page-tarefas')); return s.backgroundImage + ' | ' + s.backgroundColor; }")
    # padrão = gradiente do piloto aprovado (laranja, rosa e roxo); o amarelo virou opção (pedido do Gabriel 28/09)
    if not all(k in fundo for k in ('255, 184, 107', '255, 111, 163', '123, 108, 255')):
        falhas.append('quadro sem o gradiente do piloto como padrão (%s)' % fundo[:120])
    col = p.evaluate("() => { const c = document.querySelector('#task-board .task-col'); const s = getComputedStyle(c); return { bg: s.backgroundColor, bf: s.backdropFilter }; }")
    if 'blur' not in (col['bf'] or '') or (len(cor(col['bg'])) > 3 and cor(col['bg'])[3] >= .95) or (len(cor(col['bg'])) == 3):
        falhas.append('coluna não é vidro fosco (%s, %s)' % (col['bg'], col['bf']))
    card = p.evaluate("() => { const c = document.querySelector('#task-board .task-card'); if (!c) return null; const m = getComputedStyle(c).backgroundColor.match(/[\\d.]+/g); return m; }")
    if card and len(card) > 3 and float(card[3]) < .95:
        falhas.append('cartão não é sólido (%s)' % card)
    # 3. arrastar o fundo rola
    bx = p.evaluate("() => { const b = document.getElementById('task-board'); b.scrollLeft = 0; const r = b.getBoundingClientRect(); const cols = [...b.querySelectorAll('.task-col')]; const c1 = cols[0].getBoundingClientRect(), c2 = cols[1].getBoundingClientRect(); return { x: (c1.right + c2.left) / 2, y: r.top + r.height - 12, largura: b.scrollWidth - b.clientWidth }; }")
    if bx['largura'] <= 0:
        falhas.append('quadro não tem conteúdo para rolar na horizontal (largura extra %s)' % bx['largura'])
    p.mouse.move(bx['x'] + 400, bx['y']); p.mouse.down(); p.mouse.move(bx['x'] + 100, bx['y'], steps=10); p.mouse.up(); p.wait_for_timeout(900)
    rolou = p.evaluate("document.getElementById('task-board').scrollLeft")
    if rolou < 150:
        falhas.append('arrastar o fundo não rolou o quadro (scrollLeft %s)' % rolou)
    # 4. arrastar a partir do cartão não rola
    p.evaluate("document.getElementById('task-board').scrollLeft = 0"); p.wait_for_timeout(200)
    cb = p.evaluate("() => { const c = document.querySelector('#task-board .task-card .tc-title, #task-board .task-card'); const r = c.getBoundingClientRect(); return { x: r.left + 20, y: r.top + 10 }; }")
    p.mouse.move(cb['x'], cb['y']); p.mouse.down(); p.mouse.move(cb['x'] - 250, cb['y'], steps=10); p.mouse.up(); p.wait_for_timeout(600)
    if p.evaluate("document.getElementById('task-board').scrollLeft") > 5:
        falhas.append('arrastar a partir do cartão rolou o quadro')
    # 5. fundo escolhido persiste
    tem = p.evaluate("() => typeof wfaQuadroFundo === 'function'")
    if not tem:
        falhas.append('sem wfaQuadroFundo() para escolher o fundo')
    else:
        p.evaluate("() => wfaQuadroFundo(2)"); p.wait_for_timeout(200)
        antes = p.evaluate("getComputedStyle(document.getElementById('page-tarefas')).backgroundImage")
        p.reload(wait_until='load'); p.wait_for_timeout(2500)
        p.evaluate("() => document.querySelector('[data-nav=tarefas]').click()"); p.wait_for_timeout(700)
        depois = p.evaluate("getComputedStyle(document.getElementById('page-tarefas')).backgroundImage")
        if antes != depois or 'none' == depois:
            falhas.append('fundo escolhido não voltou depois de recarregar (%s != %s)' % (antes[:60], depois[:60]))
    # 7. roda do mouse não prende a rolagem vertical quando o quadro não tem para onde andar na horizontal
    p.evaluate("() => { const b = document.getElementById('task-board'); b.dataset.larguraOriginal = b.style.width; b.style.width = (b.scrollWidth + 50) + 'px'; }"); p.wait_for_timeout(100)
    preso = p.evaluate("""() => { const b = document.getElementById('task-board'); const ev = new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true });
      b.dispatchEvent(ev); b.style.width = b.dataset.larguraOriginal || ''; return ev.defaultPrevented; }""")
    if preso:
        falhas.append('roda do mouse presa: quadro sem rolagem horizontal ainda bloqueia a rolagem vertical')
    # 8. no tema claro, fundo escuro deixa o título claro (contraste)
    if tem:
        p.evaluate("() => wfaQuadroFundo(6)"); p.wait_for_timeout(200)
        cl = p.evaluate("() => getComputedStyle(document.querySelector('#page-tarefas .page-title h1')).color")
        v = [float(x) for x in __import__('re').findall(r'[\d.]+', cl)[:3]]
        if sum(v) / 3 < 180:
            falhas.append('fundo escuro no tema claro: título continua escuro (%s)' % cl)
        p.evaluate("() => wfaQuadroFundo(0)")
    # 9. foto de fundo guardada pequena (não pode tomar o espaço das tarefas no navegador)
    tam = p.evaluate("""async () => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d');
      for (let i = 0; i < 400; i++) { x.fillStyle = 'hsl(' + (i * 37 % 360) + ',80%,' + (30 + i % 40) + '%)'; x.fillRect(Math.random() * 3000, Math.random() * 2000, 200, 150); }
      const blob = await new Promise(r => c.toBlob(r, 'image/png')); const f = new File([blob], 'foto.png', { type: 'image/png' });
      if (typeof wfaQuadroFoto !== 'function') return -1; await wfaQuadroFoto(f); return (localStorage.getItem('wfa-quadro-fundo') || '').length; }""")
    if tam == -1:
        falhas.append('sem wfaQuadroFoto() para testar a foto de fundo')
    elif tam > 400000:
        falhas.append('foto de fundo ocupa %d caracteres no navegador (máximo 400 mil)' % tam)
    b.close()
if srv: srv.shutdown()
if falhas:
    print('FALHA (%d)' % len(falhas)); [print(' -', f) for f in falhas]; sys.exit(1)
print('OK: tema claro padrão, gradiente do piloto, rolagem livre, cartão não rola, fundo salvo, colunas de vidro')
