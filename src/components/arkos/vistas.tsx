// ArkOS: vistas (Mission Control, Operações, Agentes, Em breve), linguagem Apple
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Check, Hexagon, PenLine, Plus } from "lucide-react";
import { spring, easeApple } from "./tokens";
import {
  AGENTES, TAREFAS_DEMO,
  chipClass, type Briefing, type ClienteInfo, type Financeiro, type Op, type Proposta, type TarefaLinha,
} from "./dados";
import { AgentCard, Donut, Reveal, Spark } from "./ui";

const CORES_AP = ["#FFD84D", "#7DD8D8", "#F4A0C0", "#B6A5F5", "#9BE29B"];

type OperacoesProps = {
  demo: boolean; tarefas: TarefaLinha[]; fila: number;
  nomesCli: Record<string, string>;
  onConcluir: (id: string) => void;
  onCriar: (title: string, clienteId: string, data: string) => Promise<void>;
};

function NovaTarefa({ nomesCli, onCriar }: { nomesCli: Record<string, string>; onCriar: OperacoesProps["onCriar"] }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [title, setTitle] = useState("");
  const [cli, setCli] = useState("ark");
  const [data, setData] = useState(hoje);
  const [salvando, setSalvando] = useState(false);
  const enviar = async () => {
    const t = title.trim();
    if (!t || salvando) return;
    setSalvando(true);
    try { await onCriar(t, cli, data); setTitle(""); } finally { setSalvando(false); }
  };
  return (
    <div className="composer">
      <input className="c-title" value={title} placeholder="Nova tarefa. Ex.: revisar criativos do Cachu…"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") enviar(); }} />
      <select className="c-sel" value={cli} onChange={(e) => setCli(e.target.value)} aria-label="Cliente">
        {Object.entries(nomesCli).map(([id, nm]) => <option key={id} value={id}>{nm}</option>)}
      </select>
      <input className="c-date" type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Prazo" />
      <button className="c-add" onClick={enviar} disabled={salvando || !title.trim()}>
        <Plus size={14} strokeWidth={2.4} style={{ marginRight: 5, verticalAlign: -2 }} />
        {salvando ? "Salvando…" : "Adicionar"}
      </button>
    </div>
  );
}

function LinhaTarefa({ t, i, onConcluir }: { t: TarefaLinha; i: number; onConcluir: (id: string) => void }) {
  return (
    <motion.tr layout initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.35, ease: easeApple } }}
      transition={{ duration: 0.45, ease: easeApple, delay: 0.06 + i * 0.04 }}>
      <td className="t-check">
        <button className="chk" aria-label={`Concluir: ${t.tt}`} onClick={() => onConcluir(t.id)}>
          <Check size={13} strokeWidth={3} />
        </button>
      </td>
      <td className="t-name">{t.tt}</td>
      <td className="t-cli hide-sm">{t.cc}</td>
      <td><span className={chipClass(t.due)}>{t.due}</span></td>
      <td style={{ textAlign: "right" }}><a className="tbtn" href="/app">Abrir</a></td>
    </motion.tr>
  );
}

export function OperacoesView({ demo, tarefas, fila, nomesCli, onConcluir, onCriar }: OperacoesProps) {
  const lista = tarefas;
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
            {demo ? " Modo demonstração: as ações valem só nesta tela." : ""}
          </p>
        </div>
      </Reveal>
      <Reveal delay={0.06}>
        <NovaTarefa nomesCli={nomesCli} onCriar={onCriar} />
      </Reveal>
      <Reveal delay={0.1}>
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
                <AnimatePresence initial={false}>
                  {g.itens.map((t, i) => (
                    <LinhaTarefa key={t.id || `${g.id}-${i}`} t={t} i={i} onConcluir={onConcluir} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Reveal>
      ))}
      {!lista.length && (
        <Reveal>
          <div className="empty-view" style={{ padding: "60px 6px 80px" }}>
            <h1 className="view-h1" style={{ fontSize: 34 }}>Tudo em dia.</h1>
            <p className="view-lead">Nenhuma tarefa aberta na operação agora.</p>
          </div>
        </Reveal>
      )}
      <div style={{ height: 24 }} />
    </>
  );
}

type AprovacoesProps = {
  demo: boolean; fila: Proposta[];
  onDecidir: (id: string, decisao: "aprovada" | "recusada") => void;
};

function PropostaCard({ p, i, onDecidir }: { p: Proposta; i: number; onDecidir: AprovacoesProps["onDecidir"] }) {
  const [aberta, setAberta] = useState(false);
  return (
    <motion.div layout className="panel prop" initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.35, ease: easeApple } }}
      transition={{ duration: 0.55, ease: easeApple, delay: 0.04 * i }}>
      <div className="prop-head">
        <span className="prop-cli" style={{ background: CORES_AP[i % CORES_AP.length] }}>{p.cliente}</span>
        <span className="prop-fmt">{p.formato}</span>
      </div>
      <div className="prop-tema">{p.tema}</div>
      {p.gancho && <p className="prop-gancho">“{p.gancho}”</p>}
      {p.legenda && (
        <p className={`prop-legenda ${aberta ? "aberta" : ""}`} onClick={() => setAberta((v) => !v)}
          title={aberta ? "Recolher" : "Ver completa"}>{p.legenda}</p>
      )}
      {aberta && p.roteiro && <p className="prop-roteiro"><b>Roteiro.</b> {p.roteiro}</p>}
      {aberta && p.cta && <p className="prop-roteiro"><b>CTA.</b> {p.cta}</p>}
      <div className="prop-acts">
        <button className="btn-aprovar" onClick={() => onDecidir(p.id, "aprovada")}>Aprovar</button>
        <button className="btn-recusar" onClick={() => onDecidir(p.id, "recusada")}>Recusar</button>
        <button className="btn-ver" onClick={() => setAberta((v) => !v)}>{aberta ? "Recolher" : "Ver tudo"}</button>
      </div>
    </motion.div>
  );
}

export function AprovacoesView({ demo, fila, onDecidir }: AprovacoesProps) {
  return (
    <>
      <Reveal>
        <div className="view-hero">
          <div className="view-eyebrow">ARK OS · Aprovações</div>
          <h1 className="view-h1">Nada sai sem você.<br /><span className="soft">Seu aval em um toque.</span></h1>
          <p className="view-lead">
            Tudo que os agentes produziram e está esperando a sua decisão.
            Aprovou, segue para publicação. Recusou, morre aqui.
            {demo ? " Modo demonstração: as decisões valem só nesta tela." : ""}
          </p>
        </div>
      </Reveal>
      <AnimatePresence initial={false}>
        {fila.map((p, i) => <PropostaCard key={p.id} p={p} i={i} onDecidir={onDecidir} />)}
      </AnimatePresence>
      {!fila.length && (
        <Reveal>
          <div className="empty-view" style={{ padding: "60px 6px 80px" }}>
            <h1 className="view-h1" style={{ fontSize: 34 }}>Fila zerada.</h1>
            <p className="view-lead">Nenhuma proposta esperando o seu aval agora.</p>
          </div>
        </Reveal>
      )}
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

const SAUDE: Record<string, { cor: string; label: string }> = {
  gr: { cor: "#0F8A61", label: "saudável" },
  y: { cor: "#8A6200", label: "atenção" },
  r: { cor: "#C2372F", label: "urgente" },
};

export function ClientesView({ clientes, tarefas }: { clientes: ClienteInfo[]; tarefas: TarefaLinha[] }) {
  const conta = (nm: string) => {
    const doCliente = tarefas.filter((t) => t.cc.startsWith(nm));
    return { abertas: doCliente.length, atrasadas: doCliente.filter((t) => t.due === "atrasada").length };
  };
  return (
    <>
      <Reveal>
        <div className="view-hero">
          <div className="view-eyebrow">ARK OS · Clientes</div>
          <h1 className="view-h1">Cada cliente, um universo.<br /><span className="soft">A carteira inteira à vista.</span></h1>
          <p className="view-lead">
            Saúde, plano e o que está aberto por cliente. O ponto colorido diz quem precisa
            de você primeiro.
          </p>
        </div>
      </Reveal>
      <div className="agents" style={{ paddingBottom: 24 }}>
        {clientes.map((c, i) => {
          const s = SAUDE[c.status] || SAUDE.gr;
          const n = conta(c.nm);
          return (
            <motion.div key={c.id} className="ag cli" initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5, ease: easeApple, delay: 0.03 * i }}
              whileHover={{ y: -4, scale: 1.015, transition: spring }}>
              <div className="ag-top">
                <div className="orb cli-orb" style={{ color: s.cor }}>
                  {c.nm.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="ag-name">{c.nm}</div>
                  <div className="ag-role">{c.tipo}{c.plano ? ` · ${c.plano}` : ""}</div>
                </div>
                <span className="cli-dot" style={{ background: s.cor, boxShadow: `0 0 9px ${s.cor}` }} title={s.label} />
              </div>
              <div className="cli-meta">{c.meta}</div>
              <div className="cli-chips">
                <span className="chip ok">{n.abertas} aberta{n.abertas === 1 ? "" : "s"}</span>
                {n.atrasadas > 0 && <span className="chip bad">{n.atrasadas} atrasada{n.atrasadas === 1 ? "" : "s"}</span>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}

export function MemoriaView({ briefings, ops }: { briefings: Briefing[]; ops: Op[] }) {
  return (
    <>
      <Reveal>
        <div className="view-hero">
          <div className="view-eyebrow">ARK OS · Memória</div>
          <h1 className="view-h1">Tudo que o sistema aprendeu.<br /><span className="soft">E decidiu por você.</span></h1>
          <p className="view-lead">
            Os briefings do Conselho de IA e a linha do tempo do que os agentes fizeram,
            registrados para você nunca perder o fio.
          </p>
        </div>
      </Reveal>
      {briefings.map((b, i) => (
        <Reveal key={b.id} delay={0.04 * i}>
          <div className="panel prop">
            <div className="prop-head">
              <span className="prop-cli" style={{ background: CORES_AP[i % CORES_AP.length] }}>{b.cliente}</span>
              <span className="prop-fmt">Conselho de IA{b.date ? ` · ${b.date.slice(8, 10)}/${b.date.slice(5, 7)}` : ""}</span>
              {!b.lido && <span className="prop-fmt" style={{ color: "#8A6200", borderColor: "rgba(255,199,0,.5)" }}>novo</span>}
            </div>
            <div className="prop-tema">{b.decisao}</div>
            {b.plano.length > 0 && (
              <p className="prop-roteiro"><b>Plano.</b> {b.plano.join(" · ")}</p>
            )}
          </div>
        </Reveal>
      ))}
      <Reveal>
        <div className="panel">
          <div className="group-h">Linha do tempo.</div>
          <div style={{ marginTop: 8 }}>
            {ops.map((o) => (
              <div key={o.id} className="op">
                <span className="op-dot" />
                <div>
                  <div className="who">{o.who}</div>
                  <div className="what">{o.what}</div>
                  <div className="when">{o.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <div style={{ height: 24 }} />
    </>
  );
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function FinanceiroView({ fin, demo }: { fin: Financeiro; demo: boolean }) {
  const pendentes = fin.cobranca.filter((c) => !c.cobrado);
  return (
    <>
      <Reveal>
        <div className="view-hero">
          <div className="view-eyebrow">ARK OS · Financeiro</div>
          <h1 className="view-h1">O caixa, sem mistério.<br /><span className="soft">Um mês de cada vez.</span></h1>
          <p className="view-lead">
            {fin.mesNome}: o que entra, o que sai e quem ainda não foi cobrado.
            A mensagem de cobrança continua saindo pelo V1 por enquanto.
            {demo ? " Modo demonstração." : ""}
          </p>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="stat-strip">
          <div className="stat-big">
            <div className="n">{fmtBRL(fin.receber)}</div>
            <div className="l">a receber no mês</div>
          </div>
          <div className="stat-big">
            <div className="n">{fmtBRL(fin.pagar)}</div>
            <div className="l">custos e pagamentos</div>
          </div>
          <div className="stat-big dark">
            <div className="n">{fmtBRL(fin.sobra)}</div>
            <div className="l">sobra do mês</div>
          </div>
        </div>
      </Reveal>
      <Reveal>
        <div className="panel">
          <div className="group-h">Cobrança do mês.<span className="count">{pendentes.length} pendente{pendentes.length === 1 ? "" : "s"}</span></div>
          <table className="tt">
            <tbody>
              {fin.cobranca.map((c, i) => (
                <motion.tr key={`${c.nome}-${i}`} initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  transition={{ duration: 0.45, ease: easeApple, delay: 0.06 + i * 0.04 }}>
                  <td className="t-name">{c.nome}</td>
                  <td className="t-cli" style={{ fontVariantNumeric: "tabular-nums" }}>{fmtBRL(c.valor)}</td>
                  <td style={{ textAlign: "right" }}>
                    <span className={c.cobrado ? "chip ok" : "chip hold"}>{c.cobrado ? "cobrado" : "pendente"}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
      <div style={{ height: 24 }} />
    </>
  );
}

/* Meu Mês: o ritual mensal como página da Apple. Um número gigante por tela,
   seções claras e escuras alternadas, reveal ao rolar. */
type MeuMesProps = {
  demo: boolean;
  concluidasMes: number; aprovadasMes: number; briefings: number;
  fin: Financeiro; clientes: ClienteInfo[];
};

function MmSec({ dark, children, delay = 0 }: { dark?: boolean; children: ReactNode; delay?: number }) {
  return (
    <motion.section className={`mm-sec ${dark ? "dark" : ""}`}
      initial={{ opacity: 0, y: 44 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: easeApple, delay }}>
      {children}
    </motion.section>
  );
}

export function MeuMesView({ demo, concluidasMes, aprovadasMes, briefings, fin, clientes }: MeuMesProps) {
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long" });
  const mesTitulo = mes.charAt(0).toUpperCase() + mes.slice(1);
  const ativos = clientes.filter((c) => c.id !== "ark").length;
  const urgentes = clientes.filter((c) => c.status === "r").length;
  return (
    <>
      <MmSec>
        <div>
          <div className="view-eyebrow">ARK OS · Meu Mês</div>
          <h1 className="mm-title">{mesTitulo}, até agora.</h1>
          <p className="view-lead mm-lead">
            O mês da ARK contado pelos números que importam. Role para apresentar.
            {demo ? " Modo demonstração." : ""}
          </p>
        </div>
      </MmSec>
      <MmSec dark>
        <div>
          <div className="mm-big">{concluidasMes}</div>
          <div className="mm-label">tarefas concluídas pela equipe neste mês.</div>
        </div>
      </MmSec>
      <MmSec>
        <div>
          <div className="mm-big">{aprovadasMes}</div>
          <div className="mm-label">conteúdos aprovados e a caminho das redes.</div>
          <div className="mm-sub">{briefings} briefings do Conselho de IA registrados no período.</div>
        </div>
      </MmSec>
      <MmSec dark>
        <div>
          <div className="mm-big">{fmtBRL(fin.sobra)}</div>
          <div className="mm-label">de sobra em {fin.mesNome}.</div>
          <div className="mm-sub">{fmtBRL(fin.receber)} a receber · {fmtBRL(fin.pagar)} em custos e pagamentos.</div>
        </div>
      </MmSec>
      <MmSec>
        <div>
          <div className="mm-big">{ativos}</div>
          <div className="mm-label">clientes ativos na carteira.</div>
          <div className="mm-sub">
            {urgentes > 0
              ? `${urgentes} pedindo atenção urgente. O resto, saudável.`
              : "Todos saudáveis. Carteira em dia."}
          </div>
        </div>
      </MmSec>
      <MmSec dark>
        <div>
          <h2 className="mm-title" style={{ color: "#fff" }}>Foi assim que {mesTitulo.toLowerCase()} aconteceu.</h2>
          <p className="mm-label" style={{ marginTop: 14 }}>Feito pela equipe. Contado pelo ArkOS.</p>
        </div>
      </MmSec>
      <div style={{ height: 24 }} />
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
  tarefasTop: TarefaLinha[]; filaItens: Proposta[]; feed: Op[]; reduced: boolean;
  open: (id: string) => void; verOperacoes: () => void; verAprovacoes: () => void;
};

export function MissaoView({ saud, nome, demo, abertas, atrasadas, fila, briefings, emDia, tarefasTop, filaItens, feed, reduced, open, verOperacoes, verAprovacoes }: MissaoProps) {
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
          <a className="gbtn" style={{ cursor: "pointer" }} onClick={verAprovacoes}>Revisar fila</a>
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
            <div className="pt">Fila de aprovação <a style={{ cursor: "pointer" }} onClick={verAprovacoes}>ver todas →</a></div>
            <div style={{ marginTop: 8 }}>
              {filaItens.slice(0, 4).map((p, i) => (
                <motion.div className="ap-it" key={p.id} initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.3 + i * 0.06 }}>
                  <span className="ap-ic" style={{ background: CORES_AP[i % CORES_AP.length] }}>
                    <PenLine size={16} strokeWidth={1.8} />
                  </span>
                  <div className="ap-tx">
                    <div className="ap-t">{p.formato} · {p.tema}</div>
                    <div className="ap-s">{p.cliente} · Social Media</div>
                  </div>
                  <a className="ap-chip" style={{ cursor: "pointer" }} onClick={verAprovacoes}>Revisar</a>
                </motion.div>
              ))}
              {!filaItens.length && (
                <div className="ap-s" style={{ padding: "14px 0 6px" }}>Nenhuma proposta esperando o seu aval.</div>
              )}
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
