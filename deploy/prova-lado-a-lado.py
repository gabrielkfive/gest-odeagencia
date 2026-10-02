# -*- coding: utf-8 -*-
"""Junta login, Atividades claro e Atividades escuro numa imagem só. Uso: python deploy/prova-lado-a-lado.py <pasta>"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
pasta = sys.argv[1]
arqs = [('login-producao.png', 'Tela de login (produção)'), ('atividades-claro.png', 'Atividades, tema claro'), ('atividades-escuro.png', 'Atividades, tema escuro')]
ims = [Image.open(os.path.join(pasta, a)).convert('RGB').resize((960, 600)) for a, _ in arqs]
W, H, M, T = 960, 600, 24, 56
out = Image.new('RGB', (M + 3 * (W + M), T + H + M), (10, 10, 10))
d = ImageDraw.Draw(out)
try: f = ImageFont.truetype('arialbd.ttf', 26)
except Exception: f = ImageFont.load_default()
for k, (im, (_, rot)) in enumerate(zip(ims, arqs)):
    x = M + k * (W + M); out.paste(im, (x, T)); d.text((x, 16), rot, fill=(255, 199, 0), font=f)
out.save(os.path.join(pasta, 'lado-a-lado.png'))
print('ok')
