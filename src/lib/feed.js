// Prévia do feed do cliente (tela 5 do doc 11, 22/09/2026). Módulo puro: monta a grade do
// perfil do Instagram com as artes das tarefas, na ordem em que o cliente vai ver.
// Testado em deploy/teste-feed.mjs. A tela do /app espelha estas regras.

import { derivarAprovacoes } from "./aprovacao.js";

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Story não aparece na grade do perfil, então fica fora da prévia.
const FORA = ["story", "stories"];
const PROPORCAO = { reel: "9:16", reels: "9:16", carrossel: "1:1", carousel: "1:1" };

function doCliente(t, clienteNorm) {
  if (!t) return false;
  const id = norm(t.clienteId);
  if (id && id === clienteNorm) return true;
  return !id && !!clienteNorm && norm(t.title).includes(clienteNorm);
}

function previa(t) {
  // Reaproveita a escolha de arte da aba Aprovação: imagem ganha do vídeo, e a regra de
  // anexo válido é a mesma. Passa uma tarefa só, em homologação, pro módulo devolver a prévia.
  const [item] = derivarAprovacoes([{ ...t, status: "homologcli" }], t.clienteId || "", null);
  return item ? item.previa : null;
}

export function derivarFeed(tarefas, cliente, agoraIso, limite) {
  const c = norm(cliente);
  const agora = new Date(agoraIso || Date.now()).getTime();
  return (Array.isArray(tarefas) ? tarefas : [])
    .filter((t) => doCliente(t, c))
    .filter((t) => !FORA.includes(norm(t.formato)))
    .filter((t) => t.status === "concluido" || t.status === "homologcli")
    .map((t) => {
      const pv = previa(t);
      if (!pv) return null;
      const quando = String(t.publicarEm || "");
      return {
        id: t.id,
        titulo: t.title || "(sem título)",
        formato: t.formato || "",
        proporcao: PROPORCAO[norm(t.formato)] || "4:5",
        publicarEm: quando,
        futuro: !!quando && new Date(quando).getTime() > agora,
        aprovado: t.status === "concluido",
        previa: pv,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Ordem do perfil: o mais novo primeiro. Sem data vai pro fim, não pro topo.
      if (!a.publicarEm && !b.publicarEm) return 0;
      if (!a.publicarEm) return 1;
      if (!b.publicarEm) return -1;
      return b.publicarEm.localeCompare(a.publicarEm);
    })
    .slice(0, limite || 12);
}
