"""Screenshot do Início do /next na URL de produção (prova do deploy-verificado).
A página estática carrega sem o React pai, então a carteira de teste entra pelo
localStorage só pra tela ter número; o que se prova é a versão servida, não o dado.
Uso: python deploy/shot-next-inicio-producao.py
"""
import json, sys, time
from datetime import date, timedelta
from playwright.sync_api import sync_playwright

URL = "https://workflowark.arkcontent.workers.dev/workflowark-next.html"
hoje = date.today()
d = lambda n: (hoje + timedelta(days=n)).isoformat()
agora = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
tarefas = [
    {"id": "s1", "title": "Reel do café", "status": "concluido", "resp": "Saulo", "clienteId": "vivenda", "data": d(-3), "concluidaEm": d(-4) + "T10:00:00.000Z", "publicarEm": d(-4) + "T12:00", "up": agora},
    {"id": "s2", "title": "Story da semana", "status": "andamento", "resp": "Maria Luiza", "clienteId": "vivenda", "data": d(2), "publicarEm": d(1) + "T18:00", "up": agora},
    {"id": "s3", "title": "Relatório de Ads", "status": "backlog", "resp": "Lucas Rosi", "clienteId": "fercon", "data": d(-2), "up": agora},
    {"id": "s4", "title": "Landing", "status": "aprovacao", "resp": "Danilo", "clienteId": "fercon", "data": d(3), "aprovacaoEm": d(-5) + "T09:00:00.000Z", "up": agora},
    {"id": "s5", "title": "Roteiro", "status": "iniciar", "resp": "Bruno", "clienteId": "sasse", "data": d(0), "up": agora},
]
sessao = {"access_token": "teste-local", "refresh_token": "teste-local", "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "user": {"id": "00000000-0000-0000-0000-000000000000", "email": "teste@local"}}
seed = "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme',TEMA);localStorage.setItem('wfa-tarefas',%s);" % (json.dumps(json.dumps(sessao)), json.dumps(json.dumps(tarefas)))

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    for tema in ("dark", "light"):
        ctx = b.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script("const TEMA=%s;try{%s}catch(e){}" % (json.dumps(tema), seed))
        p = ctx.new_page()
        p.goto(URL, wait_until="load")
        p.wait_for_timeout(4000)
        marcador = p.evaluate("() => (document.documentElement.outerHTML.match(/build NEXT [0-9a-z]+/)||[''])[0]")
        tem = p.evaluate("() => !!document.getElementById('nx-inicio') && document.querySelectorAll('#nx-inicio .nxi-aurora').length")
        doto = p.evaluate("() => document.fonts.check('700 20px Doto')")
        print(tema, marcador, "auroras=", tem, "doto=", doto)
        p.screenshot(path=f"deploy/prova-producao-next-inicio-{tema}.png")
        ctx.close()
    b.close()
