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
    return modo === "agencia" ? ["chat", "alpha", "whatsapp", "notificacoes"] : [];
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


  /* ================= tela (v2, 23/09/2026) =================
     O Gabriel testou a v1 e reprovou o cartão de Primeiros passos, o tour e o "onde fica"
     (abriam a aba Conta com sincronização, migração e palmas do JARVIS). Agora:
     1) assistente de primeiro acesso em 3 passos, no padrão do AgencyFlow;
     2) Configurações como página de verdade, no padrão do Modo Criador;
     3) o sistema leva o nome da agência: a agência do Zé usa o WorkFlowZé.
     Na demonstração no domínio da ARK (?agencia=1) nada é gravado na nuvem da ARK. */
  var DEMO = hostDaArk(location.hostname);
  var PALETA = ["#FFC700", "#EAB308", "#FF8A3D", "#F43F5E", "#FF5C8A", "#A78BFA", "#7C5CFF", "#38BDF8", "#2DD4BF", "#22C55E"];
  var PAPEIS = [["gestor", "Gestor"], ["operacao", "Operação"], ["marketing", "Marketing"], ["comercial", "Comercial"], ["financeiro", "Financeiro"], ["viewer", "Só visualização"]];

  var css = document.createElement("style");
  css.textContent =
    abasOcultas(MODO).map(function (n) { return '[data-nav="' + n + '"]'; }).join(",") +
    ',body:has(.agw) #ia-fab,body:has(.agp) #ia-fab,.subitem[onclick*="/paginas"],#modal-settings .set-tab[data-st="conta"],#modal-settings .set-tab[data-st="sistema"]{display:none!important}' +
    "body{--ag-bg:#f6f6f7;--ag-card:#ffffff;--ag-ink:#141416;--ag-line:#e4e4e8;--ag-mute:#6b6b75;--ag-soft:#f1f1f3;--ag-acc:var(--yel,#FFC700);--ag-on:#111}" +
    "body.aura-dark{--ag-bg:#0e0e10;--ag-card:#17171a;--ag-ink:#f4f4f5;--ag-line:#2a2a2f;--ag-mute:#9b9ba5;--ag-soft:#1f1f23}" +
    ".agw{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(6,6,8,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);font-family:var(--sans,Inter,system-ui,sans-serif)}" +
    ".agw-card{width:560px;max-width:100%;max-height:calc(100vh - 32px);overflow:auto;background:var(--ag-card);color:var(--ag-ink);border:1px solid var(--ag-line);border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.45);padding:28px 28px 22px;position:relative}" +
    ".agw-x{position:absolute;top:16px;right:16px;background:none;border:0;color:var(--ag-mute);cursor:pointer;font-size:13px;padding:6px 8px;border-radius:8px}.agw-x:hover{background:var(--ag-soft);color:var(--ag-ink)}" +
    ".agw h2{margin:0;text-align:center;font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-.02em}" +
    ".agw .agw-sub{margin:6px 0 18px;text-align:center;color:var(--ag-mute);font-size:14px}" +
    ".agw-prog{display:flex;align-items:center;gap:8px;margin:0 0 22px}.agw-prog i{flex:1;height:5px;border-radius:5px;background:var(--ag-line)}.agw-prog i.on{background:var(--ag-acc)}.agw-prog span{font-size:12px;color:var(--ag-mute);white-space:nowrap}" +
    ".agw-eyebrow,.agp-sec{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ag-mute);margin:0 0 6px}" +
    ".agw h3{margin:0 0 4px;font-size:18px;font-weight:700}.agw p.agw-txt{margin:0 0 16px;color:var(--ag-mute);font-size:13.5px;line-height:1.5}" +
    ".agw-foot{display:flex;align-items:center;gap:10px;margin-top:22px}.agw-foot .agw-sp{flex:1}" +
    ".ag-btn{background:var(--ag-acc);color:var(--ag-on);border:0;border-radius:10px;padding:10px 16px;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit}" +
    ".ag-btn:disabled{opacity:.45;cursor:default}.ag-ghost{background:none;border:1px solid var(--ag-line);color:var(--ag-ink);border-radius:10px;padding:9px 14px;font-size:13px;cursor:pointer;font-family:inherit}" +
    ".ag-link{background:none;border:0;color:var(--ag-mute);font-size:13px;cursor:pointer;padding:6px 0;font-family:inherit}.ag-link:hover{color:var(--ag-ink)}" +
    ".ag-lbl{display:block;font-size:12px;font-weight:600;color:var(--ag-mute);margin:0 0 6px}" +
    ".ag-in{width:100%;box-sizing:border-box;background:var(--ag-soft);border:1px solid var(--ag-line);color:var(--ag-ink);border-radius:10px;padding:10px 12px;font-size:14px;font-family:inherit;outline:none}.ag-in:focus{border-color:var(--ag-acc)}" +
    ".ag-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}.ag-row{margin-bottom:14px}" +
    ".ag-logo{display:flex;align-items:center;gap:14px;margin-bottom:16px}.ag-logo .ag-lg{width:64px;height:64px;border-radius:16px;border:1px dashed var(--ag-line);display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--ag-soft);font-size:26px;font-weight:800;color:var(--ag-acc)}.ag-logo img{width:100%;height:100%;object-fit:contain}" +
    ".ag-sw{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ag-sw button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}.ag-sw button.on{outline:2px solid var(--ag-ink);outline-offset:2px}.ag-sw input[type=color]{width:34px;height:30px;border:1px solid var(--ag-line);border-radius:8px;background:none;padding:2px;cursor:pointer}" +
    ".ag-prev{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid var(--ag-line);border-radius:14px;background:var(--ag-soft);margin-top:4px}.ag-prev .ag-pm{width:34px;height:34px;border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:800}.ag-prev .ag-pm img{width:100%;height:100%;object-fit:contain}.ag-prev b{font-size:15px}.ag-prev small{display:block;color:var(--ag-mute);font-size:12px}" +
    ".ag-msg{font-size:12.5px;margin-top:8px;color:var(--ag-mute)}.ag-msg.err{color:#e5484d}" +
    ".ag-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.ag-opt{text-align:left;background:var(--ag-soft);border:1px solid var(--ag-line);border-radius:14px;padding:16px;cursor:pointer;color:var(--ag-ink);font-family:inherit}.ag-opt:hover,.ag-opt.on{border-color:var(--ag-acc)}.ag-opt b{display:block;font-size:14px;margin:10px 0 4px}.ag-opt span{font-size:12.5px;color:var(--ag-mute);line-height:1.45}.ag-opt svg{width:22px;height:22px;color:var(--ag-acc)}" +
    ".ag-tab{width:100%;border-collapse:collapse;font-size:13px;margin-top:10px}.ag-tab th{text-align:left;font-size:11px;color:var(--ag-mute);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--ag-line)}.ag-tab td{padding:8px;border-bottom:1px solid var(--ag-line)}.ag-tab tr.rep td{color:var(--ag-mute)}" +
    ".ag-list{margin:10px 0 0;padding:0;list-style:none}.ag-list li{display:flex;justify-content:space-between;gap:10px;padding:9px 12px;border:1px solid var(--ag-line);border-radius:10px;margin-bottom:6px;font-size:13px}.ag-list li small{color:var(--ag-mute)}" +
    ".ag-inline{display:grid;grid-template-columns:1fr 150px auto;gap:8px}" +
    ".ag-ok{width:56px;height:56px;border-radius:50%;background:var(--ag-acc);color:var(--ag-on);display:flex;align-items:center;justify-content:center;margin:4px auto 14px}" +
    ".agp{position:fixed;inset:0;z-index:1200;overflow:auto;background:var(--ag-bg);color:var(--ag-ink);font-family:var(--sans,Inter,system-ui,sans-serif)}" +
    ".agp-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;padding:14px 24px;background:var(--ag-bg);border-bottom:1px solid var(--ag-line)}.agp-top b{font-size:14px}" +
    ".agp-in{max-width:880px;margin:0 auto;padding:32px 24px 80px}.agp h1{margin:0;font-size:30px;font-weight:800;letter-spacing:-.02em}.agp .agp-sub{margin:6px 0 22px;color:var(--ag-mute);font-size:14px}" +
    ".agp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--ag-line);margin-bottom:26px;overflow-x:auto}.agp-tabs button{background:none;border:0;border-bottom:2px solid transparent;padding:10px 14px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ag-mute);cursor:pointer;white-space:nowrap;font-family:inherit}.agp-tabs button.on{color:var(--ag-ink);border-bottom-color:var(--ag-acc)}" +
    ".agp-box{background:var(--ag-card);border:1px solid var(--ag-line);border-radius:16px;padding:22px;margin-bottom:22px}.agp-box p{color:var(--ag-mute);font-size:13.5px;line-height:1.55;margin:0 0 14px}" +
    "@media (max-width:640px){.agw-x{position:static;display:block;margin:-10px -8px 6px auto}.agw-card{padding:22px 18px 18px;border-radius:18px}.agw h2{font-size:21px}.ag-grid2,.ag-opts{grid-template-columns:1fr}.ag-inline{grid-template-columns:1fr}.agp-in{padding:22px 16px 60px}.agp h1{font-size:24px}.agp-top{padding:12px 16px}}";
  document.head.appendChild(css);

  function lsJson(k, pad) { try { return JSON.parse(localStorage.getItem(k) || "null") || pad; } catch (e) { return pad; } }
  function membroId() { try { return (typeof WFA_MEMBER !== "undefined" && WFA_MEMBER && WFA_MEMBER.id) || "anon"; } catch (e) { return "anon"; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function aviso(t) { if (typeof toast === "function") toast(t); }
  function marca() { return lsJson("wfa-brand", {}); }
  function nomeAgencia() { var m = marca(); return (m.name || "").trim() || "Minha agência"; }
  function clicarNav(n) { var e = document.querySelector('[data-nav="' + n + '"]'); if (e) e.click(); }
  function inicial(m) { var c = nomeCurto(m); return c ? c.charAt(0) : "W"; }
  var ICON = {
    planilha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/></svg>',
    mao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    ok: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  };

  /* textos e nomes que eram da ARK passam a ser da agência */
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
  }
  function aplicarProduto() {
    var m = marca(), prod = nomeProduto(m);
    try { document.title = prod; } catch (e) {}
    var nm = document.querySelector(".brand-info .nm");
    if (nm) nm.textContent = (m.name || "").trim() ? m.name : prod;
    if (m.color && corAceita(m.color)) document.documentElement.style.setProperty("--ag-on", corSobre(m.color));
    var img = document.querySelector(".brand-mark img");
    if (img && !m.logo) img.style.visibility = "hidden"; // sem logo próprio, o símbolo da ARK não aparece
    if (img && m.logo) img.style.visibility = "";
    // botão da IA no canto: sai o símbolo da ARK, entra o logo ou a inicial da agência
    var fab = document.getElementById("ia-fab");
    if (fab) {
      var fi = fab.querySelector("img"), ini = fab.querySelector(".agx-ini");
      if (fi && m.logo) { fi.src = m.logo; fi.style.display = ""; if (ini) ini.remove(); }
      else if (fi) {
        fi.style.display = "none";
        if (!ini) { ini = document.createElement("span"); ini.className = "agx-ini"; ini.style.cssText = "font-weight:800;font-size:18px;color:var(--yel,#FFC700)"; fab.appendChild(ini); }
        ini.textContent = inicial(m);
      }
    }
  }
  function ajustarTela() {
    var nome = nomeAgencia();
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
    aplicarProduto();
  }
  function redesenhar() {
    try { if (typeof renderMeuDia === "function") renderMeuDia(); } catch (e) {}
    try { if (typeof updateBadges === "function") updateBadges(); } catch (e) {}
    ajustarTela();
    setTimeout(ajustarTela, 400);
  }

  /* ---------------- logo por arquivo ---------------- */
  function reduzirImagem(arquivo, feito) {
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(arquivo.type)) { aviso("Use PNG, JPG, WEBP ou SVG."); return; }
    if (arquivo.size > 5 * 1024 * 1024) { aviso("Imagem acima de 5 MB. Use uma menor."); return; }
    var fr = new FileReader();
    fr.onload = function () {
      if (/svg/.test(arquivo.type)) { feito(fr.result); return; }
      var img = new Image();
      img.onload = function () {
        var e = Math.min(1, 256 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * e); c.height = Math.round(img.height * e);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        feito(c.toDataURL("image/png"));
      };
      img.onerror = function () { aviso("Não consegui ler essa imagem. Tente PNG ou JPG."); };
      img.src = fr.result;
    };
    fr.readAsDataURL(arquivo);
  }

  function salvarMarca(d) {
    var m = { name: String(d.name || "").trim(), short: String(d.short || "").trim(), color: d.color || "#FFC700", logo: String(d.logo || "").trim() };
    if (!m.name) return "Escreva o nome da agência.";
    if (!corAceita(m.color)) return "Essa cor é escura demais: o texto dos botões some. Escolha uma mais clara.";
    if (m.logo && !logoValido(m.logo)) return "O logo precisa ser uma imagem enviada ou um endereço https://";
    try { localStorage.setItem("wfa-brand", JSON.stringify(m)); } catch (e) { return "Imagem grande demais para salvar. Use uma menor."; }
    if (typeof applyBrand === "function") try { applyBrand(); } catch (e) {}
    ajustarTextos(); ajustarTela();
    return "";
  }
  // o salvar do modal antigo também passa pela regra nova (aceita imagem do computador)
  W.saveBrand = function () {
    var e = salvarMarca({ name: (document.getElementById("brand-name") || {}).value, short: marca().short,
      color: (document.getElementById("brand-color") || {}).value, logo: (document.getElementById("brand-logo") || {}).value });
    aviso(e || "Marca aplicada");
  };

  /* Formulário da marca: o mesmo no passo 1 e em Configurações > Agência. O rascunho só vira
     marca quando salva; a prévia mostra ao vivo o nome do produto (WorkFlowZé). */
  function formMarca(alvo, aoSalvar, textoBotao) {
    var r = Object.assign({ name: "", short: "", color: "#FFC700", logo: "" }, marca());
    if (!corAceita(r.color)) r.color = "#FFC700";
    alvo.innerHTML =
      "<div class='ag-logo'><div class='ag-lg' data-f='lg'></div><div><button type='button' class='ag-ghost' data-f='env'>Enviar logo</button> " +
      "<button type='button' class='ag-link' data-f='tira'>Remover</button><div class='ag-msg'>PNG ou SVG com fundo transparente, até 5 MB.</div></div>" +
      "<input type='file' accept='image/png,image/jpeg,image/webp,image/svg+xml' data-f='arq' hidden></div>" +
      "<div class='ag-grid2'><div><label class='ag-lbl'>Nome da agência</label><input class='ag-in' data-f='nome' placeholder='Ex.: Agência do Zé' maxlength='60'></div>" +
      "<div><label class='ag-lbl'>Nome curto do sistema</label><input class='ag-in' data-f='curto' maxlength='13'></div></div>" +
      "<div class='ag-row'><label class='ag-lbl'>Cor principal</label><div class='ag-sw' data-f='sw'>" +
      PALETA.map(function (c) { return "<button type='button' title='" + c + "' data-cor='" + c + "' style='background:" + c + "'></button>"; }).join("") +
      "<input type='color' data-f='cor' title='Outra cor'></div><div class='ag-msg' data-f='cmsg'></div></div>" +
      "<label class='ag-lbl'>Como a sua equipe vai ver</label><div class='ag-prev'><div class='ag-pm' data-f='pm'></div><div><b data-f='pn'></b><small data-f='ps'></small></div></div>" +
      (aoSalvar ? "<div style='margin-top:16px;display:flex;gap:10px;align-items:center'><button type='button' class='ag-btn' data-f='salvar'>" + esc(textoBotao || "Salvar marca") + "</button><span class='ag-msg' data-f='smsg'></span></div>" : "");
    function q(f) { return alvo.querySelector("[data-f='" + f + "']"); }
    var raiz = alvo.closest(".agw-card") || alvo; // no assistente a cor escolhida já pinta o cartão todo
    q("nome").value = r.name; q("curto").value = r.short; q("cor").value = r.color;
    function pintar() {
      r.name = q("nome").value; r.short = q("curto").value;
      q("curto").placeholder = nomeCurto({ name: r.name }) || "Ex.: Zé";
      var lg = q("lg"), pm = q("pm");
      lg.innerHTML = r.logo ? "<img alt='' src='" + esc(r.logo) + "'>" : esc(inicial(r));
      pm.innerHTML = r.logo ? "<img alt='' src='" + esc(r.logo) + "'>" : esc(inicial(r));
      pm.style.background = r.logo ? "transparent" : r.color; pm.style.color = corSobre(r.color);
      q("pn").textContent = nomeProduto(r);
      var tit = raiz !== alvo && raiz.querySelector("h2"); if (tit) tit.textContent = "Bem-vindo ao " + nomeProduto(r);
      q("ps").textContent = (r.name.trim() || "Sua agência") + " · no menu, na aba do navegador e na tela de entrada";
      [].forEach.call(q("sw").querySelectorAll("button"), function (b) { b.classList.toggle("on", b.getAttribute("data-cor").toLowerCase() === String(r.color).toLowerCase()); });
      var cm = q("cmsg"); var okc = corAceita(r.color);
      cm.textContent = okc ? "" : "Cor escura demais: o texto dos botões some. Escolha uma mais clara.";
      cm.className = "ag-msg" + (okc ? "" : " err");
      raiz.style.setProperty("--ag-acc", okc ? r.color : "var(--yel,#FFC700)");
      raiz.style.setProperty("--ag-on", corSobre(okc ? r.color : "#FFC700"));
    }
    alvo.addEventListener("input", function (ev) {
      if (ev.target === q("cor")) r.color = ev.target.value;
      pintar();
    });
    alvo.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.getAttribute("data-cor")) { r.color = b.getAttribute("data-cor"); q("cor").value = r.color; pintar(); return; }
      var f = b.getAttribute("data-f");
      if (f === "env") q("arq").click();
      if (f === "tira") { r.logo = ""; pintar(); }
      if (f === "salvar") {
        var e = salvarMarca(r), sm = q("smsg");
        sm.className = "ag-msg" + (e ? " err" : ""); sm.textContent = e || "Salvo. " + nomeProduto(r) + " no ar.";
        if (!e && aoSalvar) aoSalvar();
      }
    });
    q("arq").addEventListener("change", function () {
      var f = q("arq").files && q("arq").files[0]; if (!f) return;
      reduzirImagem(f, function (url) { r.logo = url; pintar(); });
      q("arq").value = "";
    });
    pintar();
    return { dados: function () { return r; } };
  }

  /* Clientes: planilha (arquivo ou colado do Excel) com revisão, ou cadastro na mão. */
  function existentes() { try { return typeof CLIENTES !== "undefined" ? CLIENTES : []; } catch (e) { return []; } }
  function gravarClientes(lista) {
    if (DEMO) return lista.length; // demonstração no domínio da ARK: nada vai para a base da ARK
    var arr = typeof loadClientesCustom === "function" ? loadClientesCustom() : [];
    var todos = (typeof CLIENTES_BASE !== "undefined" ? CLIENTES_BASE : []).concat(arr);
    lista.forEach(function (c) {
      var id = typeof cliSlug === "function" ? cliSlug(c.nm) : ("cli" + Date.now());
      while (todos.some(function (x) { return x.id === id; })) id = id + "-" + Math.floor(Math.random() * 99);
      var novo = { id: id, nm: c.nm, tipo: c.tipo, plano: "", valor: c.valor || 0, cap: 0, status: "gr", meta: c.meta || "Cliente cadastrado", extra: c.meta || "" };
      arr.push(novo); todos.push(novo);
    });
    if (typeof saveClientesCustom === "function") saveClientesCustom(arr); // não gera tarefa de onboarding
    return lista.length;
  }
  function blocoClientes(alvo, aoMudar) {
    var adicionados = [];
    alvo.innerHTML =
      "<div class='ag-opts'><button type='button' class='ag-opt' data-o='plan'>" + ICON.planilha + "<b>Importar planilha</b><span>CSV do Excel, Google Planilhas ou colar as linhas direto.</span></button>" +
      "<button type='button' class='ag-opt' data-o='mao'>" + ICON.mao + "<b>Cadastrar na mão</b><span>Um cliente por vez, com nome, tipo e valor.</span></button></div>" +
      "<div data-v='plan' hidden style='margin-top:16px'><div style='display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px'><button type='button' class='ag-ghost' data-a='arq'>Escolher arquivo</button>" +
      "<button type='button' class='ag-link' data-a='modelo'>Baixar modelo de planilha</button><input type='file' accept='.csv,.txt,text/csv,text/plain' data-a='file' hidden></div>" +
      "<textarea class='ag-in' rows='3' data-a='cola' placeholder='Ou cole aqui as linhas da sua planilha (Cliente, Valor mensal, Tipo, Instagram)'></textarea>" +
      "<div class='ag-msg'>No Excel: Arquivo, Salvar como, CSV. A primeira linha pode ser o cabeçalho.</div><div data-a='rev'></div></div>" +
      "<div data-v='mao' hidden style='margin-top:16px'><div class='ag-inline'><input class='ag-in' data-m='nome' placeholder='Nome do cliente' maxlength='60'>" +
      "<select class='ag-in' data-m='tipo'><option value='ARK'>Mensal</option><option value='Alpha'>Pré pago</option></select><button type='button' class='ag-btn' data-a='add'>Adicionar</button></div>" +
      "<input class='ag-in' data-m='valor' inputmode='decimal' placeholder='Valor mensal em R$ (opcional)' style='margin-top:8px'><ul class='ag-list' data-a='lista'></ul></div>" +
      "<div class='ag-msg' data-a='msg'></div>";
    function q(s) { return alvo.querySelector(s); }
    var lidos = [];
    function revisar(texto) {
      lidos = clientesDaPlanilha(texto, existentes());
      var rev = q("[data-a='rev']");
      if (!lidos.length) { rev.innerHTML = "<div class='ag-msg err'>Não achei clientes nesse conteúdo. Confira se a primeira coluna tem o nome.</div>"; return; }
      var novos = lidos.filter(function (c) { return !c.repetido; }).length;
      rev.innerHTML = "<table class='ag-tab'><thead><tr><th></th><th>Cliente</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>" +
        lidos.map(function (c, i) {
          return "<tr class='" + (c.repetido ? "rep" : "") + "'><td><input type='checkbox' data-i='" + i + "'" + (c.repetido ? "" : " checked") + "></td><td>" + esc(c.nm) +
            (c.repetido ? " <small>(já está na carteira)</small>" : "") + "</td><td>" + (c.tipo === "Alpha" ? "Pré pago" : "Mensal") + "</td><td>" +
            (c.valor ? "R$ " + c.valor.toLocaleString("pt-BR", { minimumFractionDigits: c.valor % 1 ? 2 : 0, maximumFractionDigits: 2 }) : "") + "</td></tr>";
        }).join("") + "</tbody></table><div style='margin-top:12px;display:flex;gap:10px;align-items:center'><button type='button' class='ag-btn' data-a='importar'>Importar " +
        novos + (novos === 1 ? " cliente" : " clientes") + "</button><span class='ag-msg'>Confira antes de importar.</span></div>";
    }
    function contarMarcados() {
      var n = [].filter.call(alvo.querySelectorAll("[data-i]"), function (c) { return c.checked; }).length;
      var b = q("[data-a='importar']"); if (b) { b.textContent = "Importar " + n + (n === 1 ? " cliente" : " clientes"); b.disabled = !n; }
    }
    alvo.addEventListener("change", function (ev) {
      if (ev.target.getAttribute("data-i") != null) contarMarcados();
      if (ev.target.getAttribute("data-a") === "file") {
        var f = ev.target.files && ev.target.files[0]; if (!f) return;
        var fr = new FileReader(); fr.onload = function () { revisar(fr.result); }; fr.readAsText(f, "utf-8");
        ev.target.value = "";
      }
    });
    alvo.addEventListener("input", function (ev) { if (ev.target.getAttribute("data-a") === "cola") revisar(ev.target.value); });
    alvo.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      var o = b.getAttribute("data-o");
      if (o) {
        [].forEach.call(alvo.querySelectorAll(".ag-opt"), function (x) { x.classList.toggle("on", x === b); });
        q("[data-v='plan']").hidden = o !== "plan"; q("[data-v='mao']").hidden = o !== "mao";
        return;
      }
      var a = b.getAttribute("data-a"), msg = q("[data-a='msg']");
      if (a === "arq") q("[data-a='file']").click();
      if (a === "modelo") {
        var blob = new Blob(["﻿" + modeloCsv()], { type: "text/csv;charset=utf-8" });
        var l = document.createElement("a"); l.href = URL.createObjectURL(blob); l.download = "modelo-clientes.csv"; document.body.appendChild(l); l.click(); l.remove();
      }
      if (a === "importar") {
        var marcados = [].filter.call(alvo.querySelectorAll("[data-i]"), function (c) { return c.checked; }).map(function (c) { return lidos[+c.getAttribute("data-i")]; });
        var n = gravarClientes(marcados);
        q("[data-a='rev']").innerHTML = ""; q("[data-a='cola']").value = "";
        msg.className = "ag-msg"; msg.textContent = DEMO ? "Demonstração: " + n + (n === 1 ? " cliente seria importado" : " clientes seriam importados") + ". Nada foi gravado." : n + (n === 1 ? " cliente importado." : " clientes importados.");
        adicionados = adicionados.concat(marcados); if (aoMudar) aoMudar(adicionados);
      }
      if (a === "add") {
        var nm = q("[data-m='nome']").value.trim();
        if (!nm) { msg.className = "ag-msg err"; msg.textContent = "Escreva o nome do cliente."; return; }
        var ja = clientesDaPlanilha(nm, existentes().concat(adicionados))[0];
        if (ja && ja.repetido) { msg.className = "ag-msg err"; msg.textContent = nm + " já está na carteira."; return; }
        var c = { nm: nm, tipo: q("[data-m='tipo']").value, valor: valorReais(q("[data-m='valor']").value), meta: "" };
        gravarClientes([c]); adicionados.push(c);
        q("[data-m='nome']").value = ""; q("[data-m='valor']").value = "";
        q("[data-a='lista']").innerHTML = adicionados.map(function (x) { return "<li><span>" + esc(x.nm) + "</span><small>" + (x.tipo === "Alpha" ? "Pré pago" : "Mensal") + "</small></li>"; }).join("");
        msg.className = "ag-msg"; msg.textContent = DEMO ? "Demonstração: nada foi gravado." : "";
        if (aoMudar) aoMudar(adicionados);
      }
    });
  }

  /* Equipe: convite por e-mail com papel; quem é convidado entra com esse e-mail. */
  function blocoEquipe(alvo, aoMudar) {
    var convidados = [];
    alvo.innerHTML = "<div class='ag-inline'><input class='ag-in' type='email' data-e='email' placeholder='email@da-pessoa.com'>" +
      "<select class='ag-in' data-e='papel'>" + PAPEIS.map(function (p) { return "<option value='" + p[0] + "'>" + p[1] + "</option>"; }).join("") + "</select>" +
      "<button type='button' class='ag-btn' data-e='convidar'>Convidar</button></div><div class='ag-msg' data-e='msg'>Cada pessoa entra com o próprio e-mail. Nada de login compartilhado.</div><ul class='ag-list' data-e='lista'></ul>";
    alvo.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-e='convidar']"); if (!b) return;
      var em = alvo.querySelector("[data-e='email']"), msg = alvo.querySelector("[data-e='msg']");
      var email = em.value.trim().toLowerCase(), papel = alvo.querySelector("[data-e='papel']").value;
      if (!/^\S+@\S+\.\S+$/.test(email)) { msg.className = "ag-msg err"; msg.textContent = "Esse e-mail não parece certo."; return; }
      function pronto() {
        convidados.push({ email: email, papel: papel }); em.value = "";
        msg.className = "ag-msg"; msg.textContent = DEMO ? "Demonstração: convite não enviado." : email + " já pode entrar com esse e-mail.";
        alvo.querySelector("[data-e='lista']").innerHTML = convidados.map(function (c) {
          var nomeP = (PAPEIS.filter(function (p) { return p[0] === c.papel; })[0] || [0, c.papel])[1];
          return "<li><span>" + esc(c.email) + "</span><small>" + esc(nomeP) + "</small></li>";
        }).join("");
        if (aoMudar) aoMudar(convidados);
      }
      if (DEMO || typeof cloudCall !== "function") { pronto(); return; }
      b.disabled = true;
      cloudCall("save", { action: "add-member", email: email, role: papel }).then(function () {
        return cloudCall("load").then(function (res) { if (res && res.members) W.WFA_MEMBERS = res.members; });
      }).then(pronto).catch(function (e) { msg.className = "ag-msg err"; msg.textContent = "Não consegui convidar agora: " + ((e && e.message) || "tente de novo"); })
        .then(function () { b.disabled = false; });
    });
  }

  /* ---------------- assistente de primeiro acesso ---------------- */
  var CHAVE_INICIO = function () { return "wfa-agencia-inicio-v2-" + membroId(); };
  var wiz = null;
  function abrirAssistente() {
    if (wiz) return;
    var passo = 1, resumo = { clientes: 0, equipe: 0 };
    wiz = document.createElement("div"); wiz.className = "agw"; wiz.setAttribute("data-agx", "assistente");
    wiz.setAttribute("role", "dialog"); wiz.setAttribute("aria-modal", "true");
    document.body.appendChild(wiz);
    function fechar(marcou) { try { localStorage.setItem(CHAVE_INICIO(), marcou || "feito"); } catch (e) {} if (wiz) wiz.remove(); wiz = null; }
    function render() {
      var prod = nomeProduto(marca());
      var cab = passo <= 3 ?
        "<button class='agw-x' data-w='depois' aria-label='Fechar'>Fazer depois</button><h2>Bem-vindo ao " + esc(prod) + "</h2>" +
        "<div class='agw-sub'>Três passos e a sua agência está pronta para trabalhar.</div>" +
        "<div class='agw-prog'><i class='on'></i><i class='" + (passo >= 2 ? "on" : "") + "'></i><i class='" + (passo >= 3 ? "on" : "") + "'></i><span>" + passo + " de 3</span></div>" : "";
      var corpo = "", pe = "";
      if (passo === 1) {
        corpo = "<div class='agw-eyebrow'>Passo 1</div><h3>Sua agência</h3><p class='agw-txt'>Nome, logo e cor. O sistema passa a ter a cara da sua agência.</p><div data-w='marca'></div>";
        pe = "<button class='ag-link' data-w='pular'>Pular</button><span class='agw-sp'></span><button class='ag-btn' data-w='marca-ok'>Continuar</button>";
      } else if (passo === 2) {
        corpo = "<div class='agw-eyebrow'>Passo 2</div><h3>Seus clientes</h3><p class='agw-txt'>Traga a carteira de uma vez pela planilha ou cadastre os primeiros na mão.</p><div data-w='cli'></div>";
        pe = "<button class='ag-link' data-w='voltar'>Voltar</button><span class='agw-sp'></span><button class='ag-link' data-w='pular'>Pular</button><button class='ag-btn' data-w='prox'>Continuar</button>";
      } else if (passo === 3) {
        corpo = "<div class='agw-eyebrow'>Passo 3</div><h3>Sua equipe</h3><p class='agw-txt'>Convide quem trabalha com você. Dá pra fazer depois em Configurações, Equipe.</p><div data-w='eq'></div>";
        pe = "<button class='ag-link' data-w='voltar'>Voltar</button><span class='agw-sp'></span><button class='ag-link' data-w='pular'>Pular</button><button class='ag-btn' data-w='prox'>Concluir</button>";
      } else {
        corpo = "<div class='ag-ok'>" + ICON.ok + "</div><h2>Tudo pronto</h2><div class='agw-sub'>O " + esc(prod) + " já é da sua agência.</div>" +
          "<ul class='ag-list'><li><span>Marca</span><small>" + (marca().name ? esc(marca().name) : "Pode ajustar em Configurações") + "</small></li>" +
          "<li><span>Clientes</span><small>" + (resumo.clientes ? resumo.clientes + (DEMO ? " na demonstração" : " na carteira") : "Nenhum ainda") + "</small></li>" +
          "<li><span>Equipe</span><small>" + (resumo.equipe ? resumo.equipe + (resumo.equipe === 1 ? " convite" : " convites") : "Só você por enquanto") + "</small></li></ul>" +
          "<p class='agw-txt' style='text-align:center;margin-top:12px'>Tudo isso fica em Configurações, no ícone de engrenagem.</p>";
        pe = "<span class='agw-sp'></span><button class='ag-btn' data-w='fim'>Ir para o Meu Dia</button><span class='agw-sp'></span>";
      }
      wiz.innerHTML = "<div class='agw-card'>" + cab + corpo + "<div class='agw-foot'>" + pe + "</div></div>";
      if (passo === 1) wiz.__form = formMarca(wiz.querySelector("[data-w='marca']"));
      if (passo === 2) blocoClientes(wiz.querySelector("[data-w='cli']"), function (l) { resumo.clientes = l.length; });
      if (passo === 3) blocoEquipe(wiz.querySelector("[data-w='eq']"), function (l) { resumo.equipe = l.length; });
      var foco = wiz.querySelector("input.ag-in,button.ag-btn"); if (foco) try { foco.focus(); } catch (e) {}
    }
    wiz.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-w]"); if (!b || b.tagName !== "BUTTON") return;
      var a = b.getAttribute("data-w");
      if (a === "depois") { fechar("adiado"); return; }
      if (a === "fim") { fechar("feito"); clicarNav("dashboard"); redesenhar(); return; }
      if (a === "voltar") { passo = Math.max(1, passo - 1); render(); return; }
      if (a === "marca-ok") {
        var d = wiz.__form.dados();
        if (!String(d.name || "").trim()) { passo = 2; render(); return; } // sem nome = mesmo que pular
        var e = salvarMarca(d);
        if (e) { var m = wiz.querySelector("[data-f='cmsg']"); if (m) { m.className = "ag-msg err"; m.textContent = e; } return; }
        passo = 2; render(); return;
      }
      if (a === "pular" || a === "prox") { passo += 1; render(); }
    });
    document.addEventListener("keydown", function esc_(ev) { if (ev.key === "Escape" && wiz) { fechar("adiado"); document.removeEventListener("keydown", esc_); } });
    render();
  }

  /* ---------------- Configurações como página ---------------- */
  var origOpenSettings = W.openSettings;
  var pagina = null;
  function fecharConfig() { if (pagina) pagina.remove(); pagina = null; ajustarTela(); }
  function abrirConfig(aba) {
    if (pagina) pagina.remove();
    pagina = document.createElement("div"); pagina.className = "agp"; pagina.setAttribute("data-agx", "configuracoes");
    var abas = [["agencia", "Agência"], ["equipe", "Equipe"], ["clientes", "Clientes"], ["integracoes", "Integrações"], ["conta", "Conta"]];
    pagina.innerHTML = "<div class='agp-top'><button class='ag-ghost' data-p='voltar'>Voltar</button><b data-p='prod'></b></div>" +
      "<div class='agp-in'><h1>Configurações</h1><div class='agp-sub'>Ajustes da sua agência.</div><div class='agp-tabs' role='tablist'>" +
      abas.map(function (x) { return "<button role='tab' data-t='" + x[0] + "'>" + x[1] + "</button>"; }).join("") + "</div><div data-p='corpo'></div></div>";
    document.body.appendChild(pagina);
    pagina.querySelector("[data-p='prod']").textContent = nomeProduto(marca());
    function mostrar(t) {
      [].forEach.call(pagina.querySelectorAll("[data-t]"), function (b) { b.classList.toggle("on", b.getAttribute("data-t") === t); });
      var c = pagina.querySelector("[data-p='corpo']");
      if (t === "agencia") {
        c.innerHTML = "<div class='agp-sec'>Marca da agência</div><div class='agp-box'><p>Aparece no menu, na aba do navegador e na tela de entrada da sua equipe.</p><div data-p='marca'></div></div>" +
          "<div class='agp-sec'>Link do cliente</div><div class='agp-box'><p>O link de aprovação e a Área do Cliente ficam na ficha de cada cliente, em Clientes.</p><button class='ag-ghost' data-p='ir-clientes'>Abrir a lista de clientes</button></div>";
        formMarca(c.querySelector("[data-p='marca']"), function () { pagina.querySelector("[data-p='prod']").textContent = nomeProduto(marca()); });
      }
      if (t === "equipe") {
        var mb = []; try { mb = (typeof WFA_MEMBERS !== "undefined" && WFA_MEMBERS) || []; } catch (e) {}
        var rotulo = function (r) { try { return (typeof ROLE_LABEL !== "undefined" && ROLE_LABEL[r]) || r; } catch (e) { return r; } };
        c.innerHTML = "<div class='agp-sec'>Equipe ativa</div><div class='agp-box'>" + (mb.length ?
          "<ul class='ag-list' style='margin:0'>" + mb.map(function (m) {
            return "<li><span>" + esc(m.full_name || m.email || "Sem nome") + "<br><small>" + esc(m.email || "") + "</small></span><small>" + esc(rotulo(m.role)) + (m.active === false ? " · aguardando liberação" : "") + "</small></li>";
          }).join("") + "</ul>" : "<p style='margin:0'>Só você por enquanto.</p>") +
          "<div style='margin-top:14px'><button class='ag-ghost' data-p='papeis'>Papéis e acessos de cada pessoa</button></div></div>" +
          "<div class='agp-sec'>Convidar</div><div class='agp-box' data-p='conv'></div>";
        blocoEquipe(c.querySelector("[data-p='conv']"));
      }
      if (t === "clientes") {
        var n = existentes().filter(function (x) { return x && x.id !== "ark"; }).length;
        c.innerHTML = "<div class='agp-sec'>Carteira</div><div class='agp-box'><p>" + (n ? n + (n === 1 ? " cliente cadastrado." : " clientes cadastrados.") : "Nenhum cliente ainda.") + "</p>" +
          "<button class='ag-btn' data-p='novo'>Novo cliente</button> <button class='ag-ghost' data-p='ir-clientes'>Ver lista</button></div>" +
          "<div class='agp-sec'>Importar</div><div class='agp-box' data-p='imp'></div>";
        blocoClientes(c.querySelector("[data-p='imp']"));
      }
      if (t === "integracoes") {
        c.innerHTML = "<div class='agp-sec'>Integrações</div><div class='agp-box'><p>Google Agenda, Google Drive, Instagram e Meta Ads. Cada agência conecta as próprias contas.</p>" +
          "<button class='ag-btn' data-p='integ'>Abrir integrações</button></div>";
      }
      if (t === "conta") {
        var eu = null; try { eu = typeof WFA_MEMBER !== "undefined" ? WFA_MEMBER : null; } catch (e) {}
        c.innerHTML = "<div class='agp-sec'>Seu perfil</div><div class='agp-box'><label class='ag-lbl'>Seu nome</label><div class='ag-inline' style='grid-template-columns:1fr auto'>" +
          "<input class='ag-in' data-p='meunome' placeholder='Como aparece nas tarefas'><button class='ag-btn' data-p='salvanome'>Salvar</button></div>" +
          "<div class='ag-msg'>" + esc((eu && eu.email) || "") + "</div></div>" +
          "<div class='agp-sec'>Primeiro acesso</div><div class='agp-box'><p>Refaz os três passos: marca, clientes e equipe.</p><button class='ag-ghost' data-p='refazer'>Refazer a configuração inicial</button></div>" +
          "<div class='agp-sec'>Sessão</div><div class='agp-box'><button class='ag-ghost' data-p='sair' style='color:#e5484d'>Sair da conta</button></div>";
        c.querySelector("[data-p='meunome']").value = (eu && eu.full_name) || "";
      }
    }
    pagina.addEventListener("click", function (ev) {
      var tb = ev.target.closest("[data-t]"); if (tb) { mostrar(tb.getAttribute("data-t")); return; }
      var b = ev.target.closest("[data-p]"); if (!b || b.tagName !== "BUTTON") return;
      var a = b.getAttribute("data-p");
      if (a === "voltar") fecharConfig();
      if (a === "ir-clientes") { fecharConfig(); clicarNav("lista-clientes"); }
      if (a === "novo") { fecharConfig(); clicarNav("lista-clientes"); setTimeout(function () { if (typeof cliNovoOpen === "function") cliNovoOpen(); }, 250); }
      if (a === "integ") { fecharConfig(); clicarNav("integracoes"); }
      if (a === "papeis") { fecharConfig(); if (typeof origOpenSettings === "function") { origOpenSettings(); if (typeof setTab === "function") setTab("equipe"); } }
      if (a === "refazer") { fecharConfig(); try { localStorage.removeItem(CHAVE_INICIO()); } catch (e) {} abrirAssistente(); }
      if (a === "sair") { if (typeof wfaSair === "function") wfaSair(); }
      if (a === "salvanome") {
        var campo = document.getElementById("set-myname"), v = pagina.querySelector("[data-p='meunome']").value.trim();
        if (campo && typeof salvarMeuNome === "function") { campo.value = v; salvarMeuNome(); }
      }
    });
    document.addEventListener("keydown", function esc_(ev) { if (ev.key === "Escape" && pagina && !wiz) { fecharConfig(); document.removeEventListener("keydown", esc_); } });
    mostrar(aba || "agencia");
  }
  W.openSettings = function () { abrirConfig("agencia"); };
  A.abrirConfig = abrirConfig; A.abrirAssistente = abrirAssistente;

  /* ---------------- partida ---------------- */
  var iniciado = false;
  function iniciar() {
    if (iniciado) return; iniciado = true;
    ajustarTextos();
    if (typeof applyBrand === "function") try { applyBrand(); } catch (e) {}
    redesenhar();
    var feito = null; try { feito = localStorage.getItem(CHAVE_INICIO()); } catch (e) {}
    if (!feito) abrirAssistente();
    setInterval(function () { if (document.visibilityState === "visible") ajustarTela(); }, 4000);
  }
  // o boot chama onboardMaybeAuto() quando a nuvem terminou de carregar: é a nossa largada.
  // Os slides antigos falam da operação da ARK, então no modo agência eles saem.
  W.onboardMaybeAuto = function () { setTimeout(iniciar, 600); };
  document.addEventListener("DOMContentLoaded", function () { ajustarTextos(); redesenhar(); });
  setTimeout(iniciar, 9000); // sem nuvem (prévia local), começa mesmo assim
})(typeof window !== "undefined" ? window : this);
