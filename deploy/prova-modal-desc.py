# -*- coding: utf-8 -*-
"""Reproduz o bug da descrição espremida no modal da tarefa e prova a correção.
Uso: python deploy/prova-modal-desc.py [url-base]  (sem url: servidor local de public/)
Passa quando uma descrição de 12 linhas cabe sem rolagem interna (altura >= conteúdo) até o teto de 52vh."""
import sys, json, time, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright
base = sys.argv[1] if len(sys.argv) > 1 else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5186), functools.partial(Q, directory='public')); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5186'
desc = "\n".join(f"Linha {i}: contexto, link e o que falta fazer nesta entrega." for i in range(1, 13))
tarefas = [{"id": "t1", "title": "Receber orçamento", "status": "iniciar", "resp": "Gabriel Andrade", "clienteId": "vivenda", "data": "2026-09-19", "desc": desc, "up": time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())}]
sess = {"access_token": "x", "refresh_token": "x", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "user": {"id": "0", "email": "t@l"}}
seed = "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','dark');localStorage.setItem('wfa-tarefas',%s);" % (json.dumps(json.dumps(sess)), json.dumps(json.dumps(tarefas)))
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    ctx = b.new_context(viewport={"width": 1440, "height": 900}); ctx.add_init_script("try{%s}catch(e){}" % seed)
    p = ctx.new_page(); p.goto(base + "/workflowark.html", wait_until="load"); p.wait_for_timeout(3000)
    p.evaluate("() => { const n = document.querySelector('[data-nav=tarefas]'); n && n.click(); }"); p.wait_for_timeout(700)
    print("tarefas no estado:", p.evaluate("() => (state.tarefas||[]).map(t => t.id).join(',')"))
    print("abrir:", p.evaluate("() => { try { openTaskDetail('t1'); return 'ok'; } catch (e) { return 'ERRO ' + e.message + ' @ ' + String(e.stack || '').slice(0, 200); } }")); p.wait_for_timeout(900)
    print("modal aberto:", p.evaluate("() => { const d = document.getElementById('tk-obs') || document.getElementById('td-desc'); let e = d; const cadeia = []; while (e && e !== document.body) { cadeia.push((e.id || e.className || e.tagName) + ':' + getComputedStyle(e).display + '/' + getComputedStyle(e).visibility); e = e.parentElement; } return { valor: d.value.length, cadeia: cadeia.slice(0, 8) }; }"))
    m = p.evaluate("() => { const d = document.getElementById('tk-obs') || document.getElementById('td-desc'); return { h: d.clientHeight, sh: d.scrollHeight, fs: getComputedStyle(d).fontSize, rola: d.scrollHeight > d.clientHeight + 2 }; }")
    print("descricao:", m)
    ok = (not m["rola"]) or m["h"] >= 0.5 * 900 - 10
    print("PASSA" if ok else "FALHA: descrição com rolagem interna antes do teto")
    p.screenshot(path="deploy/prova-modal-desc.png")
    b.close()
if srv: srv.shutdown()
sys.exit(0 if ok else 1)
