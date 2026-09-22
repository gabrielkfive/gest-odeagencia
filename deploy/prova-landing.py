# -*- coding: utf-8 -*-
"""Prova da landing oficial (item 2 da maratona): prints reais da V1, oferta de 30 dias e
formulario gravando no CRM. Uso: python deploy/prova-landing.py <url-base>
Captura: deploy/prova-landing-<hero|prints|celular>.png"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:3000'
url = base.rstrip('/') + '/conheca'

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    p = ctx.new_page(); erros = []; quebradas = []
    p.on('pageerror', lambda e: erros.append(str(e)[:160]))
    p.on('response', lambda r: quebradas.append(f"{r.status} {r.url}") if r.status >= 400 else None)
    p.goto(url, wait_until='networkidle')
    p.wait_for_timeout(1200)

    print('titulo:', p.title())
    print('chamada principal:', p.evaluate("() => (document.querySelector('.lc-hero-ctas .lc-btn')||{}).textContent"))
    print('nota do hero:', p.evaluate("() => (document.querySelector('.lc-hero-nota')||{}).textContent"))
    imgs = p.evaluate("""() => [...document.querySelectorAll('.lc-print img')].map(i => ({
      src: i.getAttribute('src'), ok: i.naturalWidth > 0, w: i.naturalWidth, h: i.naturalHeight }))""")
    print('capturas na pagina:', len(imgs))
    for i in imgs:
        print('  -', i['src'], 'carregou:', i['ok'], f"{i['w']}x{i['h']}")
    print('ilustracao antiga ainda no hero:', p.evaluate("() => !!document.querySelector('.lc-hero-visual .lc-quadro')"))
    print('links legais no rodape:', p.evaluate(
        "() => [...document.querySelectorAll('.lc-rodape a')].map(a => a.getAttribute('href')).join(', ')"))
    print('formulario:', p.evaluate(
        "() => { const f = document.querySelector('#contato form'); return f ? [...f.querySelectorAll('input,textarea,select')].length + ' campos' : 'sem formulario'; }"))

    p.screenshot(path='deploy/prova-landing-hero.png')
    alvo = p.query_selector('#porDentro')
    if alvo:
        alvo.scroll_into_view_if_needed(); p.wait_for_timeout(600)
        alvo.screenshot(path='deploy/prova-landing-prints.png')
    p.set_viewport_size({'width': 390, 'height': 844}); p.wait_for_timeout(600)
    p.goto(url, wait_until='networkidle'); p.wait_for_timeout(800)
    p.screenshot(path='deploy/prova-landing-celular.png')
    print('respostas >=400:', [q for q in quebradas if 'favicon' not in q] or 'nenhuma')
    print('erros de pagina:', erros or 'nenhum')
    b.close()
