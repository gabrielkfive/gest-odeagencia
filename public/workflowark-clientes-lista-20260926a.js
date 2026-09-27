// Lista de Clientes no molde da V3 (26/09/2026). Módulo puro, testado em
// deploy/teste-clientes-lista.mjs; o navegador carrega uma cópia IDÊNTICA em
// public/workflowark-clientes-lista-<data>.js. Junta o cliente, a etapa da jornada
// (sprint 0 é onboarding, 1 a 20 é a jornada) e a cobrança do mês.

const ULTIMO_SPRINT = 20;
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ORDEM_STATUS = { r: 0, y: 1, gr: 2, churn: 3 };

export function montarLinhas(clientes, sprints, cobranca, mk) {
  const sprintDe = {};
  for (const sp of sprints || []) for (const id of sp.clis || []) if (!(id in sprintDe)) sprintDe[id] = sp.n;
  return (clientes || []).map((c) => {
    const sprint = c.id in sprintDe ? sprintDe[c.id] : null;
    const cob = (cobranca || {})[c.id] || {};
    const cobravel = c.tipo !== "Alpha" && Number(c.valor) > 0;
    return {
      id: c.id, nm: c.nm, tipo: c.tipo || "", plano: c.plano || "", valor: Number(c.valor) || 0, cap: Number(c.cap) || 0,
      status: c.status || "gr", meta: c.meta || "",
      sprint,
      etapa: sprint === null ? "sem" : sprint === 0 ? "onboarding" : "jornada",
      progresso: sprint ? Math.round((sprint / ULTIMO_SPRINT) * 100) : 0,
      cobravel,
      cobrado: cobravel && (cob.cobradoMes === mk || !!(cob.cobradoMeses && cob.cobradoMeses[mk])),
      atencao: c.status === "r" || c.status === "y",
    };
  });
}

export function filtrar(linhas, aba, busca) {
  const q = semAcento(busca).trim();
  let out = (linhas || []).filter((x) => {
    if (aba === "churn") return x.status === "churn";
    if (x.status === "churn") return false;
    if (aba === "onboarding") return x.etapa === "onboarding";
    if (aba === "jornada") return x.etapa === "jornada";
    if (aba === "atencao") return x.atencao;
    return true;
  });
  if (q) out = out.filter((x) => semAcento(x.nm + " " + x.plano + " " + x.tipo).includes(q));
  return out.sort((a, b) => (ORDEM_STATUS[a.status] ?? 2) - (ORDEM_STATUS[b.status] ?? 2) || String(a.nm).localeCompare(String(b.nm), "pt-BR"));
}

export function contarAbas(linhas) {
  const ativos = (linhas || []).filter((x) => x.status !== "churn");
  return {
    todos: ativos.length,
    onboarding: ativos.filter((x) => x.etapa === "onboarding").length,
    jornada: ativos.filter((x) => x.etapa === "jornada").length,
    atencao: ativos.filter((x) => x.atencao).length,
    churn: (linhas || []).filter((x) => x.status === "churn").length,
  };
}
