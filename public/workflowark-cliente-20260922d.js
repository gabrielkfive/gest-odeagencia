/* ============ WorkFlowArk · pagina do cliente com abas (21/09/2026, exportada do /next) ============
   Posts / Reels / Stories / Aprovacao / Editorial / Ficha / Faturas / Saude por cliente e mes,
   lendo o MESMO estado e gravando por saveTarefas (item unico). Pedido do Gabriel no video de 21/09.
   Carregada depois do app. Nao toca em mais nada. */
(function () {
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
  /* ===== APROVACAO SEM ESTRESSE (tarefa 07 do doc 11, 22/09/2026) =====
     Espelho do modulo puro src/lib/aprovacao.js, que e quem os testes cobrem
     (deploy/teste-aprovacao.mjs). Mudou la, muda aqui. */
  var APR_CORTE = 125;
  var APR_PROP = { reel: "9:16", reels: "9:16", story: "9:16", stories: "9:16", carrossel: "1:1", carousel: "1:1" };
  var APR_IMG = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i;
  var APR_VID = /\.(mp4|mov|webm|m4v)(\?|$)/i;
  function aprAnexos(t) {
    return (Array.isArray(t.attachments) ? t.attachments : []).filter(function (a) {
      return a && /^https?:\/\//.test(String(a.url || ""));
    });
  }
  function aprPrevia(lista) {
    var img = lista.find(function (a) {
      return APR_IMG.test(String(a.url)) || /imagem|image/i.test(String(a.tipo || ""));
    });
    var alvo = img || lista.find(function (a) { return APR_VID.test(String(a.url)); }) || lista[0];
    if (!alvo) return null;
    var url = String(alvo.url);
    return {
      url: url,
      nome: String(alvo.nome || url),
      tipo: APR_IMG.test(url) || img === alvo ? "imagem" : APR_VID.test(url) ? "video" : "arquivo",
    };
  }
  function aprDias(deIso) {
    if (!deIso) return 0;
    var de = new Date(deIso).getTime();
    if (!de) return 0;
    var d = Math.floor((Date.now() - de) / 86400000);
    return d > 0 ? d : 0;
  }
  function aprDerivar(tarefas) {
    return (tarefas || []).map(function (t) {
      var lista = aprAnexos(t);
      var legenda = String(t.legenda || "");
      var corta = legenda.length > APR_CORTE;
      return {
        id: t.id,
        titulo: t.title || "(sem titulo)",
        formato: t.formato || "",
        proporcao: APR_PROP[String(t.formato || "").toLowerCase()] || "4:5",
        publicarEm: t.publicarEm || "",
        previa: aprPrevia(lista),
        arquivos: lista.length,
        semArquivo: lista.length === 0,
        legenda: legenda,
        legendaCurta: corta ? legenda.slice(0, APR_CORTE).replace(/\s+$/, "") + "..." : legenda,
        legendaMais: corta,
        diasParado: aprDias(t.aprovacaoEm),
        enviadoClienteEm: t.enviadoClienteEm || "",
      };
    });
  }
  /* ===== PREVIA DO FEED (tela 5 do doc 11, 22/09/2026) =====
     Espelho de src/lib/feed.js (testado em deploy/teste-feed.mjs). Story fica fora: nao
     aparece na grade do perfil. */
  var FEED_FORA = ["story", "stories"];
  function feedDerivar(tarefas, limite) {
    var agora = Date.now();
    return (tarefas || [])
      .filter(function (t) {
        return (
          FEED_FORA.indexOf(String(t.formato || "").toLowerCase()) < 0 &&
          (t.status === "concluido" || t.status === "homologcli")
        );
      })
      .map(function (t) {
        var pv = aprPrevia(aprAnexos(t));
        if (!pv || pv.tipo !== "imagem") return null;
        var quando = String(t.publicarEm || "");
        return {
          id: t.id,
          titulo: t.title || "(sem titulo)",
          formato: t.formato || "",
          proporcao: APR_PROP[String(t.formato || "").toLowerCase()] || "4:5",
          publicarEm: quando,
          futuro: !!quando && new Date(quando).getTime() > agora,
          aprovado: t.status === "concluido",
          previa: pv,
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (!a.publicarEm && !b.publicarEm) return 0;
        if (!a.publicarEm) return 1;
        if (!b.publicarEm) return -1;
        return b.publicarEm.localeCompare(a.publicarEm);
      })
      .slice(0, limite || 12);
  }

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
      /* A arte entra antes de tudo: o Gabriel quer ver o post, nao um ícone. Mesma escolha
         de prévia da aba Aprovação (aprPrevia), com o enquadramento do formato. */
      (function () {
        var pv = aprPrevia(aprAnexos(t));
        if (!pv || pv.tipo !== "imagem") return "";
        var prop = APR_PROP[String(t.formato || "").toLowerCase()] || "4:5";
        return (
          '<div class="nxc-card-midia r' + prop.replace(":", "x") + '">' +
          '<img src="' + esc(pv.url) + '" alt="" loading="lazy" onerror="this.parentNode.remove()">' +
          "</div>"
        );
      })() +
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
      ["feed", "Feed", ""],
      ["entregas", "Entregas", todas.filter(function (t) { return t.status === "concluido" && ((t.attachments || []).length || t.legenda || t.publicarEm); }).length],
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
      '\')">Ficha completa</button><button type="button" class="nxc-btn" onclick="nxPortalLink()">Link do portal</button><button type="button" class="nxc-btn yel" onclick="nxNovaEntrega()">+ Nova entrega</button></div></div>' +
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
    else if (ABA === "aprov") {
      /* O portal so mostra o que esta esperando o CLIENTE (homologcli). Homologacao
         interna (aprovacao) e coisa de equipe e fica numa secao separada. */
      var itens = aprDerivar(
        aprov.filter(function (t) { return t.status === "homologcli"; }),
      );
      var internas = aprov.filter(function (t) { return t.status === "aprovacao"; });
      html += itens.length
        ? '<div class="apr-wrap">' +
          itens
            .map(function (a) {
              var prev = a.previa
                ? a.previa.tipo === "imagem"
                  ? '<img src="' + esc(a.previa.url) + '" alt="' + esc(a.titulo) + '" loading="lazy">'
                  : '<div class="apr-arq"><b>' + esc(a.previa.nome) + "</b><span>" +
                    (a.previa.tipo === "video" ? "vídeo anexado" : "arquivo anexado") + "</span></div>"
                : '<div class="apr-vazio"><b>Sem arte anexada</b><span>o cliente não tem o que aprovar</span></div>';
              return (
                '<article class="apr-card' + (a.semArquivo ? " falta" : "") + '">' +
                '<div class="apr-midia r' + a.proporcao.replace(":", "x") + '">' + prev + "</div>" +
                '<div class="apr-corpo">' +
                '<div class="apr-top"><b>' + esc(a.titulo) + "</b>" +
                '<span class="apr-tags">' + (a.formato ? esc(FMT[a.formato] || a.formato) : "sem formato") +
                (a.publicarEm
                  ? " · publica " + brData(a.publicarEm) + (brHora(a.publicarEm) ? " " + brHora(a.publicarEm) : "")
                  : "") +
                "</span></div>" +
                (a.legenda
                  ? '<p class="apr-leg">' + esc(a.legendaCurta) +
                    (a.legendaMais
                      ? ' <button type="button" class="apr-mais" data-leg="' + esc(a.legenda) + '" onclick="nxAprMais(this)">mais</button>'
                      : "") + "</p>"
                  : '<p class="apr-leg apr-mute">Sem legenda escrita.</p>') +
                '<div class="apr-rod">' +
                '<span class="apr-espera' + (a.diasParado >= 3 ? " alerta" : "") + '">' +
                (a.diasParado
                  ? "esperando há " + a.diasParado + (a.diasParado === 1 ? " dia" : " dias")
                  : "esperando o cliente") +
                (a.enviadoClienteEm ? " · enviado " + brData(a.enviadoClienteEm) : " · ainda não enviado") +
                "</span>" +
                '<span class="apr-acoes">' +
                '<button type="button" class="nxc-btn" data-tid="' + esc(a.id) + '" onclick="openTaskDetail(this.getAttribute(&quot;data-tid&quot;))">Abrir tarefa</button>' +
                '<button type="button" class="nxc-btn yel" data-tid="' + esc(a.id) + '" onclick="nxAprEnviar(this.getAttribute(&quot;data-tid&quot;))">Enviar ao cliente</button>' +
                "</span></div></div></article>"
              );
            })
            .join("") +
          '</div><p class="nxc-mute" style="margin-top:10px;font-size:12px">É exatamente isto que o cliente abre no portal, sem login. Enviar ao cliente gera o link, copia e registra na tarefa.</p>'
        : '<div class="nxc-empty">Nada esperando o cliente agora.</div>';
      if (internas.length)
        html +=
          '<h3 class="apr-sec">Homologação interna <span>' +
          internas.length +
          '</span></h3><p class="nxc-mute" style="font-size:12px;margin:0 0 10px">A equipe ainda está revisando. O cliente não vê isto no portal.</p>' +
          '<div class="nxc-grid">' + internas.map(cardTarefa).join("") + '</div>';
    }
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
    } else if (ABA === "entregas") {
      /* o que o cliente ve no portal: concluidas com midia, legenda ou data de publicacao */
      var ent = todas.filter(function (t) { return t.status === "concluido" && ((t.attachments || []).length || t.legenda || t.publicarEm); })
        .sort(function (a, b) { return String(b.publicarEm || b.concluidaEm || "").localeCompare(String(a.publicarEm || a.concluidaEm || "")); });
      html += ent.length
        ? '<div class="nxc-list">' + ent.map(function (t) {
            var links = (t.attachments || []).filter(function (a) { return a && /^https?:/.test(a.url || ""); });
            return '<div class="nxc-row" data-tid="' + esc(t.id) + '" onclick="openTaskDetail(this.getAttribute(&quot;data-tid&quot;))" style="cursor:pointer"><span class="nxc-dot" style="background:#4ade80"></span><span class="t"><b>' + esc(t.title || "") + '</b><span>' + (t.formato ? FMT[t.formato] + " · " : "") + (t.publicarEm ? "publica " + brData(t.publicarEm) : "entregue " + brData(t.concluidaEm)) + (links.length ? " · " + links.length + " arquivo(s)" : " · sem arquivo") + '</span></span>' + (links.length ? '<a class="nxc-mini" href="' + esc(links[0].url) + '" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Abrir</a>' : "") + "</div>";
          }).join("") + '</div><p class="nxc-mute" style="margin-top:10px;font-size:12px">É isto que o cliente vê no portal (link sem login). Anexe o arquivo ou o link do Drive na tarefa antes de concluir.</p>'
        : '<div class="nxc-empty">Nenhuma entrega concluída com arquivo, legenda ou data ainda.</div>';
    } else if (ABA === "feed") {
      var grade = feedDerivar(todas, 12);
      html += grade.length
        ? '<p class="nxc-mute" style="font-size:12px;margin:0 0 12px">Como o perfil vai ficar, na ordem de publica\u00e7\u00e3o. Story fica de fora porque n\u00e3o entra na grade.</p>' +
          '<div class="feed-grade">' +
          grade
            .map(function (g) {
              return (
                '<figure class="feed-item' + (g.futuro ? " futuro" : "") + '" title="' + esc(g.titulo) + '">' +
                '<img src="' + esc(g.previa.url) + '" alt="' + esc(g.titulo) + '" loading="lazy" onerror="this.parentNode.classList.add(\'quebrada\')">' +
                '<figcaption>' +
                (g.publicarEm ? brData(g.publicarEm) : "sem data") +
                (g.aprovado ? "" : " \u00b7 esperando o cliente") +
                "</figcaption></figure>"
              );
            })
            .join("") +
          "</div>"
        : '<div class="nxc-empty">Sem arte anexada ainda. O feed aparece quando as tarefas tiverem imagem.</div>';
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
  /* Link do portal do cliente (mesmo token do Planejamento): gera, copia e mostra */
  window.nxPortalLink = async function () {
    var c = (typeof CLIENTES !== "undefined" ? CLIENTES : []).find(function (x) { return x.id === CLI; });
    if (!c || typeof cloudCall !== "function") return;
    try {
      var r = await cloudCall("save", { action: "create-portal", cliente: c.nm, planKey: typeof planKey === "function" ? planKey(c.nm) : String(c.nm).toLowerCase() });
      if (!r || !r.token) throw new Error((r && r.error) || "Falha ao gerar");
      var url = location.origin + "/portal?t=" + r.token;
      try { await navigator.clipboard.writeText(url); } catch (e) {}
      if (typeof prompt === "function") prompt("Portal de " + c.nm + " (link copiado, mande pra ele):", url);
      if (typeof toast === "function") toast("Link do portal copiado");
    } catch (e) { if (typeof toast === "function") toast("Não consegui gerar o link: " + (e.message || e)); }
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
  window.nxAprMais = function (btn) {
    var p = btn.parentNode;
    if (p) p.textContent = btn.getAttribute("data-leg") || "";
  };
  /* Enviar ao cliente: gera o link do portal, copia e registra na tarefa (uma linha por dia,
     espelho de marcarEnviadoAoCliente em src/lib/aprovacao.js). */
  window.nxAprEnviar = async function (id) {
    var t = (state.tarefas || []).find(function (x) { return x.id === id; });
    var c = (typeof CLIENTES !== "undefined" ? CLIENTES : []).find(function (x) { return x.id === CLI; });
    if (!t || !c || typeof cloudCall !== "function") return;
    try {
      var r = await cloudCall("save", {
        action: "create-portal",
        cliente: c.nm,
        planKey: typeof planKey === "function" ? planKey(c.nm) : String(c.nm).toLowerCase(),
      });
      if (!r || !r.token) throw new Error((r && r.error) || "Falha ao gerar");
      var url = location.origin + "/portal?t=" + r.token;
      try { await navigator.clipboard.writeText(url); } catch (e) {}
      var agora = typeof wfaAgoraISO === "function" ? wfaAgoraISO() : new Date().toISOString();
      t.hist = Array.isArray(t.hist) ? t.hist : [];
      var dia = String(agora).slice(0, 10);
      var jaHoje = t.hist.some(function (h) {
        return h && /[Ee]nviad/.test(String(h.txt || "")) && String(h.em || "").slice(0, 10) === dia;
      });
      if (!jaHoje) t.hist.push({ em: agora, txt: "Enviado ao cliente para aprovação (link do portal)" });
      t.enviadoClienteEm = agora;
      if (typeof saveTarefas === "function") saveTarefas();
      if (typeof toast === "function") toast("Link copiado e envio registrado na tarefa");
      if (typeof prompt === "function") prompt("Portal de " + c.nm + " (link copiado, mande pra ele):", url);
      render();
    } catch (e) {
      if (typeof toast === "function") toast("Não consegui gerar o link: " + (e.message || e));
    }
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

})();
