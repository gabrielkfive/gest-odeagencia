# -*- coding: utf-8 -*-
"""Prova do white label minimo (item 3 da maratona): nome, cor e LOGO da agencia trocando na
barra lateral e na tela de entrada. Uso: python deploy/prova-white-label.py <url-base>
Captura: deploy/prova-white-label-<sidebar|login|configuracoes>.png"""
import sys, io, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8799').rstrip('/')
LOGO = base + '/lp/v1-celular-dark.webp'  # imagem qualquer que existe no dominio, serve de logo
MARCA = {'name': 'Agência Teste', 'color': '#4ADE80', 'logo': LOGO}
FOTO = ('data:image/svg+xml;utf8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2264%22 '
        'height=%2264%22%3E%3Ccircle cx=%2232%22 cy=%2232%22 r=%2232%22 fill=%22%23F2A33A%22/%3E%3C/svg%3E')
sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer',
        'expires_in': 3600, 'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'teste@local',
                 'user_metadata': {'avatar_url': FOTO, 'full_name': 'Gabriel Andrade'}}}
seed = ("localStorage.setItem('wfa-brand',%s);"
        "localStorage.setItem('wfa-theme','dark');"
        "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);"
        % (json.dumps(json.dumps(MARCA)), json.dumps(json.dumps(sess))))

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    ctx.add_init_script('try{%s}catch(e){}' % seed)
    p = ctx.new_page(); erros = []
    p.on('pageerror', lambda e: erros.append(str(e)[:160]))

    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3200)
    print('marcador:', p.evaluate("async () => { const r = await fetch(location.href, {cache:'no-store'});"
                                  " const t = await r.text(); return (t.match(/build [0-9a-z-]+/)||[''])[0]; }"))
    print('nome na barra lateral:', p.evaluate("() => (document.querySelector('.brand-info .nm')||{}).textContent"))
    print('logo na barra lateral:', p.evaluate("() => { const i = document.querySelector('.brand-mark img');"
                                               " return i ? i.getAttribute('src') + ' carregou=' + (i.naturalWidth > 0) : 'sem img'; }"))
    print('cor de destaque:', p.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--yel').trim()"))
    p.locator('.side').screenshot(path='deploy/prova-white-label-sidebar.png')

    p.evaluate("() => { const b = document.querySelector('[onclick*=\"modal-settings\"]');"
               " if (typeof openModal === 'function') openModal('modal-settings'); else b && b.click(); }")
    p.wait_for_timeout(900)
    print('campo do logo nas configuracoes:',
          p.evaluate("() => { const e = document.getElementById('brand-logo'); return e ? 'valor=' + e.value : 'nao existe'; }"))
    print('previa do logo:', p.evaluate("() => { const i = document.querySelector('#brand-logo-prev img');"
                                        " return i ? i.naturalWidth > 0 : 'sem previa'; }"))
    try:
        if p.evaluate("() => { const m = document.getElementById('modal-settings'); return !!m && m.getBoundingClientRect().height > 0; }"):
            p.screenshot(path='deploy/prova-white-label-configuracoes.png')
        else:
            print('modal de configuracoes nao abriu na prova (capturado so o resto)')
    except Exception as e:
        print('captura do modal falhou:', str(e)[:80])

    p2 = ctx.new_page()
    p2.goto(base + '/auth', wait_until='networkidle'); p2.wait_for_timeout(1500)
    print('nome na entrada:', p2.evaluate("() => { const h = document.querySelector('h2'); return h ? h.textContent.trim() : 'sem h2'; }"))
    print('logo na entrada:', p2.evaluate("""() => [...document.querySelectorAll('img')]
      .map(i => i.getAttribute('src')).filter(Boolean).join(' | ')"""))
    p2.screenshot(path='deploy/prova-white-label-login.png')
    print('erros de pagina:', erros or 'nenhum')
    b.close()
