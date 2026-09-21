// Entregas e aprovações do portal do cliente (lote 2 de 21/09/2026). Módulo puro, sem
// banco e sem DOM, usado pela API /api/workflowark/portal e testado por
// deploy/teste-entregas.mjs. Regra da casa: o cliente só vê o que é dele e só os campos
// que são dele (nada de responsável, horas, custo).

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const DIAS_ENTREGA = 60;

function doCliente(t, clienteNorm) {
  if (!t) return false;
  const id = norm(t.clienteId);
  if (id && id === clienteNorm) return true;
  // fallback do legado: tarefa sem clienteId, nome do cliente no título
  return !id && !!clienteNorm && norm(t.title).includes(clienteNorm);
}

function links(t) {
  return (Array.isArray(t.attachments) ? t.attachments : [])
    .filter((a) => a && /^https?:\/\//.test(String(a.url || "")))
    .map((a) => ({ nome: String(a.nome || a.url), url: String(a.url), tipo: a.tipo || "" }))
    .slice(0, 10);
}

export function derivarEntregas(tarefas, cliente, agoraIso) {
  const c = norm(cliente);
  const agora = new Date(agoraIso || Date.now()).getTime();
  const limite = agora - DIAS_ENTREGA * 86400000;
  const minhas = (Array.isArray(tarefas) ? tarefas : []).filter((t) => doCliente(t, c));
  const entregas = minhas
    .filter((t) => t.status === "concluido")
    .filter((t) => links(t).length || t.legenda || t.publicarEm)
    .filter((t) => {
      const ref = String(t.concluidaEm || t.publicarEm || "");
      const ts = ref ? new Date(ref).getTime() : 0;
      return !ts || ts >= limite;
    })
    .map((t) => ({
      id: t.id,
      titulo: t.title || "(sem título)",
      formato: t.formato || "",
      publicarEm: t.publicarEm || "",
      concluidaEm: t.concluidaEm || "",
      legenda: t.legenda || "",
      links: links(t),
    }))
    .sort((a, b) => String(b.publicarEm || b.concluidaEm).localeCompare(String(a.publicarEm || a.concluidaEm)))
    .slice(0, 40);
  const aprovacoes = minhas
    .filter((t) => t.status === "homologcli")
    .map((t) => ({
      id: t.id,
      titulo: t.title || "(sem título)",
      formato: t.formato || "",
      publicarEm: t.publicarEm || "",
      briefing: t.briefing || t.desc || "",
      legenda: t.legenda || "",
      desde: t.aprovacaoEm || t.up || "",
      links: links(t),
    }))
    .sort((a, b) => String(a.publicarEm || "9999").localeCompare(String(b.publicarEm || "9999")));
  return { entregas, aprovacoes };
}

// Decisão do cliente vira gravação por item (o servidor mescla por id com o carimbo `up`).
export function aplicarDecisaoCliente(tarefa, acao, comentario, agoraIso) {
  if (!tarefa || tarefa.status !== "homologcli") throw new Error("Este item não está esperando a sua aprovação.");
  const agora = agoraIso || new Date().toISOString();
  const texto = String(comentario || "").trim().slice(0, 2000);
  const hist = Array.isArray(tarefa.hist) ? tarefa.hist.slice() : [];
  if (acao === "aprovar") {
    hist.push({ em: agora, txt: "Aprovado pelo cliente no portal" });
    const comments = Array.isArray(tarefa.comments) ? tarefa.comments.slice() : [];
    if (texto) comments.push({ autor: "Cliente", texto, em: agora });
    return { ...tarefa, status: "concluido", concluidaEm: agora, aprovadoClienteEm: agora, timerSince: null, hist, comments, up: agora };
  }
  if (acao === "ajustar") {
    if (!texto) throw new Error("Escreva o comentário com o ajuste.");
    const comments = Array.isArray(tarefa.comments) ? tarefa.comments.slice() : [];
    comments.push({ autor: "Cliente", texto, em: agora });
    hist.push({ em: agora, txt: "Cliente pediu ajuste pelo portal" });
    return { ...tarefa, status: "andamento", ajusteClienteEm: agora, comments, hist, up: agora };
  }
  throw new Error("Ação desconhecida.");
}
