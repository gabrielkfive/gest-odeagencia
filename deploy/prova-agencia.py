# -*- coding: utf-8 -*-
"""Prova do modo agencia (onboarding-20260923a): boas-vindas, Primeiros passos, destaque de
onde fica, abas da ARK escondidas, e o modo ARK intocado.
Uso: python deploy/prova-agencia.py <url-base>
Capturas em deploy/prova-agencia-*.png"""
import sys, io, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8799').rstrip('/')
INST = 'https://agencia-z.test'
sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer',
        'expires_in': 3600, 'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'dono@agenciaz.com',
                 'user_metadata': {'full_name': 'Dono da Agência Z'}}}

def seed(tema):
    return ("try{localStorage.setItem('wfa-theme','%s');"
            "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);}catch(e){}"
            % (tema, json.dumps(json.dumps(sess))))

def abrir(pw, tema, largura, busca):
    b = pw.chromium.launch(channel='chrome', headless=True)
    ctx = b.new_context(viewport={'width': largura, 'height': 900 if largura > 500 else 844})
    ctx.add_init_script(seed(tema))
    alvo = base
    if busca == '?instancia':
        # simula a instancia da agencia num dominio que nao e da ARK: o navegador pede
        # agencia-z.test e a prova responde com os arquivos da previa
        def repassa(route):
            try:
                r = route.request
                if '/api/' in r.url:  # a instancia simulada fica sem servidor: nada chega na base da ARK
                    route.fulfill(status=503, body='offline'); return
                route.fulfill(response=route.fetch(url=base + r.url[len(INST):]))
            except Exception:
                pass
        ctx.route(INST + '/**', repassa)
        alvo, busca = INST, ''
    p = ctx.new_page(); erros = []
    p.on('pageerror', lambda e: erros.append(str(e)[:160]))
    p.goto(alvo + '/workflowark.html' + busca, wait_until='load')
    return b, p, erros

def visivel(p, sel):
    return p.evaluate("(s) => { const e = document.querySelector(s); if (!e) return false;"
                      " const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 &&"
                      " getComputedStyle(e).display !== 'none'; }", sel)

with sync_playwright() as pw:
    # 1) modo agencia, 1440 escuro: boas-vindas, cartao, destaque
    b, p, erros = abrir(pw, 'dark', 1440, '?instancia')
    p.wait_for_timeout(1500)
    print('marcador:', p.evaluate("async () => { const r = await fetch(location.pathname, {cache:'no-store'});"
                                  " return ((await r.text()).match(/build [0-9a-z-]+/)||[''])[0]; }"))
    print('clientes na lista:', p.evaluate("() => (typeof CLIENTES!=='undefined'?CLIENTES:[]).map(c=>c.nm).join(', ')"))
    print('tarefas de exemplo da ARK:', p.evaluate("() => state.tarefas.filter(t=>/^seed/.test(t.id)).length"))
    print('agenda com exemplo da ARK:', p.evaluate("() => (JSON.parse(localStorage.getItem('wfa-agenda-events')||'[]')).filter(e=>/^(ago|set)26-/.test(e.id)).length"))
    print('jornada com cliente da ARK:', p.evaluate("() => Object.values(JSON.parse(localStorage.getItem('wfa-jornada')||'{}')).flat().length"))
    print('equipe base:', p.evaluate("() => MD_PEOPLE.join(', ') || 'vazia'"))
    print('modo:', p.evaluate("() => document.documentElement.getAttribute('data-wfa-modo')"))
    p.wait_for_selector('[data-agx="boasvindas"]', timeout=15000)
    p.wait_for_timeout(500)
    p.screenshot(path='deploy/prova-agencia-boasvindas-1440-escuro.png')
    p.click('[data-agx="boasvindas"] [data-a="comecar"]')
    for i, nome in enumerate(['marca', 'cliente', 'equipe', 'tarefa']):
        p.wait_for_selector('.agx-tip', timeout=5000); p.wait_for_timeout(450)
        print('tour passo', i + 1, nome, '| destaque na tela:', p.evaluate("() => !!document.querySelector('.agx-spot')"))
        if nome in ('marca', 'cliente'):
            p.screenshot(path='deploy/prova-agencia-tour-%s-1440-escuro.png' % nome)
        p.click('.agx-tip [data-a="ok"]'); p.wait_for_timeout(350)
    print('cartao Primeiros passos:', p.evaluate("() => { const c = document.querySelector('[data-agx=passos]');"
                                                 " return c ? c.innerText.split('\\n').slice(0,3).join(' | ') : 'nao apareceu'; }"))
    for aba in ['chat', 'alpha', 'whatsapp']:
        print('aba', aba, 'visivel:', visivel(p, '[data-nav="%s"]' % aba))
    print('Atividades visivel:', visivel(p, '[data-nav="tarefas"]'))
    p.screenshot(path='deploy/prova-agencia-passos-1440-escuro.png')
    p.click('[data-onde="tarefa"]'); p.wait_for_timeout(900)
    print('destaque do botao Nova tarefa:', p.evaluate("() => !!document.querySelector('.agx-spot')"))
    p.screenshot(path='deploy/prova-agencia-onde-fica-1440-escuro.png')
    p.click('.agx-tip [data-a="ok"]'); p.wait_for_timeout(300)
    p.click('[data-fazer="marca"]'); p.wait_for_timeout(900)
    print('Configuracoes abertas na Marca, botao de logo:', p.evaluate("() => !!document.getElementById('agx-logo-file')"))
    print('tipos de cliente:', p.evaluate("() => [...(document.getElementById('cli-f-tipo')||{options:[]}).options].map(o=>o.textContent).join(' / ')"))
    print('erros de pagina:', erros or 'nenhum')
    b.close()

    # 2) modo agencia, 1440 claro
    b, p, erros = abrir(pw, 'light', 1440, '?instancia')
    p.wait_for_selector('[data-agx="boasvindas"]', timeout=15000)
    p.click('[data-agx="boasvindas"] [data-a="depois"]'); p.wait_for_timeout(400)
    print('depois vira pilula:', p.evaluate("() => (document.querySelector('.agx-pill')||{}).innerText || 'sem pilula'"))
    p.screenshot(path='deploy/prova-agencia-pilula-1440-claro.png')
    p.click('.agx-pill'); p.wait_for_timeout(400)
    p.screenshot(path='deploy/prova-agencia-passos-1440-claro.png'); b.close()

    # 3) celular 390, escuro e claro
    for tema, nome in [('dark', 'escuro'), ('light', 'claro')]:
        b, p, erros = abrir(pw, tema, 390, '?instancia')
        p.wait_for_selector('[data-agx="boasvindas"]', timeout=15000)
        p.screenshot(path='deploy/prova-agencia-boasvindas-390-%s.png' % nome)
        p.click('[data-agx="boasvindas"] [data-a="depois"]'); p.wait_for_timeout(400)
        p.click('.agx-pill'); p.wait_for_timeout(400)
        p.screenshot(path='deploy/prova-agencia-passos-390-%s.png' % nome)
        print('390', nome, 'sidebar escondida:', p.evaluate("() => { const s = document.querySelector('.side');"
              " const r = s.getBoundingClientRect(); return r.right <= 1; }"), 'erros:', erros or 'nenhum')
        b.close()

    # 4) modo ARK (sem ?agencia): nada muda
    b, p, erros = abrir(pw, 'dark', 1440, '?agencia=0')
    p.wait_for_timeout(11000)
    print('ARK modo:', p.evaluate("() => document.documentElement.getAttribute('data-wfa-modo')"),
          '| cartao:', p.evaluate("() => !!document.querySelector('[data-agx]')"),
          '| chat visivel:', visivel(p, '[data-nav="chat"]'),
          '| tipo de cliente:', p.evaluate("() => (document.getElementById('cli-f-tipo')||{options:[{}]}).options[0].textContent"))
    p.screenshot(path='deploy/prova-agencia-ark-intocada-1440.png')
    print('erros de pagina (ARK):', erros or 'nenhum')
    b.close()
