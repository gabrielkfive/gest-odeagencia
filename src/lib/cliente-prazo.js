// Aba Prazo e bolinhas de stories da página do cliente (28/09/2026), no molde da aba Prazo e do
// Feed do Modo Criador da V3. Módulo puro, testado em deploy/teste-cliente-prazo.mjs; o navegador
// carrega uma cópia IDÊNTICA em public/workflowark-cliente-prazo-<data>.js.
// Prazo da equipe = t.data (AAAA-MM-DD). Concluído não é prazo; homologcli depende do cliente e
// fica à parte em "Com o cliente", com os dias esperando quando a tarefa tem o carimbo.

const DIA = 86400000;
const norm = (s) => String(s || "").toLowerCase();
const STORY = ["story", "stories"];

function somarDias(iso, n) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function diasEntre(deIso, ateIso) {
  return Math.round((Date.parse(ateIso + "T12:00:00Z") - Date.parse(deIso + "T12:00:00Z")) / DIA);
}

function diasDesde(carimbo, agoraMs) {
  if (!carimbo) return null;
  const de = new Date(carimbo).getTime();
  if (!de) return null;
  const d = Math.floor((agoraMs - de) / DIA);
  return d > 0 ? d : 0;
}

export function agruparPrazoCliente(tarefas, hojeISO, agoraMs) {
  const g = { atrasado: [], hoje: [], semana: [], depois: [], sem: [], comCliente: [], total: 0 };
  const limite = somarDias(hojeISO, 7);
  for (const t of tarefas || []) {
    if (!t || t.status === "concluido") continue;
    const d = String(t.data || "").slice(0, 10);
    if (t.status === "homologcli") {
      g.comCliente.push({ ...t, diasEsperando: diasDesde(t.aprovacaoEm || t.enviadoClienteEm, agoraMs) });
      continue;
    }
    g.total++;
    if (!d) g.sem.push(t);
    else if (d < hojeISO) g.atrasado.push({ ...t, diasAtraso: diasEntre(d, hojeISO) });
    else if (d === hojeISO) g.hoje.push(t);
    else if (d <= limite) g.semana.push(t);
    else g.depois.push(t);
  }
  const porData = (a, b) => String(a.data || "").localeCompare(String(b.data || ""));
  for (const k of ["atrasado", "hoje", "semana", "depois"]) g[k].sort(porData);
  g.comCliente.sort((a, b) => (b.diasEsperando ?? -1) - (a.diasEsperando ?? -1));
  return g;
}

/** Próximos stories do cliente: ainda não concluídos ou agendados para depois de agora. */
export function proximosStoriesCliente(tarefas, agoraLocal, limite) {
  const agora = String(agoraLocal || "");
  return (tarefas || [])
    .filter((t) => t && STORY.includes(norm(t.formato)))
    .filter((t) => t.status !== "concluido" || (!!t.publicarEm && String(t.publicarEm) > agora))
    .map((t) => ({ ...t, quando: String(t.publicarEm || t.data || "") }))
    .sort((a, b) => {
      if (!a.quando && !b.quando) return 0;
      if (!a.quando) return 1;
      if (!b.quando) return -1;
      return a.quando.localeCompare(b.quando);
    })
    .slice(0, limite || 8);
}
