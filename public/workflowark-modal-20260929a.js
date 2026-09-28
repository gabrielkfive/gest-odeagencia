/* WorkFlowArk · modal do cartão salva sozinho, estilo Trello (pedido do Gabriel, 28/09/2026).
   A equipe usa o Chrome em 100% a 110% em tela pequena e precisava rolar até o Salvar.
   O modal já tinha salvamento automático com atraso de 1,2 s (workflowark-app, bloco AUTOSAVE de 10/09).
   Esta camada completa o comportamento do Trello sem mexer no app:
   - escolha pontual (status, prazo, prioridade, pessoa, etiqueta, checklist) grava na hora;
   - texto (título, descrição, campos) grava ao sair do campo; enquanto digita, segue o atraso de 1,2 s;
   - tarefa existente não mostra Salvar; o indicador "Salvo" sobe para o alto do modal;
   - tarefa nova continua nascendo só no Salvar (senão clique fora criaria cartão solto).
   Teste: python deploy/teste-modal-autosave.py */
(function () {
  'use strict';
  var CLIQUES = '#tk-resps,#tk-cl,#tk-papeis,#tk-anx,[data-anxadd],[data-cmtadd],[data-tkconcluir],[data-ppnovo]';

  function modal() { return document.getElementById('pj-modal'); }
  function aberto(m) { return !!(m && m.style.display !== 'none' && typeof m._tkAutosave === 'function'); }
  function ehNova(m) { return !m.querySelector('[data-tkdel]'); }
  function salvarJa(m) {
    if (!aberto(m) || ehNova(m)) return;
    m._sujo = true;
    try { m._tkAutosave(); } catch (e) {}
  }

  // escolha pontual e saída de campo de texto: o evento change do navegador cobre os dois
  document.addEventListener('change', function (e) {
    var m = modal(); if (!m || !m.contains(e.target)) return;
    setTimeout(function () { salvarJa(m); }, 0);
  });
  // descrição e textos longos: grava ao sair do campo mesmo se o change não disparar
  document.addEventListener('focusout', function (e) {
    var m = modal(); if (!m || !m.contains(e.target) || !/^(TEXTAREA|INPUT)$/.test(e.target.tagName)) return;
    if (m._sujo) setTimeout(function () { salvarJa(m); }, 0);
  });
  // ações por clique (pessoa, checklist, etiqueta, anexo, comentário): grava logo depois que o app atualiza a tela
  document.addEventListener('click', function (e) {
    var m = modal(); if (!m || !m.contains(e.target) || !e.target.closest(CLIQUES)) return;
    setTimeout(function () { if (m._sujo) salvarJa(m); }, 80);
  });

  // indicador no alto do modal, visível sem rolar. O app reescreve partes do cabeçalho quando o status muda,
  // então a pílula é própria, fica na linha do topo antes do botão de fechar e copia o texto do indicador do app.
  function arrumarIndicador(m) {
    var topo = m.querySelector('.tktopo'), x = topo && topo.querySelector('.tkx'); if (!topo) return;
    var pilula = topo.querySelector('.tk-salvo-alto');
    if (ehNova(m)) { if (pilula) pilula.remove(); return; }
    if (!pilula) {
      pilula = document.createElement('span');
      pilula.className = 'tk-salvo-alto'; pilula.setAttribute('role', 'status'); pilula.setAttribute('aria-live', 'polite');
      topo.insertBefore(pilula, x || null);
    }
    var app = m.querySelector('#tk-autosave'), txt = app ? app.textContent.trim() : '';
    pilula.textContent = txt || 'Salvo automaticamente';
    pilula.classList.toggle('pendente', /pendente|Salvando/i.test(txt));
    pilula.classList.toggle('erro', /Não salvou/i.test(txt));
  }
  // o modal nasce na primeira abertura: observa a criação dele e cada nova abertura
  var ligado = null;
  function ligar(m) {
    if (!m || ligado === m) return;
    ligado = m;
    var pend = false;
    new MutationObserver(function () { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; if (aberto(m)) arrumarIndicador(m); }); })
      .observe(m, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style'] });
    setTimeout(function () { if (aberto(m)) arrumarIndicador(m); }, 0);
  }
  function observar() {
    ligar(modal());
    new MutationObserver(function () { var m = modal(); if (m && m !== ligado) ligar(m); }).observe(document.body, { childList: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar); else observar();
})();
