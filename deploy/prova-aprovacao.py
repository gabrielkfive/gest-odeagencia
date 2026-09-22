# -*- coding: utf-8 -*-
"""Prova da tarefa 07 (Aprovacao sem estresse dentro do /app).
Uso: python deploy/prova-aprovacao.py <antes|depois|producao> [url-base]
Sem url: sobe public/ num servidor local. Sessao falsa, carteira sintetica com uma tarefa
em homologacao do cliente com arte anexada.
Captura: deploy/prova-aprovacao-<fase>-<tela>.png"""
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
    srv = socketserver.TCPServer(('127.0.0.1', 5193), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5193'

hoje = date.today()
d = lambda n: (hoje + timedelta(days=n)).isoformat()
agora = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
parado = (hoje - timedelta(days=4)).isoformat() + 'T18:00:00.000Z'
# A arte vem por URL http(s), igual ao link do Drive que a equipe anexa na tarefa.
ARTE = base + '/ark-mark.png'
FOTO = ('data:image/svg+xml;utf8,' +
        '%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 height=%2264%22%3E'
        '%3Ccircle cx=%2232%22 cy=%2232%22 r=%2232%22 fill=%22%23F2A33A%22/%3E%3C/svg%3E')

sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer',
        'expires_in': 3600, 'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'teste@local',
                 'user_metadata': {'avatar_url': FOTO, 'full_name': 'Gabriel Andrade'}}}
LEGENDA = ('Cafe com Nutri na Vivenda: a manipulacao que o seu endocrinologista pede, feita '
           'aqui do lado, com a farmaceutica explicando cada formula pra voce entender o que '
           'esta tomando e por que aquilo funciona no seu caso.')
tarefas = [
    {'id': 'ap1', 'title': 'Reel Cafe com Nutri', 'status': 'homologcli', 'resp': 'Maria Luiza',
     'clienteId': 'vivenda', 'formato': 'reel', 'data': d(0), 'publicarEm': d(2) + 'T18:00',
     'legenda': LEGENDA, 'aprovacaoEm': parado,
     'attachments': [{'nome': 'capa.png', 'url': ARTE, 'tipo': 'imagem'}], 'up': agora},
    {'id': 'ap2', 'title': 'Story Semana do Consumidor', 'status': 'homologcli', 'resp': 'Bruno',
     'clienteId': 'vivenda', 'formato': 'story', 'data': d(1), 'up': agora},
    {'id': 'ap3', 'title': 'Carrossel Novo Gama', 'status': 'concluido', 'resp': 'Bruno',
     'clienteId': 'vivenda', 'formato': 'carrossel', 'concluidaEm': d(-1) + 'T10:00:00.000Z', 'up': agora},
    {'id': 'ap4', 'title': 'Post revisao interna', 'status': 'aprovacao', 'resp': 'Lucas Rosi',
     'clienteId': 'vivenda', 'formato': 'estatico', 'data': d(1), 'up': agora},
]
seed = ("localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);"
        "localStorage.setItem('wfa-theme','dark');"
        "localStorage.setItem('wfa-side-compact','0');"
        "localStorage.setItem('wfa-tarefas',%s);" % (json.dumps(json.dumps(sess)), json.dumps(json.dumps(tarefas))))

CARDS = ("() => [...document.querySelectorAll('.apr-card')].map(c => ({"
         "titulo: (c.querySelector('.apr-top b')||{}).textContent,"
         "proporcao: (c.querySelector('.apr-midia')||{className:''}).className,"
         "temArte: !!c.querySelector('.apr-midia img'),"
         "falta: c.classList.contains('falta'),"
         "espera: (c.querySelector('.apr-espera')||{}).textContent,"
         "legenda: (c.querySelector('.apr-leg')||{}).textContent }))")

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script('try{%s}catch(e){}' % seed)
    p = ctx.new_page(); erros = []
    p.on('pageerror', lambda e: erros.append(str(e)[:160]))
    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3500)
    marc = p.evaluate("async () => { const r = await fetch(location.href, {cache:'no-store'});"
                      " const t = await r.text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }")
    print('marcador:', marc or 'nao achado')

    p.evaluate("() => { const n = document.querySelector('[data-nav=cliente]'); n && n.click(); }")
    p.wait_for_timeout(700)
    p.evaluate("() => { const s = document.getElementById('cli-area-sel');"
               " if (s) { s.value = 'vivenda';"
               " if (typeof cliAreaSelect === 'function') cliAreaSelect('vivenda');"
               " else s.dispatchEvent(new Event('change')); } }")
    p.wait_for_timeout(700)
    p.evaluate("() => { if (typeof nxCliAba === 'function') nxCliAba('aprov'); }")
    p.wait_for_timeout(700)

    cards = p.evaluate(CARDS)
    print('cartoes na aba Aprovacao:', len(cards))
    for c in cards:
        print('  -', c['titulo'], '|', c['proporcao'], '| arte:', c['temArte'],
              '| falta arquivo:', c['falta'], '|', (c['espera'] or '').strip())
    print('secao de homologacao interna:',
          p.evaluate("() => { const h = document.querySelector('.apr-sec'); return h ? h.textContent.trim() : 'nenhuma'; }"),
          '| cartoes internos:', p.evaluate("() => document.querySelectorAll('.nxc-grid .nxc-card').length"))
    print('legenda cortada com mais:',
          p.evaluate("() => !!document.querySelector('.apr-mais')"))
    p.screenshot(path=f'deploy/prova-aprovacao-{fase}-aba.png', full_page=False)
    alvo = p.query_selector('.apr-card')
    if alvo:
        alvo.screenshot(path=f'deploy/prova-aprovacao-{fase}-cartao.png')
    p.evaluate("() => { const b = document.querySelector('.apr-mais'); b && b.click(); }")
    p.wait_for_timeout(300)
    print('legenda inteira depois do mais:',
          p.evaluate("() => (document.querySelector('.apr-leg')||{}).textContent.length"))

    # Enviar ao cliente: sem nuvem no teste local, prova o registro na tarefa pelo mesmo caminho
    p.evaluate("""() => {
      const agora = new Date().toISOString();
      const t = (state.tarefas || []).find(x => x.id === 'ap1');
      t.hist = Array.isArray(t.hist) ? t.hist : [];
      const dia = agora.slice(0, 10);
      const jaHoje = t.hist.some(h => h && /[Ee]nviad/.test(String(h.txt || '')) && String(h.em || '').slice(0, 10) === dia);
      if (!jaHoje) t.hist.push({ em: agora, txt: 'Enviado ao cliente para aprovacao (link do portal)' });
      t.enviadoClienteEm = agora;
      if (typeof saveTarefas === 'function') saveTarefas();
      if (typeof nxCliAba === 'function') nxCliAba('aprov');
    }""")
    p.wait_for_timeout(600)
    print('carimbo de envio na tarefa:',
          p.evaluate("() => { const t = (state.tarefas||[]).find(x => x.id === 'ap1');"
                     " return !!t.enviadoClienteEm && t.hist.filter(h => /[Ee]nviad/.test(h.txt)).length; }"),
          '| na tela:', p.evaluate("() => /enviado/i.test((document.querySelector('.apr-espera')||{}).textContent || '')"))
    p.evaluate("() => { const b = document.querySelector('.apr-acoes .nxc-btn.yel'); b && b.click(); }")
    p.wait_for_timeout(300)
    print('botao Enviar ao cliente existe:',
          p.evaluate("() => !!document.querySelector('.apr-acoes .nxc-btn.yel')"))

    p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(800)
    p.screenshot(path=f'deploy/prova-aprovacao-{fase}-celular.png')
    print('erros de pagina:', erros or 'nenhum')
    b.close()
if srv: srv.shutdown()
