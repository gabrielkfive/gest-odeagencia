// Painel do Modo Criador no app original (26/09/2026), no molde do Modo Criador da V3.
// Módulo puro, testado em deploy/teste-criador.mjs; o navegador carrega uma cópia IDÊNTICA
// em public/workflowark-criador-<data>.js. Lê só as tarefas que já existem:
//   esperando o cliente = status homologcli; revisão interna = status aprovacao;
//   atrasado = tarefa aberta da equipe (fora concluído e homologcli) com data antes de hoje.

const norm = (s) => String(s || "").toLowerCase();
const POSTS = ["estatico", "carrossel"];

/** Mesma regra da página do cliente: clienteId ou o nome do cliente no título. */
export function tarefasDoCliente(c, tarefas) {
  const nm = norm(c && c.nm);
  return (tarefas || []).filter(
    (t) => t && (t.clienteId === c.id || (!t.clienteId && nm && norm(t.title).includes(nm))),
  );
}

const dataDe = (t) => String(t.publicarEm || t.data || "").slice(0, 10);

export function resumoCriador(clientes, tarefas, hojeISO, mk) {
  const lista = [];
  for (const c of clientes || []) {
    if (!c || c.status === "churn") continue;
    const ts = tarefasDoCliente(c, tarefas);
    let esperando = 0, revisao = 0, atrasados = 0, posts = 0, reels = 0, stories = 0;
    for (const t of ts) {
      if (t.status === "homologcli") esperando++;
      if (t.status === "aprovacao") revisao++;
      const d = String(t.data || "").slice(0, 10);
      // Com o cliente não conta como atraso da equipe (depende dele, igual à aba Prazo da V3).
      if (t.status !== "concluido" && t.status !== "homologcli" && d && d < hojeISO) atrasados++;
      if (dataDe(t).slice(0, 7) === mk) {
        const f = norm(t.formato);
        if (POSTS.includes(f)) posts++;
        else if (f === "reel" || f === "reels") reels++;
        else if (f === "story" || f === "stories") stories++;
      }
    }
    lista.push({ id: c.id, nm: c.nm, plano: c.plano || "", status: c.status || "", esperando, revisao, atrasados, posts, reels, stories, noMes: posts + reels + stories });
  }
  const peso = (x) => x.atrasados * 3 + x.esperando * 2 + x.revisao;
  lista.sort((a, b) => peso(b) - peso(a) || b.noMes - a.noMes || String(a.nm).localeCompare(String(b.nm), "pt-BR"));
  const totais = lista.reduce((s, x) => ({ esperando: s.esperando + x.esperando, revisao: s.revisao + x.revisao, atrasados: s.atrasados + x.atrasados }), { esperando: 0, revisao: 0, atrasados: 0 });
  return { clientes: lista, totais };
}
