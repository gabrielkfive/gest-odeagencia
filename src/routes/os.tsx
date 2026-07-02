// ARK OS V2 · Mission Control. Réplica fiel das referências do Figma (docs/ARKOS-V2-TOKENS.md):
// shell claro lavanda + cards brancos (SaaS Dashboard UI Kit), herói e meta em preto brilhante com
// pílula ativa preta na sidebar (Dashboard Marketing "Vision"), vidro escuro só no overlay de agente
// (Apple Vision Pro HR). Marca ARK: amarelo #FFC700 no lugar do accent das refs.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sparkles, Hexagon, Activity, BrainCircuit, Users, MessageCircle,
  PenLine, Wallet, Command, ArrowLeft, X, Search, Bell, LayoutGrid,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/os")({
  head: () => ({
    meta: [{ title: "ARK OS · Mission Control" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: ArkOS,
});

/* Design tokens (ver docs/ARKOS-V2-TOKENS.md) */
const CSS = `
html:has(.arkos),body:has(.arkos){background:#F1F2F7; margin:0}
.arkos{
  --bg:#F1F2F7; --card:#FFFFFF; --ink:#16181D; --mute:#6E7280; --dim:#A6AAB8;
  --black:#131316; --black2:#1C1C21;
  --yel:#FFC700; --yel-soft:rgba(255,199,0,.14);
  --ok:#3DD9A4; --ok-ink:#0F8A61; --bad:#F4645C; --hold:#FFC145;
  --hair:rgba(22,24,29,.07); --hair2:rgba(22,24,29,.13);
  --w06:rgba(255,255,255,.06); --w12:rgba(255,255,255,.12); --w-hair:rgba(255,255,255,.10);
  --sans:'Inter',system-ui,sans-serif; --disp:'Sora',var(--sans); --mono:'JetBrains Mono',monospace;
  background:var(--bg); color:var(--ink); font-family:var(--sans);
  min-height:100vh; overflow:hidden; position:relative;
  -webkit-font-smoothing:antialiased;
}
.arkos *{box-sizing:border-box; margin:0}
.arkos ::selection{background:var(--yel-soft)}
.arkos .mono{font-family:var(--mono)}
.arkos button{cursor:pointer; font-family:var(--sans)}
.arkos :focus-visible{outline:2px solid var(--yel); outline-offset:2px; border-radius:10px}
.arkos ::-webkit-scrollbar{width:6px}
.arkos ::-webkit-scrollbar-thumb{background:var(--hair2); border-radius:8px}
.arkos ::-webkit-scrollbar-track{background:transparent}

/* shell: sidebar branca + palco, tudo dentro do fundo lavanda (ref Vision) */
.arkos .shell{display:grid; grid-template-columns:236px minmax(0,1fr); gap:16px;
  height:100vh; padding:16px; position:relative; z-index:1}
@media (max-width:1100px){.arkos .shell{grid-template-columns:76px minmax(0,1fr)}
  .arkos .side-label,.arkos .side-sec,.arkos .side-foot{display:none}
  .arkos .side-it{justify-content:center; padding:11px 0}}

/* sidebar: card branco, item ativo = pílula preta (ref Vision) */
.arkos .side{background:var(--card); border-radius:24px; padding:22px 14px;
  display:flex; flex-direction:column; gap:2px;
  box-shadow:0 1px 2px rgba(22,24,29,.04), 0 16px 40px -28px rgba(22,24,29,.18)}
.arkos .side-logo{display:flex; align-items:center; gap:10px; padding:2px 10px 22px}
.arkos .side-logo .orb{width:30px; height:30px; border-radius:10px; display:grid; place-items:center;
  color:#131316; background:linear-gradient(135deg,#FFD84D,#E9AE00);
  box-shadow:0 6px 16px -6px rgba(255,199,0,.55)}
.arkos .side-logo b{font-family:var(--disp); font-weight:800; font-size:15px; letter-spacing:.04em}
.arkos .side-sec{font-size:10px; letter-spacing:.18em; color:var(--dim); padding:14px 12px 10px;
  text-transform:uppercase}
.arkos .side-it{position:relative; display:flex; align-items:center; gap:11px; padding:11px 14px;
  border-radius:99px; font-size:13px; font-weight:500; color:var(--mute); border:0; background:none;
  width:100%; text-align:left; font-family:var(--sans); transition:color .18s; text-decoration:none}
.arkos .side-it:hover{color:var(--ink)}
.arkos .side-it.on{color:#FFFFFF}
.arkos .side-pill{position:absolute; inset:0; border-radius:99px; background:var(--black);
  box-shadow:0 10px 22px -10px rgba(19,19,22,.5)}
.arkos .side-ic{position:relative; z-index:1; display:grid; place-items:center}
.arkos .side-label{position:relative; z-index:1; white-space:nowrap}
.arkos .side-badge{position:relative; z-index:1; margin-left:auto; min-width:20px; height:20px;
  border-radius:99px; background:var(--bad); color:#fff; font-size:10.5px; font-weight:600;
  display:grid; place-items:center; padding:0 6px}
.arkos .side-foot{padding:12px 12px 4px; font-size:10.5px; color:var(--dim)}

/* palco */
.arkos .main{min-width:0; overflow-y:auto; padding:6px 8px 8px 2px}
.arkos .stage{max-width:1180px; margin:0 auto; display:flex; flex-direction:column; gap:16px}

/* barra superior: busca larga + pílula de data + sino + avatar (ref Vision) */
.arkos .top{display:flex; align-items:center; gap:12px}
.arkos .cmd{flex:1; display:flex; align-items:center; gap:12px; background:var(--card);
  border-radius:16px; padding:0 8px 0 18px; height:52px;
  box-shadow:0 1px 2px rgba(22,24,29,.04); transition:box-shadow .25s}
.arkos .cmd:focus-within{box-shadow:0 0 0 2px var(--yel-soft), 0 10px 30px -16px rgba(255,199,0,.5)}
.arkos .cmd input{flex:1; background:none; border:0; outline:0; color:var(--ink);
  font-size:13.5px; font-family:var(--sans); min-width:0}
.arkos .cmd input::placeholder{color:var(--dim)}
.arkos .cmd .go{border:0; border-radius:12px; padding:9px 16px; font-size:12px; font-weight:600;
  color:#131316; white-space:nowrap; background:linear-gradient(180deg,#FFD84D,#E9AE00);
  box-shadow:0 8px 20px -8px rgba(255,199,0,.55); transition:transform .18s}
.arkos .cmd .go:hover{transform:translateY(-1px)}
.arkos .cmd .go:active{transform:scale(.97)}
.arkos .date-pill{display:flex; align-items:center; height:52px; padding:0 20px;
  background:var(--card); border-radius:16px; font-size:12.5px; color:var(--mute); white-space:nowrap;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .icon-btn{width:52px; height:52px; border-radius:16px; border:0; background:var(--card);
  display:grid; place-items:center; color:var(--ink); position:relative;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .icon-btn .ping{position:absolute; top:15px; right:15px; width:7px; height:7px;
  border-radius:50%; background:var(--bad); border:1.5px solid #fff}
.arkos .avatar-top{width:52px; height:52px; border-radius:16px; display:grid; place-items:center;
  font-family:var(--disp); font-weight:700; font-size:14px; color:#131316;
  background:linear-gradient(135deg,#FFD84D,#E9AE00); box-shadow:0 1px 2px rgba(22,24,29,.04)}
@media (max-width:900px){.arkos .date-pill{display:none}}

/* fileira herói: card preto + meta (ref Vision) */
.arkos .hero-row{display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:16px}
@media (max-width:1180px){.arkos .hero-row{grid-template-columns:1fr}}
.arkos .hero{position:relative; overflow:hidden; border-radius:24px; padding:34px 36px 30px;
  background:radial-gradient(120% 160% at 85% -20%, #33333B 0%, #131316 55%);
  color:#fff; box-shadow:0 30px 60px -30px rgba(19,19,22,.55)}
.arkos .hero .sphere{position:absolute; top:-70px; right:40px; width:260px; height:260px;
  border-radius:50%; pointer-events:none;
  background:radial-gradient(circle at 32% 28%, #4A4A54 0%, #202024 42%, #0C0C0E 78%);
  box-shadow:inset -20px -28px 60px rgba(0,0,0,.6), inset 14px 18px 40px rgba(255,255,255,.08),
  0 40px 80px -30px rgba(0,0,0,.8)}
.arkos .hero .eyebrow{font-size:12.5px; color:rgba(255,255,255,.55); position:relative}
.arkos .hero h1{font-family:var(--disp); font-size:clamp(28px,3.2vw,40px); font-weight:700;
  letter-spacing:-.03em; line-height:1.1; margin-top:8px; position:relative}
.arkos .hero-cards{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:26px; position:relative}
@media (max-width:640px){.arkos .hero-cards{grid-template-columns:1fr}}
.arkos .hcard{border-radius:16px; padding:18px 20px 16px; background:var(--w06);
  border:1px solid var(--w-hair); backdrop-filter:blur(6px)}
.arkos .hcard .hc-top{display:flex; align-items:center; gap:10px}
.arkos .hcard .hc-ic{width:30px; height:30px; border-radius:50%; display:grid; place-items:center;
  background:var(--w12); color:#fff}
.arkos .hcard .hc-l{margin-left:auto; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase;
  color:rgba(255,255,255,.55)}
.arkos .hcard .hc-n{font-family:var(--disp); font-size:34px; font-weight:700; letter-spacing:-.02em;
  margin-top:12px; font-variant-numeric:tabular-nums}
.arkos .hcard .hc-s{font-size:11.5px; color:rgba(255,255,255,.5); margin-top:6px; text-align:right}

/* meta: donut amarelo sobre preto (ref Vision, accent ARK) */
.arkos .goal{position:relative; overflow:hidden; border-radius:24px; padding:26px 26px 24px;
  background:radial-gradient(130% 150% at 15% 110%, #2A2A31 0%, #131316 60%);
  color:#fff; display:flex; flex-direction:column; align-items:center;
  box-shadow:0 30px 60px -30px rgba(19,19,22,.55)}
.arkos .goal .gt{font-family:var(--disp); font-size:15px; font-weight:600; align-self:flex-start}
.arkos .goal .donut-wrap{position:relative; margin-top:18px}
.arkos .goal .donut-pct{position:absolute; inset:0; display:grid; place-items:center;
  font-family:var(--disp); font-size:30px; font-weight:700; letter-spacing:-.02em}
.arkos .goal .gv{font-family:var(--disp); font-size:22px; font-weight:700; margin-top:16px;
  font-variant-numeric:tabular-nums}
.arkos .goal .gs{font-size:11.5px; color:rgba(255,255,255,.55); margin-top:6px; text-align:center}
.arkos .goal .gbtn{margin-top:16px; border:0; border-radius:12px; background:#fff; color:#131316;
  font-size:12.5px; font-weight:600; padding:11px 22px; text-decoration:none; transition:transform .18s}
.arkos .goal .gbtn:hover{transform:translateY(-1px)}

/* fileira de conteúdo: tabela + coluna direita */
.arkos .body-row{display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:16px; align-items:start}
@media (max-width:1180px){.arkos .body-row{grid-template-columns:1fr}}
.arkos .panel{background:var(--card); border-radius:24px; padding:22px 24px;
  box-shadow:0 1px 2px rgba(22,24,29,.04), 0 16px 40px -30px rgba(22,24,29,.16)}
.arkos .panel .pt{font-family:var(--disp); font-size:15px; font-weight:600;
  display:flex; align-items:center; justify-content:space-between}
.arkos .panel .pt a{font-size:11.5px; color:var(--dim); text-decoration:none; font-family:var(--sans); font-weight:500}
.arkos .panel .pt a:hover{color:var(--ink)}

/* tabela de tarefas (ref Vision "Latest Transaction") */
.arkos table.tt{width:100%; border-collapse:collapse; margin-top:14px}
.arkos .tt th{font-size:11px; font-weight:500; color:var(--dim); text-align:left;
  padding:8px 10px; border-bottom:1px solid var(--hair)}
.arkos .tt td{font-size:12.5px; padding:13px 10px; border-bottom:1px solid var(--hair); vertical-align:middle}
.arkos .tt tr:last-child td{border-bottom:0}
.arkos .tt .t-name{font-weight:500; color:var(--ink); max-width:340px; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis}
.arkos .tt .t-cli{color:var(--mute)}
.arkos .chip{display:inline-block; font-size:10.5px; font-weight:600; color:#fff;
  border-radius:6px; padding:4px 10px; white-space:nowrap}
.arkos .chip.ok{background:var(--ok)}
.arkos .chip.hold{background:var(--hold); color:#131316}
.arkos .chip.bad{background:var(--bad)}
.arkos .tbtn{border:0; border-radius:8px; background:var(--black); color:#fff; font-size:11px;
  font-weight:500; padding:7px 14px; text-decoration:none; display:inline-block}
.arkos .tbtn:hover{background:var(--black2)}
@media (max-width:760px){.arkos .tt .hide-sm{display:none}}

/* aprovações (ref Vision Pro "Waiting For Approval" + "Sales History") */
.arkos .ap-it{display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--hair)}
.arkos .ap-it:last-child{border-bottom:0}
.arkos .ap-ic{width:40px; height:40px; border-radius:14px; display:grid; place-items:center;
  color:#131316; flex-shrink:0}
.arkos .ap-tx{flex:1; min-width:0}
.arkos .ap-t{font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.arkos .ap-s{font-size:11px; color:var(--mute); margin-top:2px; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis}
.arkos .ap-chip{border-radius:8px; background:var(--ok); color:#fff; font-size:11px; font-weight:600;
  padding:6px 12px; white-space:nowrap; border:0; text-decoration:none}
.arkos .ap-chip.yel{background:var(--yel); color:#131316}

/* feed de operações */
.arkos .feed{display:flex; flex-direction:column}
.arkos .feed-h{display:flex; align-items:center; gap:9px}
.arkos .live{width:7px; height:7px; border-radius:50%; background:var(--ok); box-shadow:0 0 10px var(--ok)}
.arkos .op{display:flex; gap:11px; padding:11px 0; border-bottom:1px solid var(--hair); align-items:flex-start}
.arkos .op:last-child{border-bottom:0}
.arkos .op-dot{width:7px; height:7px; border-radius:50%; background:var(--yel); margin-top:5px; flex-shrink:0;
  box-shadow:0 0 8px rgba(255,199,0,.5)}
.arkos .op .who{font-size:10px; letter-spacing:.12em; color:var(--dim); font-weight:600}
.arkos .op .what{font-size:12px; color:var(--ink); margin-top:3px; line-height:1.5}
.arkos .op .when{font-size:10.5px; color:var(--dim); margin-top:3px; font-family:var(--mono)}

/* KPIs claros com gráfico menta (ref SaaS UI Kit) */
.arkos .kpis{display:grid; grid-template-columns:repeat(4,1fr); gap:16px}
@media (max-width:1180px){.arkos .kpis{grid-template-columns:repeat(2,1fr)}}
.arkos .kpi{background:var(--card); border-radius:20px; padding:18px 20px 14px;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .kpi .l{font-size:11.5px; color:var(--mute)}
.arkos .kpi .row{display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-top:8px}
.arkos .kpi .n{font-family:var(--disp); font-size:30px; font-weight:700; letter-spacing:-.03em;
  line-height:1; font-variant-numeric:tabular-nums}
.arkos .kpi .delta{margin-top:8px; font-size:10.5px; color:var(--mute)}
.arkos .kpi .delta b{color:var(--ok-ink); font-weight:600}

/* sociedade de agentes: cards brancos, expansão em vidro (ref Vision Pro) */
.arkos .sec-t{display:flex; align-items:baseline; gap:12px; margin-top:6px}
.arkos .sec-t h2{font-family:var(--disp); font-size:15px; font-weight:600}
.arkos .sec-t span{font-size:11px; color:var(--dim)}
.arkos .agents{display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px}
.arkos .ag{background:var(--card); border-radius:20px; padding:18px 18px 16px; cursor:pointer;
  box-shadow:0 1px 2px rgba(22,24,29,.04); transition:box-shadow .25s}
.arkos .ag:hover{box-shadow:0 18px 40px -24px rgba(22,24,29,.3)}
.arkos .ag-top{display:flex; align-items:center; gap:12px}
.arkos .orb{width:40px; height:40px; border-radius:14px; display:grid; place-items:center;
  background:var(--bg); color:var(--mute)}
.arkos .ag.online .orb{color:#131316; background:linear-gradient(135deg,#FFD84D,#E9AE00);
  box-shadow:0 8px 18px -8px rgba(255,199,0,.6)}
.arkos .ag-name{font-family:var(--disp); font-size:13.5px; font-weight:600; letter-spacing:-.01em}
.arkos .ag-role{font-size:11px; color:var(--dim); margin-top:1px}
.arkos .ag-st{margin-top:14px; font-size:11px; color:var(--mute);
  display:flex; align-items:center; gap:8px; min-height:15px}
.arkos .ag-st .dot{width:5px; height:5px; border-radius:50%; box-shadow:0 0 9px currentColor}

/* expandido: painel de vidro escuro (ref Vision Pro HR) */
.arkos .veil{position:fixed; inset:0; z-index:30; background:rgba(10,10,14,.5);
  backdrop-filter:blur(16px) saturate(1.2)}
.arkos .ag-x-wrap{position:fixed; inset:0; z-index:31; display:grid; place-items:center; pointer-events:none}
.arkos .ag-x{position:relative; pointer-events:auto; width:min(560px,92vw);
  padding:30px; border-radius:24px;
  background:rgba(28,28,33,.78); backdrop-filter:blur(28px) saturate(1.4);
  border:1px solid var(--w-hair); color:#fff;
  box-shadow:0 50px 100px -40px rgba(0,0,0,.7)}
.arkos .ag-x .ag-name{color:#fff}
.arkos .ag-x .ag-role{color:rgba(255,255,255,.55)}
.arkos .ag-x .orb{background:var(--w12); color:#fff}
.arkos .ag-x .close{position:absolute; top:18px; right:18px; background:var(--w12); border:0;
  color:#fff; width:30px; height:30px; border-radius:9px; display:grid; place-items:center}
.arkos .ag-x .desc{margin-top:18px; font-size:13.5px; color:rgba(255,255,255,.7); line-height:1.65}
.arkos .ag-x .hist{margin-top:22px; display:flex; flex-direction:column; gap:10px}
.arkos .ag-x .hist .h-it{display:flex; gap:11px; font-size:12.5px; color:rgba(255,255,255,.65); align-items:baseline}
.arkos .ag-x .hist .h-t{font-family:var(--mono); font-size:10px; color:rgba(255,255,255,.4); min-width:44px}

/* boot: tela acordando */
.arkos .boot{position:fixed; inset:0; background:#0B0B0D; z-index:50; display:grid; place-items:center}
.arkos .boot-mark{font-family:var(--disp); font-weight:800; font-size:clamp(44px,8vw,84px);
  letter-spacing:.08em; display:flex;
  background:linear-gradient(180deg,#FFF 30%, rgba(255,255,255,.4));
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .boot-mark .os{background:linear-gradient(180deg,var(--yel),#D9A800);
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .boot-lines{position:absolute; bottom:14vh; left:50%; transform:translateX(-50%);
  font-family:var(--mono); font-size:11.5px; color:#8B8B95; display:flex;
  flex-direction:column; gap:7px; align-items:center}
.arkos .boot-lines .ok{color:var(--ok)}
.arkos .demo-tag{font-size:9.5px; letter-spacing:.18em; color:#8A6200;
  background:var(--yel-soft); border-radius:99px; padding:5px 12px; white-space:nowrap}
`;

/* Física */
const spring = { type: "spring" as const, stiffness: 400, damping: 34, mass: 0.8 };
const springSoft = { type: "spring" as const, stiffness: 200, damping: 26, mass: 1.1 };
const morph = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.9 };

/* Dados */
type Agent = {
  id: string; Icon: any; nome: string; papel: string; desc: string;
  status: "online" | "idle"; fazendo: string[];
};
type Op = { id: string; who: string; what: string; when: string };

const AGENTES: Agent[] = [
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

const OPS_DEMO: Op[] = [
  { id: "d1", who: "SOCIAL MEDIA", what: "3 propostas de postagem enviadas para a fila de aprovação.", when: "agora" },
  { id: "d2", who: "CONSELHO DE IA", what: "Debate concluído para Vivenda: decisão e plano registrados.", when: "há 2 min" },
  { id: "d3", who: "ATENDENTE", what: "Demanda identificada no WhatsApp. Tarefa proposta aguardando seu aval.", when: "há 6 min" },
  { id: "d4", who: "SISTEMA", what: "Sincronização com Supabase concluída.", when: "há 9 min" },
];

const BOOT_LINES = [
  "Conectando memória…",
  "Acordando agentes…",
  "Sincronizando estado…",
  "Workspace pronto.",
];

/* Boot */
function Boot({ done }: { done: () => void }) {
  const reduced = useReducedMotion();
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (reduced) { done(); return; }
    const iv = setInterval(() => setLine((l) => l + 1), 380);
    const end = setTimeout(done, 380 * BOOT_LINES.length + 420);
    return () => { clearInterval(iv); clearTimeout(end); };
  }, [reduced, done]);
  return (
    <motion.div className="boot" onClick={done}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(6px)", transition: { duration: 0.5, ease: [0.3, 0, 0.2, 1] } }}>
      <div className="boot-mark" aria-label="ARK OS">
        {"ARK".split("").map((ch, i) => (
          <motion.span key={i} initial={{ y: 46, opacity: 0, rotateX: 55 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ ...springSoft, delay: 0.12 * i }}>{ch}</motion.span>
        ))}
        <motion.span className="os" initial={{ y: 46, opacity: 0, rotateX: 55 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ ...springSoft, delay: 0.42 }}>
          &nbsp;OS
        </motion.span>
      </div>
      <div className="boot-lines" aria-hidden>
        {BOOT_LINES.slice(0, line + 1).map((t, i) => (
          <motion.div key={t} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={spring} className={i === BOOT_LINES.length - 1 ? "ok" : undefined}>
            {i < line ? "✓ " : "• "}{t}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* Dados reais com sessão, demo sem */
function useArkData() {
  const [demo, setDemo] = useState(true);
  const [nome, setNome] = useState("Senhor");
  const [stats, setStats] = useState({ abertas: 0, atrasadas: 0, fila: 0, briefings: 0 });
  const [ops, setOps] = useState<Op[]>([]);
  const [tarefasTop, setTarefasTop] = useState<{ tt: string; cc: string; due: string }[]>([]);
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
          .slice(0, 6)
          .map((t) => ({
            tt: String(t.titulo || t.nome || t.texto || "Tarefa"),
            cc: [t.cliente, t.area || t.responsavel].filter(Boolean).join(" · ") || "ARK",
            due: t.prazo === hoje ? "hoje" : t.prazo && t.prazo < hoje ? "atrasada" : String(t.prazo || "").slice(5) || "sem prazo",
          }));
        const first = (j.member?.full_name || "").split(" ")[0];
        setNome(first || "Senhor");
        setStats({ abertas, atrasadas, fila, briefings });
        setTarefasTop(abertasList);
        if (reais.length) setOps(reais);
        setDemo(false);
      } catch { /* segue em demo */ }
    })();
    return () => { alive = false; };
  }, []);
  return { demo, nome, stats, ops, tarefasTop };
}

/* Sparkline em menta (ref SaaS UI Kit): linha + área com gradiente */
function Spark({ pts, id }: { pts: number[]; id: string }) {
  const w = 92, h = 32, min = Math.min(...pts), max = Math.max(...pts) || 1;
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * (w - 4) + 2,
    h - 5 - ((v - min) / (max - min || 1)) * (h - 12),
  ]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx] = xy[xy.length - 1];
  return (
    <svg width={w} height={h} aria-hidden>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3DD9A4" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3DD9A4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${lx},${h} L2,${h} Z`} fill={`url(#sg-${id})`} />
      <motion.path d={d} fill="none" stroke="#3DD9A4" strokeWidth={2} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.3, 0, 0.2, 1] }} />
    </svg>
  );
}

/* Donut da meta: amarelo ARK sobre trilha translúcida (ref Vision "Marketing Goal") */
function Donut({ pct }: { pct: number }) {
  const R = 56, C = 2 * Math.PI * R;
  return (
    <div className="donut-wrap">
      <svg width={150} height={150} viewBox="0 0 150 150" aria-hidden>
        <circle cx={75} cy={75} r={R} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={16} />
        <motion.circle cx={75} cy={75} r={R} fill="none" stroke="#FFC700" strokeWidth={16}
          strokeLinecap="round" strokeDasharray={C} transform="rotate(-90 75 75)"
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - Math.min(1, Math.max(0, pct / 100))) }}
          transition={{ duration: 1.1, ease: [0.3, 0, 0.2, 1], delay: 0.3 }} />
      </svg>
      <div className="donut-pct">{Math.round(pct)}%</div>
    </div>
  );
}

const TAREFAS_DEMO = [
  { tt: "Aprovar plano de conteúdo de julho da Vivenda", cc: "Vivenda · Conselho de IA", due: "hoje" },
  { tt: "Gravar captação do creme de ureia (plano Copa)", cc: "Vivenda · Captação", due: "hoje" },
  { tt: "Revisar régua de cobrança da semana", cc: "Financeiro · Cobrança", due: "amanhã" },
  { tt: "Responder demanda do portal da Fercon", cc: "Fercon · Portal do cliente", due: "amanhã" },
  { tt: "Postar carrossel aprovado do Cachu", cc: "Cachu · Social Media", due: "qui" },
  { tt: "Fechar relatório mensal da Sasse", cc: "Sasse · Relatórios", due: "sex" },
];

const APROVACOES_DEMO = [
  { t: "Carrossel · 5 motivos para amassar o burger", s: "Cachu · Social Media", cor: "#FFD84D" },
  { t: "Reel · bastidores da cozinha da Vivenda", s: "Vivenda · Roteirista", cor: "#7DD8D8" },
  { t: "Post único · promoção de quarta", s: "Babbo · Social Media", cor: "#F4A0C0" },
  { t: "Resposta sugerida no WhatsApp", s: "Fercon · Atendente", cor: "#B6A5F5" },
];

function StatusLine({ a, i }: { a: Agent; i: number }) {
  const [fase, setFase] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setFase((f) => f + 1), 3600 + i * 340);
    return () => clearInterval(iv);
  }, [i]);
  const cor = a.status === "online" ? "var(--ok-ink)" : "var(--dim)";
  return (
    <div className="ag-st">
      <span className="dot" style={{ background: cor, color: cor }} />
      <AnimatePresence mode="wait">
        <motion.span key={fase} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }} transition={spring}>
          {a.fazendo[fase % a.fazendo.length]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* Card de agente: expande no lugar (pasta iOS) */
function AgentCard({ a, i, open }: { a: Agent; i: number; open: (id: string) => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.div layoutId={`ag-${a.id}`} className={`ag ${a.status}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.4, delay: 0.05 * i }}
      whileHover={{ y: -4, scale: 1.015, transition: spring }}
      whileTap={{ scale: 0.98 }}
      onClick={() => open(a.id)}>
      <div className="ag-top">
        <div className="orb">
          <a.Icon size={17} strokeWidth={1.8} />
        </div>
        <div>
          <div className="ag-name">{a.nome}</div>
          <div className="ag-role">{a.papel}</div>
        </div>
      </div>
      <StatusLine a={a} i={i} />
    </motion.div>
  );
}

function AgentExpanded({ a, close }: { a: Agent; close: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);
  const hist = [
    { t: "09:40", x: "Última execução concluída sem erros." },
    { t: "09:12", x: "Contexto do cliente carregado da memória." },
    { t: "08:55", x: "Agente acordado pelo sistema." },
  ];
  return (
    <>
      <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={close} />
      <div className="ag-x-wrap">
      <motion.div layoutId={`ag-${a.id}`} className={`ag-x ${a.status}`} transition={morph}>
        <button className="close" onClick={close} aria-label="Fechar"><X size={15} /></button>
        <div className="ag-top">
          <div className="orb" style={{ width: 48, height: 48, borderRadius: 14 }}>
            <a.Icon size={21} strokeWidth={1.8} color={a.status === "online" ? "#FFC700" : undefined} />
          </div>
          <div>
            <div className="ag-name" style={{ fontSize: 17 }}>{a.nome}</div>
            <div className="ag-role">{a.papel} · {a.status === "online" ? "online agora" : "em espera"}</div>
          </div>
        </div>
        <motion.p className="desc" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}>{a.desc}</motion.p>
        <motion.div className="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}>
          {hist.map((h, i) => (
            <motion.div className="h-it" key={i} initial={{ x: 14, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }} transition={{ ...spring, delay: 0.16 + i * 0.06 }}>
              <span className="h-t">{h.t}</span><span>{h.x}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      </div>
    </>
  );
}

const RAIL = [
  { id: "missao", Icon: LayoutGrid, label: "Mission Control" },
  { id: "agentes", Icon: Hexagon, label: "Agentes" },
  { id: "operacoes", Icon: Activity, label: "Operações" },
  { id: "memoria", Icon: BrainCircuit, label: "Memória" },
  { id: "clientes", Icon: Users, label: "Clientes" },
];

function chipClass(due: string) {
  if (due === "atrasada") return "chip bad";
  if (due === "hoje") return "chip hold";
  return "chip ok";
}

/* ARK OS */
function ArkOS() {
  const reduced = useReducedMotion();
  const [booted, setBooted] = useState(false);
  const [nav, setNav] = useState("missao");
  const [cmd, setCmd] = useState("");
  const [openAg, setOpenAg] = useState<string | null>(null);
  const { demo, nome, stats, ops, tarefasTop } = useArkData();
  const [feed, setFeed] = useState<Op[]>([]);
  const feedIdx = useRef(0);

  useEffect(() => {
    const fonte = ops.length ? ops : OPS_DEMO;
    feedIdx.current = 0;
    setFeed([]);
    if (!booted) return;
    const push = () => {
      const item = fonte[feedIdx.current];
      if (!item) return;
      feedIdx.current += 1;
      setFeed((f) => [item, ...f].slice(0, 12));
    };
    push();
    const iv = setInterval(push, 1700);
    return () => clearInterval(iv);
  }, [booted, ops]);

  const agora = new Date();
  const hora = agora.getHours();
  const saud = hora < 5 ? "Boa madrugada" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const agAberto = AGENTES.find((a) => a.id === openAg);

  const abertas = demo ? 23 : stats.abertas;
  const atrasadas = demo ? 3 : stats.atrasadas;
  const fila = demo ? 4 : stats.fila;
  const briefings = demo ? 12 : stats.briefings;
  const emDia = abertas > 0 ? Math.round(100 * (abertas - atrasadas) / abertas) : 100;

  const shell = useMemo(() => ({
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: 0.05 } },
  }), [reduced]);
  const chega = { hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: spring } };

  return (
    <div className="arkos" data-build="arkos-v2-20260702-1720">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <AnimatePresence>{!booted && <Boot done={() => setBooted(true)} />}</AnimatePresence>

      {booted && (
        <div className="shell">
          <motion.nav className="side" initial={{ x: -240, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
            transition={{ ...springSoft, delay: 0.05 }}>
            <div className="side-logo">
              <span className="orb"><Sparkles size={16} strokeWidth={2} /></span>
              <b>ARK OS</b>
            </div>
            <div className="side-sec">Operação</div>
            {RAIL.map((r) => (
              <button key={r.id} className={`side-it ${nav === r.id ? "on" : ""}`} onClick={() => setNav(r.id)}>
                {nav === r.id && <motion.span className="side-pill" layoutId="sidepill" transition={spring} />}
                <span className="side-ic"><r.Icon size={16} strokeWidth={1.8} /></span>
                <span className="side-label">{r.label}</span>
                {r.id === "operacoes" && fila > 0 && <span className="side-badge">{fila}</span>}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <div className="side-sec">Sistema</div>
            <a className="side-it" href="/app">
              <span className="side-ic"><ArrowLeft size={15} strokeWidth={1.8} /></span>
              <span className="side-label">WorkFlowArk V1</span>
            </a>
            <div className="side-foot">© ARK Content 2026</div>
          </motion.nav>

          <motion.main className="main" variants={shell} initial="hidden" animate="show">
            <div className="stage">
              <motion.div variants={chega} className="top">
                <label className="cmd">
                  <Search size={16} color="#A6AAB8" strokeWidth={2} />
                  <input value={cmd} onChange={(e) => setCmd(e.target.value)}
                    placeholder="Declare um objetivo. Ex.: preparar o lançamento da Vivenda…" />
                  <button className="go" type="button"><Sparkles size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Lançar missão</button>
                </label>
                <span className="date-pill">
                  {agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
                {demo && <span className="demo-tag mono">DEMO</span>}
                <button className="icon-btn" aria-label="Notificações">
                  <Bell size={17} strokeWidth={1.8} />
                  {fila > 0 && <span className="ping" />}
                </button>
                <span className="avatar-top">{nome.slice(0, 1).toUpperCase()}</span>
              </motion.div>

              <motion.div variants={chega} className="hero-row">
                <div className="hero">
                  <div className="sphere" aria-hidden />
                  <div className="eyebrow">Mission Control · ARK Content</div>
                  <h1>{saud}, {nome} 👋</h1>
                  <div className="hero-cards">
                    <div className="hcard">
                      <div className="hc-top">
                        <span className="hc-ic"><Activity size={14} strokeWidth={2} /></span>
                        <span className="hc-l">Tarefas abertas</span>
                      </div>
                      <div className="hc-n">{abertas}</div>
                      <div className="hc-s">na operação agora</div>
                    </div>
                    <div className="hcard">
                      <div className="hc-top">
                        <span className="hc-ic"><Hexagon size={14} strokeWidth={2} /></span>
                        <span className="hc-l">Briefings do conselho</span>
                      </div>
                      <div className="hc-n">{briefings}</div>
                      <div className="hc-s">últimos 14 dias</div>
                    </div>
                  </div>
                </div>

                <div className="goal">
                  <div className="gt">Operação em dia</div>
                  <Donut pct={emDia} />
                  <div className="gv">{atrasadas} atrasada{atrasadas === 1 ? "" : "s"}</div>
                  <div className="gs">de {abertas} tarefas abertas. {fila} proposta{fila === 1 ? "" : "s"} esperando o seu aval.</div>
                  <a className="gbtn" href="/postagens">Revisar fila</a>
                </div>
              </motion.div>

              <motion.div variants={chega} className="body-row">
                <div className="panel">
                  <div className="pt">Hoje na operação <a href="/app">abrir tarefas →</a></div>
                  <table className="tt">
                    <thead>
                      <tr>
                        <th>Tarefa</th>
                        <th className="hide-sm">Cliente · Área</th>
                        <th>Prazo</th>
                        <th aria-label="Ação" />
                      </tr>
                    </thead>
                    <tbody>
                      {(tarefasTop.length ? tarefasTop : TAREFAS_DEMO).map((t, i) => (
                        <motion.tr key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ ...spring, delay: 0.25 + i * 0.05 }}>
                          <td className="t-name">{t.tt}</td>
                          <td className="t-cli hide-sm">{t.cc}</td>
                          <td><span className={chipClass(t.due)}>{t.due}</span></td>
                          <td style={{ textAlign: "right" }}><a className="tbtn" href="/app">Abrir</a></td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="panel">
                    <div className="pt">Fila de aprovação <a href="/postagens">ver todas →</a></div>
                    <div style={{ marginTop: 8 }}>
                      {APROVACOES_DEMO.slice(0, demo ? 4 : Math.max(1, Math.min(4, fila))).map((p, i) => (
                        <motion.div className="ap-it" key={i} initial={{ opacity: 0, x: 14 }}
                          animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.3 + i * 0.06 }}>
                          <span className="ap-ic" style={{ background: p.cor }}>
                            <PenLine size={16} strokeWidth={1.8} />
                          </span>
                          <div className="ap-tx">
                            <div className="ap-t">{p.t}</div>
                            <div className="ap-s">{p.s}</div>
                          </div>
                          <a className="ap-chip" href="/postagens">Revisar</a>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="panel feed">
                    <div className="pt feed-h">
                      <motion.span className="live" animate={reduced ? {} : { opacity: [1, 0.35, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity }} />
                      Operações ao vivo
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <AnimatePresence initial={false}>
                        {feed.slice(0, 6).map((o) => (
                          <motion.div key={o.id} className="op" layout
                            initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                            exit={{ opacity: 0 }} transition={spring}>
                            <span className="op-dot" />
                            <div>
                              <div className="who">{o.who}</div>
                              <div className="what">{o.what}</div>
                              <div className="when">{o.when}</div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={chega} className="kpis">
                {[
                  { n: abertas, l: "Tarefas abertas", d: "+4 esta semana", pts: [12, 14, 13, 17, 16, 19, 18, 21, 20, 23] },
                  { n: atrasadas, l: "Atrasadas", d: "2 a menos que ontem", pts: [8, 7, 7, 6, 5, 6, 5, 4, 4, 3] },
                  { n: fila, l: "Aguardando seu aval", d: "fila de aprovação", pts: [1, 2, 2, 3, 2, 4, 3, 5, 4, 6] },
                  { n: briefings, l: "Briefings do conselho", d: "últimos 14 dias", pts: [4, 5, 6, 6, 8, 7, 9, 10, 11, 12] },
                ].map((s, i) => (
                  <div className="kpi" key={s.l}>
                    <div className="l">{s.l}</div>
                    <div className="row">
                      <div className="n">{s.n}</div>
                      <Spark pts={s.pts} id={String(i)} />
                    </div>
                    <div className="delta"><b>●</b> {s.d}</div>
                  </div>
                ))}
              </motion.div>

              <motion.div variants={chega} className="sec-t">
                <h2>Sociedade de agentes</h2>
                <span>toque para abrir</span>
              </motion.div>
              <div className="agents" style={{ paddingBottom: 24 }}>
                {AGENTES.map((a, i) => <AgentCard key={a.id} a={a} i={i} open={setOpenAg} />)}
              </div>
            </div>
          </motion.main>
        </div>
      )}

      <AnimatePresence>
        {agAberto && <AgentExpanded a={agAberto} close={() => setOpenAg(null)} />}
      </AnimatePresence>
    </div>
  );
}
