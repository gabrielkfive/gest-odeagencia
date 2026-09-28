# -*- coding: utf-8 -*-
"""Tokens do /app vivem num arquivo só (lote 2 do doc 11, 27/09/2026).
Uso: python deploy/teste-tokens.py   (sai 1 se alguma regra quebrar)

1. O HTML liga public/workflowark-tokens-*.css ANTES do CSS principal.
2. Fora desse arquivo, nenhum bloco :root, body.aura-dark ou body.aura-light declara variável.
3. Toda var(--x) sem fallback usada no CSS ou no HTML tem definição em algum lugar
   (variável indefinida sem fallback derruba a declaração inteira; foi o bug do --card).
"""
import re, sys, glob, os

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
HTML = 'public/workflowark.html'
GLOBAIS = {':root', 'body.aura-dark', 'body.aura-light'}
# Já indefinidas antes do lote 2 (medido em 2a2c980); o teste impede que a lista cresça.
INDEFINIDAS_ANTES = set()

falhas = []
# Toda página que liga o CSS principal precisa ligar os tokens antes dele.
paginas = [h for h in glob.glob('public/*.html')
           if re.search(r'href="workflowark-\d{8}[a-z]\.css"', open(h, encoding='utf-8').read())]
arq_tokens = None
for pag in [HTML] + [h.replace(os.sep, '/') for h in paginas if h.replace(os.sep, '/') != HTML]:
    txt = open(pag, encoding='utf-8').read()
    lk = re.findall(r'<link rel="stylesheet" href="([^"]+\.css)">', txt)
    tk = [l for l in lk if re.match(r'workflowark-tokens-\d{8}[a-z]\.css$', l)]
    pr = [l for l in lk if re.match(r'workflowark-\d{8}[a-z]\.css$', l)]
    if len(tk) != 1:
        falhas.append('%s precisa ligar exatamente 1 workflowark-tokens-AAAAMMDDx.css (achou %d)' % (pag, len(tk)))
    elif not pr or lk.index(tk[0]) > lk.index(pr[0]):
        falhas.append('%s: arquivo de tokens tem que vir antes do CSS principal' % pag)
    elif not os.path.exists('public/' + tk[0]):
        falhas.append('%s liga arquivo que não existe: %s' % (pag, tk[0]))
    elif arq_tokens and 'public/' + tk[0] != arq_tokens:
        falhas.append('%s liga outro arquivo de tokens: %s' % (pag, tk[0]))
    else:
        arq_tokens = 'public/' + tk[0]
html = open(HTML, encoding='utf-8').read()
links = re.findall(r'<link rel="stylesheet" href="([^"]+\.css)">', html)

def sem_comentario(t):
    return re.sub(r'/\*.*?\*/', '', t, flags=re.S)

fontes = {}
for l in links:
    p = 'public/' + l
    if os.path.exists(p):
        fontes[p] = sem_comentario(open(p, encoding='utf-8').read())
fontes[HTML + ' (style)'] = sem_comentario(''.join(re.findall(r'<style[^>]*>(.*?)</style>', html, flags=re.S)))

definidas, usadas = set(), set()
for nome, css in fontes.items():
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', css):
        sel = ' '.join(m.group(1).split())
        decl = re.findall(r'(--[\w-]+)\s*:', m.group(2))
        definidas.update(decl)
        if decl and sel in GLOBAIS and nome != arq_tokens:
            falhas.append('%s declara %d variável(is) em %s: %s' % (nome, len(decl), sel, ' '.join(decl[:6])))
    usadas.update(re.findall(r'var\((--[\w-]+)\)', css))
# HTML inteiro (style inline e JS) também define e usa
definidas.update(re.findall(r'(--[\w-]+)\s*:', html))
definidas.update(re.findall(r"setProperty\(\s*['\"](--[\w-]+)", html))
usadas.update(re.findall(r'var\((--[\w-]+)\)', html))
novas = sorted((usadas - definidas) - INDEFINIDAS_ANTES)
if novas:
    falhas.append('var() sem definição: ' + ' '.join(novas))

if falhas:
    print('FALHA'); [print(' -', f) for f in falhas]; sys.exit(1)
print('OK: tokens em %s, %d variáveis definidas, %d usadas' % (arq_tokens, len(definidas), len(usadas)))
