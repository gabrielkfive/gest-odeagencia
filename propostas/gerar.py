# -*- coding: utf-8 -*-
"""
Gerador de propostas ARK (ferramenta do Estrategista Comercial).

Uso:
    python gerar.py clientes/ahava            # gera o HTML
    python gerar.py clientes/ahava --pdf      # gera HTML + PDF

O que ele faz:
1. Lê clientes/<cliente>/dados.json (aponta o modelo e traz os dados)
2. Preenche os tokens {{...}} do modelo em modelos/<modelo>.html
3. Embute logo ARK e avatar do cliente em base64
4. Confere se sobrou token sem preencher e se há travessões proibidos
5. Com --pdf, imprime via Chrome headless (17 págs, 1280x800) e confere
"""
import base64
import io
import json
import os
import re
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

AQUI = os.path.dirname(os.path.abspath(__file__))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
TRAVESSOES = ['\u2014', '\u2013', '\u2500', '\u2501', '\u2550']  # yasismo: proibido


def b64(path, mime):
    data = base64.b64encode(open(path, 'rb').read()).decode()
    return f'data:{mime};base64,{data}'


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    cliente_dir = os.path.join(AQUI, sys.argv[1]) if not os.path.isabs(sys.argv[1]) else sys.argv[1]
    dados = json.load(open(os.path.join(cliente_dir, 'dados.json'), encoding='utf-8'))

    modelo_path = os.path.join(AQUI, 'modelos', dados['modelo'] + '.html')
    html = open(modelo_path, encoding='utf-8').read()

    # tokens simples do dados.json
    for chave, valor in dados.items():
        if chave in ('modelo', 'cliente_avatar'):
            continue
        html = html.replace('{{' + chave.upper() + '}}', str(valor))

    # imagens
    html = html.replace('{{LOGO}}', b64(os.path.join(AQUI, 'assets', 'logo-ark.png'), 'image/png'))
    avatar = os.path.join(cliente_dir, dados['cliente_avatar'])
    ext = os.path.splitext(avatar)[1].lower()
    mime = 'image/png' if ext == '.png' else 'image/jpeg'
    html = html.replace('{{CLIENTE_AVATAR}}', b64(avatar, mime))

    # verificações
    sobras = sorted(set(re.findall(r'\{\{[A-Z_0-9]+\}\}', html)))
    if sobras:
        print('ATENÇÃO, tokens sem valor no dados.json:', sobras)
    for ch in TRAVESSOES:
        if ch in html:
            print(f'ATENÇÃO, travessão proibido ({ch!r}) encontrado. Remover antes de entregar!')

    saida = os.path.join(cliente_dir, 'proposta.html')
    open(saida, 'w', encoding='utf-8').write(html)
    print('HTML gerado:', saida)

    if '--pdf' in sys.argv:
        nome = dados.get('cliente_nome', 'Cliente')
        pdf = os.path.join(cliente_dir, f'Proposta ARK Content x {nome}.pdf')
        url = 'file:///' + saida.replace('\\', '/')
        subprocess.run([CHROME, '--headless=new', '--disable-gpu',
                        '--user-data-dir=' + os.path.join(os.environ.get('TEMP', '.'), 'chrome-pdf-ark'),
                        '--no-pdf-header-footer', '--virtual-time-budget=15000',
                        f'--print-to-pdf={pdf}', url], check=True, capture_output=True)
        print('PDF gerado:', pdf)
        try:
            import fitz
            doc = fitz.open(pdf)
            print(f'Verificação: {len(doc)} páginas no PDF.')
        except ImportError:
            print('(instale PyMuPDF para conferência automática de páginas: pip install PyMuPDF)')


if __name__ == '__main__':
    main()
