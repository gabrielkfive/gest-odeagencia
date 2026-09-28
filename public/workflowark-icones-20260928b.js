/* WorkFlowArk · ícones no lugar de emoji na interface (28/09/2026).
   HIG (icons, sf-symbols, buttons): ícone de interface é símbolo monocromático, de traço e peso consistentes, na cor
   do texto; emoji fica só em conteúdo escrito por gente. SF Symbols não pode ser usado na web (licença da Apple),
   então estes desenhos são próprios, no mesmo espírito: grade 24, traço 1.7, pontas e cantos arredondados.
   Troca só o emoji que ABRE o texto de controles e rótulos (botão, rótulo de campo, cabeçalho de tabela),
   nunca o texto de tarefas, posts ou mensagens. Roda no carregamento e em cada mudança da tela. */
(function () {
  'use strict';
  var P = {
    check: 'M5 12.5l4.5 4.5L19 7.5',
    xmark: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
    play: '<path d="M8 5.8v12.4a.8.8 0 0 0 1.2.7l9.6-6.2a.8.8 0 0 0 0-1.4L9.2 5.1A.8.8 0 0 0 8 5.8z" fill="currentColor" stroke="none"/>',
    pause: 'M9 5.5v13M15 5.5v13',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
    arrowCw: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.2h-4.2',
    arrowCcw: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2',
    paperclip: 'M16.5 7.5l-7.3 7.3a2.2 2.2 0 0 0 3.1 3.1l7.4-7.4a4.2 4.2 0 0 0-6-6l-7.6 7.6a6.2 6.2 0 0 0 8.8 8.8l6-6',
    film: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M8 5v14M16 5v14M3.5 9.7H8M3.5 14.3H8M16 9.7h4.5M16 14.3h4.5"/>',
    video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
    pencil: 'M4.5 19.5l1-4L15.8 5.2a2 2 0 0 1 2.9 0l.1.1a2 2 0 0 1 0 2.9L8.5 18.5z M13.8 7.2l3 3',
    sparkles: 'M11 3.5l1.6 4.6 4.6 1.6-4.6 1.6L11 16l-1.6-4.7L4.8 9.7l4.6-1.6z M18 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
    speaker: 'M4.5 9.5h3.3l4.2-3.7v12.4l-4.2-3.7H4.5z M15.5 9.2a4 4 0 0 1 0 5.6 M18 6.8a7.3 7.3 0 0 1 0 10.4',
    checkCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.3l2.6 2.6 5-5.2"/>',
    heart: 'M12 19.5s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.3c0 5.2-7 9.6-7 9.6z',
    download: 'M12 4.5v10M7.8 10.5l4.2 4.2 4.2-4.2M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16',
    upload: 'M12 15V5M7.8 9.2L12 5l4.2 4.2M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16',
    chart: 'M4.5 19.5h15M7.5 16v-4.5M12 16V8M16.5 16V5.5',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 17.5h2"/>',
    bell: 'M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14z M10.2 20.2a2 2 0 0 0 3.6 0',
    warning: 'M10.3 5.1a2 2 0 0 1 3.4 0l7 12a2 2 0 0 1-1.7 3H5a2 2 0 0 1-1.7-3z M12 10v3.5 M12 16.8h.01',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    clipboard: '<rect x="8.5" y="3.5" width="7" height="3.5" rx="1"/><path d="M8.5 5.2H6.8A1.8 1.8 0 0 0 5 7v12.2A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.8-1.8V7a1.8 1.8 0 0 0-1.8-1.8h-1.7"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    flame: 'M12 20.5a6 6 0 0 0 6-6c0-3.6-2.4-5.8-3.8-8.7-.8 1.9-1.8 2.8-2.9 3.2.2-2-.6-3.8-1.9-5.5-.6 4.2-5.4 6.2-5.4 11a6 6 0 0 0 6 6z',
    link: 'M10.2 13.8a3.8 3.8 0 0 0 5.4 0l3-3a3.8 3.8 0 0 0-5.4-5.4l-1.1 1.1 M13.8 10.2a3.8 3.8 0 0 0-5.4 0l-3 3a3.8 3.8 0 0 0 5.4 5.4l1.1-1.1',
    arrowUpRight: 'M7 17L17 7M9 7h8v8',
    arrowRight: 'M5 12h14M13 6l6 6-6 6',
    arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
    arrowTurn: 'M5 7v4a4 4 0 0 0 4 4h10M15 11l4 4-4 4',
    bulb: 'M9.5 17.5h5M10.5 20.5h3M12 3.5a5.8 5.8 0 0 0-3.4 10.5c.6.5.9 1.1.9 1.8v.2h5v-.2c0-.7.3-1.3.9-1.8A5.8 5.8 0 0 0 12 3.5z',
    doc: 'M7 3.5h6.5L18.5 8.5v12H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z M13.5 3.5v5h5',
    send: 'M20.5 3.5L3.5 10.8l6.8 2.9 2.9 6.8z M10.3 13.7l4.5-4.5',
    photo: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M3.5 16l5-5 4.2 4.2 2.8-2.8 5 5"/><circle cx="15.5" cy="9" r="1.2"/>',
    camera: 'M4 8.5h3l1.6-2.5h6.8L17 8.5h3a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z M12 16.8a3.3 3.3 0 1 0 0-6.6 3.3 3.3 0 0 0 0 6.6z',
    envelope: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
    bubble: 'M5.5 5h13A1.5 1.5 0 0 1 20 6.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V16A1.5 1.5 0 0 1 4 14.5v-8A1.5 1.5 0 0 1 5.5 5z',
    pin: 'M12 20.5s-6-5.3-6-10.5a6 6 0 0 1 12 0c0 5.2-6 10.5-6 10.5z M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4.3l2.8 1.8M9.5 3h5"/>',
    star: 'M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z',
    mic: '<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>',
    wrench: 'M14.7 5.3a4.5 4.5 0 0 0 5 5.9l-8.9 8.9a2.1 2.1 0 0 1-3-3l8.9-8.9a4.5 4.5 0 0 0-2-2.9z',
    list: 'M8.5 6.5h11M8.5 12h11M8.5 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01',
    cart: 'M3.5 4.5h2l2.3 10.5h10.4L20.5 8H6.6 M9.5 19.5h.01M17 19.5h.01',
    scale: 'M12 4.5v15M7 19.5h10M5 7.5h14M5 7.5l-2.5 5.5a2.5 2.5 0 0 0 5 0zM19 7.5l-2.5 5.5a2.5 2.5 0 0 0 5 0z',
    printer: 'M7 9V4.5h10V9 M5.5 9h13A1.5 1.5 0 0 1 20 10.5v5a1.5 1.5 0 0 1-1.5 1.5H17 M7 17H5.5A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9 M7 14h10v6H7z',
    person: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4.5 20.5a7.5 7.5 0 0 1 15 0',
    tag: 'M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.4 1.4 0 0 1 0 2l-6.4 6.4a1.4 1.4 0 0 1-2 0z M8 8h.01',
    flag: 'M5.5 20.5V4.5 M5.5 5h11.5l-2.2 4 2.2 4H5.5',
    building: 'M5 20.5V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5v15 M15 9.5h3A1.5 1.5 0 0 1 19.5 11v9.5 M3.5 20.5h17 M8.5 8h3M8.5 11.5h3M8.5 15h3',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8" fill="currentColor"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    puzzle: 'M10 4.5a2 2 0 0 1 4 0V6h3.5A1.5 1.5 0 0 1 19 7.5V11h-1.5a2 2 0 0 0 0 4H19v3.5a1.5 1.5 0 0 1-1.5 1.5H14v-1.5a2 2 0 0 0-4 0V20H6.5A1.5 1.5 0 0 1 5 18.5V15h1.5a2 2 0 0 0 0-4H5V7.5A1.5 1.5 0 0 1 6.5 6H10z',
    circle: '<circle cx="12" cy="12" r="4.5" fill="currentColor" stroke="none"/>',
    circleOpen: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>',
    trophy: 'M8 4.5h8v5a4 4 0 0 1-8 0z M8 6H4.5v1.5A3 3 0 0 0 8 10.5 M16 6h3.5v1.5A3 3 0 0 1 16 10.5 M12 13.5v3.5 M8.5 20h7l-.5-3h-6z',
    number: 'M9.5 4.5l-2 15M16.5 4.5l-2 15M5 9h14.5M4.5 15h14.5'
  };
  // emoji que abre o texto -> [símbolo, tom opcional]
  var M = {
    '✓': 'check', '✔': 'check', '☑': 'checkCircle', '✅': 'checkCircle', '✕': 'xmark', '✖': 'xmark', '❌': 'xmark',
    '▶': 'play', '⏸': 'pause', '⏹': 'stop', '↻': 'arrowCw', '🔄': 'arrowCw', '↺': 'arrowCcw',
    '📎': 'paperclip', '🎬': 'film', '📹': 'video', '✍': 'pencil', '✎': 'pencil', '🧠': 'sparkles', '✨': 'sparkles', '✦': 'sparkles',
    '🔊': 'speaker', '💾': 'download', '⬇': 'download', '⬆': 'upload', '📈': 'chart', '📊': 'chart', '📲': 'phone', '📱': 'phone',
    '🔔': 'bell', '⚠': 'warning', '📅': 'calendar', '🗓': 'calendar', '📋': 'clipboard', '🌐': 'globe', '🔥': 'flame', '🔗': 'link',
    '↗': 'arrowUpRight', '➜': 'arrowRight', '➤': 'send', '🔜': 'arrowRight', '←': 'arrowLeft', '↪': 'arrowTurn', '💡': 'bulb',
    '📄': 'doc', '🚀': 'send', '📷': 'camera', '🖼': 'photo', '✉': 'envelope', '💬': 'bubble', '📌': 'pin', '📍': 'pin',
    '⏱': 'timer', '🏆': 'trophy', '🏅': 'trophy', '⭐': 'star', '🎙': 'mic', '🛠': 'wrench', '☰': 'list', '🛒': 'cart', '⚖': 'scale',
    '🖨': 'printer', '💚': ['heart', 'var(--green)'], '👤': 'person', '🏷': 'tag', '🚩': ['flag', 'var(--red)'], '🏢': 'building',
    '🎯': 'target', '🧭': 'compass', '🧩': 'puzzle', '◎': 'circleOpen',
    '🟢': ['circle', 'var(--green)'], '🟡': ['circle', 'var(--yel)'], '🔴': ['circle', 'var(--red)'], '⚫': ['circle', 'var(--mute)']
  };
  var chaves = Object.keys(M).sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp('^(\\s*)(' + chaves.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')\\uFE0F?\\s*');
  var ALVO = 'button,label,summary,[role=button],th,h4,.tkl,.tb-btn,.dec-btn,.icobtn,.gbtn,.set-sect-t,.btn,.cc-btn,.set-tab';
  var NS = 'http://www.w3.org/2000/svg';

  function simbolo(nome, tom) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'sfi');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.7');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    var d = P[nome];
    s.innerHTML = d.charAt(0) === '<' ? d : '<path d="' + d + '"/>';
    if (tom) s.style.color = tom;
    return s;
  }
  function trocar(el) {
    if (!el || el.nodeType !== 1 || el.closest('svg')) return;
    var n = el.firstChild;
    while (n && n.nodeType === 3 && !n.nodeValue.trim()) n = n.nextSibling;
    if (!n || n.nodeType !== 3) return;
    var m = n.nodeValue.match(RE);
    if (!m) return;
    var alvo = M[m[2]], nome = Array.isArray(alvo) ? alvo[0] : alvo, tom = Array.isArray(alvo) ? alvo[1] : null;
    n.nodeValue = n.nodeValue.slice(m[0].length);
    el.insertBefore(simbolo(nome, tom), n);
    if (!n.nodeValue) n.nodeValue = '';
  }
  function varrer(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    if (raiz.matches && raiz.matches(ALVO)) trocar(raiz);
    var l = raiz.querySelectorAll ? raiz.querySelectorAll(ALVO) : [];
    for (var i = 0; i < l.length; i++) trocar(l[i]);
  }
  var pend = [], agendado = false;
  function processar() {
    agendado = false; var lote = pend; pend = [];
    for (var i = 0; i < lote.length; i++) varrer(lote[i]);
  }
  function iniciar() {
    varrer(document.body);
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') { if (m.target.parentElement) pend.push(m.target.parentElement); }
        else for (var j = 0; j < m.addedNodes.length; j++) { var a = m.addedNodes[j]; pend.push(a.nodeType === 1 ? a : a.parentElement); }
      }
      if (pend.length && !agendado) { agendado = true; requestAnimationFrame(processar); }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  window.wfaIconeTrocar = varrer;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
