import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/motor")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Motor · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Motor,
});

type PlanoItem = {
  id: string; clienteId: string; mes: string; titulo: string; formato: string;
  gancho: string; roteiro: string; melhorDia: string;
  status: "pendente" | "aprovado" | "descartado" | "publicado"; criadoEm: string;
};
type Captacao = {
  id: string; clienteId: string; data: string; titulo?: string;
  status: "agendada" | "concluida"; motorPlanoId?: string; videos: unknown[];
};
type Tarefa = {
  id: string; title: string; clienteId: string; funcao: string;
  status: string; prazo?: string; resp?: string;
};
type FilaItem = {
  id: string; clienteId: string; cliente: string; tarefaId?: string;
  status: "pendente" | "aprovada" | "recusada" | "agendada" | "publicada";
  tema: string; gancho: string; legenda: string; cta: string; melhorDia?: string; ts: number;
};
type Tipo = "roteiro" | "captacao" | "edicao" | "legenda" | "publicado";
type CalEvent = {
  id: string; tipo: Tipo; titulo: string; cor: string; bgCor: string;
  raw: PlanoItem | Captacao | Tarefa | FilaItem;
};

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Roboto, sans-serif";
const CAP_VIVENDA = 3;

const TIPO: Record<Tipo, { cor: string; bg: string; label: string }> = {
  roteiro:  { cor: "#A89F92", bg: "#2a2520", label: "Roteiro" },
  captacao: { cor: GOLD,      bg: "#3a2d10", label: "Captação" },
  edicao:   { cor: "#60a5fa", bg: "#1e3a5f", label: "Edição" },
  legenda:  { cor: "#c084fc", bg: "#3b1f5c", label: "Legenda" },
  publicado:{ cor: "#4ade80", bg: "#1a4a2e", label: "Publicado" },
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function ymAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymAvançar(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymVoltar(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MESES[m - 1]} ${y}`;
}
function diasDoMes(ym: string): Date[] {
  const [y, m] = ym.split("-").map(Number);
  const dias: Date[] = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) { dias.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return dias;
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function authedFetch(action: string, payload?: Record<string, unknown>) {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) { const r = await supabase.auth.refreshSession(); token = r.data.session?.access_token; }
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const isLoad = action === "load";
  const res = await fetch("/api/workflowark/state", {
    method: isLoad ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, ...(isLoad ? {} : { "Content-Type": "application/json" }) },
    body: isLoad ? undefined : JSON.stringify(payload ?? {}),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Falha na requisição.");
  return out;
}

function Motor() {
  const [mes, setMes] = useState(ymAtual);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [plano, setPlano] = useState<PlanoItem[]>([]);
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [gerandoLegendas, setGerandoLegendas] = useState(false);
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState<CalEvent | null>(null);

  const hoje = toISO(new Date());
  const mesProx = ymAvançar(ymAtual());

  const carregar = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const out = await authedFetch("load");
      const s = out?.state ?? {};
      setPlano(Array.isArray(s["wfa-motor-plano"]) ? s["wfa-motor-plano"] : []);
      setCaptacoes(Array.isArray(s["wfa-producao"]) ? s["wfa-producao"] : []);
      setTarefas(Array.isArray(s["wfa-tarefas"]) ? s["wfa-tarefas"] : []);
      setFila(Array.isArray(s["wfa-social-fila"]) ? s["wfa-social-fila"] : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function isVivenda(id: string) {
    return id === "vivenda" || String(id).includes("vivenda");
  }

  // KPIs para o mês visível
  const vivCap = captacoes.filter(c => isVivenda(c.clienteId) && c.data?.startsWith(mes));
  const vivPublicado = fila.filter(f =>
    (isVivenda(f.clienteId) || f.cliente === "Vivenda") &&
    (f.status === "publicada" || f.status === "agendada") &&
    (f.melhorDia?.startsWith(mes) ?? false)
  );
  const vivLegPend = fila.filter(f => (isVivenda(f.clienteId) || f.cliente === "Vivenda") && f.status === "pendente");
  const vivEdicaoAberta = tarefas.filter(t =>
    isVivenda(t.clienteId) &&
    String(t.funcao || "").toLowerCase().includes("edit") &&
    t.status !== "concluido" && t.status !== "concluída"
  );
  const editAtrasada = vivEdicaoAberta.filter(t => t.prazo && t.prazo < hoje);
  const capGap = CAP_VIVENDA - vivCap.length;

  function eventosNoDia(data: string): CalEvent[] {
    const evs: CalEvent[] = [];
    plano
      .filter(p => isVivenda(p.clienteId) && p.melhorDia === data && p.status === "pendente")
      .forEach(p => evs.push({ id: p.id, tipo: "roteiro", titulo: p.titulo, cor: TIPO.roteiro.cor, bgCor: TIPO.roteiro.bg, raw: p }));
    captacoes
      .filter(c => isVivenda(c.clienteId) && c.data === data)
      .forEach(c => evs.push({ id: c.id, tipo: "captacao", titulo: c.titulo || "Captação", cor: TIPO.captacao.cor, bgCor: TIPO.captacao.bg, raw: c }));
    tarefas
      .filter(t => isVivenda(t.clienteId) && String(t.funcao || "").toLowerCase().includes("edit") && t.prazo === data && t.status !== "concluido" && t.status !== "concluída")
      .forEach(t => evs.push({ id: t.id, tipo: "edicao", titulo: t.title, cor: TIPO.edicao.cor, bgCor: TIPO.edicao.bg, raw: t }));
    fila
      .filter(f => (isVivenda(f.clienteId) || f.cliente === "Vivenda") && f.melhorDia === data)
      .forEach(f => {
        const tipo: Tipo = f.status === "publicada" ? "publicado" : "legenda";
        evs.push({ id: f.id, tipo, titulo: f.tema, cor: TIPO[tipo].cor, bgCor: TIPO[tipo].bg, raw: f });
      });
    return evs;
  }

  async function gerarPlano() {
    setGerandoPlano(true); setErr("");
    try { await authedFetch("motor-plano-mensal", { mes: mesProx }); await carregar(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setGerandoPlano(false); }
  }

  async function gerarLegendas() {
    setGerandoLegendas(true); setErr("");
    try {
      const out = await authedFetch("motor-gerar-legendas", {});
      if (out.gerados === 0) setErr(out.msg || "Nenhuma edição nova sem legenda encontrada.");
      else await carregar();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setGerandoLegendas(false); }
  }

  async function aprovarRoteiro(id: string) {
    setBusy(id);
    try { await authedFetch("motor-status", { id, status: "aprovado" }); await carregar(); setModal(null); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  const dias = diasDoMes(mes);
  const offset = dias[0].getDay();
  const cells: (Date | null)[] = [...Array(offset).fill(null), ...dias];
  while (cells.length % 7 !== 0) cells.push(null);

  const kpis = [
    { label: "Captações", val: `${vivCap.length} / ${CAP_VIVENDA}`, note: capGap > 0 ? `${capGap} em aberto` : "mês fechado", alert: capGap > 0 },
    { label: "Publicados / Agendados", val: String(vivPublicado.length), note: "este mês", alert: false },
    { label: "Legendas pendentes", val: String(vivLegPend.length), note: "aguardando revisão", alert: vivLegPend.length > 0 },
    { label: "Edições abertas", val: String(vivEdicaoAberta.length), note: editAtrasada.length > 0 ? `${editAtrasada.length} atrasada(s)` : "em andamento", alert: editAtrasada.length > 0 },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#F5F0E8", fontFamily: SANS }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 22, margin: 0, color: GOLD }}>Motor de Conteúdo</h1>
          <p style={{ margin: "2px 0 0", color: "#A89F92", fontSize: 12 }}>Vivenda · calendário operacional</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={gerarPlano} disabled={gerandoPlano} style={sBtn(gerandoPlano)}>
            {gerandoPlano ? "Gerando…" : `✨ Gerar Plano de ${ymLabel(mesProx).split(" ")[0]}`}
          </button>
          <button onClick={gerarLegendas} disabled={gerandoLegendas} style={sBtn(gerandoLegendas)}>
            {gerandoLegendas ? "Gerando…" : "✍️ Gerar Legendas"}
          </button>
        </div>
      </div>

      {err && <div style={{ background: "#3a1414", color: "#ffd5d5", padding: "8px 20px", fontSize: 13 }}>{err}</div>}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: `1px solid ${BORDER}` }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ padding: "14px 18px", background: SURFACE, borderRight: i < 3 ? `1px solid ${BORDER}` : "none" }}>
            <div style={{ fontSize: 10, color: "#A89F92", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.4, marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.alert ? "#ef4444" : GOLD, lineHeight: 1, marginBottom: 3 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: k.alert ? "#ef4444" : "#A89F92" }}>{k.note}</div>
          </div>
        ))}
      </div>

      {/* Faixa de alertas */}
      {(capGap > 0 || vivLegPend.length > 0 || editAtrasada.length > 0) && (
        <div style={{ padding: "8px 20px", background: "#0f0d0b", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "#A89F92", fontWeight: 700, textTransform: "uppercase" as const }}>Atenção</span>
          {capGap > 0 && <Chip txt={`${capGap} captação(ões) sem data`} cor="#ef4444" />}
          {vivLegPend.length > 0 && <Chip txt={`${vivLegPend.length} legenda(s) pendente(s)`} cor="#c084fc" />}
          {editAtrasada.length > 0 && <Chip txt={`${editAtrasada.length} edição(ões) atrasada(s)`} cor="#f97316" />}
        </div>
      )}

      {/* Calendário */}
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button onClick={() => setMes(ymVoltar(mes))} style={navBtn}>‹</button>
          <span style={{ fontFamily: SERIF, fontSize: 17, color: "#F5F0E8", minWidth: 150, textAlign: "center" as const }}>{ymLabel(mes)}</span>
          <button onClick={() => setMes(ymAvançar(mes))} style={navBtn}>›</button>
          {mes !== ymAtual() && (
            <button onClick={() => setMes(ymAtual())} style={{ ...navBtn, fontSize: 11, color: "#A89F92", padding: "4px 10px" }}>Hoje</button>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(Object.entries(TIPO) as [Tipo, typeof TIPO[Tipo]][]).map(([k, v]) => (
              <span key={k} style={{ fontSize: 10, color: v.cor, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: v.bg, border: `1px solid ${v.cor}`, display: "inline-block" }} />
                {v.label}
              </span>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#A89F92" }}>Carregando…</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: BORDER, borderRadius: 12, overflow: "hidden", border: `1px solid ${BORDER}` }}>
            {SEMANA.map(d => (
              <div key={d} style={{ background: "#0e0c0b", padding: "7px 0", textAlign: "center" as const, fontSize: 10, fontWeight: 700, color: "#A89F92", textTransform: "uppercase" as const, letterSpacing: 0.4 }}>{d}</div>
            ))}
            {cells.map((dia, i) => {
              if (!dia) return <div key={i} style={{ background: "#0a0908", minHeight: 82 }} />;
              const dStr = toISO(dia);
              const isHoje = dStr === hoje;
              const evs = eventosNoDia(dStr);
              const mostrar = evs.slice(0, 3);
              const extra = evs.length - mostrar.length;
              return (
                <div key={i} style={{ background: SURFACE, minHeight: 82, padding: "6px 5px", outline: isHoje ? `2px solid ${GOLD}` : "none", outlineOffset: -1 }}>
                  <div style={{ fontSize: 11, fontWeight: isHoje ? 700 : 400, color: isHoje ? GOLD : "#5a5450", marginBottom: 4, textAlign: "right" as const }}>
                    {dia.getDate()}
                  </div>
                  {mostrar.map(ev => (
                    <div key={ev.id} onClick={() => setModal(ev)} title={ev.titulo}
                      style={{ background: ev.bgCor, color: ev.cor, fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 2, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}>
                      {ev.titulo}
                    </div>
                  ))}
                  {extra > 0 && <div style={{ fontSize: 9, color: "#A89F92", paddingLeft: 2 }}>+{extra} mais</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span style={{ background: TIPO[modal.tipo].bg, color: TIPO[modal.tipo].cor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                  {TIPO[modal.tipo].label}
                </span>
                <h2 style={{ fontFamily: SERIF, fontSize: 18, margin: "8px 0 0", color: GOLD }}>{modal.titulo}</h2>
              </div>
              <button onClick={() => setModal(null)} style={{ background: "none", border: 0, color: "#A89F92", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            {modal.tipo === "roteiro" && (() => {
              const p = modal.raw as PlanoItem;
              return (
                <>
                  <div style={{ color: "#A89F92", fontSize: 12, marginBottom: 10 }}>{p.formato} · {p.melhorDia || "sem data"}</div>
                  {p.gancho && <Bloco titulo="Gancho" texto={p.gancho} />}
                  {p.roteiro && <Bloco titulo="Roteiro" texto={p.roteiro} />}
                  <div style={{ marginTop: 16 }}>
                    <button onClick={() => aprovarRoteiro(p.id)} disabled={busy === p.id}
                      style={{ background: "#1f7a3d", color: "#6ee7a0", border: "none", borderRadius: 10, padding: "9px 15px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                      ✅ Aprovar → criar captação
                    </button>
                  </div>
                </>
              );
            })()}

            {modal.tipo === "captacao" && (() => {
              const c = modal.raw as Captacao;
              return <div style={{ color: "#CFC7B8", fontSize: 13 }}>Data: {c.data} · Status: {c.status}</div>;
            })()}

            {modal.tipo === "legenda" && (() => {
              const f = modal.raw as FilaItem;
              return (
                <>
                  <Bloco titulo="Gancho" texto={f.gancho} />
                  <Bloco titulo="Legenda" texto={f.legenda} />
                  <div style={{ color: "#A89F92", fontSize: 12, marginTop: 10 }}>
                    Aprovar em <a href="/postagens" style={{ color: GOLD }}>/postagens</a>
                  </div>
                </>
              );
            })()}

            {modal.tipo === "edicao" && (() => {
              const t = modal.raw as Tarefa;
              return <div style={{ color: "#CFC7B8", fontSize: 13 }}>Prazo: {t.prazo || "sem prazo"} · Resp: {t.resp || "—"} · Status: {t.status}</div>;
            })()}

            {modal.tipo === "publicado" && (() => {
              const f = modal.raw as FilaItem;
              return <div style={{ color: "#CFC7B8", fontSize: 13 }}>Data: {f.melhorDia || "—"} · Status: {f.status}</div>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ txt, cor }: { txt: string; cor: string }) {
  return (
    <span style={{ background: `${cor}1a`, color: cor, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, border: `1px solid ${cor}40` }}>
      {txt}
    </span>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: "#A89F92", fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 3 }}>{titulo}</div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.6, color: "#E8E0D4" }}>{texto}</p>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: SURFACE, border: `1px solid ${BORDER}`, color: "#F5F0E8",
  borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 18, lineHeight: 1,
};

function sBtn(disabled: boolean): React.CSSProperties {
  return {
    background: disabled ? "#3a342c" : GOLD,
    color: disabled ? "#6b5d3f" : "#111",
    border: "none", borderRadius: 10, padding: "9px 14px",
    fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer",
  };
}
