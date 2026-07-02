// ARK OS V2 · Mission Control — camada visual premium (refs: motion.dev, iOS folder, Mintlify)
// Regras: luz ambiente em vez de caixas; profundidade por camadas; amarelo só como acento;
// nada aparece, tudo chega; clicar num agente o expande no lugar (shared layout, estilo pasta iOS).
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sparkles, Hexagon, Activity, BrainCircuit, Users, MessageCircle,
  PenLine, Wallet, Command, ArrowLeft, X,
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

/* ── Design tokens ──────────────────────────────────────── */
const CSS = `
html:has(.arkos),body:has(.arkos){background:#FAFAF7; margin:0}
.arkos{
  --void:#FAFAF7; --ink:#1D1D1F; --mute:#6E6E76; --dim:#A2A2AA;
  --yel:#FFC700; --yel-glow:rgba(255,199,0,.16);
  --ok:#16A34A; --warn:#C2760A; --bad:#DC2626;
  --glass:rgba(0,0,0,.025); --glass2:rgba(0,0,0,.045);
  --hair:rgba(0,0,0,.07); --hair2:rgba(0,0,0,.12);
  --card:#FFFFFF;
  --ink-dark:#F5F4F0; --mute-dark:#9C9CA6; --hair-dark:rgba(255,255,255,.09);
  --sans:'Inter',system-ui,sans-serif; --disp:'Sora',var(--sans); --mono:'JetBrains Mono',monospace;
  background:var(--void); color:var(--ink); font-family:var(--sans);
  min-height:100vh; overflow:hidden; position:relative;
  -webkit-font-smoothing:antialiased;
}
.arkos *{box-sizing:border-box; margin:0}
.arkos ::selection{background:var(--yel-glow)}
.arkos .mono{font-family:var(--mono)}

/* luz ambiente viva: sobre fundo claro, a atmosfera é quase sussurrada, nunca parada */
.arkos .aurora{position:fixed; inset:0; pointer-events:none; z-index:0; mix-blend-mode:multiply}
.arkos .aurora::before{content:''; position:absolute; width:820px; height:520px;
  top:-260px; left:14%; border-radius:50%;
  background:radial-gradient(closest-side, rgba(255,199,0,.10), transparent 70%);
  animation:drift 26s ease-in-out infinite alternate}
.arkos .aurora::after{content:''; position:absolute; width:700px; height:500px;
  bottom:-240px; right:-120px; border-radius:50%;
  background:radial-gradient(closest-side, rgba(120,140,255,.05), transparent 70%);
  animation:drift 32s ease-in-out infinite alternate-reverse}
@keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.12)}}
@media (prefers-reduced-motion:reduce){.arkos .aurora::before,.arkos .aurora::after{animation:none}}

.arkos button{cursor:pointer; font-family:var(--sans)}
.arkos :focus-visible{outline:2px solid var(--yel); outline-offset:2px; border-radius:10px}
.arkos .status-pill{display:inline-flex; align-items:center; gap:7px; margin-left:auto;
  font-size:10.5px; color:var(--mute); background:var(--glass2); border-radius:99px; padding:5px 12px}
.arkos .status-pill .dot{width:6px; height:6px; border-radius:50%; background:var(--ok); box-shadow:0 0 9px var(--ok)}

/* camadas: cartão branco denso, sombra em duas voltas (perto + longe), sem "caixa de admin" */
.arkos .mod{position:relative; border-radius:18px; background:var(--card);
  border:1px solid var(--hair);
  box-shadow:0 1px 1px rgba(0,0,0,.03), 0 14px 30px -18px rgba(20,20,25,.14);
  transition:box-shadow .25s, transform .25s;
}
.arkos .mod:hover{box-shadow:0 1px 1px rgba(0,0,0,.03), 0 22px 42px -18px rgba(20,20,25,.20)}

/* shell: chrome escuro (rail) segurando um palco claro, como dock sobre mesa iluminada */
.arkos .grid-shell{display:grid; grid-template-rows:56px 1fr; height:100vh; position:relative; z-index:1}
.arkos .grid-body{display:grid; grid-template-columns:224px 1fr 330px; min-height:0;
  gap:14px; padding:14px 16px 18px}
.arkos .pane{border-radius:22px; background:var(--card);
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset, 0 24px 50px -28px rgba(20,20,25,.16)}
.arkos .pane.rail{background:linear-gradient(180deg,#1C1C1E,#141416);
  box-shadow:0 24px 50px -24px rgba(0,0,0,.35)}
.arkos .pane.ops{background:linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,255,255,.78));
  backdrop-filter:blur(20px) saturate(1.2)}
@media (max-width:1180px){.arkos .grid-body{grid-template-columns:70px 1fr 300px}
  .arkos .rail-label,.arkos .rail-sec{display:none}}
@media (max-width:860px){.arkos .grid-body{grid-template-columns:70px 1fr}
  .arkos .ops{display:none}}

/* barra: vidro claro sobre o palco */
.arkos .bar{display:flex; align-items:center; gap:18px; padding:0 22px;
  background:rgba(250,250,247,.72); backdrop-filter:blur(18px) saturate(1.3);
  border-bottom:1px solid var(--hair); z-index:6}
.arkos .mark{font-family:var(--disp); font-weight:800; letter-spacing:.16em; font-size:13px}
.arkos .mark b{color:var(--yel); -webkit-text-stroke:.4px rgba(0,0,0,.15)}
.arkos .bar-int{display:flex; align-items:center; gap:7px; font-size:11.5px; color:var(--mute)}
.arkos .bar-dot{width:5px;height:5px;border-radius:50%; box-shadow:0 0 8px currentColor}
.arkos .bar-clock{margin-left:auto; font-size:11.5px; color:var(--dim)}
.arkos .bar-demo{font-size:9.5px; letter-spacing:.18em; color:#8A6200;
  background:var(--yel-glow); border-radius:99px; padding:4px 12px}

/* rail: grafite, texto claro, luz âmbar no ativo (a identidade do resto do sistema) */
.arkos .rail{padding:20px 12px; display:flex; flex-direction:column; gap:2px}
.arkos .rail-sec{font-family:var(--mono); font-size:9.5px; letter-spacing:.24em; color:var(--mute-dark); padding:0 12px 12px}
.arkos .rail-it{position:relative; display:flex; align-items:center; gap:11px; padding:10px 12px;
  border-radius:11px; font-size:13px; color:var(--mute-dark); cursor:pointer; border:0; background:none;
  width:100%; text-align:left; font-family:var(--sans); transition:color .18s}
.arkos .rail-it:hover{color:var(--ink-dark)}
.arkos .rail-it.on{color:var(--ink-dark); font-weight:500}
.arkos .rail-pill{position:absolute; inset:0; border-radius:11px; background:rgba(255,255,255,.07);
  box-shadow:0 1px 0 rgba(255,255,255,.07) inset}
.arkos .rail-glow{position:absolute; left:0; top:50%; width:2px; height:16px; transform:translateY(-50%);
  border-radius:2px; background:var(--yel); box-shadow:0 0 12px var(--yel)}
.arkos .rail-ic{position:relative; z-index:1; display:grid; place-items:center; opacity:.85}
.arkos .rail-label{position:relative; z-index:1}

/* palco central */
.arkos .main{padding:44px 52px; overflow-y:auto; min-width:0}
.arkos .stage{max-width:980px; margin:0 auto}
.arkos .eyebrow{display:flex; align-items:center; gap:9px;
  font-family:var(--mono); font-size:10px; letter-spacing:.26em; color:var(--dim)}
.arkos .eyebrow i{width:14px; height:1px; background:var(--yel); display:inline-block}
.arkos h1{font-family:var(--disp); font-size:clamp(28px,3.4vw,38px); font-weight:700;
  letter-spacing:-.035em; line-height:1.12; margin-top:14px;
  background:linear-gradient(180deg,#1D1D1F 45%, rgba(29,29,31,.62));
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos h1 em{font-style:normal; background:linear-gradient(180deg,var(--yel),#D9A800);
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .sub{margin-top:10px; font-size:14px; color:var(--mute); font-weight:400}

/* comando: o objeto principal do palco */
.arkos .cmd{margin-top:30px; display:flex; align-items:center; gap:14px;
  border-radius:16px; padding:17px 20px; cursor:text;
  background:var(--glass2); border:1px solid var(--hair);
  transition:box-shadow .25s, border-color .25s}
.arkos .cmd:focus-within{border-color:transparent; box-shadow:0 0 0 1px var(--yel-glow), 0 0 44px -8px rgba(255,199,0,.3),
  0 1px 0 rgba(255,255,255,.6) inset}
.arkos .cmd input{flex:1; background:none; border:0; outline:0; color:var(--ink);
  font-size:14.5px; font-family:var(--sans)}
.arkos .cmd input::placeholder{color:var(--dim)}
/* CTA primário: dourado com brilho e varredura de luz (Landingfolio) */
.arkos .cmd .go{position:relative; overflow:hidden; border:0; border-radius:11px;
  padding:10px 18px; font-size:12.5px; font-weight:600; color:#0A0A0C; white-space:nowrap;
  background:linear-gradient(180deg,#FFD84D,#E9AE00);
  box-shadow:0 1px 0 rgba(255,255,255,.35) inset, 0 8px 24px -8px rgba(255,199,0,.45);
  transition:transform .18s, box-shadow .25s}
.arkos .cmd .go:hover{transform:translateY(-1px);
  box-shadow:0 1px 0 rgba(255,255,255,.35) inset, 0 12px 34px -8px rgba(255,199,0,.6)}
.arkos .cmd .go:active{transform:translateY(0) scale(.98)}
.arkos .cmd .go::after{content:''; position:absolute; top:0; bottom:0; width:44px; left:-60px;
  transform:skewX(-20deg); background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)}
.arkos .cmd .go:hover::after{animation:shine .7s ease}
@keyframes shine{to{left:130%}}
@media (prefers-reduced-motion:reduce){.arkos .cmd .go:hover::after{animation:none}}

/* KPIs: tiles com tendência (refs: SaaS Dashboard UI Kit, mindcloud) */
.arkos .kpis{display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:34px}
@media (max-width:1280px){.arkos .kpis{grid-template-columns:repeat(2,1fr)}}
.arkos .kpi{padding:16px 18px 14px}
.arkos .kpi .l{font-size:11px; color:var(--dim); letter-spacing:.02em}
.arkos .kpi .row{display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-top:8px}
.arkos .kpi .n{font-family:var(--disp); font-size:28px; font-weight:700; letter-spacing:-.03em; line-height:1;
  font-variant-numeric:tabular-nums}
.arkos .kpi.hot .n{color:var(--yel); text-shadow:0 0 26px rgba(255,199,0,.35)}
.arkos .kpi .spark{flex-shrink:0; opacity:.9}
.arkos .kpi .delta{margin-top:9px; font-family:var(--mono); font-size:10px; color:var(--mute)}
.arkos .kpi .delta b{color:var(--ok); font-weight:500}
.arkos .kpi .delta b.down{color:var(--bad)}

/* grade de conteúdo: Hoje + Aprovação/Clientes */
.arkos .grid2{display:grid; grid-template-columns:1.5fr 1fr; gap:12px; margin-top:12px}
@media (max-width:1280px){.arkos .grid2{grid-template-columns:1fr}}
.arkos .card{padding:18px 20px}
.arkos .card .ct{font-family:var(--disp); font-size:13px; font-weight:600; display:flex;
  align-items:center; justify-content:space-between}
.arkos .card .ct a{font-size:11px; color:var(--dim); text-decoration:none; font-family:var(--sans); font-weight:400}
.arkos .card .ct a:hover{color:var(--yel)}
.arkos .li{display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--hair)}
.arkos .li:last-child{border-bottom:0; padding-bottom:2px}
.arkos .li .tick{width:16px; height:16px; border-radius:6px; border:1.5px solid var(--hair2); flex-shrink:0}
.arkos .li .tx{flex:1; min-width:0}
.arkos .li .tt{font-size:12.5px; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.arkos .li .cc{font-size:10.5px; color:var(--dim); margin-top:2px}
.arkos .chip{font-family:var(--mono); font-size:9.5px; padding:3px 8px; border-radius:99px;
  background:var(--glass2); color:var(--mute); white-space:nowrap}
.arkos .chip.due{color:var(--warn)}
.arkos .cli-strip{display:flex; flex-wrap:wrap; gap:8px; margin-top:14px}
.arkos .avatar{display:flex; align-items:center; gap:8px; padding:7px 12px 7px 8px; border-radius:99px;
  background:var(--glass2); font-size:11.5px; color:var(--mute)}
.arkos .avatar i{width:22px; height:22px; border-radius:50%; display:grid; place-items:center;
  font-style:normal; font-family:var(--disp); font-size:9px; font-weight:700; color:#0A0A0C;
  background:linear-gradient(135deg,#FFD84D,#E3A800)}
.arkos .apr{display:flex; align-items:center; gap:14px; margin-top:14px}
.arkos .apr .big{font-family:var(--disp); font-size:30px; font-weight:700; color:var(--yel);
  text-shadow:0 0 26px rgba(255,199,0,.3)}
.arkos .apr p{font-size:12px; color:var(--mute); line-height:1.5}

.arkos .sec-t{display:flex; align-items:baseline; gap:12px; margin:52px 0 18px}
.arkos .sec-t h2{font-family:var(--disp); font-size:15px; font-weight:600; letter-spacing:-.01em}
.arkos .sec-t span{font-size:11px; color:var(--dim)}

/* agentes: objetos táteis */
.arkos .agents{display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px}
.arkos .ag{padding:18px 18px 16px; cursor:pointer}
.arkos .ag-top{display:flex; align-items:center; gap:12px}
.arkos .orb{width:38px; height:38px; border-radius:12px; display:grid; place-items:center;
  background:linear-gradient(180deg, var(--glass2), var(--glass));
  box-shadow:0 1px 0 rgba(255,255,255,.6) inset; color:var(--mute)}
.arkos .ag.online .orb{color:#B37E00; background:linear-gradient(180deg, var(--yel-glow), rgba(255,199,0,.06))}
.arkos .ag-name{font-family:var(--disp); font-size:13.5px; font-weight:600; letter-spacing:-.01em}
.arkos .ag-role{font-size:11px; color:var(--dim); margin-top:1px}
.arkos .ag-st{margin-top:14px; font-family:var(--mono); font-size:10.5px; color:var(--mute);
  display:flex; align-items:center; gap:8px; min-height:15px}
.arkos .ag-st .dot{width:5px; height:5px; border-radius:50%; box-shadow:0 0 9px currentColor}

/* expandido (pasta iOS): mesmo objeto, maior */
.arkos .veil{position:fixed; inset:0; z-index:30; background:rgba(5,5,7,.55);
  backdrop-filter:blur(16px) saturate(1.2)}
.arkos .ag-x{position:fixed; z-index:31; left:50%; top:50%; width:min(560px,92vw);
  transform:translate(-50%,-50%); padding:30px; border-radius:24px}
.arkos .ag-x .close{position:absolute; top:18px; right:18px; background:var(--glass2); border:0;
  color:var(--mute); width:30px; height:30px; border-radius:9px; cursor:pointer; display:grid; place-items:center}
.arkos .ag-x .desc{margin-top:18px; font-size:13.5px; color:var(--mute); line-height:1.65}
.arkos .ag-x .hist{margin-top:22px; display:flex; flex-direction:column; gap:10px}
.arkos .ag-x .hist .h-it{display:flex; gap:11px; font-size:12.5px; color:var(--mute); align-items:baseline}
.arkos .ag-x .hist .h-t{font-family:var(--mono); font-size:10px; color:var(--dim); min-width:44px}

/* operações: linha do tempo viva */
.arkos .ops{display:flex; flex-direction:column; min-height:0}
.arkos .ops-h{padding:22px 24px 14px}
.arkos .ops-h .t{font-family:var(--disp); font-size:13px; font-weight:600; display:flex; align-items:center; gap:9px}
.arkos .live{width:6px; height:6px; border-radius:50%; background:var(--ok); box-shadow:0 0 10px var(--ok)}
.arkos .ops-list{flex:1; overflow-y:auto; padding:6px 24px 24px; position:relative}
.arkos .ops-line{position:absolute; left:35px; top:0; bottom:0; width:1px;
  background:linear-gradient(180deg, var(--hair2), transparent)}
.arkos .op{position:relative; padding:2px 0 20px 32px}
.arkos .op-dot{position:absolute; left:8px; top:6px; width:7px; height:7px; border-radius:50%;
  background:var(--yel); box-shadow:0 0 10px rgba(255,199,0,.5)}
.arkos .op .who{font-family:var(--mono); font-size:9.5px; letter-spacing:.14em; color:var(--dim)}
.arkos .op .what{font-size:12.5px; color:var(--ink); margin-top:5px; line-height:1.5; font-weight:400}
.arkos .op .when{font-family:var(--mono); font-size:10px; color:var(--dim); margin-top:5px}

/* boot: único momento escuro de propósito, o palco liga como uma tela acordando */
.arkos .boot{position:fixed; inset:0; background:#08080A; z-index:50; display:grid; place-items:center}
.arkos .boot-mark{font-family:var(--disp); font-weight:800; font-size:clamp(44px,8vw,84px);
  letter-spacing:.08em; display:flex;
  background:linear-gradient(180deg,#FFF 30%, rgba(255,255,255,.4));
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .boot-mark .os{background:linear-gradient(180deg,var(--yel),#D9A800);
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .boot-lines{position:absolute; bottom:14vh; left:50%; transform:translateX(-50%);
  font-family:var(--mono); font-size:11.5px; color:var(--mute-dark); display:flex;
  flex-direction:column; gap:7px; align-items:center}
.arkos .boot-lines .ok{color:var(--ok)}
.arkos ::-webkit-scrollbar{width:6px}
.arkos ::-webkit-scrollbar-thumb{background:var(--hair2); border-radius:8px}
.arkos ::-webkit-scrollbar-track{background:transparent}
`;

/* ── Física (AML) ───────────────────────────────────────── */
const spring = { type: "spring" as const, stiffness: 400, damping: 34, mass: 0.8 };
const springSoft = { type: "spring" as const, stiffness: 200, damping: 26, mass: 1.1 };
const morph = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.9 };

/* ── Dados ──────────────────────────────────────────────── */
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
  "Verificando integrações…",
  "Workspace pronto.",
];

/* ── Boot ───────────────────────────────────────────────── */
function Boot({ done }: { done: () => void }) {
  const reduced = useReducedMotion();
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (reduced) { done(); return; }
    const iv = setInterval(() => setLine((l) => l + 1), 420);
    const end = setTimeout(done, 420 * BOOT_LINES.length + 500);
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

/* ── Dados reais com sessão, demo sem ───────────────────── */
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
          .slice(0, 5)
          .map((t) => ({
            tt: String(t.titulo || t.nome || t.texto || "Tarefa"),
            cc: [t.cliente, t.area || t.responsavel].filter(Boolean).join(" · ") || "ARK",
            due: t.prazo === hoje ? "hoje" : String(t.prazo || "").slice(5) || "sem prazo",
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

/* ── Peças ──────────────────────────────────────────────── */
/* Sparkline: série única por tile, traço 2px, tinta neutra (amarelo só no tile quente) */
function Spark({ pts, hot }: { pts: number[]; hot?: boolean }) {
  const w = 92, h = 30, min = Math.min(...pts), max = Math.max(...pts) || 1;
  const xy = pts.map((v, i) => [
    (i / (pts.length - 1)) * (w - 4) + 2,
    h - 4 - ((v - min) / (max - min || 1)) * (h - 10),
  ]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const cor = hot ? "#FFC700" : "rgba(245,244,240,.55)";
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg className="spark" width={w} height={h} aria-hidden>
      <path d={`${d} L${lx},${h} L2,${h} Z`} fill={cor} opacity={0.08} />
      <motion.path d={d} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.3, 0, 0.2, 1] }} />
      <circle cx={lx} cy={ly} r={2.5} fill={cor} />
    </svg>
  );
}

const CLIENTES = ["Vivenda", "Fercon", "Sasse", "Cachu", "Attra", "Brisa", "Dom", "Babbo"];
const TAREFAS_DEMO = [
  { tt: "Aprovar plano de conteúdo de julho da Vivenda", cc: "Vivenda · Conselho de IA", due: "hoje" },
  { tt: "Gravar captação do creme de ureia (plano Copa)", cc: "Vivenda · Captação", due: "hoje" },
  { tt: "Revisar régua de cobrança da semana", cc: "Financeiro · Cobrança", due: "amanhã" },
  { tt: "Responder demanda do portal da Fercon", cc: "Fercon · Portal do cliente", due: "amanhã" },
  { tt: "Postar carrossel aprovado do Cachu", cc: "Cachu · Social Media", due: "qui" },
];

function Clock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const iv = setInterval(() => setT(new Date()), 1000); return () => clearInterval(iv); }, []);
  return (
    <span className="bar-clock mono">
      {t.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · {t.toLocaleTimeString("pt-BR")}
    </span>
  );
}

function StatusLine({ a, i }: { a: Agent; i: number }) {
  const [fase, setFase] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setFase((f) => f + 1), 3600 + i * 340);
    return () => clearInterval(iv);
  }, [i]);
  const cor = a.status === "online" ? "var(--ok)" : "var(--dim)";
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

/* Card de agente: objeto tátil que expande no lugar (pasta iOS) */
function AgentCard({ a, i, open }: { a: Agent; i: number; open: (id: string) => void }) {
  const reduced = useReducedMotion();
  return (
    <motion.div layoutId={`ag-${a.id}`} className={`mod ag ${a.status}`}
      initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ ...spring, delay: 0.05 * i }}
      whileHover={{ y: -4, scale: 1.015, transition: spring }}
      whileTap={{ scale: 0.98 }}
      onClick={() => open(a.id)}>
      <div className="ag-top">
        <motion.div layoutId={`orb-${a.id}`} className="orb"
          animate={reduced || a.status !== "online" ? {} : { scale: [1, 1.05, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}>
          <a.Icon size={17} strokeWidth={1.8} />
        </motion.div>
        <div>
          <motion.div layoutId={`nm-${a.id}`} className="ag-name">{a.nome}</motion.div>
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
      <motion.div layoutId={`ag-${a.id}`} className={`mod ag-x ${a.status}`} transition={morph}>
        <button className="close" onClick={close} aria-label="Fechar"><X size={15} /></button>
        <div className="ag-top">
          <motion.div layoutId={`orb-${a.id}`} className="orb" style={{ width: 48, height: 48, borderRadius: 14 }}>
            <a.Icon size={21} strokeWidth={1.8} color={a.status === "online" ? "#FFC700" : undefined} />
          </motion.div>
          <div>
            <motion.div layoutId={`nm-${a.id}`} className="ag-name" style={{ fontSize: 17 }}>{a.nome}</motion.div>
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
    </>
  );
}

const RAIL = [
  { id: "missao", Icon: Sparkles, label: "Mission Control" },
  { id: "agentes", Icon: Hexagon, label: "Agentes" },
  { id: "operacoes", Icon: Activity, label: "Operações" },
  { id: "memoria", Icon: BrainCircuit, label: "Memória" },
  { id: "clientes", Icon: Users, label: "Clientes" },
];

const INTEGRACOES = [
  { nome: "Supabase", cor: "var(--ok)" },
  { nome: "Anthropic", cor: "var(--ok)" },
  { nome: "WhatsApp", cor: "var(--ok)" },
  { nome: "Google", cor: "var(--warn)" },
];

/* ── ARK OS ─────────────────────────────────────────────── */
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
      setFeed((f) => [item, ...f].slice(0, 20));
    };
    push();
    const iv = setInterval(push, 1700);
    return () => clearInterval(iv);
  }, [booted, ops]);

  const hora = new Date().getHours();
  const saud = hora < 5 ? "Boa madrugada" : hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const agAberto = AGENTES.find((a) => a.id === openAg);

  const shell = useMemo(() => ({
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: 0.05 } },
  }), [reduced]);
  const chega = { hidden: { y: 24, opacity: 0 }, show: { y: 0, opacity: 1, transition: spring } };

  return (
    <div className="arkos">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="aurora" aria-hidden />
      <AnimatePresence>{!booted && <Boot done={() => setBooted(true)} />}</AnimatePresence>

      {booted && (
        <div className="grid-shell">
          <motion.header className="bar" initial={{ y: -56 }} animate={{ y: 0 }} transition={springSoft}>
            <span className="mark">ARK<b>OS</b></span>
            {INTEGRACOES.map((s, i) => (
              <motion.span key={s.nome} className="bar-int" initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.25 + i * 0.07 }}>
                <span className="bar-dot" style={{ background: s.cor, color: s.cor }} />{s.nome}
              </motion.span>
            ))}
            {demo && <span className="bar-demo mono">MODO DEMONSTRAÇÃO</span>}
            <Clock />
          </motion.header>

          <div className="grid-body">
            <motion.nav className="rail pane" initial={{ x: -240, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ ...springSoft, delay: 0.08 }}>
              <div className="rail-sec">ESPAÇOS</div>
              {RAIL.map((r) => (
                <button key={r.id} className={`rail-it ${nav === r.id ? "on" : ""}`} onClick={() => setNav(r.id)}>
                  {nav === r.id && (
                    <>
                      <motion.span className="rail-pill" layoutId="railpill" transition={spring} />
                      <motion.span className="rail-glow" layoutId="railglow" transition={spring} />
                    </>
                  )}
                  <span className="rail-ic"><r.Icon size={16} strokeWidth={1.8} /></span>
                  <span className="rail-label">{r.label}</span>
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <a className="rail-it" href="/app" style={{ textDecoration: "none" }}>
                <span className="rail-ic"><ArrowLeft size={15} strokeWidth={1.8} /></span>
                <span className="rail-label">WorkFlowArk V1</span>
              </a>
            </motion.nav>

            <motion.main className="main pane" variants={shell} initial="hidden" animate="show">
              <div className="stage">
                <motion.div variants={chega} className="eyebrow" style={{ display: "flex", width: "100%" }}>
                  <i />MISSION CONTROL · ARK CONTENT
                  <span className="status-pill"><span className="dot" />Todos os sistemas operacionais</span>
                </motion.div>
                <motion.h1 variants={chega}>{saud}, <em>{nome}</em>.<br />A operação está viva.</motion.h1>
                <motion.p variants={chega} className="sub">
                  {AGENTES.filter((a) => a.status === "online").length} agentes trabalhando agora. Tudo que acontece está na linha do tempo à direita.
                </motion.p>

                <motion.label variants={chega} className="cmd">
                  <Sparkles size={16} color="#FFC700" strokeWidth={1.8} />
                  <input value={cmd} onChange={(e) => setCmd(e.target.value)}
                    placeholder="Declare um objetivo. Ex.: preparar o lançamento da Vivenda…" />
                  <button className="go" type="button">Lançar missão</button>
                </motion.label>

                <motion.div variants={chega} className="kpis">
                  {[
                    { n: demo ? 23 : stats.abertas, l: "Tarefas abertas", d: "+4 esta semana", hot: false,
                      pts: [12, 14, 13, 17, 16, 19, 18, 21, 20, 23] },
                    { n: demo ? 3 : stats.atrasadas, l: "Atrasadas", d: "2 a menos que ontem", hot: false,
                      pts: [8, 7, 7, 6, 5, 6, 5, 4, 4, 3] },
                    { n: demo ? 6 : stats.fila, l: "Aguardando seu aval", d: "fila de aprovação", hot: (demo ? 6 : stats.fila) > 0,
                      pts: [1, 2, 2, 3, 2, 4, 3, 5, 4, 6] },
                    { n: demo ? 12 : stats.briefings, l: "Briefings do conselho", d: "últimos 14 dias", hot: false,
                      pts: [4, 5, 6, 6, 8, 7, 9, 10, 11, 12] },
                  ].map((s) => (
                    <div className={`mod kpi ${s.hot ? "hot" : ""}`} key={s.l}>
                      <div className="l">{s.l}</div>
                      <div className="row">
                        <div className="n">{s.n}</div>
                        <Spark pts={s.pts} hot={s.hot} />
                      </div>
                      <div className="delta"><b>●</b> {s.d}</div>
                    </div>
                  ))}
                </motion.div>

                <motion.div variants={chega} className="grid2">
                  <div className="mod card">
                    <div className="ct">Hoje na operação <a href="/app">abrir tarefas →</a></div>
                    <div style={{ marginTop: 6 }}>
                      {(tarefasTop.length ? tarefasTop : TAREFAS_DEMO).map((t, i) => (
                        <motion.div className="li" key={i} initial={{ x: -14, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }} transition={{ ...spring, delay: 0.3 + i * 0.05 }}>
                          <span className="tick" />
                          <div className="tx">
                            <div className="tt">{t.tt}</div>
                            <div className="cc">{t.cc}</div>
                          </div>
                          <span className={`chip ${t.due === "hoje" ? "due" : ""}`}>{t.due}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="mod card">
                      <div className="ct">Fila de aprovação <a href="/postagens">revisar →</a></div>
                      <div className="apr">
                        <div className="big">{demo ? 6 : stats.fila}</div>
                        <p>propostas prontas dos agentes esperando o seu aval para ir ao ar.</p>
                      </div>
                    </div>
                    <div className="mod card">
                      <div className="ct">Clientes ativos</div>
                      <div className="cli-strip">
                        {CLIENTES.map((c, i) => (
                          <motion.span className="avatar" key={c} initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }} transition={{ ...spring, delay: 0.35 + i * 0.04 }}>
                            <i>{c.slice(0, 2).toUpperCase()}</i>{c}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={chega} className="sec-t">
                  <h2>Sociedade de agentes</h2>
                  <span>toque para abrir</span>
                </motion.div>
                <div className="agents">
                  {AGENTES.map((a, i) => <AgentCard key={a.id} a={a} i={i} open={setOpenAg} />)}
                </div>
              </div>
            </motion.main>

            <motion.aside className="ops pane" initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ ...springSoft, delay: 0.14 }}>
              <div className="ops-h">
                <div className="t">
                  <motion.span className="live" animate={reduced ? {} : { opacity: [1, 0.35, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }} />
                  Operações ao vivo
                </div>
              </div>
              <div className="ops-list">
                <div className="ops-line" aria-hidden />
                <AnimatePresence initial={false}>
                  {feed.map((o) => (
                    <motion.div key={o.id} className="op" layout
                      initial={{ x: 44, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                      exit={{ opacity: 0 }} transition={spring}>
                      <span className="op-dot" />
                      <div className="who">{o.who}</div>
                      <div className="what">{o.what}</div>
                      <div className="when">{o.when}</div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.aside>
          </div>
        </div>
      )}

      <AnimatePresence>
        {agAberto && <AgentExpanded a={agAberto} close={() => setOpenAg(null)} />}
      </AnimatePresence>
    </div>
  );
}
