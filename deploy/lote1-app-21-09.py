# -*- coding: utf-8 -*-
"""Lote 1 do veredito de 21/09 no /app: rodapé com foto e cargo, visão de cliente do /next,
aba Sistema nas configurações, Régua dos 15 fora, Início com "Decisões que esperam você",
sem botão "Novo Meu Dia". Roda uma vez; cada troca é conferida (assert)."""
import io, re, os, subprocess

H = 'public/workflowark.html'
JS_OLD, JS_NEW = 'public/workflowark-app-20260921a.js', 'public/workflowark-app-20260921b.js'
SKIN_JS, SKIN_CSS = 'public/workflowark-next-20260921b.js', 'public/workflowark-next-20260921b.css'
CLI_JS, CLI_CSS = 'public/workflowark-cliente-20260921a.js', 'public/workflowark-cliente-20260921a.css'

NL = {}
CRLF, LF = chr(13) + chr(10), chr(10)
def rd(p):
    s = io.open(p, encoding='utf-8', newline='').read()
    NL[p] = CRLF if CRLF in s[:2000] else LF
    return s.replace(CRLF, LF)
def wr(p, s):
    io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(LF, NL.get(p, LF)))

# ---- Task 1: rodapé com foto e cargo (JS renomeado) ----
if os.path.exists(JS_OLD): subprocess.run(['git', 'mv', JS_OLD, JS_NEW], check=True)
j = rd(JS_NEW)
old = """  const av=document.getElementById('side-av');if(av)av.textContent=mdInitial(nm);
  const n=document.getElementById('side-nm');if(n)n.textContent=nm;
  const r=document.getElementById('side-rl');if(r)r.textContent=rl;"""
new = """  /* foto do login (Google) quando existe, sigla so de reserva; cargo + ARK Content no rodape (pedido de 21/09) */
  let foto='';
  try{const s=JSON.parse(localStorage.getItem('sb-fxfnonozzekxnxddxsnh-auth-token')||'null');const u=s&&s.user&&s.user.user_metadata;foto=(u&&(u.avatar_url||u.picture))||'';}catch(e){}
  const av=document.getElementById('side-av');
  if(av){if(foto&&/^https?:/.test(foto)){av.innerHTML='<img src="'+foto.replace(/"/g,'')+'" alt="" referrerpolicy="no-referrer" onerror="this.parentNode.textContent=\\''+mdInitial(nm).replace(/'/g,'')+'\\'">';}else av.textContent=mdInitial(nm);}
  const n=document.getElementById('side-nm');if(n)n.textContent=nm;
  const r=document.getElementById('side-rl');if(r)r.textContent=rl+' · ARK Content';"""
assert old in j; j = j.replace(old, new)
# ---- Task 4 (parte JS): título das decisões ----
n_dec = j.count('🎯 Decisões de hoje'); assert n_dec >= 2
j = j.replace('🎯 Decisões de hoje', 'Decisões que esperam você')
wr(JS_NEW, j)

# ---- Task 2: página do cliente extraída da pele do /next ----
s = rd(SKIN_JS)
nl = '\r\n' if '\r\n' in s[:500] else '\n'
fim = s.index('  /* Inicio enxuto')
bloco = s[:fim].replace('  if (!document.body.classList.contains("next")) return;' + nl, '')
assert 'classList.contains("next")' not in bloco
cab = ('/* ============ WorkFlowArk · pagina do cliente com abas (21/09/2026, exportada do /next) ============' + nl +
       '   Posts / Reels / Stories / Aprovacao / Editorial / Ficha / Faturas / Saude por cliente e mes,' + nl +
       '   lendo o MESMO estado e gravando por saveTarefas (item unico). Pedido do Gabriel no video de 21/09.' + nl +
       '   Carregada depois do app. Nao toca em mais nada. */' + nl)
bloco = re.sub(r'^/\*.*?\*/' + nl, cab, bloco, count=1, flags=re.S)
wr(CLI_JS, bloco + '})();' + nl)
c = rd(SKIN_CSS)
a = c.index('/* ---- pagina do cliente com abas'); b = c.index('/* ---- ajustes 21/09')
wr(CLI_CSS, '/* pagina do cliente com abas (exportada do /next em 21/09/2026) */' + nl + c[a:b])

# ---- HTML: referências, marcador, régua fora, aba Sistema, botão Novo Meu Dia fora ----
h = rd(H)
assert h.count('workflowark-app-20260921a.js') == 1
h = h.replace('workflowark-app-20260921a.js', 'workflowark-app-20260921b.js')
h = h.replace('<script src="workflowark-app-20260921b.js"></script>',
              '<script src="workflowark-app-20260921b.js"></script>\n<script src="workflowark-cliente-20260921a.js" defer></script>', 1)
h = h.replace('<link rel="stylesheet" href="workflowark-20260915a.css">',
              '<link rel="stylesheet" href="workflowark-20260915a.css">\n<link rel="stylesheet" href="workflowark-cliente-20260921a.css">', 1)
assert h.startswith('<!-- build 20260921a-cobranca-merge -->')
h = h.replace('<!-- build 20260921a-cobranca-merge -->', '<!-- build 20260921b-lote1-app -->', 1)
# Régua dos 15: subitem do menu
m = re.search(r'\n[ \t]*<div class="subitem" data-nav="regua">.*?</div>\n', h, flags=re.S); assert m
h = h[:m.start()] + '\n' + h[m.end():]
# Régua dos 15: preferência no modal
m = re.search(r'[ \t]*<div class="set-sect-t" style="margin:18px 0 8px">Preferências de menu</div>.*?</p>\n', h, flags=re.S); assert m and 'pref-regua' in m.group(0)
h = h[:m.start()] + h[m.end():]
# botão Novo Meu Dia
m = re.search(r'[ \t]*<a href="/meu-dia" target="_top"[^>]*>[^<]*</a>\n', h); assert m
h = h[:m.start()] + h[m.end():]
# aba Sistema no modal de configurações
old = '<button class="set-tab" data-st="conta" onclick="setTab(\'conta\')">Conta</button>'
assert old in h
h = h.replace(old, old + '\n        <button class="set-tab" data-st="sistema" onclick="setTab(\'sistema\')">Sistema</button>', 1)
cards = [('Marca', 'Logo, cores e link público do cliente', "openSettingsIr('integracoes')"),
         ('Equipe e papéis', 'Quem vê o quê. Financeiro restrito.', "setTab('equipe')"),
         ('Integrações', 'Google Agenda, Drive, Instagram, WhatsApp, Meta Ads', "openSettingsIr('integracoes')"),
         ('Planos e contratos', 'Modelos de contrato e propostas', "openSettingsIr('contratos')"),
         ('Automações', 'Rotinas e agentes, sempre com aprovação', "openSettingsIr('rotinas')"),
         ('Assinatura eletrônica', 'Enviar contrato para assinar (em preparação)', "toast('Assinatura eletrônica: em preparação')")]
pane = ('\n      <!-- SISTEMA (blocos aprovados em 21/09, vindos da base v2) -->\n      <div class="set-pane" data-stp="sistema">\n'
        '        <div class="set-sect-t" style="margin-bottom:10px">Sistema</div>\n'
        '        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">\n' +
        ''.join(f'          <button type="button" class="set-merow" style="text-align:left;cursor:pointer;margin:0;font-family:inherit" onclick="{fn}"><div style="font-size:13.5px;font-weight:700;color:var(--ink)">{t}</div><div class="set-meta-line" style="font-family:inherit;font-size:11.5px">{d}</div></button>\n' for t, d, fn in cards) +
        '        </div>\n      </div>\n')
anchor = '      <!-- EQUIPE & ACESSOS (admin) -->'
assert anchor in h
h = h.replace(anchor, pane + anchor, 1)
# CSS do rodapé com foto (inline no head, sem renomear o css principal)
old = '<link rel="stylesheet" href="workflowark-cliente-20260921a.css">'
h = h.replace(old, old + '\n<style>.side-foot .av{min-width:34px;width:34px;height:34px;overflow:hidden;flex:none}.side-foot .av img{width:100%;height:100%;object-fit:cover;border-radius:50%;display:block}.side.compact .side-foot .av{min-width:34px}</style>', 1)
wr(H, h)
# helper: openSettingsIr fecha o modal e navega
j = rd(JS_NEW)
j = j.replace('function setTab(name){', "function openSettingsIr(pagina){try{closeModal('modal-settings');}catch(e){}const el=document.querySelector('[data-nav=\"'+pagina+'\"]');if(el)el.click();}\nfunction setTab(name){", 1)
wr(JS_NEW, j)
print('ok: js', JS_NEW, '| cliente', os.path.getsize(CLI_JS), os.path.getsize(CLI_CSS), '| decisoes', n_dec)
