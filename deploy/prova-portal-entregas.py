# -*- coding: utf-8 -*-
"""Prova do portal com Entregas e Aprovação (lote 2, 21/09). Uso: python deploy/prova-portal-entregas.py <url-base>
Intercepta /api/workflowark/portal com dados sintéticos (o desenho é o que se prova; a API tem teste próprio
em deploy/teste-entregas.mjs). Sai em deploy/prova-portal-entregas-{desktop,celular,ajuste}.png"""
import sys, json
from playwright.sync_api import sync_playwright
base = sys.argv[1]
dados = {"ok": True, "cliente": "Vivenda", "agency": "ARK Content", "periodo": "Setembro 2026",
         "ideias": [{"dia": "Ter 23", "formato": "Reel", "tema": "Café com Nutri", "angulo": "Bastidores do café com as nutricionistas."}],
         "demandas": [],
         "aprovacoes": [{"id": "c", "titulo": "Story Novo Gama · bastidores", "formato": "story", "publicarEm": "2026-09-22T12:00", "briefing": "Três stories de bastidor da loja nova.", "legenda": "Chegamos no Novo Gama. Vem conhecer.", "desde": "2026-09-20T18:40:00.000Z", "links": [{"nome": "story-1.png", "url": "https://drive.google.com/x"}]}],
         "entregas": [{"id": "a", "titulo": "Reel Café com Nutri", "formato": "reel", "publicarEm": "2026-09-18T12:00", "concluidaEm": "2026-09-17T10:00:00.000Z", "legenda": "O café que virou conversa.", "links": [{"nome": "reel-final.mp4", "url": "https://drive.google.com/y"}]},
                      {"id": "b", "titulo": "Carrossel Semana do Consumidor", "formato": "carrossel", "publicarEm": "2026-09-15T10:00", "concluidaEm": "2026-09-14T10:00:00.000Z", "legenda": "", "links": []}]}
pedidos = []
with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome", headless=True)
    for nome, vp in (("desktop", {"width": 1280, "height": 900}), ("celular", {"width": 390, "height": 844})):
        ctx = b.new_context(viewport=vp)
        def rota(r):
            if r.request.method == "POST":
                pedidos.append(json.loads(r.request.post_data or "{}")); r.fulfill(status=200, content_type="application/json", body=json.dumps({"ok": True, "status": "andamento"}))
            else:
                r.fulfill(status=200, content_type="application/json", body=json.dumps(dados))
        ctx.route("**/api/workflowark/portal**", rota)
        p = ctx.new_page(); erros = []; p.on("pageerror", lambda e: erros.append(str(e)[:140]))
        p.goto(base + "/portal?t=teste", wait_until="load"); p.wait_for_timeout(2500)
        txt = p.inner_text("body")
        print(nome, "| aprovacao:", "Esperando a sua aprovação" in txt, "| entregas:", "Entregas · 2" in txt, "| botoes:", p.locator("button:has-text('Aprovar')").count(), p.locator("button:has-text('Pedir ajuste')").count(), "| erros:", erros or "nenhum")
        p.screenshot(path=f"deploy/prova-portal-entregas-{nome}.png", full_page=True)
        if nome == "desktop":
            p.fill("textarea >> nth=0", "Trocar a foto 2 pela do balcão"); p.click("button:has-text('Pedir ajuste')"); p.wait_for_timeout(600)
            print("ajuste enviado:", pedidos[-1] if pedidos else None, "| confirmacao:", "Ajuste enviado" in p.inner_text("body"))
            p.screenshot(path="deploy/prova-portal-entregas-ajuste.png", full_page=True)
        ctx.close()
    b.close()
