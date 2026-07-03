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

export type TarefaLinha = { tt: string; cc: string; due: string };

export const TAREFAS_DEMO = [
  { tt: "Aprovar plano de conteúdo de julho da Vivenda", cc: "Vivenda · Conselho de IA", due: "hoje" },
  { tt: "Gravar captação do creme de ureia (plano Copa)", cc: "Vivenda · Captação", due: "hoje" },
  { tt: "Revisar régua de cobrança da semana", cc: "Financeiro · Cobrança", due: "amanhã" },
  { tt: "Responder demanda do portal da Fercon", cc: "Fercon · Portal do cliente", due: "amanhã" },
  { tt: "Postar carrossel aprovado do Cachu", cc: "Cachu · Social Media", due: "qui" },
  { tt: "Fechar relatório mensal da Sasse", cc: "Sasse · Relatórios", due: "sex" },
];

export const TAREFAS_DEMO_OPS = [
  { tt: "Enviar relatório de junho da Babbo", cc: "Babbo · Relatórios", due: "atrasada" },
  { tt: "Cobrar aprovação do calendário do Cachu", cc: "Cachu · Social Media", due: "atrasada" },
  { tt: "Ajustar orçamento de tráfego da Fercon", cc: "Fercon · Tráfego", due: "atrasada" },
  ...TAREFAS_DEMO,
  { tt: "Planejar pauta do conselho de agosto", cc: "ARK · Conselho de IA", due: "07-10" },
  { tt: "Atualizar organograma no ARK OS", cc: "ARK · Sistema", due: "07-14" },
];

export const APROVACOES_DEMO = [
  { t: "Carrossel · 5 motivos para amassar o burger", s: "Cachu · Social Media", cor: "#FFD84D" },
  { t: "Reel · bastidores da cozinha da Vivenda", s: "Vivenda · Roteirista", cor: "#7DD8D8" },
  { t: "Post único · promoção de quarta", s: "Babbo · Social Media", cor: "#F4A0C0" },
  { t: "Resposta sugerida no WhatsApp", s: "Fercon · Atendente", cor: "#B6A5F5" },
];

/* Dados reais com sessão, demo sem */
export function useArkData() {
  const [demo, setDemo] = useState(true);
  const [nome, setNome] = useState("Senhor");
  const [stats, setStats] = useState({ abertas: 0, atrasadas: 0, fila: 0, briefings: 0 });
  const [ops, setOps] = useState<Op[]>([]);
  const [tarefasTop, setTarefasTop] = useState<{ tt: string; cc: string; due: string }[]>([]);
  const [tarefasAll, setTarefasAll] = useState<{ tt: string; cc: string; due: string }[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const r = await fetch("/api/workflowark/state", { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return;
        const j = await r.json();
        if (!alive) return;
        const st = j.state || {};
        const tarefas: any[] = st["wfa-tarefas"] || [];
        const hoje = new Date().toISOString().slice(0, 10);
        const abertas = tarefas.filter((t) => t && !t.done && !t.concluida).length;
        const atrasadas = tarefas.filter((t) => t && !t.done && !t.concluida && t.prazo && t.prazo < hoje).length;
        const fila = (st["wfa-social-fila"] || []).filter((p: any) => p?.status === "pendente").length;
        const briefings = (st["wfa-conselho-briefings"] || []).length;
        const notifs: any[] = st["wfa-notificacoes"] || [];
        const reais: Op[] = notifs.slice(-14).reverse().map((n: any, i: number) => ({
          id: `r${i}`,
          who: String(n?.origem || n?.tipo || "SISTEMA").toUpperCase(),
          what: String(n?.msg || n?.texto || n?.titulo || "Atividade registrada."),
          when: n?.ts ? new Date(n.ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "",
        }));
        const abertasList = tarefas
          .filter((t) => t && !t.done && !t.concluida)
          .sort((a, b) => String(a.prazo || "9999").localeCompare(String(b.prazo || "9999")))
          .map((t) => ({
            tt: String(t.titulo || t.nome || t.texto || "Tarefa"),
            cc: [t.cliente, t.area || t.responsavel].filter(Boolean).join(" · ") || "ARK",
            due: t.prazo === hoje ? "hoje" : t.prazo && t.prazo < hoje ? "atrasada" : String(t.prazo || "").slice(5) || "sem prazo",
          }));
        const first = (j.member?.full_name || "").split(" ")[0];
        setNome(first || "Senhor");
        setStats({ abertas, atrasadas, fila, briefings });
        setTarefasTop(abertasList.slice(0, 6));
        setTarefasAll(abertasList);
        if (reais.length) setOps(reais);
        setDemo(false);
      } catch { /* segue em demo */ }
    })();
    return () => { alive = false; };
  }, []);
  return { demo, nome, stats, ops, tarefasTop, tarefasAll };
}

export function chipClass(due: string) {
  if (due === "atrasada") return "chip bad";
  if (due === "hoje") return "chip hold";
  return "chip ok";
}
