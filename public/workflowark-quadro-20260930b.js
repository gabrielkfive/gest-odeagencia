/* WorkFlowArk · aba Atividades no piloto Liquid Glass aprovado (28/09/2026).
   - Rolagem livre estilo Trello: arrastar o fundo do quadro (ou o fundo da coluna) com o mouse rola na horizontal,
     com inércia (projeção de momento da Apple). Cartão, botão e campo não iniciam o arraste do quadro.
   - Plano de fundo por pessoa neste aparelho: grafite ARK por padrão (preto com brilho sutil), amarelo, azul e outros
     gradientes (o do piloto, rosa e roxo, fica como opção), ou uma foto.
   - Refração de Liquid Glass nas cápsulas da barra do topo e da barra de vistas (só no Chrome; nos outros fica o desfoque).
   Teste: python deploy/teste-quadro.py */
(function () {
  'use strict';
  var CHAVE = 'wfa-quadro-fundo';
  // Ordem de 30/09: o grafite entrou no índice 0 (padrão) e o gradiente do piloto foi para o fim (índice 8).
  // Os índices 1 a 7 não mudaram. Escolha salva sem "v" é da lista de 28/09 e migra por LISTA_V1.
  var VERSAO = 2;
  var LISTA_V1 = [8, 1, 2, 3, 4, 5, 6, 7];
  var FUNDOS = [
    'radial-gradient(120% 90% at 12% 0%,rgba(255,255,255,.10),rgba(255,255,255,0) 55%),radial-gradient(80% 70% at 100% 100%,rgba(254,239,2,.06),rgba(254,239,2,0) 60%),linear-gradient(160deg,#2c2c30 0%,#18181b 50%,#0a0a0b 100%)', // padrão: grafite ARK
    'linear-gradient(135deg,#FFE066 0%,#FFC700 45%,#FFAE00 100%)', // amarelo ARK, opção
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(160deg,#0f2027,#203a43 50%,#2c5364)',
    'linear-gradient(135deg,#f6d365,#fda085)',
    'linear-gradient(135deg,#ffb86b,#ff6fa3 45%,#7b6cff)' // gradiente do piloto (rosa e roxo), só como opção
  ];
  // fundos escuros (índices) pedem texto claro no tema claro; foto sempre ganha um véu escuro leve
  var ESCUROS = { 0: 1, 5: 1, 6: 1 };
  function pagina() { return document.getElementById('page-tarefas'); }

  // ---------- plano de fundo ----------
  function aplicarFundo(v) {
    var pg = pagina(); if (!pg) return;
    var css = (v && v.foto) ? 'linear-gradient(rgba(0,0,0,.3),rgba(0,0,0,.3)), url("' + v.foto + '") center/cover no-repeat' : FUNDOS[(v && v.i) || 0] || FUNDOS[0];
    pg.style.setProperty('--quadro-fundo', css);
    pg.classList.toggle('qf-escuro', !!((v && v.foto) || ESCUROS[(v && v.i) || 0]));
    marcarAmostras(v);
  }
  function lerFundo() {
    var v; try { v = JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { v = null; }
    if (!v || typeof v !== 'object') return { i: 0 };
    if (v.foto || v.v === VERSAO) return v;
    // escolha salva na lista de 28/09: mesmo fundo, índice novo
    var n = LISTA_V1[+v.i || 0]; v = { i: n == null ? 0 : n, v: VERSAO };
    salvarFundo(v); return v;
  }
  function salvarFundo(v) { try { localStorage.setItem(CHAVE, JSON.stringify(v)); return true; } catch (e) { return false; } }
  window.wfaQuadroFundo = function (i) { var v = { i: Math.max(0, Math.min(FUNDOS.length - 1, +i || 0)), v: VERSAO }; salvarFundo(v); aplicarFundo(v); };
  // A foto fica no navegador junto com as tarefas: guardada pequena (até 1280 px e no máximo 400 mil caracteres)
  // para nunca tomar o espaço de que o salvamento das tarefas precisa.
  function usarFoto(arquivo) {
    return new Promise(function (ok) {
      if (!arquivo || !/^image\//.test(arquivo.type)) return ok(false);
      var img = new Image(), url = URL.createObjectURL(arquivo);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var tentativas = [[1280, .7], [1024, .6], [800, .55]], dado = '';
        for (var k = 0; k < tentativas.length; k++) {
          var max = tentativas[k][0], f = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
          c.width = Math.round(img.width * f); c.height = Math.round(img.height * f);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          dado = c.toDataURL('image/jpeg', tentativas[k][1]);
          if (dado.length <= 400000) break;
        }
        var v = { foto: dado };
        if (!salvarFundo(v)) { if (window.showToast) try { showToast('A foto não coube no navegador; use uma imagem menor.'); } catch (e) {} return ok(false); }
        aplicarFundo(v); ok(true);
      };
      img.onerror = function () { URL.revokeObjectURL(url); ok(false); };
      img.src = url;
    });
  }
  window.wfaQuadroFoto = usarFoto;

  // ---------- botão e popover de fundo ----------
  var pop;
  function marcarAmostras(v) {
    if (!pop) return;
    [].forEach.call(pop.querySelectorAll('.qf-amostra'), function (b, j) { b.classList.toggle('on', !(v && v.foto) && ((v && v.i) || 0) === j); });
  }
  function montarBotao() {
    var acoes = document.querySelector('#page-tarefas .tf-acoes');
    if (!acoes || document.getElementById('tf-fundo-btn')) return;
    var bt = document.createElement('button');
    bt.id = 'tf-fundo-btn'; bt.type = 'button'; bt.className = 'tf-fundo-btn'; bt.setAttribute('aria-label', 'Plano de fundo do quadro'); bt.title = 'Plano de fundo do quadro';
    bt.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 16l5-5 4.2 4.2 2.8-2.8 5 5"/><circle cx="15.5" cy="9" r="1.2"/></svg><span>Fundo</span>';
    acoes.insertBefore(bt, acoes.firstChild);
    pop = document.createElement('div');
    pop.className = 'qf-pop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Plano de fundo do quadro');
    var h = '<div class="qf-tit">Plano de fundo do quadro</div><div class="qf-grade">';
    FUNDOS.forEach(function (f, j) { h += '<button type="button" class="qf-amostra" style="background:' + f + '" aria-label="' + (j === 0 ? 'Grafite ARK' : j === 1 ? 'Amarelo ARK' : j === FUNDOS.length - 1 ? 'Gradiente do piloto' : 'Fundo ' + (j + 1)) + '" data-i="' + j + '"></button>'; });
    h += '</div><label class="qf-foto"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 15V5M7.8 9.2L12 5l4.2 4.2M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16"/></svg>Usar uma foto minha<input type="file" accept="image/*" hidden></label>';
    pop.innerHTML = h;
    document.body.appendChild(pop);
    pop.addEventListener('click', function (e) { var a = e.target.closest('.qf-amostra'); if (a) window.wfaQuadroFundo(+a.dataset.i); });
    pop.querySelector('input').addEventListener('change', function () { usarFoto(this.files[0]); this.value = ''; });
    bt.addEventListener('click', function (e) {
      e.stopPropagation();
      var r = bt.getBoundingClientRect();
      pop.style.top = (r.bottom + 8) + 'px'; pop.style.left = Math.max(12, r.right - 300) + 'px';
      pop.classList.toggle('aberto');
    });
    document.addEventListener('click', function (e) { if (pop.classList.contains('aberto') && !pop.contains(e.target) && e.target !== bt) pop.classList.remove('aberto'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') pop.classList.remove('aberto'); });
    marcarAmostras(lerFundo());
  }

  // ---------- rolagem livre ----------
  var NAO = '.task-card,button,input,select,textarea,a,label,[draggable="true"],[contenteditable],.tc-add,.task-add,.qf-pop';
  function ligarQuadro() {
    var q = document.getElementById('task-board');
    if (!q || q.dataset.rolagemLivre) return;
    q.dataset.rolagemLivre = '1';
    var pegando = false, x0 = 0, s0 = 0, hist = [], anim = 0, moveu = false;
    q.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest(NAO)) return;
      cancelAnimationFrame(anim); pegando = true; moveu = false; x0 = e.clientX; s0 = q.scrollLeft; hist = [[e.clientX, performance.now()]];
    });
    q.addEventListener('pointermove', function (e) {
      if (!pegando) return;
      var dx = e.clientX - x0;
      if (!moveu && Math.abs(dx) < 4) return;
      if (!moveu) { moveu = true; q.classList.add('arrastando'); try { q.setPointerCapture(e.pointerId); } catch (er) {} }
      q.scrollLeft = s0 - dx; hist.push([e.clientX, performance.now()]); if (hist.length > 6) hist.shift();
    });
    function soltar() {
      if (!pegando) return; pegando = false; q.classList.remove('arrastando');
      if (!moveu || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var agora = performance.now(), rec = hist.filter(function (h) { return agora - h[1] < 100; });
      if (rec.length < 2) return; // parou antes de soltar: sem arremesso
      var a = rec[0], b = rec[rec.length - 1], dt = Math.max(1, b[1] - a[1]), v = -(b[0] - a[0]) / dt * 1000;
      var t0 = performance.now(), ini = q.scrollLeft, d = 0.998, alvo = ini + (v / 1000) * d / (1 - d);
      (function passo(t) { var p = Math.min(1, (t - t0) / 650), k = 1 - Math.pow(1 - p, 3); q.scrollLeft = ini + (alvo - ini) * k; if (p < 1) anim = requestAnimationFrame(passo); })(t0);
    }
    q.addEventListener('pointerup', soltar); q.addEventListener('pointercancel', soltar);
    q.addEventListener('wheel', function (e) {
      if (e.target.closest('.task-col') || Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
      var max = q.scrollWidth - q.clientWidth;
      if (max <= 1 || (e.deltaY < 0 && q.scrollLeft <= 0) || (e.deltaY > 0 && q.scrollLeft >= max - 1)) return; // deixa a página rolar
      q.scrollLeft += e.deltaY; e.preventDefault();
    }, { passive: false });
  }

  // ---------- refração nas cápsulas (Liquid Glass) ----------
  var CAPSULAS = '.topbar .tb-search,.topbar .tb-btn.tb-ic,#task-views,#tf-fundo-btn';
  var chrome = /Chrome\//.test(navigator.userAgent); // Chrome e Edge aceitam filtro SVG no backdrop-filter
  var NS = 'http://www.w3.org/2000/svg', defs = null, cache = {};
  function mapa(w, h, r, borda) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var ctx = c.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, ax = Math.max(w / 2 - r, 0), ay = Math.max(h / 2 - r, 0);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var px = x + .5 - w / 2, py = y + .5 - h / 2, qx = Math.max(-ax, Math.min(ax, px)), qy = Math.max(-ay, Math.min(ay, py));
      var vx = px - qx, vy = py - qy, len = Math.hypot(vx, vy) || 1, dist = r - len, ox = 0, oy = 0;
      if (dist >= 0 && dist < borda) { var t = 1 - dist / borda, m = t * t * t; ox = -vx / len * m; oy = -vy / len * m; }
      var i = (y * w + x) * 4; d[i] = 128 + ox * 127; d[i + 1] = 128 + oy * 127; d[i + 2] = 128; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0); return c.toDataURL();
  }
  function refratar(el) {
    if (!chrome || matchMedia('(prefers-reduced-transparency: reduce)').matches) return;
    var b = el.getBoundingClientRect(), w = Math.round(b.width), h = Math.round(b.height);
    if (w < 8 || h < 8) return;
    var chaveTam = w + 'x' + h, id = 'wfa-lg-' + chaveTam;
    if (!defs) {
      var s = document.createElementNS(NS, 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
      s.style.position = 'absolute'; defs = document.createElementNS(NS, 'defs'); s.appendChild(defs); document.body.appendChild(s);
    }
    if (!cache[chaveTam]) {
      var f = document.createElementNS(NS, 'filter');
      f.setAttribute('id', id); f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', w); f.setAttribute('height', h);
      f.setAttribute('filterUnits', 'userSpaceOnUse'); f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = '<feImage href="' + mapa(w, h, Math.min(h / 2, 20), Math.min(16, h * .42)) + '" x="0" y="0" width="' + w + '" height="' + h + '" result="m"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="m" scale="' + Math.min(30, h * .75) + '" xChannelSelector="R" yChannelSelector="G"/>';
      defs.appendChild(f); cache[chaveTam] = 1;
      while (defs.children.length > 16) { var velho = defs.firstChild; delete cache[velho.id.replace('wfa-lg-', '')]; defs.removeChild(velho); }
    }
    el.style.setProperty('backdrop-filter', 'url(#' + id + ') blur(1px) saturate(1.8) brightness(1.05)', 'important');
  }
  var ro = ('ResizeObserver' in window) ? new ResizeObserver(function (es) { es.forEach(function (e) { refratar(e.target); }); }) : null;
  function observarCapsulas() {
    [].forEach.call(document.querySelectorAll(CAPSULAS), function (el) { if (!el.dataset.lg) { el.dataset.lg = '1'; ro ? ro.observe(el) : refratar(el); } });
  }

  // Modo piloto: controle segmentado e botão Fundo vão para a barra do topo; "Mais" e o estado de salvamento
  // vão para a linha de filtros. Os elementos são movidos, não copiados: os cliques do app continuam valendo.
  function modoPiloto() {
    var topo = document.querySelector('.topbar'), vis = document.getElementById('task-views'), fundo = document.getElementById('tf-fundo-btn');
    var direita = topo && topo.querySelector('.tb-right');
    if (topo && vis && vis.parentElement !== topo) topo.insertBefore(vis, direita);
    if (direita && fundo && fundo.parentElement !== direita) {
      var tema = direita.querySelector('.tb-btn.tb-ic');
      direita.insertBefore(fundo, tema ? tema.nextSibling : direita.firstChild);
    }
    var filtros = document.getElementById('tf-filtros'), mais = document.getElementById('tf-mais'), sync = document.getElementById('sync-status');
    if (filtros && mais && mais.parentElement !== filtros) filtros.appendChild(mais);
    if (filtros && sync && sync.parentElement !== filtros) filtros.appendChild(sync);
    var kpis = document.getElementById('tf-kpis');
    if (filtros && kpis && kpis.parentElement !== filtros) filtros.appendChild(kpis);
  }
  window.wfaQuadroModoPiloto = modoPiloto;

  function iniciar() {
    aplicarFundo(lerFundo()); montarBotao(); modoPiloto(); ligarQuadro(); observarCapsulas();
    // o app recria partes da página ao trocar de aba: religa sem duplicar
    var agendado = false;
    new MutationObserver(function () { if (agendado) return; agendado = true; requestAnimationFrame(function () { agendado = false; if (!document.getElementById('tf-fundo-btn')) montarBotao(); modoPiloto(); ligarQuadro(); observarCapsulas(); }); })
      .observe(document.getElementById('page-tarefas') || document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
