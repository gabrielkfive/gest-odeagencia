# -*- coding: utf-8 -*-
"""Contraste do texto solto sobre o fundo do quadro, medido no pixel do screenshot.
Uso: node deploy/prova-fundo-amarelo.mjs <pasta> > <pasta>/medidas.json ; python deploy/prova-contraste.py <pasta>
Para cada texto: fundo = mediana dos pixels do retângulo do elemento que diferem pouco do mais escuro/claro
(aproximação: pega os pixels do retângulo e fica com a mediana, que é dominada pelo fundo, não pelo traço da letra)."""
import sys, json, os, re, statistics
from PIL import Image
pasta = sys.argv[1]
med = json.load(open(os.path.join(pasta, 'medidas.json'), encoding='utf-8'))
def lum(c):
    def f(v):
        v = v / 255
        return v / 12.92 if v <= .03928 else ((v + .055) / 1.055) ** 2.4
    return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2])
def razao(a, b):
    la, lb = lum(a), lum(b); return (max(la, lb) + .05) / (min(la, lb) + .05)
pior = 99; linhas = []
for tema, nome in (('light', 'claro'), ('dark', 'escuro')):
    im = Image.open(os.path.join(pasta, 'atividades-%s.png' % nome)).convert('RGB')
    for t in med[tema]['textos']:
        n = [float(x) for x in re.findall(r'[\d.]+', t['cor'])]
        a = n[3] if len(n) > 3 else 1
        caixa = im.crop((t['x'], t['y'], t['x'] + t['w'], t['y'] + t['h']))
        px = list(caixa.getdata())
        fundo = tuple(statistics.median(p[i] for p in px) for i in range(3))
        texto = tuple(n[i] * a + fundo[i] * (1 - a) for i in range(3))
        r = razao(texto, fundo); pior = min(pior, r)
        linhas.append('%-6s %-5.2f %-28s %s' % (nome, r, t['txt'] or t['sel'], 'OK' if r >= 4.5 else ('grande OK' if r >= 3 else 'BAIXO')))
print('\n'.join(linhas)); print('pior contraste: %.2f' % pior)
