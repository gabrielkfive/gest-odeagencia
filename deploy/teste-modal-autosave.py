# -*- coding: utf-8 -*-
"""Modal do cartão salva sozinho, estilo Trello (pedido do Gabriel, 28/09/2026).
Uso: python deploy/teste-modal-autosave.py [url-base]    (sai 1 se alguma regra quebrar)

Motivo: a equipe usa o Chrome em 100% a 110% em tela pequena e precisava rolar até o Salvar.
1. Trocar status grava na hora (em até 400 ms), sem clicar em Salvar.
2. Trocar o prazo grava na hora.
3. Descrição grava ao sair do campo (blur), sem esperar.
4. Título digitado e modal fechado clicando fora: fica gravado.
5. Tarefa existente não mostra o botão Salvar; tarefa nova mostra.
6. O indicador de salvamento fica visível no alto do modal, sem rolar.
"""
import sys, os, json, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    srv = socketserver.ThreadingTCPServer(('127.0.0.1', 5206), functools.partial(Q, directory='public'))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5206'

sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
        'user': {'id': '0', 'email': 'teste@local', 'user_metadata': {'full_name': 'Equipe Demo'}}}
tarefas = [{'id': 'a1', 'title': 'Reel de lançamento', 'status': 'andamento', 'resp': 'Ana Souza', 'clienteId': 'vivenda',
            'data': '2026-10-10', 'desc': 'Texto inicial', 'up': '2026-09-28T12:00:00.000Z'},
           {'id': 'a2', 'title': 'Story da semana', 'status': 'backlog', 'resp': 'Bruno Lima', 'clienteId': 'vivenda',
            'data': '2026-10-12', 'up': '2026-09-28T12:00:00.000Z'}]
falhas = []
LER = "id => { const t = (state.tarefas || []).find(x => x.id === id) || {}; return { st: t.status, data: t.data, desc: t.desc, title: t.title }; }"

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1366, 'height': 680})   # tela pequena, como a da equipe
    ctx.add_init_script("try{localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);if(!localStorage.getItem('wfa-tarefas'))localStorage.setItem('wfa-tarefas',%s);localStorage.setItem('wfa-theme','light');}catch(e){}"
                        % (json.dumps(json.dumps(sess)), json.dumps(json.dumps(tarefas))))
    p = ctx.new_page()
    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3000)
    p.evaluate("() => document.querySelector('[data-nav=tarefas]').click()"); p.wait_for_timeout(800)
    p.evaluate("() => openTaskDetail('a1')"); p.wait_for_timeout(700)

    # 5 e 6: Salvar escondido na tarefa existente; indicador no alto
    vis = p.evaluate("""() => { const m = document.getElementById('pj-modal'); const s = m && m.querySelector('[data-tksave]');
      const ind = m && m.querySelector('.tk-salvo-alto'); const caixa = m.querySelector('.pj-f').getBoundingClientRect();
      const r = ind ? ind.getBoundingClientRect() : null;
      return { salvar: !!(s && s.offsetParent), ind: !!ind, indTopo: r ? r.top - caixa.top : null, indVisivel: r ? (r.bottom <= innerHeight && r.top >= 0) : false }; }""")
    if vis['salvar']:
        falhas.append('tarefa existente ainda mostra o botão Salvar')
    if not vis['ind'] or vis['indTopo'] is None or vis['indTopo'] > 160 or not vis['indVisivel']:
        falhas.append('indicador de salvamento não está visível no alto do modal (%s)' % vis)

    # 1: status grava na hora
    p.select_option('#tk-st', 'iniciar'); p.wait_for_timeout(400)
    if p.evaluate(LER, 'a1')['st'] != 'iniciar':
        falhas.append('trocar o status não gravou em 400 ms (%s)' % p.evaluate(LER, 'a1'))
    # 6b: o indicador continua no alto e mostra que salvou depois da troca (o app reescreve o trecho do status)
    pos = p.evaluate('''() => { const m = document.getElementById('pj-modal'); const i = m.querySelector('.tk-salvo-alto');
      if (!i) return 'sumiu'; const r = i.getBoundingClientRect(), c = m.querySelector('.pj-f').getBoundingClientRect();
      return { topo: r.top - c.top, texto: i.textContent.trim(), visivel: r.width > 0 && r.bottom <= innerHeight }; }''')
    if pos == 'sumiu' or pos['topo'] > 160 or not pos['visivel'] or 'Salvo' not in pos['texto']:
        falhas.append('depois de trocar o status o indicador não aparece no alto com "Salvo" (%s)' % pos)
    # 2: prazo grava na hora
    p.fill('#tk-venc', '2026-10-20'); p.dispatch_event('#tk-venc', 'change'); p.wait_for_timeout(400)
    if p.evaluate(LER, 'a1')['data'] != '2026-10-20':
        falhas.append('trocar o prazo não gravou em 400 ms (%s)' % p.evaluate(LER, 'a1'))
    # 3: descrição grava no blur
    p.click('#tk-obs'); p.keyboard.press('Control+A'); p.keyboard.type('Descrição nova do cartão')
    p.evaluate("() => document.getElementById('tk-obs').blur()"); p.wait_for_timeout(400)
    if p.evaluate(LER, 'a1')['desc'] != 'Descrição nova do cartão':
        falhas.append('descrição não gravou ao sair do campo (%s)' % p.evaluate(LER, 'a1'))
    # 4: título digitado e clique fora
    p.click('#tk-t'); p.keyboard.press('Control+A'); p.keyboard.type('Reel de lançamento v2')
    p.mouse.click(8, 8); p.wait_for_timeout(500)
    if p.evaluate(LER, 'a1')['title'] != 'Reel de lançamento v2':
        falhas.append('título digitado não ficou gravado ao clicar fora (%s)' % p.evaluate(LER, 'a1'))
    # persistência depois de recarregar
    p.reload(wait_until='load'); p.wait_for_timeout(2500)
    depois = p.evaluate(LER, 'a1')
    if depois['st'] != 'iniciar' or depois['data'] != '2026-10-20' or depois['desc'] != 'Descrição nova do cartão':
        falhas.append('alterações não voltaram depois de recarregar (%s)' % depois)

    # 5: tarefa nova continua com Salvar
    nova = p.evaluate("""() => { if (typeof wfaTarefaModal !== 'function') return 'sem wfaTarefaModal';
      wfaTarefaModal({ id: 'nova-teste', title: '', status: 'backlog', clienteId: 'vivenda' }, true);
      const s = document.querySelector('#pj-modal [data-tksave]'); return !!(s && s.offsetParent); }""")
    if nova is not True:
        falhas.append('tarefa nova sem o botão Salvar (%s)' % nova)
    b.close()
if srv: srv.shutdown()
if falhas:
    print('FALHA (%d)' % len(falhas)); [print(' -', f) for f in falhas]; sys.exit(1)
print('OK: status, prazo, descrição e título gravam sozinhos; Salvar só na tarefa nova; indicador no alto')
