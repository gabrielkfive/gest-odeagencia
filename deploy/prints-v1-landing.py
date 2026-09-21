# -*- coding: utf-8 -*-
"""Prints da V1 (/app que roda em produção) para a landing de venda, com carteira sintética.
Uso: python deploy/prints-v1-landing.py <url-base> <pasta-saida>"""
import sys, json, time, os
from datetime import date, timedelta
from playwright.sync_api import sync_playwright
base, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
srv = None
if base == 'local':  # servidor local de public/ (prova "depois" antes de publicar)
    import threading, http.server, socketserver, functools
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = socketserver.TCPServer(('127.0.0.1', 5185), functools.partial(Q, directory='public')); threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5185'
hoje = date.today(); d = lambda n: (hoje + timedelta(days=n)).isoformat(); agora = time.strftime('%Y-%m-%dT%H:%M:%S.000Z', time.gmtime())
T = [
    {"id": "a1", "title": "Reel Café com Nutri · corte final", "status": "andamento", "resp": "Saulo", "resps": ["Saulo"], "clienteId": "vivenda", "prio": "alta", "data": d(1), "publicarEm": d(2) + "T18:00", "formato": "reel", "tags": ["Vídeo"], "checklist": [{"id": "c1", "text": "Briefing lido", "done": True}, {"id": "c2", "text": "Corte", "done": True}, {"id": "c3", "text": "Legenda", "done": False}], "up": agora},
    {"id": "a2", "title": "Story bastidores da loja nova", "status": "homologcli", "resp": "Maria Luiza", "clienteId": "vivenda", "prio": "media", "data": d(0), "publicarEm": d(1) + "T12:00", "formato": "story", "tags": ["Social"], "up": agora},
    {"id": "a3", "title": "Carrossel Semana do Consumidor", "status": "concluido", "resp": "Bruno", "clienteId": "vivenda", "prio": "media", "data": d(-4), "publicarEm": d(-3) + "T10:00", "formato": "carrossel", "concluidaEm": d(-4) + "T10:00:00.000Z", "legenda": "Semana do Consumidor: o desconto que cuida.", "attachments": [{"nome": "carrossel.pdf", "url": "https://drive.google.com/x"}], "up": agora},
    {"id": "a4", "title": "Página de tratamentos do site", "status": "andamento", "resp": "Danilo de Lima", "clienteId": "moenda", "prio": "alta", "data": d(3), "tags": ["Site"], "up": agora},
    {"id": "a5", "title": "Relatório semanal de Google Ads", "status": "iniciar", "resp": "Lucas Rosi", "clienteId": "fercon", "prio": "media", "data": d(2), "tags": ["Tráfego"], "up": agora},
    {"id": "a6", "title": "Proposta de renovação · plano Gold", "status": "aprovacao", "resp": "Gabriel Andrade", "clienteId": "fonseca", "prio": "alta", "data": d(2), "tags": ["Comercial"], "up": agora},
    {"id": "a7", "title": "Roteiro do vídeo de brindes", "status": "backlog", "resp": "Bruno", "clienteId": "sasse", "prio": "baixa", "data": d(6), "tags": ["Roteiro"], "up": agora},
    {"id": "a8", "title": "Reel inauguração · versão 2", "status": "homologcli", "resp": "Saulo", "clienteId": "royalface", "prio": "media", "data": d(1), "publicarEm": d(3) + "T19:00", "formato": "reel", "up": agora},
    {"id": "a9", "title": "Carrossel bastidores do restaurante", "status": "iniciar", "resp": "Maria Luiza", "clienteId": "vaca", "prio": "baixa", "data": d(4), "publicarEm": d(6) + "T11:00", "formato": "carrossel", "up": agora},
    {"id": "a10", "title": "Planejamento de outubro", "status": "backlog", "resp": "Gabriel Andrade", "clienteId": "vivenda", "prio": "media", "data": d(8), "up": agora},
]
CRM = [{"id": "l1", "nm": "Clínica Athos", "stage": 1, "val": 6000, "resp": "Saulo", "up": agora}, {"id": "l2", "nm": "Mundo Livre Bar", "stage": 2, "val": 3200, "resp": "Gabriel Andrade", "up": agora}, {"id": "l3", "nm": "Ahava Odontologia", "stage": 3, "val": 5400, "resp": "Gabriel Andrade", "up": agora}, {"id": "l4", "nm": "Localiza Seminovos", "stage": 4, "val": 7900, "resp": "Gabriel Andrade", "up": agora}, {"id": "l5", "nm": "Líder Automóveis", "stage": 0, "val": 4500, "resp": "Saulo", "up": agora}]
sess = {"access_token": "x", "refresh_token": "x", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "user": {"id": "0", "email": "t@l", "user_metadata": {"full_name": "Gabriel Andrade"}}}
def seed(tema): return "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','%s');localStorage.setItem('wfa-tarefas',%s);localStorage.setItem('wfa-crm',%s);" % (json.dumps(json.dumps(sess)), tema, json.dumps(json.dumps(T)), json.dumps(json.dumps(CRM)))
TELAS = [("meu-dia", None)] if os.environ.get("SO_INICIO") else [("meu-dia", None), ("kanban", "tarefas"), ("cliente", "cliente"), ("crm", "comercial"), ("projetos", "projetos")]
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    for tema in ("dark", "light"):
        ctx = b.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2); ctx.add_init_script("try{%s}catch(e){}" % seed(tema))
        p = ctx.new_page(); p.goto(base + "/workflowark.html", wait_until="load"); p.wait_for_timeout(3500)
        for nome, nav in TELAS:
            if nav:
                p.evaluate("(n) => { const el = document.querySelector('[data-nav=\"' + n + '\"]'); el && el.click(); }", nav); p.wait_for_timeout(800)
            if nome == "cliente":
                p.evaluate("() => { const s = document.getElementById('cli-area-sel'); if (s) { s.value = 'vivenda'; typeof cliAreaSelect === 'function' && cliAreaSelect('vivenda'); } }"); p.wait_for_timeout(600)
            p.screenshot(path=os.path.join(out, f"v1-{nome}-{tema}.png"))
            print(tema, nome)
        p.evaluate("() => { const el = document.querySelector('[data-nav=\"tarefas\"]'); el && el.click(); }"); p.wait_for_timeout(600)
        p.evaluate("() => openTaskDetail('a1')"); p.wait_for_timeout(900)
        p.screenshot(path=os.path.join(out, f"v1-tarefa-modal-{tema}.png")); print(tema, "modal")
        ctx.close()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True); ctx.add_init_script("try{%s}catch(e){}" % seed("dark"))
    p = ctx.new_page(); p.goto(base + "/workflowark.html", wait_until="load"); p.wait_for_timeout(3500)
    p.screenshot(path=os.path.join(out, "v1-celular-dark.png")); print("celular")
    b.close()
if srv: srv.shutdown()
