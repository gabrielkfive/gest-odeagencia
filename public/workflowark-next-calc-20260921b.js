/* ============ WorkFlowArk NEXT · cálculo puro do Início (21/09/2026) ============
   Sem DOM, sem estado global: recebe as listas e devolve os números do Início.
   Roda no navegador (window.NX_CALC) e no Node (module.exports), por isso o teste
   deploy/teste-next-inicio.mjs prova as regras sem abrir a página.
   Regra da casa: nunca inventar número. Sem dado, o campo vem null e a tela
   escreve "sem dados". */
(function (raiz) {
  var ABERTA = function (t) { return t && t.status !== "concluido"; };
  var EM_APROVACAO = function (t) { return t && (t.status === "aprovacao" || t.status === "homologcli"); };
  var norm = function (s) {
    return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  };
  var somaDias = function (iso, n) {
    var x = new Date(iso + "T12:00:00Z");
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };
  /* "Gabriel" na tarefa casa com "Gabriel Andrade" do cadastro (mesma tolerância do renderMeuDia) */
  function ehDe(t, nome) {
    var r = norm(t.resp);
    if (!r) return false;
    var n = norm(nome);
    if (r === n) return true;
    var rf = r.split(/\s+/)[0], nf = n.split(/\s+/)[0];
    return !!nf && rf === nf;
  }
  function tarefasDo(tarefas, c) {
    var nm = norm(c.nm);
    return tarefas.filter(function (t) {
      return t && (t.clienteId === c.id || (nm && norm(t.title).indexOf(nm) >= 0));
    });
  }
  /* Mesma régua da aba Saúde da página do cliente: sinais explicados por registro. */
  function sinaisDo(c, ts, ed, hoje, mesK) {
    var s = [];
    var abertas = ts.filter(ABERTA);
    var atras = abertas.filter(function (t) { return t.data && t.data < hoje; });
    var parada = ts.filter(EM_APROVACAO).filter(function (t) {
      return t.aprovacaoEm && new Date(hoje + "T23:59:59Z").getTime() - new Date(t.aprovacaoEm).getTime() > 3 * 86400000;
    });
    var noMes = ts.filter(function (t) { return String(t.publicarEm || t.data || "").slice(0, 7) === mesK; });
    var edMes = ed.filter(function (e) { return e && e.clienteId === c.id && String(e.data || "").slice(0, 7) === mesK; });
    if (atras.length) s.push({ cor: "#ff6b6b", rotulo: "Tarefas atrasadas", detalhe: atras.length + " aberta(s) com prazo antes de hoje", n: atras.length, chave: "atrasadas" });
    if (parada.length) s.push({ cor: "#a78bfa", rotulo: "Aprovação parada", detalhe: parada.length + " há mais de 3 dias em homologação", n: parada.length, chave: "aprovacao" });
    if (!noMes.length && !edMes.length) s.push({ cor: "#FFC700", rotulo: "Sem entrega no mês", detalhe: "nada no editorial nem tarefa com data no mês", n: 0, chave: "sem-entrega" });
    return s;
  }
  function inicio(p) {
    var tarefas = (p.tarefas || []).filter(Boolean);
    var clientes = (p.clientes || []).filter(Boolean);
    var editorial = (p.editorial || []).filter(Boolean);
    var hoje = p.hoje;
    var mesK = hoje.slice(0, 7);
    var fim7 = somaDias(hoje, 6);
    var minhas = p.nome ? tarefas.filter(function (t) { return ehDe(t, p.nome); }) : tarefas;

    var kpis = {
      hoje: minhas.filter(function (t) { return ABERTA(t) && t.data === hoje; }).length,
      atrasadas: minhas.filter(function (t) { return ABERTA(t) && t.data && t.data < hoje; }).length,
      aprovacao: minhas.filter(EM_APROVACAO).length,
      publicamSemana: minhas.filter(function (t) {
        var d = String(t.publicarEm || "").slice(0, 10);
        return ABERTA(t) && d && d >= hoje && d <= fim7;
      }).length,
    };

    var ativos = clientes.filter(function (c) { return c.status !== "churn"; });
    var sinais = {};
    var verdes = 0;
    var atencao = [];
    ativos.forEach(function (c) {
      var s = sinaisDo(c, tarefasDo(tarefas, c), editorial, hoje, mesK);
      sinais[c.id] = s;
      if (!s.length) verdes++;
      else {
        var pior = s[0];
        atencao.push({
          id: c.id, nm: c.nm, sinais: s.length,
          n: pior.n || s.length,
          rotulo: pior.chave === "atrasadas" ? (pior.n === 1 ? "atrasada" : "atrasadas")
            : pior.chave === "aprovacao" ? (pior.n === 1 ? "aprovação parada" : "aprovações paradas")
            : "sem entrega no mês",
        });
      }
    });
    atencao.sort(function (a, b) { return b.sinais - a.sinais || b.n - a.n || String(a.nm).localeCompare(String(b.nm)); });

    var concl = tarefas.filter(function (t) {
      return t.status === "concluido" && t.data && String(t.concluidaEm || "").slice(0, 7) === mesK;
    });
    var okN = concl.filter(function (t) { return String(t.concluidaEm).slice(0, 10) <= t.data; }).length;
    var prazo = { total: concl.length, ok: okN, pct: concl.length ? Math.round((100 * okN) / concl.length) : null };

    var linha = [];
    tarefas.forEach(function (t) {
      var d = String(t.publicarEm || "").slice(0, 10);
      if (!d || d.slice(0, 7) !== mesK) return;
      var cor = t.status === "concluido" ? "ok" : d < hoje ? "alerta" : t.status === "andamento" ? "andamento" : "planejado";
      linha.push({ dia: d, cor: cor, titulo: t.title || "(sem título)", id: t.id });
    });
    editorial.forEach(function (e) {
      var d = String(e.data || "").slice(0, 10);
      if (!d || d.slice(0, 7) !== mesK) return;
      linha.push({ dia: d, cor: e.status === "postado" ? "ok" : d < hoje ? "alerta" : e.status === "agendado" ? "andamento" : "planejado", titulo: e.titulo || "(editorial)" });
    });
    linha.sort(function (a, b) { return a.dia.localeCompare(b.dia); });

    return {
      kpis: kpis,
      saude: { verdes: verdes, total: ativos.length, sinais: sinais },
      prazo: prazo,
      linha: linha,
      atencao: atencao.slice(0, 3),
    };
  }
  var API = { inicio: inicio };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else raiz.NX_CALC = API;
})(typeof window !== "undefined" ? window : globalThis);
