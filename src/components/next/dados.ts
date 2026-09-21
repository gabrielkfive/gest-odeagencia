// WorkFlowArk Next (rota /next): leitura do estado real pela API e derivacoes por area.
// Nao duplica dado: tudo vem das chaves wfa-* que o app legado e as rotas React ja usam
// (specs/system.md). Gravacao so por save-state de item unico com carimbo `up`, que o
// servidor mescla por id (src/lib/merge-estado.js); nunca "lista inteira ganha".
import { supabase } from "@/integrations/supabase/client";
import clientesBase from "@/lib/clientes-base.json";

export const TZ = "America/Sao_Paulo";
export const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const norm = (s: unknown) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
export const dataBR = (d?: string) =>
  d ? String(d).slice(0, 10).split("-").reverse().join("/") : "sem data";
export const brl = (n: number) =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export type Member = {
  id: string;
  full_name?: string | null;
  email?: string;
  role?: string;
  active?: boolean;
  permissions?: Record<string, unknown> | null;
};
export type Tarefa = {
  id: string;
  title?: string;
  desc?: string;
  resp?: string;
  resps?: string[];
  data?: string;
  prio?: string;
  status?: string;
  clienteId?: string;
  concluidaEm?: string;
  criadaEm?: string;
  aprovacaoEm?: string;
  timeSpent?: number;
  timerSince?: string | null;
  up?: string;
  checklist?: { done?: boolean; text?: string }[];
  tags?: string[];
};
export type ProjTarefa = {
  id: string;
  t?: string;
  st?: string;
  resps?: string[];
  resp?: string;
  venc?: string;
  up?: string;
};
export type Projeto = {
  id: string;
  cliente?: string;
  clienteId?: string;
  sprint?: string;
  tarefas?: ProjTarefa[];
  up?: string;
};
// `stage` e NUMERO no legado (0 Prospecção, 1 Diagnóstico, 2 Proposta, 3 Negociação,
// 4 Fechado, 5 Perdido); aberto = stage < 4 (ou sem stage).
export type Lead = {
  id: string;
  nm?: string;
  stage?: number;
  val?: number | string;
  resp?: string;
  due?: string;
  next?: string;
  contact?: string;
  seg?: string;
  source?: string;
  obs?: string;
  up?: string;
};
export type Demanda = {
  id: string;
  titulo?: string;
  cliente?: string;
  mensagem?: string;
  origem?: string;
  status?: string;
  criadaEm?: string;
};
export type Rotina = {
  id: string;
  titulo?: string;
  freq?: string;
  dia?: string;
  hora?: string;
  resp?: string;
  ativo?: boolean;
};
export type Captacao = {
  id: string;
  clienteId?: string;
  data?: string;
  local?: string;
  produtor?: string;
  editor?: string;
  status?: string;
  concluidaEm?: string;
  videos?: { taskId?: string; titulo?: string }[];
  pop?: { done?: boolean; text?: string }[];
  sla?: string;
  titulo?: string;
};
export type Editorial = {
  id: string;
  clienteId: string;
  cliente: string;
  data: string;
  titulo: string;
  formato: string;
  status: "planejado" | "agendado" | "postado";
};
export type PropostaSocial = {
  id: string;
  clienteId?: string;
  cliente?: string;
  status?: string;
  formato?: string;
  tema?: string;
  gancho?: string;
  ts?: number;
  date?: string;
};
export type Notificacao = {
  id?: string;
  ts?: number;
  msg?: string;
  texto?: string;
  titulo?: string;
  origem?: string;
  tipo?: string;
};
export type ClienteCustom = {
  id: string;
  nm?: string;
  nome?: string;
  tipo?: string;
  plano?: string;
  status?: string;
  meta?: string;
  valor?: number;
};

export type Estado = Record<string, unknown>;

export type Carga = {
  member: Member | null;
  members: Member[];
  state: Estado;
  t: string | null;
  now: string;
};

// Uma unica porta pro servidor. GET carrega tudo que o papel pode ver; POST grava/age.
export async function api(body: Record<string, unknown> | null): Promise<any> {
  const sess = await supabase.auth.getSession();
  let token = sess.data.session?.access_token;
  if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const r = await fetch("/api/workflowark/state", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403)
    throw new Error(j?.error || "Sem permissão para este bloco.");
  if (!r.ok) throw new Error(j?.error || `Erro ${r.status}`);
  return j;
}

export async function carregarEstado(): Promise<Carga> {
  const j = await api(null);
  return {
    member: j.member || null,
    members: Array.isArray(j.members) ? j.members : [],
    state: (j.state || {}) as Estado,
    t: j.t || null,
    now: j.now || new Date().toISOString(),
  };
}

function lista<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// Nomes dos clientes: base fixa + custom criados no app.
export function mapaClientes(st: Estado): Record<string, string> {
  const custom = lista<ClienteCustom>(st["wfa-clientes-custom"]);
  return {
    ...(clientesBase as Record<string, string>),
    ...Object.fromEntries(custom.filter((c) => c?.id).map((c) => [c.id, c.nm || c.nome || ""])),
  };
}

export const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  iniciar: "A iniciar",
  andamento: "Em andamento",
  aprovacao: "Homologação",
  homologcli: "Homologação do cliente",
  concluido: "Concluído",
};
export const STATUS_COR: Record<string, string> = {
  backlog: "#8b8b8b",
  iniciar: "#60a5fa",
  andamento: "#FFC700",
  aprovacao: "#a78bfa",
  homologcli: "#f472b6",
  concluido: "#4ade80",
};

export const aberta = (t: Tarefa) => t.status !== "concluido";

// A pessoa: compara nome canonico ou primeiro nome (responsavel e texto no sistema).
export function ehMinha(t: Tarefa, member: Member | null): boolean {
  const nome = norm(member?.full_name || "");
  if (!nome) return false;
  const primeiro = nome.split(/\s+/)[0];
  const lst = [t.resp, ...(t.resps || [])].filter(Boolean).map(norm);
  return lst.some((r) => r === nome || (!!primeiro && r.split(/\s+/)[0] === primeiro));
}

// Cartoes de projeto fora do backlog aparecem no Kanban como `pj:<proj>:<tarefa>` sem copia.
// Aqui a mesma regra: contamos a tarefa de projeto UMA vez e nunca uma tarefa `pj:` da lista
// de tarefas em duplicidade com o projeto de origem.
export function tarefasUnificadas(st: Estado, nomes: Record<string, string>): Tarefa[] {
  const tarefas = lista<Tarefa>(st["wfa-tarefas"]).filter(
    (t) => t && t.id && !String(t.id).startsWith("pj:"),
  );
  const projetos = lista<Projeto>(st["wfa-projetos"]);
  const ids = new Set(tarefas.map((t) => t.id));
  const deProjeto: Tarefa[] = [];
  for (const p of projetos) {
    for (const pt of p.tarefas || []) {
      if (!pt?.id || pt.st === "backlog") continue;
      const id = `pj:${p.id}:${pt.id}`;
      if (ids.has(id)) continue;
      const st = pt.st === "homolog" ? "aprovacao" : pt.st;
      deProjeto.push({
        id,
        title: pt.t,
        status: st,
        resp: pt.resp || pt.resps?.[0],
        resps: pt.resps,
        data: pt.venc,
        clienteId: p.clienteId,
        up: pt.up,
        tags: [p.cliente || nomes[p.clienteId || ""] || "Projeto"],
      });
    }
  }
  return [...tarefas, ...deProjeto];
}

export function leads(st: Estado): Lead[] {
  return lista<Lead>(st["wfa-crm"]).filter((l) => l && l.id);
}
export function demandas(st: Estado): Demanda[] {
  return lista<Demanda>(st["wfa-demandas"]).filter((d) => d && d.id);
}
export function rotinas(st: Estado): Rotina[] {
  return lista<Rotina>(st["wfa-rotinas"]).filter((r) => r && r.id);
}
export function captacoes(st: Estado): Captacao[] {
  return lista<Captacao>(st["wfa-producao"]).filter((c) => c && c.id);
}
export function editorial(st: Estado): Editorial[] {
  return lista<Editorial>(st["wfa-editorial"]).filter((e) => e && e.id);
}
export function filaSocial(st: Estado): PropostaSocial[] {
  return lista<PropostaSocial>(st["wfa-social-fila"]).filter((p) => p && p.id);
}
export function notificacoes(st: Estado): Notificacao[] {
  return lista<Notificacao>(st["wfa-notificacoes"]);
}
export function projetos(st: Estado): Projeto[] {
  return lista<Projeto>(st["wfa-projetos"]).filter((p) => p && p.id);
}

export const CRM_STAGES = [
  { idx: 0, key: "prospeccao", label: "Prospecção", cor: "#94a3b8" },
  { idx: 1, key: "diagnostico", label: "Diagnóstico", cor: "#3b82f6" },
  { idx: 2, key: "proposta", label: "Proposta", cor: "#FFC700" },
  { idx: 3, key: "negociacao", label: "Negociação", cor: "#ea580c" },
  { idx: 4, key: "fechado", label: "Fechado", cor: "#16a34a" },
  { idx: 5, key: "perdido", label: "Perdido", cor: "#dc2626" },
];
export const leadAberto = (l: Lead) => l.stage == null || Number(l.stage) < 4;
export const leadEtapa = (l: Lead) => CRM_STAGES[Number(l.stage) || 0] || CRM_STAGES[0];

// Financeiro em leitura (mesma derivacao do ARK OS): planilha do mes + cobranca por cliente.
// So existe quando o papel recebeu os blocos; sem bloco a tela mostra "sem acesso", nao zero.
export type Financeiro = {
  disponivel: boolean;
  mesNome: string;
  receber: number;
  custos: number;
  sobra: number;
  cobranca: { id: string; nome: string; valor: number; cobrado: boolean }[];
};
export function financeiro(st: Estado, nomes: Record<string, string>): Financeiro {
  const plan: any = st["wfa-planilha"];
  const cob: any = st["wfa-cobranca"];
  if (!plan && !cob)
    return { disponivel: false, mesNome: "", receber: 0, custos: 0, sobra: 0, cobranca: [] };
  const meses: any[] = Array.isArray(plan?.meses) ? plan.meses : [];
  const mes = meses.find((m) => m?.id === plan?.ativo) || meses[0];
  const soma = (arr: any[], f: string) => arr.reduce((a, x) => a + (Number(x?.[f]) || 0), 0);
  const receitas: any[] = Array.isArray(mes?.receitas) ? mes.receitas : [];
  const pagar: any[] = Array.isArray(mes?.pagar) ? mes.pagar : [];
  const receber = soma(receitas, "valor");
  const custos = soma(receitas, "custo") + soma(pagar, "valor");
  const mesKey = hojeSP().slice(0, 7);
  const cobranca = Object.entries((cob || {}) as Record<string, any>)
    .filter(([, v]) => v && typeof v === "object")
    .map(([id, v]) => ({
      id,
      nome: String(v._nome || nomes[id] || id),
      valor: Number(v._valor) || 0,
      cobrado: v?.cobradoMes === mesKey,
    }))
    .filter((c) => c.valor > 0)
    .sort((a, b) => Number(a.cobrado) - Number(b.cobrado) || b.valor - a.valor);
  return {
    disponivel: true,
    mesNome: String(mes?.nome || mesKey),
    receber,
    custos,
    sobra: receber - custos,
    cobranca,
  };
}

// Gravacao de item unico: o servidor faz a uniao por id e o `up` decide o conflito.
export async function salvarTarefa(t: Tarefa): Promise<void> {
  if (String(t.id).startsWith("pj:"))
    throw new Error("Tarefa de projeto: conclua pelo quadro de Projetos.");
  await api({
    action: "save-state",
    key: "wfa-tarefas",
    data: [{ ...t, up: new Date().toISOString() }],
  });
}

// Ponte com o app legado: ele restaura a aba de `wfa-current-page` ao abrir (restoreLastPage).
export function irParaApp(pagina: string) {
  try {
    localStorage.setItem("wfa-current-page", pagina);
  } catch {
    /* sem storage */
  }
  window.location.href = "/app";
}
