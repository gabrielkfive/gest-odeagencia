/* ============ WorkFlowArk · modo agência (23/09/2026) ============
   Para o dono de OUTRA agência que usa o sistema na instância dele. Pedido do Gabriel no
   áudio de 23/09: colocar nome e logo, cadastrar clientes e equipe sozinho, ser guiado no
   primeiro acesso e não ver nada que é da ARK.

   Liga sozinho em qualquer domínio que não seja o da ARK. No domínio da ARK só liga com
   ?agencia=1 (demonstração) e desliga com ?agencia=0. Na ARK, com o modo desligado, este
   arquivo não muda nada: não esconde aba, não troca texto, não mostra painel.

   Núcleo puro em window.WFA_AGENCIA (testado em deploy/teste-agencia.mjs). A parte de tela
   só roda no navegador. */
(function (W) {
  "use strict";

  var HOSTS_ARK = ["workflowark.arkcontent.workers.dev", "localhost", "127.0.0.1", ""]; // "" = arquivo aberto direto (file://)
  var NOMES_ARK = ["ark content", "ark", "workflowark"];

  function hostDaArk(host) {
    host = String(host || "").toLowerCase();
    return HOSTS_ARK.indexOf(host) >= 0 || /-workflowark\.arkcontent\.workers\.dev$/.test(host); // prévias de versão
  }

  function decidirModo(o) {
    var busca = String((o && o.busca) || "");
    var m = busca.match(/[?&]agencia=([01])/);
    if (m) return m[1] === "1" ? "agencia" : "ark";
    var salvo = o && o.salvo;
    if (salvo === "agencia" || salvo === "ark") return salvo;
    return hostDaArk(o && o.host) ? "ark" : "agencia";
  }

  function logoValido(v) {
    v = String(v || "").trim();
    return /^https:\/\//.test(v) || /^\/[^/]/.test(v) || /^data:image\/(png|jpeg|webp|svg\+xml|gif);/.test(v);
  }

  function passos(o) {
    var marca = (o && o.marca) || {};
    var nome = String(marca.name || "").trim();
    var marcaFeita = !!nome && NOMES_ARK.indexOf(nome.toLowerCase()) < 0 &&
      logoValido(marca.logo) && !/ark-(mark|logo)\.png$/.test(String(marca.logo));
    var clientes = ((o && o.clientes) || []).filter(function (c) { return c && c.id !== "ark"; });
    var membros = (o && o.membros) || [];
    var tarefas = ((o && o.tarefas) || []).filter(function (t) { return t && !t._ex; });
    return [
      { id: "marca", titulo: "Nome e logo da agência", texto: "Sua marca na barra lateral e na tela de entrada.", feito: marcaFeita },
      { id: "cliente", titulo: "Primeiro cliente", texto: "Cadastre um cliente da sua carteira.", feito: clientes.length >= 1 },
      { id: "equipe", titulo: "Convidar a equipe", texto: "Chame quem trabalha com você pelo e-mail.", feito: membros.length >= 2 },
      { id: "tarefa", titulo: "Primeira tarefa", texto: "Crie a primeira entrega e escolha o responsável.", feito: tarefas.length >= 1 },
    ];
  }

  function progresso(lista) {
    var feitos = lista.filter(function (p) { return p.feito; }).length;
    return { feitos: feitos, total: lista.length, completo: feitos === lista.length };
  }

  function abasOcultas(modo) {
    // chat: a equipe relatou que não salva; alpha: operação parceira da ARK;
    // whatsapp: depende do número e da Evolution da ARK.
    return modo === "agencia" ? ["chat", "alpha", "whatsapp"] : [];
  }

  function sementesDaArk() {
    return ["wfaSeedClientesV1", "wfaSeedRotinasV1", "seedValhalla", "seedSamuel", "seedProcessos",
      "saneamentoCarteira", "migraNomesEquipe", "wfaSeedHistoricoCob", "wfaLimpezaConselhoV1"];
  }

  // tira da lista só os ids EXATOS dos dados de exemplo da ARK; o que a agência criou fica
  function semSementes(lista, ids) {
    if (!Array.isArray(lista)) return [];
    var fora = {};
    (ids || []).forEach(function (i) { fora[i] = 1; });
    return lista.filter(function (x) { return !(x && fora[x.id]); });
  }

  // jornada: { sprint: [ids de cliente] } fica só com os clientes que existem na agência
  function jornadaSo(j, validos) {
    var ok = {}, out = {};
    (validos || []).forEach(function (i) { ok[i] = 1; });
    if (!j || typeof j !== "object" || Array.isArray(j)) return out;
    Object.keys(j).forEach(function (k) { out[k] = Array.isArray(j[k]) ? j[k].filter(function (i) { return ok[i]; }) : []; });
    return out;
  }
  // agenda semeada da ARK usa ids com prefixo do mês (ago26-, set26-)
  function idDeExemploDaArk(id) { return /^(jul|ago|set|out|nov|dez)\d{2}-/.test(String(id || "")); }


  /* ---- marca da agência: "agência do Zé" vira WorkFlowZé (mesma regra de src/lib/marca-agencia.js) ---- */
  var GENERICAS = ["agencia", "digital", "marketing", "mkt", "comunicacao", "studio", "estudio", "content",
    "conteudo", "criativa", "criativo", "publicidade", "propaganda", "midia", "media", "social", "ltda", "me",
    "eireli", "grupo", "company", "co", "do", "da", "de", "dos", "das", "e", "&", "the"];
  function semAcento(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function capitaliza(p) { return p ? p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR") : ""; }
  function nomeCurto(marca) {
    var m = marca || {};
    var curto = String(m.short || "").trim();
    if (curto) return curto.slice(0, 13);
    var palavras = String(m.name || "").replace(/[.,;:!?()"'\/\\]/g, " ").split(/\s+/).filter(Boolean);
    if (!palavras.length) return "";
    var uteis = palavras.filter(function (p) { return GENERICAS.indexOf(semAcento(p)) < 0; });
    return capitaliza((uteis[0] || palavras[0]).slice(0, 13));
  }
  function nomeProduto(marca) {
    var c = nomeCurto(marca);
    if (!c || semAcento(c) === "ark") return "WorkFlowArk";
    return "WorkFlow" + c;
  }
  function luminancia(hex) {
    var n = parseInt(hex.slice(1), 16);
    function canal(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  }
  function corAceita(hex) { return /^#[0-9a-f]{6}$/i.test(String(hex || "")) && luminancia(hex) >= 0.12; }
  function corSobre(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(String(hex || ""))) return "#111111";
    var l = luminancia(hex);
    return (l + 0.05) / (0.0056 + 0.05) >= 1.05 / (l + 0.05) ? "#111111" : "#ffffff";
  }

  /* ---- planilha de clientes: CSV, ponto e vírgula do Excel brasileiro ou colado com tab ---- */
  function separador(linha) {
    if (linha.indexOf("\t") >= 0) return "\t";
    var pv = (linha.match(/;/g) || []).length, vg = (linha.match(/,/g) || []).length;
    return pv >= vg && pv > 0 ? ";" : (vg > 0 ? "," : ";");
  }
  function quebrarLinha(linha, sep) {
    var out = [], cur = "", aspas = false;
    for (var i = 0; i < linha.length; i++) {
      var ch = linha[i];
      if (ch === '"') { if (aspas && linha[i + 1] === '"') { cur += '"'; i++; } else aspas = !aspas; }
      else if (ch === sep && !aspas) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(function (c) { return c.trim(); });
  }
  function lerPlanilha(texto) {
    var linhas = String(texto || "").replace(/^﻿/, "").split(/\r?\n/).filter(function (l) { return l.replace(/[;,\t\s]/g, "") !== ""; });
    if (!linhas.length) return { cabecalho: null, linhas: [] };
    var sep = separador(linhas[0]);
    var rows = linhas.map(function (l) { return quebrarLinha(l, sep); });
    var chaves = { nome: /^(cliente|nome|empresa|razao|marca)/, valor: /(valor|mensal|fee|preco)/, tipo: /^(tipo|plano|modelo|contrato)/, instagram: /(instagram|insta|@)/, contato: /(contato|responsavel|telefone|whats)/ };
    var cab = null, h = rows[0].map(semAcento);
    var mapa = {};
    Object.keys(chaves).forEach(function (k) { h.forEach(function (c, i) { if (mapa[k] == null && chaves[k].test(c)) mapa[k] = i; }); });
    if (mapa.nome != null) { cab = mapa; rows = rows.slice(1); }
    return { cabecalho: cab, linhas: rows };
  }
  function valorReais(v) {
    v = String(v || "").replace(/r\$|\s/gi, "");
    if (!v) return 0;
    if (v.indexOf(",") >= 0) v = v.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  function chaveNome(nm) { return semAcento(nm).replace(/\s+/g, " ").trim(); }
  function clientesDaPlanilha(texto, existentes) {
    var p = lerPlanilha(texto), c = p.cabecalho || { nome: 0 };
    var vistos = {};
    (existentes || []).forEach(function (e) { if (e && e.nm) vistos[chaveNome(e.nm)] = 1; });
    var out = [];
    p.linhas.forEach(function (r) {
      var nm = String(r[c.nome] || "").trim();
      if (!nm) return;
      var tipoTxt = c.tipo != null ? semAcento(r[c.tipo]) : "";
      var meta = [c.instagram != null ? r[c.instagram] : "", c.contato != null ? r[c.contato] : ""].filter(Boolean).join(" · ");
      var k = chaveNome(nm);
      out.push({ nm: nm, valor: c.valor != null ? valorReais(r[c.valor]) : 0, tipo: /(pre|pacote|avulso)/.test(tipoTxt) ? "Alpha" : "ARK", meta: meta, repetido: !!vistos[k] });
      vistos[k] = 1;
    });
    return out;
  }
  function modeloCsv() { return "Cliente;Valor mensal;Tipo;Instagram\nCliente exemplo;;Mensal;@cliente\n"; }

  var A = { nomeCurto: nomeCurto, nomeProduto: nomeProduto, corAceita: corAceita, corSobre: corSobre, lerPlanilha: lerPlanilha, clientesDaPlanilha: clientesDaPlanilha, modeloCsv: modeloCsv, valorReais: valorReais,
    jornadaSo: jornadaSo, idDeExemploDaArk: idDeExemploDaArk, hostDaArk: hostDaArk, semSementes: semSementes, decidirModo: decidirModo, passos: passos, progresso: progresso, abasOcultas: abasOcultas,
    sementesDaArk: sementesDaArk, logoValido: logoValido };
  W.WFA_AGENCIA = A;

  if (typeof document === "undefined") return; // teste em node: só o núcleo

  /* ---------------- modo ---------------- */
  var salvo = null;
  try { salvo = localStorage.getItem("wfa-modo"); } catch (e) {}
  var MODO = decidirModo({ host: location.hostname, busca: location.search, salvo: salvo });
  try {
    var mq = location.search.match(/[?&]agencia=([01])/);
    if (mq) localStorage.setItem("wfa-modo", mq[1] === "1" ? "agencia" : "ark");
  } catch (e) {}
  A.modo = MODO;
  document.documentElement.setAttribute("data-wfa-modo", MODO);
  if (MODO !== "agencia") return; // ARK: nada muda daqui pra baixo

  /* ---------------- o que é da ARK sai ----------------
     Só na instância da agência (domínio que não é da ARK). Na demonstração com ?agencia=1 no
     domínio da ARK, nenhum dado é tocado: só a tela muda. Roda antes do boot da nuvem, então
     nada disso chega a subir para a base nova. */
  if (!hostDaArk(location.hostname)) {
    sementesDaArk().forEach(function (n) { W[n] = function () {}; });
    try {
      var tira = function (chave, ids) {
        var cru = localStorage.getItem(chave); if (!cru) return;
        var l = JSON.parse(cru); if (!Array.isArray(l)) return;
        var n = semSementes(l, ids); if (n.length !== l.length) localStorage.setItem(chave, JSON.stringify(n));
      };
      var idsTarefa = ["seed1", "seed2", "seed3", "seed4", "seed5", "seed6", "seed7", "seed8", "seed9"];
      if (typeof state !== "undefined" && state && Array.isArray(state.tarefas)) state.tarefas = semSementes(state.tarefas, idsTarefa);
      tira("wfa-tarefas", idsTarefa);
      try {
        var ag = JSON.parse(localStorage.getItem("wfa-agenda-events") || "null");
        if (Array.isArray(ag)) {
          var ag2 = ag.filter(function (e) { return !(e && idDeExemploDaArk(e.id)); });
          if (ag2.length !== ag.length) localStorage.setItem("wfa-agenda-events", JSON.stringify(ag2));
        }
      } catch (e) {}
      if (typeof AGENDA_INITIAL_EVENTS !== "undefined") {
        tira("wfa-agenda-events", AGENDA_INITIAL_EVENTS.map(function (e) { return e.id; }));
        AGENDA_INITIAL_EVENTS.splice(0);
      }
      if (typeof ALPHA_SEED !== "undefined") {
        tira("wfa-alpha", ALPHA_SEED.map(function (e) { return e.id; }));
        ALPHA_SEED.splice(0);
      }
      if (typeof CLIENTES_BASE !== "undefined") {
        CLIENTES_BASE.splice(1); // fica só o cliente interno (a própria agência)
        if (typeof rebuildClientes === "function") rebuildClientes();
      }
      try {
        var jo = JSON.parse(localStorage.getItem("wfa-jornada") || "null");
        if (jo && typeof CLIENTES !== "undefined") {
          var jo2 = jornadaSo(jo, CLIENTES.map(function (c) { return c.id; }));
          if (JSON.stringify(jo2) !== JSON.stringify(jo)) localStorage.setItem("wfa-jornada", JSON.stringify(jo2));
        }
      } catch (e) {}
      if (typeof MD_PEOPLE_BASE !== "undefined") {
        MD_PEOPLE_BASE.splice(0);
        if (typeof rebuildPeople === "function") rebuildPeople();
      }
    } catch (e) { console.warn("[agencia] limpeza dos exemplos da ARK", e); }
  }

  var css = document.createElement("style");
  css.textContent =
    abasOcultas(MODO).map(function (n) { return '[data-nav="' + n + '"]'; }).join(",") +
    ',.subitem[onclick*="/paginas"]{display:none!important}' +
    "body{--agx-bg:#ffffff;--agx-ink:#141414;--agx-line:#e4e4e8;--agx-mute:#6b6b73;--agx-hover:#f3f3f5}" +
    "body.aura-dark{--agx-bg:#151515;--agx-ink:#f4f4f4;--agx-line:#2c2c2c;--agx-mute:#9a9aa2;--agx-hover:#1f1f1f}" +
    ".agx-card{position:fixed;right:20px;bottom:92px;max-height:calc(100vh - 120px);overflow:auto;z-index:40;width:340px;max-width:calc(100vw - 24px);background:var(--agx-bg);color:var(--agx-ink);border:1px solid var(--agx-line);border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.28);font-size:13px;overflow:hidden}" +
    ".agx-head{display:flex;align-items:center;gap:10px;padding:14px 16px 10px}" +
    ".agx-head b{font-size:14px;font-weight:700;flex:1}" +
    ".agx-head button{background:none;border:0;color:var(--agx-mute);cursor:pointer;font-size:12px;padding:4px 6px;border-radius:6px}" +
    ".agx-head button:hover{color:var(--agx-ink);background:var(--agx-line)}" +
    ".agx-bar{height:4px;margin:0 16px 8px;background:var(--agx-line);border-radius:4px;overflow:hidden}" +
    ".agx-bar i{display:block;height:100%;background:var(--yel,#FFC700);transition:width .4s ease}" +
    ".agx-list{padding:4px 8px 10px}" +
    ".agx-row{display:grid;grid-template-columns:22px 1fr auto;gap:10px;align-items:start;padding:9px 8px;border-radius:10px}" +
    ".agx-row:hover{background:var(--agx-hover)}" +
    ".agx-ok{width:20px;height:20px;border-radius:50%;border:1.5px solid var(--agx-mute);display:flex;align-items:center;justify-content:center;margin-top:1px}" +
    ".agx-row.feito .agx-ok{background:var(--yel,#FFC700);border-color:var(--yel,#FFC700);color:#111}" +
    ".agx-row.feito .agx-t{text-decoration:line-through;color:var(--agx-mute)}" +
    ".agx-t{font-weight:600;line-height:1.3}.agx-d{color:var(--agx-mute);font-size:12px;line-height:1.4;margin-top:2px}" +
    ".agx-onde{background:none;border:0;padding:0;margin-top:4px;color:var(--agx-mute);font-size:11.5px;text-decoration:underline;cursor:pointer}" +
    ".agx-go{background:var(--yel,#FFC700);color:#111;border:0;border-radius:8px;padding:6px 11px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}" +
    ".agx-ia{margin:0 16px 14px;padding:10px 12px;border:1px dashed var(--agx-line);border-radius:10px;font-size:12px;color:var(--agx-mute)}" +
    ".agx-ia summary{cursor:pointer;color:var(--agx-ink);font-weight:600}.agx-ia ol{margin:8px 0 0 16px;padding:0;line-height:1.55}" +
    ".agx-pill{position:fixed;right:20px;bottom:92px;z-index:40;background:var(--agx-bg);color:var(--agx-ink);border:1px solid var(--agx-line);border-radius:999px;padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 10px 30px rgba(0,0,0,.25)}" +
    ".agx-pill i{font-style:normal;color:var(--yel,#FFC700);margin-left:6px}" +
    ".agx-spot{position:fixed;z-index:1400;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,.58);pointer-events:none;transition:all .25s ease;outline:2px solid var(--yel,#FFC700);outline-offset:3px}" +
    ".agx-tip{position:fixed;z-index:1401;width:280px;max-width:calc(100vw - 24px);background:var(--agx-bg);color:var(--agx-ink);border:1px solid var(--agx-line);border-radius:14px;padding:14px 16px;font-size:13px;line-height:1.5;box-shadow:0 18px 48px rgba(0,0,0,.35)}" +
    ".agx-tip b{display:block;font-size:14px;margin-bottom:4px}.agx-tip .agx-acts{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}" +
    ".agx-sec{background:none;border:1px solid var(--agx-line);color:var(--agx-ink);border-radius:8px;padding:6px 11px;font-size:12px;cursor:pointer}" +
    ".agx-wel{position:fixed;inset:0;z-index:1500;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}" +
    ".agx-wel>div{width:440px;max-width:100%;background:var(--agx-bg);color:var(--agx-ink);border:1px solid var(--agx-line);border-radius:20px;padding:28px 26px 22px;box-shadow:0 30px 80px rgba(0,0,0,.4)}" +
    ".agx-wel h2{margin:0 0 8px;font-size:22px;line-height:1.2;font-weight:800}.agx-wel p{margin:0 0 18px;color:var(--agx-mute);line-height:1.55;font-size:14px}" +
    ".agx-wel ol{margin:0 0 20px 18px;padding:0;line-height:1.8;font-size:13.5px}" +
    ".agx-wel .agx-acts{display:flex;gap:10px;justify-content:flex-end}.agx-wel .agx-go{padding:10px 18px;font-size:13.5px}" +
    "@media (max-width:640px){.agx-card{right:12px;left:12px;bottom:84px;width:auto;max-height:62vh;overflow:auto}.agx-pill{right:12px;bottom:84px}}";
  document.head.appendChild(css);

  function lsJson(k, pad) { try { return JSON.parse(localStorage.getItem(k) || "null") || pad; } catch (e) { return pad; } }
  function membroId() { try { return (typeof WFA_MEMBER !== "undefined" && WFA_MEMBER && WFA_MEMBER.id) || "anon"; } catch (e) { return "anon"; } }
  function estadoAtual() {
    var cl = [], mb = [], tf = [];
    try { cl = typeof CLIENTES !== "undefined" ? CLIENTES : []; } catch (e) {}
    try { mb = typeof WFA_MEMBERS !== "undefined" ? WFA_MEMBERS : []; } catch (e) {}
    try { tf = (typeof state !== "undefined" && state && state.tarefas) || []; } catch (e) {}
    return { marca: lsJson("wfa-brand", {}), clientes: cl, membros: mb, tarefas: tf };
  }
  function nomeAgencia() { var m = lsJson("wfa-brand", {}); return (m.name || "").trim() || "Minha agência"; }

  /* textos que falam da ARK viram textos da agência */
  function ajustarTextos() {
    try {
      if (typeof CLIENTES_BASE !== "undefined" && CLIENTES_BASE[0] && CLIENTES_BASE[0].id === "ark") {
        CLIENTES_BASE[0].nm = nomeAgencia();
        CLIENTES_BASE[0].meta = "Tarefas internas da agência";
        if (typeof rebuildClientes === "function") rebuildClientes();
      }
    } catch (e) {}
    var tipo = document.getElementById("cli-f-tipo");
    if (tipo) {
      [].forEach.call(tipo.options, function (op) {
        if (op.value === "ARK") op.textContent = "Mensal (cobrança todo mês)";
        if (op.value === "Alpha") op.textContent = "Pré pago (pacote fechado)";
      });
    }
    var bn = document.getElementById("brand-name");
    if (bn) bn.setAttribute("placeholder", "Nome da sua agência");
  }

  /* nome da agência no lugar de "ARK Content" e sem o "Senhor" do JARVIS da ARK */
  function ajustarTela() {
    var nome = nomeAgencia();
    var nm = document.querySelector(".brand-info .nm");
    if (nm && !(lsJson("wfa-brand", {}).name)) nm.textContent = nome;
    [].forEach.call(document.querySelectorAll(".eyebrow,#side-rl"), function (e) {
      if (e.textContent.indexOf("ARK Content") >= 0) e.textContent = e.textContent.replace("ARK Content", nome);
    });
    [].forEach.call(document.querySelectorAll(".aura-saud"), function (e) {
      if (e.textContent.indexOf(", Senhor") >= 0) e.textContent = e.textContent.replace(", Senhor", "");
    });
    var pg = document.getElementById("page-dashboard");
    if (pg && document.createTreeWalker) {
      var tw = document.createTreeWalker(pg, NodeFilter.SHOW_TEXT), n;
      while ((n = tw.nextNode())) if (n.nodeValue.indexOf(", Senhor") >= 0) n.nodeValue = n.nodeValue.replace(/, Senhor/g, "");
    }
  }
  function redesenhar() {
    try { if (typeof renderMeuDia === "function") renderMeuDia(); } catch (e) {}
    try { if (typeof updateBadges === "function") updateBadges(); } catch (e) {}
    try { if (typeof updateCrmBadge === "function") updateCrmBadge(); } catch (e) {}
    // o herói do Meu Dia só recalcula no clique de navegação (ou a cada minuto); um clique
    // num marcador vazio com data-subnav dispara só esse recálculo, sem trocar de página
    try {
      var gat = document.createElement("i"); gat.setAttribute("data-subnav", ""); gat.style.display = "none";
      document.body.appendChild(gat); gat.dispatchEvent(new MouseEvent("click", { bubbles: true })); gat.remove();
    } catch (e) {}
    ajustarTela();
    setTimeout(ajustarTela, 400); // o herói reescreve a saudação no quadro seguinte
  }

  /* ---------------- logo por arquivo ---------------- */
  function reduzirImagem(arquivo, feito) {
    var fr = new FileReader();
    fr.onload = function () {
      if (/svg/.test(arquivo.type)) { feito(fr.result); return; }
      var img = new Image();
      img.onload = function () {
        var lado = 256, e = Math.min(1, lado / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * e); c.height = Math.round(img.height * e);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        feito(c.toDataURL("image/png"));
      };
      img.onerror = function () { if (typeof toast === "function") toast("Não consegui ler essa imagem. Tente PNG ou JPG."); };
      img.src = fr.result;
    };
    fr.readAsDataURL(arquivo);
  }
  function montarEnvioLogo() {
    var campo = document.getElementById("brand-logo");
    if (!campo || document.getElementById("agx-logo-file")) return;
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/png,image/jpeg,image/webp,image/svg+xml"; inp.id = "agx-logo-file"; inp.style.display = "none";
    var bt = document.createElement("button");
    bt.type = "button"; bt.className = "icobtn"; bt.textContent = "Enviar logo do computador";
    bt.style.marginTop = "6px";
    bt.onclick = function () { inp.click(); };
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      if (f.size > 3 * 1024 * 1024) { if (typeof toast === "function") toast("Imagem acima de 3 MB. Use uma menor."); return; }
      reduzirImagem(f, function (url) {
        campo.value = url;
        if (typeof brandLogoPreview === "function") brandLogoPreview();
        if (typeof toast === "function") toast("Logo carregado. Clique em Aplicar marca.");
      });
    };
    campo.parentNode.appendChild(bt); campo.parentNode.appendChild(inp);
  }
  // aceita a imagem vinda do computador (data:image), que o salvar original recusava
  W.saveBrand = function () {
    var name = ((document.getElementById("brand-name") || {}).value || "").trim();
    var color = (document.getElementById("brand-color") || {}).value || "#FFC700";
    var logo = ((document.getElementById("brand-logo") || {}).value || "").trim();
    if (logo && !logoValido(logo)) { if (typeof toast === "function") toast("O logo precisa ser uma imagem enviada ou um endereço https://"); return; }
    try { localStorage.setItem("wfa-brand", JSON.stringify({ name: name, color: color, logo: logo })); }
    catch (e) { if (typeof toast === "function") toast("Imagem grande demais para salvar. Use uma menor."); return; }
    if (typeof applyBrand === "function") applyBrand();
    ajustarTextos();
    if (typeof toast === "function") toast("Marca aplicada ✓");
    renderCard();
  };

  /* ---------------- destaque na tela (onde fica) ---------------- */
  var ALVOS = {
    marca: { sel: ".brand-mark", t: "Sua marca", d: "Nome, cor e logo ficam em Configurações, aba Conta, bloco Marca. Aparecem aqui e na tela de entrada." },
    cliente: { sel: '#clientes-menu [data-nav="lista-clientes"]', t: "Seus clientes", d: "Em Clientes, Lista de Clientes, use o botão Novo cliente. Clique no cartão para abrir a ficha completa." },
    equipe: { sel: '[onclick="openSettings()"]', t: "Sua equipe", d: "Em Configurações, aba Equipe, digite o e-mail da pessoa e o papel. Ela entra com esse e-mail." },
    tarefa: { sel: 'button[onclick="openNovaTarefa()"]', t: "Suas tarefas", d: "O botão Nova tarefa fica sempre no topo. Escolha cliente, responsável e prazo." },
  };
  var spot = null, tip = null;
  function fecharDestaque() { if (spot) spot.remove(); if (tip) tip.remove(); spot = tip = null; }
  function visivel(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function mostrarOnde(id, depois) {
    fecharDestaque();
    var a = ALVOS[id]; if (!a) return;
    var el = document.querySelector(a.sel);
    if (!visivel(el) && window.innerWidth <= 900 && typeof toggleSide === "function") { try { toggleSide(true); } catch (e) {} }
    if (id === "cliente") { var g = document.getElementById("clientes-menu"); if (g && !g.classList.contains("open")) g.classList.add("open"); }
    setTimeout(function () {
      el = document.querySelector(a.sel);
      tip = document.createElement("div"); tip.className = "agx-tip";
      tip.innerHTML = "<b></b><span></span><div class='agx-acts'><button class='agx-sec' data-a='ok'>Entendi</button><button class='agx-go' data-a='ir'>Fazer agora</button></div>";
      tip.querySelector("b").textContent = a.t; tip.querySelector("span").textContent = a.d;
      document.body.appendChild(tip);
      if (visivel(el)) {
        el.scrollIntoView({ block: "nearest" });
        var r = el.getBoundingClientRect();
        spot = document.createElement("div"); spot.className = "agx-spot";
        spot.style.left = r.left - 6 + "px"; spot.style.top = r.top - 6 + "px";
        spot.style.width = r.width + 12 + "px"; spot.style.height = r.height + 12 + "px";
        document.body.appendChild(spot);
        var tw = 280, x = r.right + 16, y = r.top;
        if (x + tw > window.innerWidth - 12) x = Math.max(12, r.left - tw - 16);
        if (x < 12 || window.innerWidth < 640) { x = 12; y = r.bottom + 14; }
        tip.style.left = x + "px"; tip.style.top = Math.min(y, window.innerHeight - tip.offsetHeight - 12) + "px";
      } else {
        tip.style.left = "50%"; tip.style.top = "30%"; tip.style.transform = "translateX(-50%)";
      }
      tip.onclick = function (ev) {
        var b = ev.target.closest("button"); if (!b) return;
        fecharDestaque();
        if (b.getAttribute("data-a") === "ir") fazer(id); else if (depois) depois();
      };
    }, 260);
  }

  function clicarNav(n) { var e = document.querySelector('[data-nav="' + n + '"]'); if (e) e.click(); }
  function fazer(id) {
    if (window.innerWidth <= 900 && typeof toggleSide === "function") { try { toggleSide(false); } catch (e) {} }
    if (id === "marca") { if (typeof openSettings === "function") { openSettings(); if (typeof setTab === "function") setTab("conta"); } setTimeout(montarEnvioLogo, 100); }
    if (id === "cliente") { clicarNav("lista-clientes"); setTimeout(function () { if (typeof cliNovoOpen === "function") cliNovoOpen(); }, 250); }
    if (id === "equipe") { if (typeof openSettings === "function") { openSettings(); if (typeof setTab === "function") setTab("equipe"); } }
    if (id === "tarefa") { if (typeof openNovaTarefa === "function") openNovaTarefa(); }
  }
  function tour() {
    var ordem = ["marca", "cliente", "equipe", "tarefa"], i = 0;
    (function prox() { if (i < ordem.length) mostrarOnde(ordem[i++], prox); })();
  }

  /* ---------------- cartão Primeiros passos ---------------- */
  var CHAVE_FECHADO = "wfa-agencia-passos-fechado", CHAVE_MIN = "wfa-agencia-passos-min";
  var card = null;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function renderCard() {
    if (localStorage.getItem(CHAVE_FECHADO) === "1") { if (card) card.remove(); card = null; return; }
    var lista = passos(estadoAtual()), pr = progresso(lista);
    var min = localStorage.getItem(CHAVE_MIN) === "1";
    if (!card) { card = document.createElement("div"); document.body.appendChild(card); card.addEventListener("click", clique); }
    card.setAttribute("data-agx", "passos");
    if (min) {
      card.className = "agx-pill";
      card.innerHTML = "Primeiros passos<i>" + pr.feitos + " de " + pr.total + "</i>";
      return;
    }
    card.className = "agx-card";
    card.innerHTML =
      "<div class='agx-head'><b>" + (pr.completo ? "Tudo pronto" : "Primeiros passos") + "</b>" +
      "<button data-a='tour' title='Mostrar onde fica cada coisa'>Tour</button>" +
      "<button data-a='min' title='Minimizar'>Minimizar</button>" +
      (pr.completo ? "<button data-a='fechar'>Fechar</button>" : "") + "</div>" +
      "<div class='agx-bar'><i style='width:" + Math.round((pr.feitos / pr.total) * 100) + "%'></i></div>" +
      "<div class='agx-list'>" + lista.map(function (p) {
        return "<div class='agx-row" + (p.feito ? " feito" : "") + "'><div class='agx-ok'>" + (p.feito ? "✓" : "") + "</div>" +
          "<div><div class='agx-t'>" + esc(p.titulo) + "</div><div class='agx-d'>" + esc(p.texto) + "</div>" +
          "<button class='agx-onde' data-onde='" + p.id + "'>Onde fica</button></div>" +
          (p.feito ? "<span></span>" : "<button class='agx-go' data-fazer='" + p.id + "'>Fazer</button>") + "</div>";
      }).join("") + "</div>" +
      "<details class='agx-ia'><summary>Opcional: IA do Estúdio</summary>" +
      "<ol><li>Entre em console.anthropic.com e crie a conta da agência.</li>" +
      "<li>Em Billing, coloque crédito. A IA para quando o crédito zera.</li>" +
      "<li>Em API Keys, clique em Create Key e copie a chave.</li>" +
      "<li>Mande a chave para o time WorkFlowArk no onboarding. Ela fica guardada só na sua instância.</li></ol></details>";
  }
  function clique(ev) {
    var b = ev.target.closest("button,[data-agx]"); if (!b) return;
    if (card && card.className === "agx-pill") { localStorage.setItem(CHAVE_MIN, "0"); renderCard(); return; }
    var a = b.getAttribute("data-a");
    if (a === "min") { localStorage.setItem(CHAVE_MIN, "1"); renderCard(); return; }
    if (a === "fechar") { localStorage.setItem(CHAVE_FECHADO, "1"); renderCard(); return; }
    if (a === "tour") { tour(); return; }
    if (b.getAttribute("data-onde")) { mostrarOnde(b.getAttribute("data-onde")); return; }
    if (b.getAttribute("data-fazer")) { fazer(b.getAttribute("data-fazer")); }
  }

  /* ---------------- boas-vindas no primeiro acesso ---------------- */
  function boasVindas() {
    var k = "wfa-agencia-boasvindas-" + membroId();
    if (localStorage.getItem(k) === "1") return;
    var w = document.createElement("div"); w.className = "agx-wel"; w.setAttribute("data-agx", "boasvindas");
    w.innerHTML = "<div><h2>Bem vindo ao seu WorkFlowArk</h2>" +
      "<p>Em quatro passos a sua agência fica pronta para operar. A gente mostra onde fica cada coisa.</p>" +
      "<ol><li>Nome e logo da agência</li><li>Primeiro cliente</li><li>Convidar a equipe</li><li>Primeira tarefa</li></ol>" +
      "<div class='agx-acts'><button class='agx-sec' data-a='depois'>Depois</button><button class='agx-go' data-a='comecar'>Começar</button></div></div>";
    document.body.appendChild(w);
    w.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b && ev.target !== w) return;
      localStorage.setItem(k, "1"); w.remove();
      if (b && b.getAttribute("data-a") === "comecar") { localStorage.setItem(CHAVE_MIN, "0"); renderCard(); tour(); }
      else { localStorage.setItem(CHAVE_MIN, "1"); renderCard(); } // depois: vira a pílula no canto
    });
  }

  /* ---------------- partida ---------------- */
  var iniciado = false;
  function iniciar() {
    if (iniciado) return; iniciado = true;
    ajustarTextos();
    if (typeof applyBrand === "function") try { applyBrand(); } catch (e) {}
    redesenhar();
    // com as boas-vindas na tela, o cartão só aparece depois da escolha (Começar ou Depois)
    if (localStorage.getItem("wfa-agencia-boasvindas-" + membroId()) === "1") renderCard();
    boasVindas();
    setInterval(function () {
      if (document.visibilityState !== "visible") return;
      ajustarTela();
      if (card) renderCard();
    }, 4000);
    document.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest('[onclick="openSettings()"],[onclick*="setTab"]')) setTimeout(montarEnvioLogo, 150);
    });
  }
  // o boot chama onboardMaybeAuto() quando a nuvem terminou de carregar: é a nossa largada.
  // Os slides antigos falam da operação da ARK, então no modo agência eles saem.
  W.onboardMaybeAuto = function () { setTimeout(iniciar, 600); };
  document.addEventListener("DOMContentLoaded", function () { ajustarTextos(); redesenhar(); });
  setTimeout(iniciar, 9000); // sem nuvem (prévia local), começa mesmo assim
})(typeof window !== "undefined" ? window : this);
