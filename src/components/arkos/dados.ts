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
   wfa-clientes-custom no estado. status: gr = saudável, y = atenção, r = urgente. */
export type ClienteInfo = {
  id: string; nm: string; tipo: string; plano: string; status: string; meta: string;
};

export const CLIENTES_BASE: ClienteInfo[] = [
  { id: "ark", nm: "ARK Content", tipo: "Interno", plano: "Interno", status: "gr", meta: "Marketing e operação da própria ARK" },
  { id: "vivenda", nm: "Vivenda", tipo: "ARK", plano: "Plano X", status: "gr", meta: "Maior ticket · 3 captações/mês · prioritário" },
  { id: "fercon", nm: "Fercon", tipo: "ARK", plano: "Gold", status: "gr", meta: "Ampliou · 2 captações/mês" },
  { id: "sasse", nm: "Sasse Gifts", tipo: "ARK", plano: "Plano X", status: "gr", meta: "2 captações/mês" },
  { id: "fonseca", nm: "Fonseca & Cavalcanti", tipo: "ARK", plano: "Gold", status: "gr", meta: "1 captação/mês · próxima fase" },
  { id: "vaca", nm: "Vaca Velha", tipo: "ARK", plano: "Gold", status: "gr", meta: "1 captação/mês" },
  { id: "dom", nm: "Dom Baruka", tipo: "Alpha", plano: "Alpha Senior", status: "r", meta: "URGENTE · cardápio + iFood + bebidas" },
  { id: "stray", nm: "Stray House", tipo: "Alpha", plano: "Alpha Senior", status: "y", meta: "Recuperação · ROAS 5,08 · subir criativos" },
  { id: "cachu", nm: "Cachu Restaurante", tipo: "Alpha", plano: "Alpha Senior", status: "gr", meta: "Ajustada · acompanhando ROAS" },
  { id: "babbo", nm: "Babbo Giovanni", tipo: "Alpha", plano: "Alpha Senior", status: "y", meta: "Em ajuste · tarefas on-demand" },
  { id: "brisa", nm: "Brisa Doce Café", tipo: "Alpha", plano: "Alpha Senior", status: "gr", meta: "Super saudável · onboarding/inauguração" },
  { id: "attra", nm: "Attraversiamo Café", tipo: "Alpha", plano: "Alpha Senior", status: "gr", meta: "Bombando · 1 captação/mês" },
  { id: "4bburger", nm: "4B Burger", tipo: "ARK", plano: "Onboarding", status: "gr", meta: "Em onboarding" },
  { id: "saborlenha", nm: "Pizzaria Sabor e Lenha", tipo: "ARK", plano: "Onboarding", status: "gr", meta: "Em onboarding" },
];

export const CLIENTES_NM: Record<string, string> =
  Object.fromEntries(CLIENTES_BASE.map((c) => [c.id, c.nm]));

/* Briefing do Conselho de IA (wfa-conselho-briefings, escrito pelo agents-run) */
export type Briefing = {
  id: string; cliente: string; date: string; decisao: string; plano: string[]; lido: boolean;
};

export const BRIEFINGS_DEMO: Briefing[] = [
  { id: "bd1", cliente: "Vivenda", date: new Date().toISOString().slice(0, 10), lido: false,
    decisao: "Concentrar julho no creme de ureia: captação dedicada, três Reels de prova social e mídia paga no público de recompra.",
    plano: ["Captação do creme na fábrica com foco em textura", "Sequência de 3 Reels: antes/depois, bastidores, depoimento"] },
  { id: "bd2", cliente: "Dom Baruka", date: new Date().toISOString().slice(0, 10), lido: true,
    decisao: "Prioridade máxima no iFood: refazer fotos do cardápio e ativar cupom de primeira compra antes do fim de semana.",
    plano: ["Sessão de fotos dos 8 pratos mais pedidos", "Cupom de 20% na primeira compra via iFood"] },
];

export const APROVACOES_DEMO = [
  { t: "Carrossel · 5 motivos para amassar o burger", s: "Cachu · Social Media", cor: "#FFD84D" },
  { t: "Reel · bastidores da cozinha da Vivenda", s: "Vivenda · Roteirista", cor: "#7DD8D8" },
  { t: "Post único · promoção de quarta", s: "Babbo · Social Media", cor: "#F4A0C0" },
  { t: "Resposta sugerida no WhatsApp", s: "Fercon · Atendente", cor: "#B6A5F5" },
];

/* Proposta do agente Social Media (wfa-social-fila, server-owned; decidir via action social-decide) */
export type Proposta = {
  id: string; cliente: string; formato: string; tema: string;
  gancho: string; roteiro: string; legenda: string; cta: string;
};

export const FILA_DEMO: Proposta[] = [
  { id: "fd1", cliente: "Cachu Restaurante", formato: "Carrossel",
    tema: "5 motivos para amassar o burger do Cachu",
    gancho: "O segredo não está no pão. Está no que a gente faz antes dele.",
    roteiro: "Capa com o burger em close. Cards 2 a 5 com um motivo cada (blend da casa, pão de fermentação, queijo derretido na chapa, molho autoral). Último card com CTA.",
    legenda: "Tem burger e tem O burger. Aqui a gente escolheu fazer do jeito difícil: blend próprio, pão de fermentação natural e molho da casa. Vem provar o motivo número 6. 📍 Asa Sul",
    cta: "Marca quem vem junto no próximo rodízio." },
  { id: "fd2", cliente: "Vivenda", formato: "Reel",
    tema: "Bastidores da cozinha: o creme de ureia saindo da linha",
    gancho: "Você já viu um creme ser envasado de perto? Olha isso.",
    roteiro: "Abre na linha de envase (3s). Corte para a textura do creme. Fecha com a embalagem e o benefício em uma frase.",
    legenda: "Da linha de produção direto para a sua rotina de cuidado. O creme de ureia da Vivenda nasce assim: processo limpo, textura que você sente na primeira aplicação.",
    cta: "Toca no link da bio para conhecer." },
  { id: "fd3", cliente: "Babbo Giovanni", formato: "Post",
    tema: "Promoção de quarta: pizza em dobro",
    gancho: "Quarta é dia de dobrar a pizza, não a sobremesa.",
    roteiro: "Arte única com a pizza inteira em cima e a condição da promoção embaixo.",
    legenda: "Toda quarta a segunda pizza sai por nossa conta. Vale no salão, das 18h às 22h. Chama a mesa inteira.",
    cta: "Reserva pelo link da bio." },
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
  const [fila, setFila] = useState<Proposta[]>(FILA_DEMO);
  const [clientes, setClientes] = useState<ClienteInfo[]>(CLIENTES_BASE);
  const [briefings, setBriefings] = useState<Briefing[]>(BRIEFINGS_DEMO);

  const aplicar = (st: any, member?: any) => {
    const tarefas: any[] = Array.isArray(st["wfa-tarefas"]) ? st["wfa-tarefas"] : [];
    const custom: any[] = Array.isArray(st["wfa-clientes-custom"]) ? st["wfa-clientes-custom"] : [];
    const nomes: Record<string, string> = { ...CLIENTES_NM };
    for (const c of custom) if (c?.id && c?.nm) nomes[String(c.id)] = String(c.nm);
    setClientes([
      ...CLIENTES_BASE,
      ...custom
        .filter((c) => c?.id && c?.nm)
        .map((c) => ({
          id: String(c.id), nm: String(c.nm), tipo: String(c.tipo || "Custom"),
          plano: String(c.plano || ""), status: String(c.status || "gr"),
          meta: String(c.meta || c.extra || ""),
        })),
    ]);
    const briefRaw: any[] = Array.isArray(st["wfa-conselho-briefings"]) ? st["wfa-conselho-briefings"] : [];
    if (briefRaw.length) {
      setBriefings(briefRaw.slice(0, 10).map((b) => ({
        id: String(b?.id || ""), cliente: String(b?.cliente || nomes[b?.clienteId] || "Cliente"),
        date: String(b?.date || ""), decisao: String(b?.decisao || ""),
        plano: Array.isArray(b?.plano) ? b.plano.map((x: any) => String(x)) : [],
        lido: !!b?.lido,
      })));
    }
    const hoje = new Date().toISOString().slice(0, 10);
    const abertasArr = tarefas.filter(tarefaAberta);
    const atrasadas = abertasArr.filter((t) => (t.data || t.prazo) && String(t.data || t.prazo) < hoje).length;
    const pendentes: any[] = (st["wfa-social-fila"] || []).filter((p: any) => p?.status === "pendente");
    const fila = pendentes.length;
    setFila(pendentes
      .slice()
      .sort((a, b) => (b?.ts || 0) - (a?.ts || 0))
      .map((p) => ({
        id: String(p.id || ""), cliente: String(p.cliente || nomes[p.clienteId] || "Cliente"),
        formato: String(p.formato || "Post"), tema: String(p.tema || "Proposta de postagem"),
        gancho: String(p.gancho || ""), roteiro: String(p.roteiro || ""),
        legenda: String(p.legenda || ""), cta: String(p.cta || ""),
      })));
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

  /* Aprovar ou recusar UMA proposta (action social-decide: o servidor muda só o status). */
  const decidirProposta = async (id: string, decisao: "aprovada" | "recusada") => {
    setFila((l) => l.filter((p) => p.id !== id));
    setStats((s) => ({ ...s, fila: Math.max(0, s.fila - 1) }));
    if (demo) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("sem sessão");
      const r = await fetch("/api/workflowark/state", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "social-decide", id, decisao }),
      });
      if (!r.ok) throw new Error("decide falhou");
    } catch {
      const res = await carregar().catch(() => null);
      if (res) aplicar(res.j.state || {});
    }
  };

  /* JARVIS pela barra de missão (action jarvis: Haiku com tom de mordomo, resposta curta). */
  const jarvis = async (pergunta: string): Promise<string> => {
    if (demo) {
      await new Promise((r) => setTimeout(r, 900));
      return "Senhor, estou em modo demonstração nesta tela. Entre com a sua conta e eu passo a executar missões de verdade sobre a operação.";
    }
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("sem sessão");
      const r = await fetch("/api/workflowark/state", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "jarvis", pergunta }),
      });
      const j: any = await r.json().catch(() => ({}));
      if (!r.ok) return String(j?.error || "Senhor, encontrei uma falha ao processar. Tente novamente.");
      return String(j?.reply || "Senhor, não obtive resposta desta vez.");
    } catch {
      return "Senhor, não consegui falar com a central agora. Verifique a conexão e tente de novo.";
    }
  };

  return {
    demo, nome, stats, ops, tarefasTop, tarefasAll, nomesCli, fila, clientes, briefings,
    concluirTarefa, criarTarefa, decidirProposta, jarvis,
  };
}

export function chipClass(due: string) {
  if (due === "atrasada") return "chip bad";
  if (due === "hoje") return "chip hold";
  return "chip ok";
}
