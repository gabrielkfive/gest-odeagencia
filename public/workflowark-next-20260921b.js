/* ============ WorkFlowArk NEXT · pagina do cliente com abas (21/09/2026) ============
   Carregado so pela copia (workflowark-next.html), depois do app. Substitui a Area do
   Cliente por uma pagina no molde dos benchmarks (Modo Criador: Posts / Reels / Stories
   por mes; AgencyFlow: Ficha, Aprovacao, Faturas, Saude), lendo o MESMO estado
   (state.tarefas, CLIENTES, cliDetData, state.cobranca, wfa-editorial) e gravando pelo
   MESMO caminho (saveTarefas, que sincroniza por item). Campos novos na tarefa sao
   aditivos: formato, publicarEm, legenda, briefing (o modal do legado muta o objeto e
   preserva). Nada aqui toca o /app. */
(function () {
  if (!document.body.classList.contains("next")) return;
  var MES = new Date();
  var ABA = "posts";
  var CLI = "";
  var esc = function (s) {
    return typeof mdEsc === "function"
      ? mdEsc(s)
      : String(s || "").replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
  };
  var pad = function (n) {
    return String(n).padStart(2, "0");
  };
  var mesKey = function (d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1);
  };
  var mesNome = function (d) {
    return d
      .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      .replace(/^./, function (c) {
        return c.toUpperCase();
      });
  };
  var hoje = function () {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  };
  var brData = function (s) {
    return s ? String(s).slice(0, 10).split("-").reverse().join("/") : "";
  };
  var brHora = function (s) {
    return s && s.length >= 16 ? String(s).slice(11, 16) : "";
  };
  var ST = {
    backlog: "Backlog",
    iniciar: "A iniciar",
    andamento: "Em andamento",
    aprovacao: "Homologação",
    homologcli: "Homologação do cliente",
    concluido: "Concluído",
  };
  var STC = {
    backlog: "#8b8b8b",
    iniciar: "#60a5fa",
    andamento: "#FFC700",
    aprovacao: "#a78bfa",
    homologcli: "#f472b6",
    concluido: "#4ade80",
  };
  var FMT = { estatico: "Estático", carrossel: "Carrossel", reel: "Reel", story: "Story" };
  function editorial() {
    try {
      var a = JSON.parse(localStorage.getItem("wfa-editorial") || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function tarefasDo(id) {
    var c =
      (typeof CLIENTES !== "undefined" ? CLIENTES : []).find(function (x) {
        return x.id === id;
      }) || {};
    var nm = String(c.nm || "").toLowerCase();
    return (state.tarefas || []).filter(function (t) {
      return (
        t &&
        (t.clienteId === id ||
          (nm &&
            String(t.title || "")
              .toLowerCase()
              .indexOf(nm) >= 0))
      );
    });
  }
  function noMes(t, k) {
    var d = t.publicarEm || t.data || "";
    return String(d).slice(0, 7) === k;
  }
  function chk(t) {
    var l = t.checklist || [];
    var d = l.filter(function (x) {
      return x && x.done;
    }).length;
    return l.length ? d + "/" + l.length : "";
  }
  function pill(txt, cor) {
    return '<span class="nxc-pill" style="' + (cor ? "--c:" + cor : "") + '">' + txt + "</span>";
  }

  function cardTarefa(t) {
    var atras = t.data && t.data < hoje() && t.status !== "concluido";
    return (
      '<div class="nxc-card" onclick="openTaskDetail(\'' +
      t.id +
      "')\">" +
      '<div class="nxc-card-top">' +
      pill(ST[t.status] || t.status || "", STC[t.status] || "#888") +
      (t.formato ? pill(FMT[t.formato] || t.formato) : "") +
      "</div>" +
      '<div class="nxc-card-t">' +
      esc(t.title || "(sem título)") +
      "</div>" +
      (t.legenda
        ? '<div class="nxc-card-l">' +
          esc(String(t.legenda).slice(0, 140)) +
          (t.legenda.length > 140 ? "…" : "") +
          "</div>"
        : "") +
      '<div class="nxc-card-m">' +
      (t.publicarEm
        ? '<span title="Data de publicação (o que o cliente vê)">📅 publica ' +
          brData(t.publicarEm) +
          " " +
          brHora(t.publicarEm) +
          "</span>"
        : "") +
      (t.data
        ? '<span class="' +
          (atras ? "late" : "") +
          '" title="Prazo interno">⏱ ' +
          brData(t.data) +
          "</span>"
        : "") +
      (chk(t) ? "<span>☑ " + chk(t) + "</span>" : "") +
      (t.resp ? "<span>" + esc(t.resp) + "</span>" : "") +
      "</div>" +
      '<button type="button" class="nxc-mini" onclick="event.stopPropagation();nxPost(\'' +
      t.id +
      "')\">Cartão de post</button>" +
      "</div>"
    );
  }

  function render() {
    var gen = document.getElementById("cli-portal-generic");
    var orig = document.getElementById("cli-vivenda-orig");
    if (!gen) return;
    if (orig) orig.style.display = "none";
    var c = (typeof CLIENTES !== "undefined" ? CLIENTES : []).find(function (x) {
      return x.id === CLI;
    });
    if (!c) {
      gen.innerHTML = '<div class="nxc-empty">Escolha um cliente acima.</div>';
      gen.style.display = "";
      return;
    }
    var k = mesKey(MES),
      todas = tarefasDo(CLI),
      doMes = todas.filter(function (t) {
        return noMes(t, k);
      });
    var byF = function (f) {
      return doMes.filter(function (t) {
        return f.indexOf(t.formato || "") >= 0;
      });
    };
    var posts = byF(["estatico", "carrossel"]),
      reels = byF(["reel"]),
      stories = byF(["story"]),
      semF = doMes.filter(function (t) {
        return !t.formato;
      });
    var aprov = todas.filter(function (t) {
      return t.status === "aprovacao" || t.status === "homologcli";
    });
    var abertas = todas.filter(function (t) {
      return t.status !== "concluido";
    });
    var atras = abertas.filter(function (t) {
      return t.data && t.data < hoje();
    });
    var ed = editorial().filter(function (e) {
      return e.clienteId === CLI && String(e.data || "").slice(0, 7) === k;
    });
    var cob = (state.cobranca || {})[CLI];
    var d = typeof cliDetData === "function" ? cliDetData(CLI) : {};
    var stL = { r: "Urgente", y: "Em ajuste", gr: "Saudável", churn: "Churn" }[c.status] || "Ativo";
    var abas = [
      ["posts", "Posts", posts.length],
      ["reels", "Reels", reels.length],
      ["stories", "Stories", stories.length],
      ["todas", "Sem formato", semF.length],
      ["aprov", "Aprovação", aprov.length],
      ["editorial", "Editorial", ed.length],
      ["ficha", "Ficha", ""],
      ["faturas", "Faturas", ""],
      ["saude", "Saúde", atras.length],
    ];
    var html =
      '<div class="nxc-wrap">' +
      '<div class="nxc-head"><div class="nxc-av">' +
      esc(
        String(c.nm || "?")
          .slice(0, 2)
          .toUpperCase(),
      ) +
      "</div>" +
      '<div class="nxc-hd"><div class="nxc-nm">' +
      esc(c.nm) +
      '</div><div class="nxc-sub">' +
      esc(c.plano || "") +
      " · " +
      (c.tipo === "ARK" ? "ARK" : "Squad Alpha") +
      " · " +
      stL +
      "</div></div>" +
      '<div class="nxc-mes"><button type="button" onclick="nxCliMes(-1)">‹</button><span>' +
      mesNome(MES) +
      '</span><button type="button" onclick="nxCliMes(1)">›</button></div>' +
      '<div class="nxc-acoes"><button type="button" class="nxc-btn" onclick="cliDetalhe(\'' +
      CLI +
      '\')">Ficha completa</button><button type="button" class="nxc-btn yel" onclick="nxNovaEntrega()">+ Nova entrega</button></div></div>' +
      '<div class="nxc-tabs">' +
      abas
        .map(function (a) {
          return (
            '<button type="button" class="nxc-tab' +
            (ABA === a[0] ? " on" : "") +
            '" onclick="nxCliAba(\'' +
            a[0] +
            "')\">" +
            a[1] +
            (a[2] !== "" ? " <b>" + a[2] + "</b>" : "") +
            "</button>"
          );
        })
        .join("") +
      "</div>";
    var grid = function (lst, vazio) {
      return lst.length
        ? '<div class="nxc-grid">' + lst.map(cardTarefa).join("") + "</div>"
        : '<div class="nxc-empty">' + vazio + "</div>";
    };
    if (ABA === "posts")
      html += grid(
        posts,
        "Nenhum post em " +
          mesNome(MES) +
          '. Use "Nova entrega" ou abra o cartão de post de uma tarefa e escolha o formato.',
      );
    else if (ABA === "reels") html += grid(reels, "Nenhum reel em " + mesNome(MES) + ".");
    else if (ABA === "stories") html += grid(stories, "Nenhum story em " + mesNome(MES) + ".");
    else if (ABA === "todas") html += grid(semF, "Todas as tarefas do mês já têm formato.");
    else if (ABA === "aprov") html += grid(aprov, "Nada em homologação para este cliente.");
    else if (ABA === "editorial")
      html += ed.length
        ? '<div class="nxc-list">' +
          ed
            .sort(function (a, b) {
              return String(a.data).localeCompare(String(b.data));
            })
            .map(function (e) {
              return (
                '<div class="nxc-row"><span class="nxc-dot" style="background:' +
                ({ planejado: "#8b8b8b", agendado: "#FFC700", postado: "#4ade80" }[e.status] ||
                  "#888") +
                '"></span><span class="t"><b>' +
                esc(e.titulo) +
                "</b><span>" +
                esc(e.formato || "") +
                " · " +
                esc(e.status || "") +
                '</span></span><span class="m">' +
                brData(e.data) +
                "</span></div>"
              );
            })
            .join("") +
          '</div><a class="nxc-btn" href="/calendario" target="_top" style="margin-top:12px;display:inline-block">Abrir calendário editorial</a>'
        : '<div class="nxc-empty">Sem entradas no editorial de ' +
          mesNome(MES) +
          '. <a href="/calendario" target="_top">Abrir calendário</a></div>';
    else if (ABA === "ficha") {
      var campos = [
        ["briefing", "Briefing"],
        ["nicho", "Nicho"],
        ["responsavel", "Account responsável"],
        ["email", "E-mail"],
        ["telefone", "Telefone"],
        ["instagram", "Instagram"],
        ["inicio", "Início"],
        ["drive", "Pasta de entregas (Drive)"],
        ["grupo", "Grupo de WhatsApp"],
      ];
      html +=
        '<div class="nxc-ficha">' +
        campos
          .map(function (f) {
            var v = d[f[0]] || "";
            var isLink = /^https?:\/\//.test(v);
            return (
              '<div class="nxc-fi"><label>' +
              f[1] +
              "</label><div>" +
              (v
                ? isLink
                  ? '<a href="' + esc(v) + '" target="_blank" rel="noreferrer">' + esc(v) + "</a>"
                  : esc(v)
                : '<span class="nxc-mute">não preenchido</span>') +
              "</div></div>"
            );
          })
          .join("") +
        Object.keys(d)
          .filter(function (k2) {
            return (
              !campos.some(function (f) {
                return f[0] === k2;
              }) && d[k2]
            );
          })
          .map(function (k2) {
            return (
              '<div class="nxc-fi"><label>' +
              esc(k2) +
              "</label><div>" +
              esc(String(d[k2])) +
              "</div></div>"
            );
          })
          .join("") +
        '</div><button type="button" class="nxc-btn" style="margin-top:12px" onclick="cliDetalhe(\'' +
        CLI +
        "')\">Editar ficha</button>";
    } else if (ABA === "faturas") {
      if (!cob && !(state.cobranca && Object.keys(state.cobranca).length))
        html += '<div class="nxc-empty">Sem acesso ao bloco de cobranças com o seu papel.</div>';
      else {
        var v = Number((cob && cob._valor) || c.valor || 0);
        var pago = cob && cob.cobradoMes === k;
        html +=
          '<div class="nxc-grid"><div class="nxc-kpi"><span class="l">Mensalidade</span><span class="v">' +
          (v ? "R$ " + v.toLocaleString("pt-BR") : "sem valor") +
          '</span></div><div class="nxc-kpi"><span class="l">' +
          mesNome(MES) +
          '</span><span class="v" style="color:' +
          (pago ? "#4ade80" : "#FFC700") +
          '">' +
          (pago ? "Cobrado" : "Pendente") +
          '</span></div></div><button type="button" class="nxc-btn" style="margin-top:12px" onclick="document.querySelector(\'[data-nav=cobranca]\')&&document.querySelector(\'[data-nav=cobranca]\').click()">Abrir cobranças</button>';
      }
    } else if (ABA === "saude") {
      var parada = aprov.filter(function (t) {
        return t.aprovacaoEm && Date.now() - new Date(t.aprovacaoEm).getTime() > 3 * 86400000;
      });
      var sinais = [];
      if (c.status === "churn")
        sinais.push(["#8b8b8b", "Fora da operação", "cliente marcado como churn na ficha"]);
      if (atras.length)
        sinais.push([
          "#ff6b6b",
          "Tarefas atrasadas",
          "" + atras.length + " aberta(s) com prazo antes de hoje",
        ]);
      if (parada.length)
        sinais.push([
          "#a78bfa",
          "Aprovação parada",
          "" + parada.length + " há mais de 3 dias em homologação",
        ]);
      if (!ed.length && !doMes.length)
        sinais.push([
          "#FFC700",
          "Sem entrega no mês",
          "nada no editorial nem tarefa com data em " + mesNome(MES),
        ]);
      if (!abertas.length)
        sinais.push(["#8b8b8b", "Sem tarefa aberta", "nenhuma atividade em andamento"]);
      if (!sinais.length)
        sinais.push(["#4ade80", "Em dia", "sem atraso, sem aprovação parada, com entrega no mês"]);
      html +=
        '<div class="nxc-list">' +
        sinais
          .map(function (s) {
            return (
              '<div class="nxc-row"><span class="nxc-dot" style="background:' +
              s[0] +
              '"></span><span class="t"><b>' +
              s[1] +
              "</b><span>" +
              s[2] +
              "</span></span></div>"
            );
          })
          .join("") +
        '</div><p class="nxc-mute" style="margin-top:10px;font-size:12px">Sinal explicado pelos registros, sem score inventado.</p>';
    }
    html += "</div>";
    gen.innerHTML = html;
    gen.style.display = "";
  }

  window.cliAreaSelect = function (id) {
    CLI = id || "";
    try {
      localStorage.setItem("wfa-cliente-ativo", CLI);
    } catch (e) {}
    render();
  };
  window.nxCliAba = function (a) {
    ABA = a;
    render();
  };
  window.nxCliMes = function (n) {
    MES = new Date(MES.getFullYear(), MES.getMonth() + n, 1);
    render();
  };
  window.nxNovaEntrega = function () {
    if (typeof openNovaTarefa !== "function") return;
    try {
      window.WFA_FILTROS = window.WFA_FILTROS || {};
      WFA_FILTROS.cli = CLI;
    } catch (e) {}
    openNovaTarefa("backlog");
  };
  /* Cartao de post (Modo Criador): formato, data de publicacao, legenda, briefing. Grava na
     tarefa real por saveTarefas (sync por item). */
  window.nxPost = function (id) {
    var t = (state.tarefas || []).find(function (x) {
      return x.id === id;
    });
    if (!t) return;
    var ov = document.createElement("div");
    ov.className = "nxc-ov";
    ov.id = "nxc-post";
    ov.innerHTML =
      '<div class="nxc-box" role="dialog" aria-label="Cartão de post">' +
      '<div class="nxc-box-h"><b>Cartão de post</b><span class="nxc-mute">' +
      esc(t.title || "") +
      '</span><button type="button" class="nxc-x" onclick="nxPostFecha()">×</button></div>' +
      '<label>Formato</label><div class="nxc-fmt">' +
      Object.keys(FMT)
        .map(function (f) {
          return (
            '<button type="button" data-f="' +
            f +
            '" class="' +
            (t.formato === f ? "on" : "") +
            '">' +
            FMT[f] +
            "</button>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="nxc-2"><div><label>Prazo interno</label><input id="nxp-data" type="date" value="' +
      esc(t.data || "") +
      '"></div><div><label>Data de publicação <span class="nxc-mute">(o que o cliente vê)</span></label><input id="nxp-pub" type="datetime-local" value="' +
      esc(t.publicarEm || "") +
      '"></div></div>' +
      '<label>Briefing</label><textarea id="nxp-brief" rows="3">' +
      esc(t.briefing || t.desc || "") +
      "</textarea>" +
      '<label>Legenda <span id="nxp-cnt" class="nxc-mute"></span></label><textarea id="nxp-leg" rows="5">' +
      esc(t.legenda || "") +
      "</textarea>" +
      '<div class="nxc-box-f"><span id="nxp-st" class="nxc-mute"></span><button type="button" class="nxc-btn" onclick="openTaskDetail(\'' +
      id +
      '\')">Abrir tarefa completa</button><button type="button" class="nxc-btn yel" onclick="nxPostSalva(\'' +
      id +
      "')\">Salvar</button></div>" +
      "</div>";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) nxPostFecha();
    });
    ov.querySelectorAll(".nxc-fmt button").forEach(function (b) {
      b.addEventListener("click", function () {
        ov.querySelectorAll(".nxc-fmt button").forEach(function (x) {
          x.classList.remove("on");
        });
        b.classList.add("on");
      });
    });
    var leg = ov.querySelector("#nxp-leg"),
      cnt = ov.querySelector("#nxp-cnt");
    var up = function () {
      cnt.textContent = leg.value.length + "/2200";
    };
    leg.addEventListener("input", up);
    up();
    document.addEventListener("keydown", nxEsc);
  };
  function nxEsc(e) {
    if (e.key === "Escape") nxPostFecha();
  }
  window.nxPostFecha = function () {
    var ov = document.getElementById("nxc-post");
    if (ov) ov.remove();
    document.removeEventListener("keydown", nxEsc);
  };
  window.nxPostSalva = function (id) {
    var t = (state.tarefas || []).find(function (x) {
      return x.id === id;
    });
    if (!t) return;
    var ov = document.getElementById("nxc-post");
    if (!ov) return;
    var f = ov.querySelector(".nxc-fmt button.on");
    t.formato = f ? f.getAttribute("data-f") : "";
    t.data = ov.querySelector("#nxp-data").value || t.data;
    t.publicarEm = ov.querySelector("#nxp-pub").value || "";
    t.briefing = ov.querySelector("#nxp-brief").value;
    t.legenda = ov.querySelector("#nxp-leg").value;
    t.up = new Date().toISOString();
    try {
      saveTarefas();
    } catch (e) {
      ov.querySelector("#nxp-st").textContent = "Não salvou: " + e.message;
      return;
    }
    ov.querySelector("#nxp-st").textContent =
      "Salvo " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (typeof toast === "function") toast("Cartão de post salvo");
    setTimeout(nxPostFecha, 500);
    render();
  };
  /* ao entrar na aba do cliente, abre o ultimo cliente escolhido */
  document.querySelectorAll('[data-nav="cliente"]').forEach(function (el) {
    el.addEventListener("click", function () {
      setTimeout(function () {
        var sel = document.getElementById("cli-area-sel");
        var v =
          (typeof wfaClienteAtivo === "function" ? wfaClienteAtivo() : "") ||
          (sel && sel.value) ||
          "";
        if (sel && v) {
          sel.value = v;
        }
        cliAreaSelect(v);
      }, 60);
    });
  });

  /* Inicio enxuto (21/09, voz do Gabriel): widgets comecam minimizados, um botao discreto abre. */
  (function () {
    var board = document.getElementById("mdw-board");
    var add = document.getElementById("mdw-add");
    if (!board || !add) return;
    board.classList.add("nx-min");
    var h = add.closest("div") && add.closest("div").parentElement;
    if (h) h.classList.add("nx-widgets-h");
    var b = document.createElement("button");
    b.type = "button";
    b.className = "icobtn";
    b.textContent = "Mostrar widgets";
    b.onclick = function () {
      var min = board.classList.toggle("nx-min");
      b.textContent = min ? "Mostrar widgets" : "Esconder widgets";
    };
    add.parentElement.insertBefore(b, add);
    add.title = "Adicionar widget";
  })();

  /* Projetos: "Visao geral" no molde AgencyFlow (E03), antes da carteira: um cartao por
     projeto (cliente, sprint, progresso, atrasadas, pessoas, proximo vencimento) e barras
     gerais (tarefas em andamento / abertas, entregas de social do mes). Clique abre o
     projeto pelo mesmo caminho do legado (data-open). Le wfa-projetos + state.tarefas. */
  (function () {
    var orig = window.renderProjetos;
    if (typeof orig !== "function") return;
    function projetos() {
      try { var a = JSON.parse(localStorage.getItem("wfa-projetos") || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    function ini(n) { return String(n || "?").split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2).toUpperCase(); }
    function visao() {
      var l = document.getElementById("pj-lista");
      if (!l) return;
      var box = document.getElementById("nx-pj-overview");
      if (!box) { box = document.createElement("div"); box.id = "nx-pj-overview"; l.parentElement.insertBefore(box, l); }
      if (l.style.display === "none") { box.style.display = "none"; return; }
      box.style.display = "";
      var hj = hoje(), pjs = projetos();
      var cards = pjs.map(function (p) {
        var ts = (p.tarefas || []).filter(function (t) { return t && t.id; });
        var done = ts.filter(function (t) { return t.st === "concluido"; }).length;
        var abertas = ts.filter(function (t) { return t.st !== "concluido"; });
        var atras = abertas.filter(function (t) { return t.venc && t.venc < hj; }).length;
        var pct = ts.length ? Math.round((100 * done) / ts.length) : 0;
        var pessoas = []; abertas.forEach(function (t) { (t.resps || (t.resp ? [t.resp] : [])).forEach(function (r) { if (r && pessoas.indexOf(r) < 0) pessoas.push(r); }); });
        var prox = abertas.map(function (t) { return t.venc; }).filter(Boolean).sort()[0];
        var dias = prox ? Math.round((new Date(prox + "T12:00:00") - new Date(hj + "T12:00:00")) / 86400000) : null;
        return '<div class="nxp-card" data-open="' + esc(p.id) + '">'
          + '<div class="nxp-top"><b>' + esc(p.cliente || p.nome || "Projeto") + '</b>' + (p.sprint ? '<span class="nxc-pill">' + esc(p.sprint) + "</span>" : "") + "</div>"
          + '<div class="nxp-bar"><i style="width:' + pct + '%"></i></div>'
          + '<div class="nxp-m"><span>' + pct + "% · " + done + "/" + ts.length + " concluídas</span>"
          + (dias === null ? "" : '<span class="' + (dias < 0 ? "late" : "") + '">' + (dias < 0 ? Math.abs(dias) + " dia(s) atrasado" : dias === 0 ? "vence hoje" : dias + " dia(s) pro próximo prazo") + "</span>") + "</div>"
          + '<div class="nxp-foot"><span class="nxp-avs">' + pessoas.slice(0, 5).map(function (n) { return '<i title="' + esc(n) + '">' + esc(ini(n)) + "</i>"; }).join("") + (pessoas.length > 5 ? "<i>+" + (pessoas.length - 5) + "</i>" : "") + "</span>"
          + '<span class="nxp-cnt" title="pessoas · abertas · atrasadas">👤 ' + pessoas.length + " · ☐ " + abertas.length + (atras ? ' · <b class="late">⚠ ' + atras + "</b>" : "") + "</span></div>"
          + "</div>";
      }).join("");
      var tAb = (state.tarefas || []).filter(function (t) { return t && t.status !== "concluido"; });
      var tAnd = tAb.filter(function (t) { return t.status === "andamento"; }).length;
      var mesK = hj.slice(0, 7);
      var social = (state.tarefas || []).filter(function (t) { return t && t.publicarEm && String(t.publicarEm).slice(0, 7) === mesK; });
      var socialOk = social.filter(function (t) { return t.status === "concluido"; }).length;
      var barra = function (l, a, b, cor) { var pc = b ? Math.round((100 * a) / b) : 0; return '<div class="nxp-geral"><div class="nxp-gl"><span>' + l + "</span><b>" + a + "/" + b + "</b></div><div class=\"nxp-bar\"><i style=\"width:" + pc + "%;background:" + cor + '"></i></div></div>'; };
      box.innerHTML = '<div class="nxp-h"><h2>Visão geral dos projetos</h2><span class="nxc-mute">' + pjs.length + " projeto(s) · clique pra abrir o quadro</span></div>"
        + (cards ? '<div class="nxp-grid">' + cards + "</div>" : '<div class="nxc-empty">Nenhum projeto ainda. Crie o primeiro na carteira abaixo.</div>')
        + '<div class="nxp-gerais">' + barra("Tarefas gerais (em andamento / abertas)", tAnd, tAb.length, "#ffd400") + barra("Entregas de social do mês (publicadas / com data)", socialOk, social.length, "#4ade80") + "</div>";
    }
    window.renderProjetos = function () { orig(); try { visao(); } catch (e) { console.warn("nx projetos", e); } };
  })();

  /* Producao audiovisual "que pensa" (21/09, voz do Gabriel): compara o combinado de cada
     cliente (campo `cap` = captacoes por mes na carteira) com as captacoes agendadas no mes
     (wfa-producao) e com os reels/videos com data de publicacao sem captacao. Sugere e
     pre-preenche o formulario existente (prodNovaToggle + prodCriar), sem criar nada sozinho. */
  (function () {
    var orig = window.renderProducao;
    if (typeof orig !== "function") return;
    function plano() {
      var list = document.getElementById("prod-list");
      if (!list) return;
      var box = document.getElementById("nx-prod-plano");
      if (!box) { box = document.createElement("div"); box.id = "nx-prod-plano"; list.parentElement.insertBefore(box, list); }
      var mesK = hoje().slice(0, 7);
      var caps = (typeof loadProducao === "function" ? loadProducao() : []).filter(function (c) { return c && String(c.data || "").slice(0, 7) === mesK; });
      var cli = (typeof CLIENTES !== "undefined" ? CLIENTES : []).filter(function (c) { return c && c.status !== "churn"; });
      var linhas = [];
      cli.forEach(function (c) {
        var meta = Number(c.cap) || 0;
        var feitas = caps.filter(function (x) { return x.clienteId === c.id; });
        var reels = (state.tarefas || []).filter(function (t) { return t && t.clienteId === c.id && t.status !== "concluido" && (t.formato === "reel" || t.origem === "captacao") && String(t.publicarEm || t.data || "").slice(0, 7) === mesK; });
        var falta = Math.max(0, meta - feitas.length);
        if (!meta && !reels.length) return;
        linhas.push({ c: c, meta: meta, feitas: feitas.length, falta: falta, reels: reels });
      });
      linhas.sort(function (a, b) { return b.falta - a.falta || b.reels.length - a.reels.length; });
      var pend = linhas.filter(function (l) { return l.falta > 0; });
      box.innerHTML = '<div class="nxp-h"><h2>Plano de captações do mês</h2><span class="nxc-mute">' + pend.length + ' cliente(s) abaixo do combinado · combinado vem da carteira (captações por mês)</span></div>'
        + (linhas.length ? '<div class="nxp-grid">' + linhas.map(function (l) {
          var pc = l.meta ? Math.min(100, Math.round((100 * l.feitas) / l.meta)) : 0;
          return '<div class="nxp-card" style="cursor:default">'
            + '<div class="nxp-top"><b>' + esc(l.c.nm) + '</b>' + (l.meta ? '<span class="nxc-pill">' + l.feitas + "/" + l.meta + " no mês</span>" : '<span class="nxc-pill">sem combinado</span>') + "</div>"
            + '<div class="nxp-bar"><i style="width:' + pc + '%;background:' + (l.falta ? "#ffd400" : "#4ade80") + '"></i></div>'
            + '<div class="nxp-m"><span>' + (l.falta ? "faltam " + l.falta + " captação(ões)" : l.meta ? "combinado do mês cumprido" : "") + "</span><span>" + (l.reels.length ? l.reels.length + " reel(s) com data" : "") + "</span></div>"
            + (l.falta || l.reels.length ? '<button type="button" class="nxc-btn yel" style="align-self:flex-start" onclick="nxProdAgendar(\'' + l.c.id + "')\">Agendar captação</button>" : "")
            + "</div>";
        }).join("") + "</div>" : '<div class="nxc-empty">Nenhum cliente com combinado de captações na carteira. Preencha "captações por mês" na ficha.</div>');
    }
    window.nxProdAgendar = function (id) {
      var f = document.getElementById("prod-form");
      if (!f) return;
      if (!f.classList.contains("open") && typeof prodNovaToggle === "function") prodNovaToggle();
      var sel = document.getElementById("prod-cliente"); if (sel) sel.value = id;
      var mesK = hoje().slice(0, 7);
      var reels = (state.tarefas || []).filter(function (t) { return t && t.clienteId === id && t.status !== "concluido" && t.formato === "reel" && String(t.publicarEm || t.data || "").slice(0, 7) === mesK; });
      var v = document.getElementById("prod-videos");
      if (v && !v.value && reels.length) v.value = reels.map(function (t) { return t.title; }).join("\n");
      f.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.renderProducao = function () { orig(); try { plano(); } catch (e) { console.warn("nx producao", e); } };
  })();

  /* Início no molde "instrumento, não formulário" (doc 07, lote 1, 21/09). Bloco #nx-inicio
     depois do cabeçalho do Meu Dia: KPIs em matriz de pontos, linha do mês, dois cartões
     aurora (saúde da carteira, entregas no prazo) e três clientes que pedem atenção. Os
     números vêm de NX_CALC.inicio (workflowark-next-calc-<data>.js, testado em Node). Só
     repinta quando os números mudam, como o md-kpis do legado. Nada é criado, só lido. */
  (function () {
    var orig = window.renderMeuDia;
    if (typeof orig !== "function" || typeof NX_CALC === "undefined") return;
    var SIG = "";
    function editorialLista() {
      try { var a = JSON.parse(localStorage.getItem("wfa-editorial") || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
    }
    function nomeMembro() {
      return (typeof WFA_MEMBER !== "undefined" && WFA_MEMBER && WFA_MEMBER.full_name) || "";
    }
    function nav(id) {
      var el = document.querySelector('[data-nav="' + id + '"]');
      if (el) el.click();
      return !!el;
    }
    window.nxIrTarefas = function () { nav("tarefas"); };
    window.nxIrClientes = function () { nav("lista-clientes") || nav("cliente"); };
    window.nxIrCliente = function (id) {
      if (!nav("cliente")) return;
      setTimeout(function () {
        var sel = document.getElementById("cli-area-sel");
        if (sel) sel.value = id;
        if (typeof cliAreaSelect === "function") cliAreaSelect(id);
      }, 80);
    };
    function mesCurto(iso) {
      return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
    }
    function mesLongo(iso) {
      return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { month: "long" });
    }
    function kpi(n, rotulo, alerta, acao) {
      return '<button type="button" class="nxi-kpi' + (alerta && n ? " alerta" : "") + '" onclick="' + acao + '"><span class="n">' + n + '</span><span class="l">' + rotulo + "</span></button>";
    }
    function linhaMes(r, H) {
      var y = +H.slice(0, 4), m = +H.slice(5, 7);
      var dim = new Date(y, m, 0).getDate();
      var pos = function (d) { return ((+d.slice(8, 10) - 1) / (dim - 1)) * 100; };
      var porDia = {};
      r.linha.forEach(function (p) { (porDia[p.dia] = porDia[p.dia] || []).push(p); });
      var pontos = Object.keys(porDia).map(function (d) {
        var l = porDia[d];
        var cor = l.some(function (p) { return p.cor === "alerta"; }) ? "alerta" : l.every(function (p) { return p.cor === "ok"; }) ? "ok" : l.some(function (p) { return p.cor === "andamento"; }) ? "andamento" : "planejado";
        var t = l.map(function (p) { return p.titulo; }).join(" · ");
        var id = (l.find(function (p) { return p.id; }) || {}).id;
        return '<span class="d ' + cor + '" style="left:' + pos(d).toFixed(2) + '%" title="' + esc(brData(d) + ": " + t) + '"' + (id ? ' onclick="openTaskDetail(\'' + esc(id) + "')\"" : "") + "></span>";
      }).join("");
      var pub = r.linha.filter(function (p) { return p.cor === "ok"; }).length;
      var flag = r.linha.length
        ? r.linha.length + " entrega" + (r.linha.length === 1 ? "" : "s") + " em " + mesLongo(H) + " · " + pub + " publicada" + (pub === 1 ? "" : "s")
        : "Nenhuma entrega com data em " + mesLongo(H);
      return '<div class="nxi-tl"><div class="line"></div>' + pontos +
        '<span class="hoje" style="left:' + pos(H).toFixed(2) + '%"></span>' +
        '<span class="m1">' + mesCurto(H.slice(0, 8) + "01") + '</span><span class="m2">' + mesCurto(H.slice(0, 8) + pad(dim)) + "</span>" +
        '<div class="flag">' + flag + "</div></div>";
    }
    function aurora(classe, titulo, numero, sub, acao) {
      /* data-aura-keep em cada filho: o normalizador AURA escurece por elemento, não por subárvore */
      return '<button type="button" class="nxi-aurora ' + classe + '" data-aura-keep' + (acao ? ' onclick="' + acao + '"' : "") + '><div class="t" data-aura-keep>' + titulo + '</div><div class="n" data-aura-keep>' + numero + '</div><div class="s" data-aura-keep>' + sub + '</div>' + (classe === "vazio" ? "" : '<div class="bars" data-aura-keep></div>') + "</button>";
    }
    function render() {
      var pg = document.getElementById("page-dashboard");
      if (!pg || typeof state === "undefined") return;
      var box = document.getElementById("nx-inicio");
      if (!box) {
        box = document.createElement("div");
        box.id = "nx-inicio";
        box.className = "nxi-in";
        var head = pg.querySelector(".page-head");
        if (head) head.insertAdjacentElement("afterend", box);
        else pg.insertAdjacentElement("afterbegin", box);
      }
      var H = typeof hojeSP === "function" ? hojeSP() : hoje();
      var r = NX_CALC.inicio({
        tarefas: state.tarefas || [],
        clientes: typeof CLIENTES !== "undefined" ? CLIENTES : [],
        editorial: editorialLista(),
        hoje: H,
        nome: nomeMembro(),
      });
      var sig = JSON.stringify([H, r.kpis, r.saude.verdes, r.saude.total, r.prazo, r.linha, r.atencao]);
      if (sig === SIG) return;
      SIG = sig;
      var s = r.saude, p = r.prazo;
      var html =
        '<div class="nxi-kpis">' +
        kpi(r.kpis.hoje, "vencem hoje", false, "nxIrTarefas()") +
        kpi(r.kpis.atrasadas, r.kpis.atrasadas === 1 ? "atrasada" : "atrasadas", true, "nxIrTarefas()") +
        kpi(r.kpis.aprovacao, "em aprovação", false, "nxIrTarefas()") +
        kpi(r.kpis.publicamSemana, "publicam esta semana", false, "nxIrTarefas()") +
        "</div>" +
        linhaMes(r, H) +
        '<div class="nxi-aur">' +
        (s.total
          ? aurora(s.verdes / s.total >= 0.7 ? "bom" : "atencao", "Saúde da carteira", s.verdes, s.verdes + " de " + s.total + " cliente" + (s.total === 1 ? "" : "s") + " sem alerta", "nxIrClientes()")
          : aurora("vazio", "Saúde da carteira", "sem dados", "nenhum cliente ativo na carteira")) +
        (p.pct === null
          ? aurora("vazio", "Entregas no prazo", "sem dados", "nenhuma entrega concluída com prazo em " + mesLongo(H))
          : aurora(p.pct >= 80 ? "bom" : "atencao", "Entregas no prazo", p.pct + "%", p.ok + " de " + p.total + " concluída" + (p.total === 1 ? "" : "s") + " no prazo em " + mesLongo(H), "nxIrTarefas()")) +
        "</div>" +
        '<div class="nxi-minis">' +
        (r.atencao.length
          ? r.atencao.map(function (c) {
              var semEntrega = c.rotulo === "sem entrega no mês";
              return '<button type="button" class="nxi-mini" onclick="nxIrCliente(\'' + esc(c.id) + '\')"><div class="l"><span>' + esc(c.nm) + "</span><i>" + c.sinais + " sinal" + (c.sinais === 1 ? "" : "is") + '</i></div><div class="n">' + (semEntrega ? "0" : c.n) + "<small>" + (semEntrega ? "entregas no mês" : esc(c.rotulo)) + "</small></div></button>";
            }).join("")
          : '<div class="nxi-mini tudo"><div class="l"><span>Carteira</span></div><div class="n">' + s.total + "<small>cliente" + (s.total === 1 ? "" : "s") + " sem alerta</small></div></div>") +
        "</div>";
      box.innerHTML = html;
    }
    window.renderMeuDia = function () {
      orig.apply(this, arguments);
      try { render(); } catch (e) { console.warn("nx inicio", e); }
    };
    setInterval(function () { try { render(); } catch (e) {} }, 60000);
    try { render(); } catch (e) { console.warn("nx inicio", e); }
  })();
})();
