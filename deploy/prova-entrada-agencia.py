# -*- coding: utf-8 -*-
"""Prova da tela de entrada no modo agencia (onboarding-20260923b).
1) /workflowark?agencia=1 sem sessao cai no /auth JA em modo agencia (o flag sobrevive ao redirect)
2) volta do Google (/app?code=...) continua em modo agencia
3) login por e-mail e senha responde na previa (senha errada devolve a mensagem certa)
4) na ARK (sem flag) a entrada fica como hoje
Uso: python deploy/prova-entrada-agencia.py <url-base>"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from playwright.sync_api import sync_playwright

base = sys.argv[1].rstrip('/')
ARK_TEXTOS = ['maior agência de marketing do Brasil', '+500 clientes atendidos', '27 clientes ativos',
              'Especialistas em gastronomia', 'Método dos 5 Eixos', 'Acesso da equipe Ark', 'Sistema operacional da Ark']

def texto(p):
    return p.evaluate("() => document.body.innerText")

with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for larg, alt, nome in [(1440, 900, '1440'), (390, 844, '390')]:
        ctx = b.new_context(viewport={'width': larg, 'height': alt})
        p = ctx.new_page()
        p.goto(base + '/workflowark?agencia=1', wait_until='load')
        p.wait_for_url('**/auth**', timeout=20000); p.wait_for_timeout(2500)
        t = texto(p)
        print(nome, 'agencia | url:', p.url.replace(base, ''), '| modo salvo:', p.evaluate("() => localStorage.getItem('wfa-modo')"))
        print(nome, 'agencia | textos da ARK na tela:', [x for x in ARK_TEXTOS if x in t] or 'nenhum')
        print(nome, 'agencia | titulo:', p.evaluate("() => (document.querySelector('h1')||{}).innerText"))
        p.screenshot(path='deploy/prova-entrada-agencia-%s.png' % nome, full_page=True)
        p.click('text=Criar acesso'); p.wait_for_timeout(400)
        print(nome, 'agencia | aba criar acesso:', 'Teste de 30 dias' in texto(p))
        if nome == '1440':
            p.screenshot(path='deploy/prova-entrada-agencia-criar-1440.png')
            p.click('button:has-text("Entrar") >> nth=0'); p.wait_for_timeout(300)
            p.fill('#floating_email', 'teste-inexistente@agencia-z.test'); p.fill('#floating_password', 'senha-errada-123')
            p.click('form button[type=submit]'); p.wait_for_timeout(4000)
            print('login e-mail e senha na previa:', 'E-mail ou senha incorretos' in texto(p))
            # volta do Google cai em /app?code=...; sem sessao o guard manda pro /auth de novo
            p.goto(base + '/app?code=teste', wait_until='load'); p.wait_for_url('**/auth**', timeout=20000); p.wait_for_timeout(1500)
            print('depois da volta do Google continua agencia:', p.evaluate("() => !!document.querySelector('[data-agx=entrada]')"))
        ctx.close()

        ctx = b.new_context(viewport={'width': larg, 'height': alt})
        p = ctx.new_page()
        p.goto(base + '/auth', wait_until='load'); p.wait_for_timeout(2500)
        t = texto(p)
        print(nome, 'ARK | textos da ARK na tela:', len([x for x in ARK_TEXTOS if x in t]), 'de', len(ARK_TEXTOS))
        p.screenshot(path='deploy/prova-entrada-ark-%s.png' % nome, full_page=True)
        ctx.close()
    b.close()
