// ArkOS: tipos, dados demo e hook de dados reais (Supabase via /api/workflowark/state)
import { useEffect, useState } from "react";
import {
  Sparkles, Hexagon, PenLine, Wallet, Command, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* Dados */
export type Agent = {
  id: string; Icon: any; nome: string; papel: string; desc: string;
  status: "online" | "idle"; fazendo: string[];
};
export type Op = { id: string; who: string; what: string; when: string };

export const AGENTES: Agent[] = [
  { id: "jarvis", Icon: Sparkles, nome: "JARVIS", papel: "Comandante", status: "online",
    desc: "Orquestra o workspace inteiro. Entende comandos por voz e texto, executa 14 ações reais no sistema e aprende sobre o Senhor a cada conversa.",
    fazendo: ["Monitorando o workspace.", "Aguardando o Senhor.", "Revisando tarefas do dia."] },
  { id: "conselho", Icon: Hexagon, nome: "Conselho de IA", papel: "Estratégia", status: "online",
    desc: "Cinco diretores debatem cada cliente prioritário: operação, tráfego, social, roteiro e atendimento. Toda decisão vira briefing registrado.",
    fazendo: ["Debatendo prioridades.", "Lendo briefings recentes.", "Preparando decisão."] },
  { id: "social", Icon: PenLine, nome: "Social Media", papel: "Conteúdo", status: "online",
    desc: "Produz propostas de postagem por cliente, com gancho, roteiro, legenda e CTA. Nada publica sem o seu aval na fila de aprovação.",
    fazendo: ["Produzindo propostas.", "Consultando brief do cliente.", "Enviando para aprovação."] },
  { id: "roteirista", Icon: Command, nome: "Roteirista", papel: "Vídeo curto", status: "online",
    desc: "Especialista em viralização para Reels, TikTok e Shorts. Escreve ganchos, estrutura blocos de retenção e fecha com CTA.",
    fazendo: ["Escrevendo gancho.", "Estruturando roteiro.", "Ajustando CTA."] },
  { id: "atendente", Icon: MessageCircle, nome: "Atendente WhatsApp", papel: "Triagem", status: "online",
    desc: "Ouve todas as conversas, transcreve áudios, entende a demanda e propõe tarefa e resposta. Você aprova com um toque.",
    fazendo: ["Ouvindo conversas.", "Classificando demanda.", "Sugerindo resposta."] },
  { id: "cobranca", Icon: Wallet, nome: "Cobrança", papel: "Financeiro", status: "idle",
    desc: "Régua de cobrança da ARK: vencimentos, agrupamento por cliente e mensagem pronta para enviar no WhatsApp.",
    fazendo: ["Régua do dia concluída.", "Aguardando vencimentos."] },
];

export const OPS_DEMO: Op[] = [
  { id: "d1", who: "SOCIAL MEDIA", what: "3 propostas de postagem enviadas para a fila de aprovação.", when: "agora" },
  { id: "d2", who: "CONSELHO DE IA", what: "Debate concluído para Vivenda: decisão e plano registrados.", when: "há 2 min" },
  { id: "d3", who: "ATENDENTE", what: "Demanda identificada no WhatsApp. Tarefa proposta aguardando seu aval.", when: "há 6 min" },
  { id: "d4", who: "SISTEMA", what: "Sincronização com Supabase concluída.", when: "há 9 min" },
];

export type TarefaLinha = { id: string; tt: string; cc: string; due: string };

export const TAREFAS_DEMO: TarefaLinha[] = [
  { id: "dm1", tt: "Aprovar plano de conteúdo de julho da Vivenda", cc: "Vivenda · Conselho de IA", due: "hoje" },
  { id: "dm2", tt: "Gravar captação do creme de ureia (plano Copa)", cc: "Vivenda · Captação", due: "hoje" },
  { id: "dm3", tt: "Revisar régua de cobrança da semana", cc: "Financeiro · Cobrança", due: "amanhã" },
  { id: "dm4", tt: "Responder demanda do portal da Fercon", cc: "Fercon · Portal do cliente", due: "amanhã" },
  { id: "dm5", tt: "Postar carrossel aprovado do Cachu", cc: "Cachu · Social Media", due: "qui" },
  { id: "dm6", tt: "Fechar relatório mensal da Sasse", cc: "Sasse · Relatórios", due: "sex" },
];

export const TAREFAS_DEMO_OPS: TarefaLinha[] = [
  { id: "dmo1", tt: "Enviar relatório de junho da Babbo", cc: "Babbo · Relatórios", due: "atrasada" },
  { id: "dmo2", tt: "Cobrar aprovação do calendário do Cachu", cc: "Cachu · Social Media", due: "atrasada" },
  { id: "dmo3", tt: "Ajustar orçamento de tráfego da Fercon", cc: "Fercon · Tráfego", due: "atrasada" },
  ...TAREFAS_DEMO,
  { id: "dmo4", tt: "Planejar pauta do conselho de agosto", cc: "ARK · Conselho de IA", due: "07-10" },
  { id: "dmo5", tt: "Atualizar organograma no ARK OS", cc: "ARK · Sistema", due: "07-14" },
];

/* Clientes fixos do V1 (CLIENTES_BASE em public/workflowark.html); os custom vêm de
   wfa-clientes-custom no estado. Necessário para traduzir clienteId em nome. */
export const CLIENTES_NM: Record<string, string> = {
  ark: "ARK Content", vivenda: "Vivenda", fercon: "Fercon", sasse: "Sasse Gifts",
  fonseca: "Fonseca & Cavalcanti", vaca: "Vaca Velha", dom: "Dom Baruka",
  stray: "Stray House", cachu: "Cachu Restaurante", babbo: "Babbo Giovanni",
  brisa: "Brisa Doce Café",
};

export const APROVACOES_DEMO = [
  { t: "Carrossel · 5 motivos para amassar o burger", s: "Cachu · Social Media", cor: "#FFD84D" },
  { t: "Reel · bastidores da cozinha da Vivenda", s: "Vivenda · Roteirista", cor: "#7DD8D8" },
  { t: "Post único · promoção de quarta", s: "Babbo · Social Media", cor: "#F4A0C0" },
  { t: "Resposta sugerida no WhatsApp", s: "Fercon · Atendente", cor: "#B6A5F5" },
];

/* Tarefa do V1 (public/workflowark.html): title, data (prazo ISO), status ('concluido' = feita),
   clienteId, funcao, resp, prio. NUNCA remover campos desconhecidos ao salvar. */
function tarefaAberta(t: any) {
  return t && t.status !== "concluido" && !t.done && !t.concluida;
}

function linhaDe(t: any, hoje: string, nomes: Record<string, string>): TarefaLinha {
  const prazo = String(t.data || t.prazo || "");
  return {
    id: String(t.id || ""),
    tt: String(t.title || t.titulo || t.nome || "Tarefa"),
    cc: [nomes[t.clienteId] || t.cliente, t.funcao || t.resp || t.area].filter(Boolean).join(" · ") || "ARK",
    due: prazo === hoje ? "hoje" : prazo && prazo < hoje ? "atrasada" : prazo.slice(5) || "sem prazo",
  };
}

/* Dados reais com sessão, demo sem. Ações: concluir e criar tarefa (save-state em wfa-tarefas,
   sempre com leitura fresca antes de gravar para não atropelar edição de outro aparelho). */
export function useArkData() {
  const [demo, setDemo] = useState(true);
  const [nome, setNome] = useState("Senhor");
  const [stats, setStats] = useState({ abertas: 0, atrasadas: 0, fila: 0, briefings: 0 });
  const [ops, setOps] = useState<Op[]>([]);
  const [tarefasTop, setTarefasTop] = useState<TarefaLinha[]>(TAREFAS_DEMO);
  const [tarefasAll, setTarefasAll] = useState<TarefaLinha[]>(TAREFAS_DEMO_OPS);
  const [nomesCli, setNomesCli] = useState<Record<string, string>>(CLIENTES_NM);

  const aplicar = (st: any, member?: any) => {
    const tarefas: any[] = Array.isArray(st["wfa-tarefas"]) ? st["wfa-tarefas"] : [];
    const custom: any[] = Array.isArray(st["wfa-clientes-custom"]) ? st["wfa-clientes-custom"] : [];
    const nomes: Record<string, string> = { ...CLIENTES_NM };
    for (const c of custom) if (c?.id && c?.nm) nomes[String(c.id)] = String(c.nm);
    const hoje = new Date().toISOString().slice(0, 10);
    const abertasArr = tarefas.filter(tarefaAberta);
    const atrasadas = abertasArr.filter((t) => (t.data || t.prazo) && String(t.data || t.prazo) < hoje).length;
    const fila = (st["wfa-social-fila"] || []).filter((p: any) => p?.status === "pendente").length;
    const briefings = (st["wfa-conselho-briefings"] || []).length;
    const notifs: any[] = st["wfa-notificacoes"] || [];
    const reais: Op[] = notifs.slice(-14).reverse().map((n: any, i: number) => ({
      id: `r${i}`,
      who: String(n?.origem || n?.tipo || "SISTEMA").toUpperCase(),
      what: String(n?.msg || n?.texto || n?.titulo || "Atividade registrada."),
      when: n?.ts ? new Date(n.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
    }));
    const abertasList = abertasArr
      .slice()
      .sort((a, b) => String(a.data || a.prazo || "9999").localeCompare(String(b.data || b.prazo || "9999")))
      .map((t) => linhaDe(t, hoje, nomes));
    if (member) {
      const first = (member.full_name || "").split(" ")[0];
      setNome(first || "Senhor");
    }
    setNomesCli(nomes);
    setStats({ abertas: abertasArr.length, atrasadas, fila, briefings });
    setTarefasTop(abertasList.slice(0, 6));
    setTarefasAll(abertasList);
    if (reais.length) setOps(reais);
  };

  const carregar = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const r = await fetch("/api/workflowark/state", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const j = await r.json();
    return { token, j };
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await carregar();
        if (!res || !alive) return;
        aplicar(res.j.state || {}, res.j.member);
        setDemo(false);
      } catch { /* segue em demo */ }
    })();
    return () => { alive = false; };
  }, []);

  /* Muda UMA tarefa na lista fresca e salva a lista inteira (contrato do save-state). */
  const salvarTarefas = async (muda: (tarefas: any[]) => any[]) => {
    const res = await carregar();
    if (!res) throw new Error("sem sessão");
    const st = res.j.state || {};
    const tarefas: any[] = Array.isArray(st["wfa-tarefas"]) ? st["wfa-tarefas"] : [];
    const novas = muda(tarefas);
    const r = await fetch("/api/workflowark/state", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${res.token}` },
      body: JSON.stringify({ action: "save-state", key: "wfa-tarefas", data: novas }),
    });
    if (!r.ok) throw new Error("save falhou");
    aplicar({ ...st, "wfa-tarefas": novas });
  };

  const concluirTarefa = async (id: string) => {
    if (demo) {
      setTarefasAll((l) => l.filter((t) => t.id !== id));
      setTarefasTop((l) => l.filter((t) => t.id !== id));
      setStats((s) => ({ ...s, abertas: Math.max(0, s.abertas - 1) }));
      return;
    }
    setTarefasAll((l) => l.filter((t) => t.id !== id));
    setTarefasTop((l) => l.filter((t) => t.id !== id));
    try {
      await salvarTarefas((ts) => ts.map((t) =>
        t?.id === id ? { ...t, status: "concluido", concluidaEm: new Date().toISOString() } : t));
    } catch {
      const res = await carregar().catch(() => null);
      if (res) aplicar(res.j.state || {});
    }
  };

  const criarTarefa = async (title: string, clienteId: string, data: string) => {
    const nova = {
      id: "t" + Date.now(), title: title.slice(0, 140), desc: "", funcao: "",
      clienteId, resp: "", data, prio: "media", status: "backlog",
      tags: [], checklist: [], sprintN: null, origem: "arkos",
      criadaEm: new Date().toISOString(),
    };
    if (demo) {
      const hoje = new Date().toISOString().slice(0, 10);
      const linha = linhaDe(nova, hoje, nomesCli);
      setTarefasAll((l) => [linha, ...l]);
      setStats((s) => ({ ...s, abertas: s.abertas + 1 }));
      return;
    }
    await salvarTarefas((ts) => [...ts, nova]);
  };

  return { demo, nome, stats, ops, tarefasTop, tarefasAll, nomesCli, concluirTarefa, criarTarefa };
}

export function chipClass(due: string) {
  if (due === "atrasada") return "chip bad";
  if (due === "hoje") return "chip hold";
  return "chip ok";
}
