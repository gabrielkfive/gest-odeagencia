# -*- coding: utf-8 -*-
"""Prova do onboarding v2 do modo agencia (onboarding-20260923c).
Instancia simulada da "Agencia do Ze" (agencia-ze.test, API bloqueada: nada chega na base da ARK):
entrada WorkFlowZe, assistente de 3 passos, importacao de planilha, Configuracoes como pagina,
e a ARK intacta (Sistema > Marca abre a aba Marca). Uso: python deploy/prova-agencia-v2.py <url-base>"""
import sys, io, json, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip('/')
INST = 'https://agencia-ze.test'
OUT = 'deploy/prova-v2-'
sess = {'access_token': 'teste-local', 'refresh_token': 'teste-local', 'token_type': 'bearer',
        'expires_in': 3600, 'expires_at': int(time.time()) + 3600,
        'user': {'id': '00000000-0000-0000-0000-000000000000', 'email': 'ze@agenciadoze.com',
                 'user_metadata': {'full_name': 'Zé'}}}
CSV = 'Cliente;Valor mensal;Tipo;Instagram\nPadaria Pão de Mel;R$ 1.500,00;Mensal;@padaria\nBarbearia do Bairro;800;Pré pago;\nMercado Central;2.000,50;Mensal;'
PROIBIDO = ['palmas', 'Sincronizar', 'Migração de dados', 'Rotinas de uma vez', 'JARVIS', 'ARK Content', 'maior agência']
res = {}

def ctx_novo(b, largura, tema, sessao=True, marca=None):
    c = b.new_context(viewport={'width': largura, 'height': 900 if largura > 500 else 844}, accept_downloads=True)
    js = "try{localStorage.setItem('wfa-theme','%s');" % tema
    if sessao: js += "localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);" % json.dumps(json.dumps(sess))
    if marca: js += "if(!localStorage.getItem('wfa-brand'))localStorage.setItem('wfa-brand',%s);" % json.dumps(json.dumps(marca))
    js += "}catch(e){}"
    c.add_init_script(js)
    def repassa(route):
        try:
            r = route.request
            if '/api/' in r.url:
                route.fulfill(status=503, body='offline'); return
            route.fulfill(response=route.fetch(url=base + r.url[len(INST):]))
        except Exception:
            pass
    c.route(INST + '/**', repassa)
    return c

def pagina(c):
    p = c.new_page(); p.__erros = []
    p.on('pageerror', lambda e: p.__erros.append(str(e)[:160]))
    return p

def texto(p, sel='body'):
    return p.evaluate("(s) => (document.querySelector(s)||{}).innerText || ''", sel)

def proibidos(t):
    return [x for x in PROIBIDO if x in t]

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)

    # 1) assistente, 1440 escuro
    c = ctx_novo(b, 1440, 'dark'); p = pagina(c)
    p.goto(INST + '/workflowark.html', wait_until='load')
    p.wait_for_selector('[data-agx=assistente]', timeout=15000); p.wait_for_timeout(500)
    res['marcador'] = p.evaluate("async () => ((await (await fetch(location.pathname,{cache:'no-store'})).text()).match(/build [0-9a-z-]+/)||[''])[0]")
    res['passo1 titulo'] = texto(p, '.agw h2')
    p.fill("[data-f=nome]", 'Agência do Zé')
    p.click("[data-cor='#A78BFA']")
    res['passo1 previa ao vivo'] = texto(p, "[data-f=pn]")
    p.screenshot(path=OUT + 'passo1-1440-escuro.png')
    p.click("[data-w=marca-ok]"); p.wait_for_timeout(300)
    res['depois do passo 1, titulo da aba'] = p.title()
    res['passo2 progresso'] = texto(p, '.agw-prog span')
    p.click("[data-o=plan]"); p.fill("[data-a=cola]", CSV); p.wait_for_timeout(300)
    res['passo2 linhas na revisao'] = p.evaluate("() => document.querySelectorAll('.ag-tab tbody tr').length")
    p.screenshot(path=OUT + 'passo2-planilha-1440-escuro.png')
    p.click("[data-a=importar]"); p.wait_for_timeout(300)
    res['passo2 mensagem'] = texto(p, "[data-a=msg]")
    res['clientes no sistema'] = p.evaluate("() => CLIENTES.map(c=>c.nm).join(', ')")
    res['tarefas criadas pela importacao'] = p.evaluate("() => state.tarefas.length")
    p.click("[data-w=prox]"); p.wait_for_timeout(300)
    res['passo3 titulo'] = texto(p, '.agw h3')
    p.screenshot(path=OUT + 'passo3-1440-escuro.png')
    p.click("[data-w=pular]"); p.wait_for_timeout(300)
    res['fim'] = texto(p, '.agw h2')
    p.screenshot(path=OUT + 'fim-1440-escuro.png')
    p.click("[data-w=fim]"); p.wait_for_timeout(1200)
    res['assistente fechou'] = p.evaluate("() => !document.querySelector('[data-agx=assistente]')")
    res['titulo da aba'] = p.title()
    res['nome na barra lateral'] = texto(p, '.brand-info .nm')
    res['textos da ARK no Meu Dia'] = proibidos(texto(p, '#page-dashboard'))
    p.screenshot(path=OUT + 'meudia-1440-escuro.png')

    # 2) Configuracoes como pagina
    p.evaluate("() => openSettings()"); p.wait_for_selector('[data-agx=configuracoes]'); p.wait_for_timeout(300)
    res['config abas'] = p.evaluate("() => [...document.querySelectorAll('.agp-tabs button')].map(b=>b.innerText).join(' | ')")
    p.screenshot(path=OUT + 'config-agencia-1440-escuro.png', full_page=True)
    vistos = []
    for aba in ['equipe', 'clientes', 'integracoes', 'conta']:
        p.click("[data-t=%s]" % aba); p.wait_for_timeout(250)
        vistos += proibidos(texto(p, '[data-agx=configuracoes]'))
        if aba in ('clientes', 'conta'): p.screenshot(path=OUT + 'config-%s-1440-escuro.png' % aba, full_page=True)
    res['textos tecnicos ou da ARK nas Configuracoes'] = sorted(set(vistos)) or 'nenhum'
    res['modal antigo abriu junto'] = p.evaluate("() => document.getElementById('modal-settings').classList.contains('open')")
    p.click("[data-p=voltar]"); p.wait_for_timeout(300)
    res['config fechou no Voltar'] = p.evaluate("() => !document.querySelector('[data-agx=configuracoes]')")
    p.reload(wait_until='load'); p.wait_for_timeout(11000)
    res['assistente nao volta depois de concluido'] = p.evaluate("() => !document.querySelector('[data-agx=assistente]')")
    res['erros de pagina (agencia)'] = p.__erros or 'nenhum'
    c.close()

    # 3) claro e celular
    for larg, tema in [(1440, 'light'), (390, 'dark'), (390, 'light')]:
        c = ctx_novo(b, larg, tema, marca={'name': 'Agência do Zé', 'color': '#A78BFA', 'logo': ''}); p = pagina(c)
        p.goto(INST + '/workflowark.html', wait_until='load'); p.wait_for_selector('[data-agx=assistente]', timeout=15000); p.wait_for_timeout(400)
        nome = '%d-%s' % (larg, 'claro' if tema == 'light' else 'escuro')
        p.screenshot(path=OUT + 'passo1-%s.png' % nome)
        p.click("[data-w=marca-ok]"); p.wait_for_timeout(250); p.click("[data-o=plan]"); p.wait_for_timeout(200)
        p.screenshot(path=OUT + 'passo2-%s.png' % nome)
        p.click("[data-w=depois]"); p.wait_for_timeout(300)
        p.evaluate("() => openSettings()"); p.wait_for_timeout(400)
        p.screenshot(path=OUT + 'config-%s.png' % nome, full_page=(larg > 500))
        res['sem rolagem lateral ' + nome] = p.evaluate("() => document.documentElement.scrollWidth <= innerWidth + 1")
        res['erros ' + nome] = p.__erros or 'nenhum'
        c.close()

    # 4) entrada WorkFlowZe (sem sessao, marca salva nesta origem)
    for larg in (1440, 390):
        c = ctx_novo(b, larg, 'dark', sessao=False, marca={'name': 'Agência do Zé', 'color': '#A78BFA', 'logo': ''}); p = pagina(c)
        p.goto(INST + '/auth', wait_until='load'); p.wait_for_selector('[data-agx=entrada]', timeout=20000); p.wait_for_timeout(1200)
        t = texto(p)
        res['entrada %d produto' % larg] = texto(p, '[data-agx=produto]')
        res['entrada %d titulo da aba' % larg] = p.title()
        res['entrada %d textos da ARK' % larg] = proibidos(t) or 'nenhum'
        p.screenshot(path=OUT + 'entrada-%d.png' % larg, full_page=True)
        if larg == 1440:
            p.click('text=Criar acesso'); p.wait_for_timeout(300)
            p.screenshot(path=OUT + 'entrada-criar-1440.png')
        c.close()
    c = ctx_novo(b, 1440, 'dark', sessao=False); p = pagina(c)
    p.goto(INST + '/auth', wait_until='load'); p.wait_for_selector('[data-agx=entrada]', timeout=20000); p.wait_for_timeout(1000)
    res['entrada sem marca'] = texto(p, '[data-agx=produto]')
    c.close()

    # 5) ARK intacta: sem flag no dominio da ARK
    c = b.new_context(viewport={'width': 1440, 'height': 900})
    c.add_init_script("try{localStorage.setItem('wfa-theme','dark');localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);}catch(e){}" % json.dumps(json.dumps(sess)))
    c.route('**/api/**', lambda r: r.fulfill(status=503, body='offline'))
    p = pagina(c)
    p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(12000)
    res['ARK: modo'] = p.evaluate("() => document.documentElement.getAttribute('data-wfa-modo')")
    res['ARK: assistente ou pagina da agencia'] = p.evaluate("() => !!document.querySelector('[data-agx]')")
    p.evaluate("() => { document.querySelectorAll('.ob-overlay,.onb,.modal.open').forEach(e=>{if(e.id!=='modal-settings')e.classList.remove('open')}); openSettings(); setTab('sistema'); }"); p.wait_for_timeout(300)
    p.click("#modal-settings [data-stp=sistema] button:has-text('Marca')"); p.wait_for_timeout(300)
    res['ARK: Sistema > Marca abre'] = p.evaluate("() => (document.querySelector('#modal-settings .set-pane.active')||{}).dataset.stp")
    res['ARK: continua na pagina atual (nao foi pra Integracoes)'] = p.evaluate("() => document.getElementById('modal-settings').classList.contains('open')")
    p.screenshot(path=OUT + 'ark-marca-1440.png')
    p.evaluate("() => setTab('conta')")
    res['ARK: aba Conta mantem JARVIS'] = 'JARVIS' in texto(p, '#modal-settings')
    c.close()
    c = b.new_context(viewport={'width': 1440, 'height': 900}); p = pagina(c)
    p.goto(base + '/auth', wait_until='load'); p.wait_for_timeout(3500)
    res['ARK: entrada com os textos de hoje'] = 'maior agência de marketing do Brasil' in texto(p)
    c.close()
    b.close()

for k, v in res.items():
    print('%s: %s' % (k, v))
