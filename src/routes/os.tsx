// ARK OS V3 · casca da rota. Tokens, dados, peças e vistas moram em src/components/arkos/.
// Linguagem visual: base Figma v2 (docs/ARKOS-V2-TOKENS.md) + fluidez da página Apple AirPods Max.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Sparkles, Hexagon, Activity, BrainCircuit, Users, Inbox, Wallet,
  ArrowLeft, Search, Bell, LayoutGrid,
} from "lucide-react";
import { CSS, spring, springSoft, easeApple } from "@/components/arkos/tokens";
import { AGENTES, OPS_DEMO, useArkData, type Op } from "@/components/arkos/dados";
import { AgentExpanded, Boot, MissaoOverlay } from "@/components/arkos/ui";
import {
  AgentesView, AprovacoesView, ClientesView, FinanceiroView, MemoriaView, MissaoView, OperacoesView,
} from "@/components/arkos/vistas";

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

const RAIL = [
  { id: "missao", Icon: LayoutGrid, label: "Mission Control" },
  { id: "operacoes", Icon: Activity, label: "Operações" },
  { id: "aprovacoes", Icon: Inbox, label: "Aprovações" },
  { id: "agentes", Icon: Hexagon, label: "Agentes" },
  { id: "financeiro", Icon: Wallet, label: "Financeiro" },
  { id: "memoria", Icon: BrainCircuit, label: "Memória" },
  { id: "clientes", Icon: Users, label: "Clientes" },
];

/* ARK OS */
function ArkOS() {
  const reduced = useReducedMotion();
  const [booted, setBooted] = useState(false);
  const [nav, setNav] = useState("missao");
  const [cmd, setCmd] = useState("");
  const [openAg, setOpenAg] = useState<string | null>(null);
  const {
    demo, nome, stats, ops, tarefasTop, tarefasAll, nomesCli, fila: filaItens,
    clientes, briefings: briefingsList, financeiro, concluirTarefa, criarTarefa, decidirProposta, jarvis,
  } = useArkData();
  const [missao, setMissao] = useState<{ q: string; resp: string | null } | null>(null);

  const lancarMissao = () => {
    const q = cmd.trim();
    if (!q) return;
    setMissao({ q, resp: null });
    setCmd("");
    jarvis(q).then((resp) => setMissao((m) => (m && m.q === q ? { ...m, resp } : m)));
  };
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

  const abertas = demo ? tarefasAll.length : stats.abertas;
  const atrasadas = demo ? tarefasAll.filter((t) => t.due === "atrasada").length : stats.atrasadas;
  const filaN = demo ? filaItens.length : stats.fila;
  const briefings = demo ? 12 : stats.briefings;
  const emDia = abertas > 0 ? Math.round(100 * (abertas - atrasadas) / abertas) : 100;

  return (
    <div className="arkos" data-build="arkos-v3-20260703-c7">
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
                {nav === r.id && (
                  <>
                    <motion.span className="side-pill" layoutId="sidepill" transition={spring} />
                    <motion.span className="side-glow" layoutId="sideglow" transition={spring} />
                  </>
                )}
                <span className="side-ic"><r.Icon size={16} strokeWidth={1.8} /></span>
                <span className="side-label">{r.label}</span>
                {r.id === "aprovacoes" && filaN > 0 && <span className="side-badge">{filaN}</span>}
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

          <motion.main className="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}>
            <div className="stage">
              <motion.div className="top" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={spring}>
                <label className="cmd">
                  <Search size={16} color="#A6AAB8" strokeWidth={2} />
                  <input value={cmd} onChange={(e) => setCmd(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") lancarMissao(); }}
                    placeholder="Declare um objetivo. Ex.: preparar o lançamento da Vivenda…" />
                  <button className="go" type="button" onClick={lancarMissao}>
                    <Sparkles size={13} style={{ marginRight: 6, verticalAlign: -2 }} />Lançar missão
                  </button>
                </label>
                <span className="date-pill">
                  {agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
                {demo && <span className="demo-tag mono">DEMO</span>}
                <button className="icon-btn" aria-label="Notificações">
                  <Bell size={17} strokeWidth={1.8} />
                  {filaN > 0 && <span className="ping" />}
                </button>
                <span className="avatar-top">{nome.slice(0, 1).toUpperCase()}</span>
              </motion.div>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={nav}
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -14 }}
                  transition={{ duration: reduced ? 0 : 0.5, ease: easeApple }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {nav === "missao" && (
                    <MissaoView saud={saud} nome={nome} demo={demo} abertas={abertas}
                      atrasadas={atrasadas} fila={filaN} briefings={briefings} emDia={emDia}
                      tarefasTop={tarefasTop} filaItens={filaItens} feed={feed} reduced={!!reduced}
                      open={setOpenAg} verOperacoes={() => setNav("operacoes")}
                      verAprovacoes={() => setNav("aprovacoes")} />
                  )}
                  {nav === "operacoes" && (
                    <OperacoesView demo={demo} tarefas={tarefasAll} fila={filaN}
                      nomesCli={nomesCli} onConcluir={concluirTarefa} onCriar={criarTarefa} />
                  )}
                  {nav === "aprovacoes" && (
                    <AprovacoesView demo={demo} fila={filaItens} onDecidir={decidirProposta} />
                  )}
                  {nav === "agentes" && <AgentesView open={setOpenAg} />}
                  {nav === "financeiro" && <FinanceiroView fin={financeiro} demo={demo} />}
                  {nav === "memoria" && (
                    <MemoriaView briefings={briefingsList} ops={ops.length ? ops : OPS_DEMO} />
                  )}
                  {nav === "clientes" && (
                    <ClientesView clientes={clientes} tarefas={tarefasAll} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.main>
        </div>
      )}

      <AnimatePresence>
        {agAberto && <AgentExpanded a={agAberto} close={() => setOpenAg(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {missao && <MissaoOverlay pergunta={missao.q} resposta={missao.resp} close={() => setMissao(null)} />}
      </AnimatePresence>
    </div>
  );
}
