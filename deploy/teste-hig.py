# -*- coding: utf-8 -*-
"""Regras da Apple HIG medidas no /app (estudo em Documents/WorkFlowArk-Next-2026-09-20/estudo-apple-hig.md).
Uso: python deploy/teste-hig.py [url-base] [--relatorio]
Sem url: sobe public/ num servidor local com carteira sintética. Sai 1 se alguma regra quebrar.

Por tela (Meu Dia, Kanban, modal da tarefa, CRM, Área do Cliente, Configurações) nos temas claro e escuro:
  1. nenhum texto visível abaixo de 11 px                       (typography: mínimo macOS 10, iOS 11)
  2. nenhum texto em caixa alta por CSS                          (typography, writing)
  3. nenhum texto com peso acima de 700                          (typography: Regular a Bold)
  4. nenhuma fonte mono em texto de interface                    (typography: minimizar famílias)
  5. contraste de texto >= 4.5:1 (>= 3:1 se >= 18 px ou >= 700)  (accessibility)
  6. no máximo 1 item com fundo amarelo na sidebar               (sidebars, color: acento só no ativo)
"""
import sys, os, json, threading, http.server, socketserver, functools
from playwright.sync_api import sync_playwright

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
RELATORIO = '--relatorio' in sys.argv
base = args[0] if args else None
srv = None
if not base:
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(('127.0.0.1', 5193), functools.partial(Q, directory='public'))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = 'http://127.0.0.1:5193'

sess = {'access_token': 't', 'refresh_token': 't', 'token_type': 'bearer', 'expires_in': 3600, 'expires_at': 4102444800,
        'user': {'id': '0', 'email': 'teste@local', 'user_metadata': {'full_name': 'Equipe Demo'}}}
tarefas = [
    {'id': 't1', 'title': 'Reel de lançamento', 'status': 'andamento', 'resp': 'Ana Souza', 'clienteId': 'vivenda', 'data': '2026-09-28', 'formato': 'reel', 'up': '2026-09-27T12:00:00.000Z', 'desc': 'Gravar na loja.'},
    {'id': 't2', 'title': 'Story da semana', 'status': 'homologcli', 'resp': 'Bruno Lima', 'clienteId': 'vivenda', 'data': '2026-09-27', 'formato': 'story', 'up': '2026-09-27T12:00:00.000Z'},
    {'id': 't4', 'title': 'Relatório de anúncios', 'status': 'backlog', 'resp': 'Carla Dias', 'clienteId': 'fercon', 'data': '2026-09-25', 'up': '2026-09-27T12:00:00.000Z'},
]

MEDIR = r"""() => {
  const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r,g,b] = m.slice(0,3).map(v => { v = v/255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); }); return .2126*r + .7152*g + .0722*b; };
  const alfa = c => { const m = c.match(/[\d.]+/g); return m && m.length > 3 ? +m[3] : 1; };
  const fundo = el => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e);
      if (s.backgroundImage && s.backgroundImage !== 'none') return null;
      if (alfa(s.backgroundColor) >= .95) return s.backgroundColor; }
    return getComputedStyle(document.body).backgroundColor; };
  const visivel = el => { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false;
    for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .2) return false; } return true; };
  const q = { pequeno: [], caixaAlta: [], pesado: [], mono: [], contraste: [], amareloSidebar: 0, emoji: [] };
  const EMO = /^\s*[←-➿⬀-⯿\u{1F300}-\u{1FAFF}]/u;
  const topo0 = document.querySelector('.modal-bg.open, .modal.open, #task-detail.open, .settings-modal.open');
  for (const el of document.querySelectorAll('button,label,summary,th,h4,.tkl,.tb-btn,.dec-btn,.icobtn,.gbtn,.set-sect-t,.set-tab')) {
    if (topo0 && !topo0.contains(el) && !el.closest('.side')) continue;
    let n = el.firstChild; while (n && n.nodeType === 3 && !n.nodeValue.trim()) n = n.nextSibling;
    if (n && n.nodeType === 3 && EMO.test(n.nodeValue) && visivel(el)) q.emoji.push(el.tagName + ' "' + n.nodeValue.trim().slice(0, 20) + '"'); }
  const topo = document.querySelector('.modal-bg.open, .modal.open, #task-detail.open, .settings-modal.open');
  for (const el of document.querySelectorAll('body *')) {
    if (topo && !topo.contains(el) && !el.closest('.side')) continue;
    const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
    if (!t || !/[A-Za-zÀ-ú0-9]/.test(t) || el.closest('svg,code,pre,kbd,textarea,script,style')) continue;
    if (!visivel(el)) continue;
    const s = getComputedStyle(el), px = parseFloat(s.fontSize), w = +s.fontWeight, rot = (el.tagName + '.' + (el.className && el.className.baseVal === undefined ? el.className : '')).slice(0, 50) + ' "' + t.slice(0, 24) + '"';
    if (px < 11) q.pequeno.push(px + 'px ' + rot);
    if (s.textTransform === 'uppercase' && /[a-zà-ú]/i.test(t)) q.caixaAlta.push(rot);
    if (w > 700) q.pesado.push(w + ' ' + rot);
    if (/mono/i.test(s.fontFamily)) q.mono.push(rot);
    const bg = fundo(el);
    if (bg && alfa(s.color) > .5) { const a = lum(s.color), b = lum(bg); const cr = (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const min = (px >= 18 || w >= 700) ? 3 : 4.5; if (cr < min) q.contraste.push(cr.toFixed(2) + ' ' + rot + ' ' + s.color + ' em ' + bg); }
  }
  for (const n of document.querySelectorAll('.side .navitem, .side .subitem, .side .crm-pill, #nav-indicator')) { if (!visivel(n)) continue;
    const c = getComputedStyle(n).backgroundColor.match(/[\d.]+/g); if (c && +c[0] > 230 && +c[1] > 170 && +c[1] < 215 && +c[2] < 60 && alfa(getComputedStyle(n).backgroundColor) > .5) q.amareloSidebar++; }
  return q;
}"""

falhas, total = [], {}
with sync_playwright() as pw:
    b = pw.chromium.launch(channel='chrome', headless=True)
    for tema in ('dark', 'light'):
        ctx = b.new_context(viewport={'width': 1440, 'height': 900})
        ctx.add_init_script("try{localStorage.setItem('sb-fxfnonozzekxnxddxsnh-auth-token',%s);localStorage.setItem('wfa-theme','%s');localStorage.setItem('wfa-tarefas',%s);}catch(e){}"
                            % (json.dumps(json.dumps(sess)), tema, json.dumps(json.dumps(tarefas))))
        p = ctx.new_page()
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(3000)
        def tema_certo():
            p.evaluate("t => { document.body.classList.toggle('aura-dark', t === 'dark'); document.body.classList.toggle('aura-light', t === 'light'); }", tema)
        def nav(n):
            p.evaluate("n => { const el = document.querySelector('[data-nav=' + n + ']'); el && el.click(); }", n); p.wait_for_timeout(700); tema_certo()
        telas = []
        nav('dashboard'); telas.append(('inicio', p.evaluate(MEDIR)))
        # saudação do Meu Dia: texto com gradiente não entra na medida geral; confere a cor de preenchimento real
        sd = p.evaluate('''() => { const e = document.querySelector('.aura-saud'); if (!e || !e.getBoundingClientRect().width) return null;
          const s = getComputedStyle(e); let f = s.webkitTextFillColor; const clip = s.backgroundClip === 'text' || s.webkitBackgroundClip === 'text';
          const bgi = s.backgroundImage; let bg = null; for (let x = e.parentElement; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; const m = c.match(/[\\d.]+/g); if (m && (m.length < 4 || +m[3] > .9)) { bg = c; break; } }
          return { fill: f, clip, bgi: bgi.slice(0, 60), cor: s.color, bg }; }''')
        if sd:
            import re as _re
            def _lum(c):
                v = [float(x) / 255 for x in _re.findall(r'[\d.]+', c)[:3]]
                v = [x / 12.92 if x <= .03928 else ((x + .055) / 1.055) ** 2.4 for x in v]; return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]
            if sd['clip'] and sd['bgi'] != 'none':
                falhas.append('inicio-%s saudação: texto em gradiente recortado, cor real não garantida (%s)' % (tema, sd['bgi']))
            else:
                cor = sd['fill'] if sd['fill'] and not sd['fill'].endswith(', 0)') else sd['cor']
                a1, b1 = _lum(cor), _lum(sd['bg'] or 'rgb(0,0,0)'); cr = (max(a1, b1) + .05) / (min(a1, b1) + .05)
                if cr < 3: falhas.append('inicio-%s saudação: contraste %.2f (%s em %s)' % (tema, cr, cor, sd['bg']))
        nav('tarefas'); telas.append(('kanban', p.evaluate(MEDIR)))
        # subitens: o grupo não pode ganhar amarelo junto com a folha (sidebars: um destaque só)
        nav('jornada'); telas.append(('sub-jornada', p.evaluate(MEDIR)))
        nav('projetos'); telas.append(('sub-projetos', p.evaluate(MEDIR)))
        nav('tarefas')
        p.evaluate("() => { try { openTaskDetail('t1'); } catch (e) {} }"); p.wait_for_timeout(600); tema_certo(); telas.append(('tarefa', p.evaluate(MEDIR)))
        p.goto(base + '/workflowark.html', wait_until='load'); p.wait_for_timeout(2500)
        nav('crm'); telas.append(('crm', p.evaluate(MEDIR)))
        nav('cliente'); p.evaluate("() => { const s = document.getElementById('cli-area-sel'); if (s) { s.value = 'vivenda'; if (typeof cliAreaSelect === 'function') cliAreaSelect('vivenda'); } }"); p.wait_for_timeout(500); tema_certo()
        telas.append(('cliente', p.evaluate(MEDIR)))
        av = p.evaluate("() => { const e = [...document.querySelectorAll('.nxc-av')].find(x => x.getBoundingClientRect().width > 40); return e ? parseFloat(getComputedStyle(e).fontSize) : null; }")
        if av is not None and av < 16:
            falhas.append('cliente-%s avatar: iniciais do avatar grande em %spx (mínimo 16)' % (tema, av))
        p.evaluate("() => { try { openSettings(); } catch (e) {} }"); p.wait_for_timeout(500); tema_certo(); telas.append(('config', p.evaluate(MEDIR)))
        # Liquid Glass só na navegação (materials, sidebars, toolbars): vidro na sidebar e nos controles do topo,
        # barra do topo sem fundo chapado, item selecionado em cápsula
        vid = p.evaluate('''() => {
          const bf = q => { const e = document.querySelector(q); return e ? getComputedStyle(e).backdropFilter : 'ausente'; };
          const tb = getComputedStyle(document.querySelector('.topbar'));
          const sel = document.querySelector('.side .subitem.active, .side .navitem.active[data-nav]:not([data-nav=""])');
          let capsula = 'sem item'; if (sel) { const r = sel.getBoundingClientRect(); capsula = parseFloat(getComputedStyle(sel).borderTopLeftRadius) >= r.height / 2 - 1; }
          return { side: bf('.side'), busca: bf('.tb-search'), icone: bf('.topbar .tb-btn.tb-ic'), topo: tb.backgroundColor, capsula: capsula };
        }''')
        for k in ('side', 'busca', 'icone'):
            if 'blur' not in (vid[k] or ''):
                falhas.append('%s vidro: %s sem desfoque de fundo (%s)' % (tema, k, vid[k]))
        if vid['topo'] not in ('rgba(0, 0, 0, 0)', 'transparent'):
            falhas.append('%s vidro: barra do topo com fundo chapado %s' % (tema, vid['topo']))
        if vid['capsula'] is not True:
            falhas.append('%s vidro: item selecionado não é cápsula (%s)' % (tema, vid['capsula']))
        for nome, q in telas:
            chave = '%s-%s' % (nome, tema)
            total[chave] = {k: (v if isinstance(v, int) else len(v)) for k, v in q.items()}
            for regra, lim in (('pequeno', 0), ('caixaAlta', 0), ('pesado', 0), ('mono', 0), ('contraste', 0), ('emoji', 0)):
                if len(q[regra]) > lim:
                    falhas.append('%s %s: %d (%s)' % (chave, regra, len(q[regra]), ' | '.join(q[regra][:40])))
            if q['amareloSidebar'] > 1:
                falhas.append('%s amareloSidebar: %d itens com fundo amarelo' % (chave, q['amareloSidebar']))
        ctx.close()
    b.close()
if srv: srv.shutdown()
if RELATORIO:
    print('%-14s %8s %9s %7s %5s %9s %7s' % ('tela', 'pequeno', 'caixaAlta', 'pesado', 'mono', 'contraste', 'amarelo'))
    for k, v in total.items():
        print('%-14s %8d %9d %7d %5d %9d %7d' % (k, v['pequeno'], v['caixaAlta'], v['pesado'], v['mono'], v['contraste'], v['amareloSidebar']))
if falhas:
    print('FALHA (%d)' % len(falhas)); [print(' -', f) for f in falhas]; sys.exit(1)
print('OK: 6 telas x 2 temas dentro das regras da HIG')
