// ArkOS: vistas (Mission Control, Operações, Agentes, Em breve), linguagem Apple
import { AnimatePresence, motion } from "motion/react";
import { Activity, Hexagon, PenLine } from "lucide-react";
import { spring, easeApple } from "./tokens";
import {
  AGENTES, APROVACOES_DEMO, TAREFAS_DEMO, TAREFAS_DEMO_OPS,
  chipClass, type Op, type TarefaLinha,
} from "./dados";
import { AgentCard, Donut, Reveal, Spark } from "./ui";

export function OperacoesView({ demo, tarefas, fila }: { demo: boolean; tarefas: TarefaLinha[]; fila: number }) {
  const lista = demo || !tarefas.length ? TAREFAS_DEMO_OPS : tarefas;
  const atrasadas = lista.filter((t) => t.due === "atrasada");
  const deHoje = lista.filter((t) => t.due === "hoje");
  const proximas = lista.filter((t) => t.due !== "atrasada" && t.due !== "hoje");
  const grupos = [
    { id: "g-atr", h: "Atrasadas.", itens: atrasadas },
    { id: "g-hoje", h: "Para hoje.", itens: deHoje },
    { id: "g-prox", h: "A seguir.", itens: proximas },
  ].filter((g) => g.itens.length);
  return (
    <>
      <Reveal>
        <div className="view-hero">
          <div className="view-eyebrow">ARK OS · Operações</div>
          <h1 className="view-h1">Tudo em movimento.<br /><span className="soft">Nada esquecido.</span></h1>
          <p className="view-lead">
            Cada tarefa da operação, agrupada pelo que importa: o que atrasou, o que é para hoje
            e o que vem a seguir.{fila > 0 ? ` E ${fila} proposta${fila === 1 ? "" : "s"} esperando o seu aval na fila.` : ""}
          </p>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="stat-strip">
          <div className="stat-big dark">
            <div className="n">{atrasadas.length}</div>
            <div className="l">atrasadas, para resolver primeiro</div>
          </div>
          <div className="stat-big">
            <div className="n">{deHoje.length}</div>
            <div className="l">para hoje</div>
          </div>
          <div className="stat-big">
            <div className="n">{lista.length}</div>
            <div className="l">abertas na operação</div>
          </div>
        </div>
      </Reveal>
      {grupos.map((g) => (
        <Reveal key={g.id}>
          <div className="panel">
            <div className="group-h">{g.h}<span className="count">{g.itens.length}</span></div>
            <table className="tt">
              <tbody>
                {g.itens.map((t, i) => (
                  <motion.tr key={`${g.id}-${i}`} initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ duration: 0.45, ease: easeApple, delay: 0.08 + i * 0.04 }}>
                    <td className="t-name">{t.tt}</td>
                    <td className="t-cli hide-sm">{t.cc}</td>
                    <td><span className={chipClass(t.due)}>{t.due}</span></td>
                    <td style={{ textAlign: "right" }}><a className="tbtn" href="/app">Abrir</a></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      ))}
      <div style={{ height: 24 }} />
    </>
  );
}

export function AgentesView({ open }: { open: (id: string) => void }) {
  return (
    <>
      <Reveal>
        <div className="view-hero">
          <div className="view-eyebrow">ARK OS · Agentes</div>
          <h1 className="view-h1">A sociedade que<br /><span className="soft">trabalha por você.</span></h1>
          <p className="view-lead">
            Seis agentes especializados, cada um com um papel claro na operação.
            Toque em um card para ver o que ele está fazendo agora.
          </p>
        </div>
      </Reveal>
      <div className="agents" style={{ paddingBottom: 24 }}>
        {AGENTES.map((a, i) => <AgentCard key={a.id} a={a} i={i} open={open} />)}
      </div>
    </>
  );
}

export function EmBreveView({ eyebrow, titulo, texto }: { eyebrow: string; titulo: string; texto: string }) {
  return (
    <Reveal>
      <div className="empty-view">
        <div className="view-eyebrow">{eyebrow}</div>
        <h1 className="view-h1">{titulo}</h1>
        <p className="view-lead">{texto}</p>
      </div>
    </Reveal>
  );
}

export type MissaoProps = {
  saud: string; nome: string; demo: boolean;
  abertas: number; atrasadas: number; fila: number; briefings: number; emDia: number;
  tarefasTop: TarefaLinha[]; feed: Op[]; reduced: boolean;
  open: (id: string) => void; verOperacoes: () => void;
};

export function MissaoView({ saud, nome, demo, abertas, atrasadas, fila, briefings, emDia, tarefasTop, feed, reduced, open, verOperacoes }: MissaoProps) {
  const chega = (delay: number) => ({
    initial: { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { ...spring, delay },
  });
  return (
    <>
      <motion.div {...chega(0)} className="hero-row">
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

      <motion.div {...chega(0.07)} className="body-row">
        <div className="panel">
          <div className="pt">Hoje na operação <a style={{ cursor: "pointer" }} onClick={verOperacoes}>abrir tarefas →</a></div>
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

      <motion.div {...chega(0.14)} className="kpis">
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

      <motion.div {...chega(0.2)} className="sec-t">
        <h2>Sociedade de agentes</h2>
        <span>toque para abrir</span>
      </motion.div>
      <div className="agents" style={{ paddingBottom: 24 }}>
        {AGENTES.map((a, i) => <AgentCard key={a.id} a={a} i={i} open={open} />)}
      </div>
    </>
  );
}
