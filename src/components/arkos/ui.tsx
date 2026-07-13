// ArkOS: peças de interface compartilhadas (boot, gráficos, cards de agente, reveal)
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { spring, springSoft, morph, easeApple } from "./tokens";
import type { Agent } from "./dados";

const BOOT_LINES = [
  "Conectando memória…",
  "Acordando agentes…",
  "Sincronizando estado…",
  "Workspace pronto.",
];

/* Boot */
export function Boot({ done }: { done: () => void }) {
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

/* Sparkline em menta (ref SaaS UI Kit): linha + área com gradiente */
export function Spark({ pts, id }: { pts: number[]; id: string }) {
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
export function Donut({ pct }: { pct: number }) {
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

export function StatusLine({ a, i }: { a: Agent; i: number }) {
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
export function AgentCard({ a, i, open }: { a: Agent; i: number; open: (id: string) => void }) {
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

export function AgentExpanded({ a, close }: { a: Agent; close: () => void }) {
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

export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div initial={reduced ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, ease: easeApple, delay }}>
      {children}
    </motion.div>
  );
}

/* Overlay da missão: pergunta + resposta do JARVIS no vidro escuro (mesma linguagem do agente) */
export function MissaoOverlay({ pergunta, resposta, close }: {
  pergunta: string; resposta: string | null; close: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [close]);
  return (
    <>
      <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={close} />
      <div className="ag-x-wrap">
        <motion.div className="ag-x" initial={{ opacity: 0, y: 26, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12 }} transition={morph}>
          <button className="close" onClick={close} aria-label="Fechar"><X size={15} /></button>
          <div className="ag-role">Missão declarada</div>
          <div className="ag-name" style={{ fontSize: 17, marginTop: 6 }}>{pergunta}</div>
          <div className="desc" aria-live="polite">
            {resposta ?? (
              <span className="jv-dots" aria-label="JARVIS pensando">
                <motion.i animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity, delay: 0 }} />
                <motion.i animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity, delay: 0.18 }} />
                <motion.i animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1.1, repeat: Infinity, delay: 0.36 }} />
              </span>
            )}
          </div>
          {resposta && <div className="ag-role" style={{ marginTop: 16 }}>JARVIS · Comandante</div>}
        </motion.div>
      </div>
    </>
  );
}
