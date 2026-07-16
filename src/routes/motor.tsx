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
    meta: [{ title: "Motor de Conteúdo · Vivenda · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Motor,
});

type PlanoItem = {
  id: string; clienteId: string; mes: string;
  titulo: string; formato: string; gancho: string; roteiro: string; melhorDia: string;
  status: "pendente" | "aprovado" | "descartado" | "publicado";
  criadoEm: string;
};
type Captacao = {
  id: string; clienteId: string; data: string; titulo?: string;
  status: "agendada" | "concluida"; motorPlanoId?: string;
  videos: { id: string; titulo: string; roteiroTrecho: string; editor: string; prazo: string; status: string }[];
};
type Tarefa = {
  id: string; title: string; clienteId: string; funcao: string; status: string;
  desc?: string; resp?: string; tags?: string[];
};
type FilaItem = {
  id: string; clienteId: string; cliente: string; tarefaId?: string;
  status: "pendente" | "aprovada" | "recusada" | "agendada";
  formato: string; tema: string; gancho: string; legenda: string; cta: string; melhorDia?: string; ts: number;
};

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function mesProximo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(ym: string): string {
  const [, m] = ym.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(m) - 1]}`;
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
  if (!res.ok) throw new Error(out.error || "Falha ao falar com o servidor.");
  return out;
}

function Motor() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [plano, setPlano] = useState<PlanoItem[]>([]);
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [gerandoLegendas, setGerandoLegendas] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [busy, setBusy] = useState("");
  const [detail, setDetail] = useState<PlanoItem | null>(null);

  const mes = mesProximo();
  const CAP_VIVENDA = 3;

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

  async function gerarPlano() {
    setGerandoPlano(true); setErr("");
    try { await authedFetch("motor-plano-mensal", { mes }); await carregar(); }
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

  async function atualizarStatus(id: string, status: "aprovado" | "descartado" | "publicado") {
    setBusy(id);
    try {
      await authedFetch("motor-status", { id, status });
      setPlano((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      if (status === "aprovado") await carregar();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  const vivPlano = plano.filter((p) => p.clienteId === "vivenda");
  const roteiros = vivPlano.filter((p) => p.status === "pendente");
  const captados = captacoes.filter((c) => c.clienteId === "vivenda" && c.status === "agendada");
  const emEdicao = tarefas.filter((t) =>
    (t.clienteId === "vivenda" || String(t.clienteId || "").includes("vivenda")) &&
    String(t.funcao || "").toLowerCase().includes("edit") &&
    t.status !== "concluido"
  );
  const vivFila = fila.filter((f) => f.clienteId === "vivenda" || f.cliente === "Vivenda");
  const legendasPend = vivFila.filter((f) => f.status === "pendente");
  const agendados = vivFila.filter((f) => f.status === "aprovada" || f.status === "agendada");
  const publicados = vivPlano.filter((p) => p.status === "publicado");

  const hoje = new Date().toISOString().slice(0, 10);
  const em14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const proxMesStart = mes + "-01";
  const proxMesEnd = mes + "-31";
  const proximas14 = captados.filter((c) => c.data >= hoje && c.data <= em14);
  const proxMesCap = captados.filter((c) => c.data >= proxMesStart && c.data <= proxMesEnd);
  const gap = CAP_VIVENDA - proxMesCap.length;

  const COLS = [
    { key: "roteiro" as const, label: "Roteiro", count: roteiros.length, color: "#A89F92" },
    { key: "captacao" as const, label: "Captação", count: captados.length, color: GOLD },
    { key: "edicao" as const, label: "Em Edição", count: emEdicao.length, color: "#3b82f6" },
    { key: "legenda" as const, label: "Legenda", count: legendasPend.length, color: "#a855f7" },
    { key: "agendado" as const, label: "Agendado", count: agendados.length, color: "#22c55e" },
    { key: "publicado" as const, label: "Publicado", count: publicados.length, color: "#4ade80" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#F5F0E8", fontFamily: SANS }}>
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 24, margin: 0, color: GOLD }}>Motor de Conteúdo</h1>
          <p style={{ margin: "3px 0 0", color: "#A89F92", fontSize: 13 }}>Vivenda · pipeline completo</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={gerarPlano} disabled={gerandoPlano} style={actionBtn(gerandoPlano)}>
            {gerandoPlano ? "Gerando…" : `✨ Gerar Plano de ${mesLabel(mes)}`}
          </button>
          <button onClick={gerarLegendas} disabled={gerandoLegendas} style={actionBtn(gerandoLegendas)}>
            {gerandoLegendas ? "Gerando…" : "✍️ Gerar Legendas Pendentes"}
          </button>
          <button onClick={() => setShowRadar((v) => !v)}
            style={{ ...actionBtn(false), background: showRadar ? "#2a2520" : SURFACE, color: showRadar ? GOLD : "#CFC7B8", border: `1px solid ${showRadar ? GOLD : BORDER}` }}>
            📡 Radar de Captações
          </button>
        </div>
      </div>

      {err && (
        <div style={{ background: "#3a1414", border: "1px solid #5a2020", color: "#ffd5d5", padding: "10px 20px", fontSize: 13 }}>{err}</div>
      )}

      {showRadar && (
        <div style={{ background: "#111010", borderBottom: `1px solid ${BORDER}`, padding: "18px 20px" }}>
          <h3 style={{ fontFamily: SERIF, fontSize: 16, margin: "0 0 14px", color: GOLD }}>Radar de Captações · Vivenda</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
            <div>
              <div style={sectionLabel}>Próximos 14 dias</div>
              {proximas14.length === 0
                ? <div style={{ color: "#ef4444", fontSize: 13 }}>⚠ Nenhuma captação agendada</div>
                : proximas14.map((c) => <div key={c.id} style={{ color: "#22c55e", fontSize: 13, marginBottom: 4 }}>✓ {c.titulo || "Captação"} · {c.data}</div>)
              }
            </div>
            <div>
              <div style={sectionLabel}>Próximo mês · {mesLabel(mes)}</div>
              <div style={{ fontSize: 13, color: "#CFC7B8", marginBottom: 6 }}>{proxMesCap.length} de {CAP_VIVENDA} captações agendadas</div>
              {gap > 0
                ? <div style={{ color: "#ef4444", fontSize: 13 }}>⚠ {gap} slot(s) em aberto — agendar até o dia 20</div>
                : <div style={{ color: "#22c55e", fontSize: 13 }}>✓ Mês fechado</div>
              }
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: "#A89F92", padding: 24 }}>Carregando pipeline…</p>}

      {!loading && (
        <div style={{ display: "flex", gap: 0, overflowX: "auto", minHeight: "calc(100vh - 130px)" }}>
          {COLS.map((col) => (
            <div key={col.key} style={{ flex: "0 0 230px", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8, background: "#0e0c0b" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.color, flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{col.label}</span>
                <span style={{ marginLeft: "auto", background: "#2C2825", color: "#A89F92", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>{col.count}</span>
              </div>
              <div style={{ padding: 8, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
                {col.key === "roteiro" && roteiros.map((r) => (
                  <RoteiroCard key={r.id} item={r} isBusy={busy === r.id}
                    onAprovar={() => atualizarStatus(r.id, "aprovado")}
                    onDescartar={() => atualizarStatus(r.id, "descartado")}
                    onDetail={() => setDetail(r)} />
                ))}
                {col.key === "captacao" && captados.map((c) => (
                  <PipeCard key={c.id} title={c.titulo || "Captação agendada"} sub={c.data || "sem data"} dot={GOLD} />
                ))}
                {col.key === "edicao" && emEdicao.map((t) => (
                  <PipeCard key={t.id} title={t.title} sub={t.resp || "sem responsável"} dot="#3b82f6" />
                ))}
                {col.key === "legenda" && legendasPend.map((f) => (
                  <PipeCard key={f.id} title={f.tema} sub="ver em /postagens" dot="#a855f7" />
                ))}
                {col.key === "agendado" && agendados.map((f) => (
                  <PipeCard key={f.id} title={f.tema} sub={f.melhorDia || "agendado"} dot="#22c55e" />
                ))}
                {col.key === "publicado" && publicados.map((p) => (
                  <PipeCard key={p.id} title={p.titulo} sub={p.melhorDia || ""} dot="#4ade80" />
                ))}
                {col.count === 0 && (
                  <div style={{ color: "#333", fontSize: 12, textAlign: "center" as const, padding: "18px 6px" }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <div onClick={() => setDetail(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, maxWidth: 600, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 20, margin: 0, color: GOLD, flex: 1, paddingRight: 12 }}>{detail.titulo}</h2>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: 0, color: "#A89F92", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <Pill text={detail.formato} />
              {detail.melhorDia && <Pill text={`📅 ${detail.melhorDia}`} />}
            </div>
            {detail.gancho && <Bloco titulo="Gancho" texto={detail.gancho} />}
            {detail.roteiro && <Bloco titulo="Roteiro" texto={detail.roteiro} />}
            {detail.status === "pendente" && (
              <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                <button onClick={() => { atualizarStatus(detail.id, "aprovado"); setDetail(null); }} style={btn("#1f7a3d", "#fff")}>
                  ✅ Aprovar → criar captação
                </button>
                <button onClick={() => { atualizarStatus(detail.id, "descartado"); setDetail(null); }} style={btn("#5a2020", "#ffd5d5")}>
                  ✕ Descartar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoteiroCard({ item, isBusy, onAprovar, onDescartar, onDetail }: {
  item: PlanoItem; isBusy: boolean; onAprovar: () => void; onDescartar: () => void; onDetail: () => void;
}) {
  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 11 }}>
      <div style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#F5F0E8", marginBottom: 3 }} onClick={onDetail}>
        {item.titulo}
      </div>
      <div style={{ fontSize: 11, color: "#A89F92", marginBottom: 7 }}>{item.formato} · {item.melhorDia || "sem data"}</div>
      {item.gancho && (
        <p style={{ fontSize: 11.5, color: GOLD, fontStyle: "italic", margin: "0 0 8px", lineHeight: 1.4 }}>
          {item.gancho.length > 90 ? item.gancho.slice(0, 90) + "…" : item.gancho}
        </p>
      )}
      <div style={{ display: "flex", gap: 5 }}>
        <button onClick={onAprovar} disabled={isBusy} style={{ ...smallBtn("#1a5c30", "#6ee7a0"), flex: 1 }}>✅ Aprovar</button>
        <button onClick={onDescartar} disabled={isBusy} style={{ ...smallBtn("#3a1414", "#f87171"), flex: 1 }}>✕</button>
      </div>
    </div>
  );
}

function PipeCard({ title, sub, dot }: { title: string; sub: string; dot: string }) {
  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 11 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F5F0E8", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: dot }}>● {sub}</div>
    </div>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: "#A89F92", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 3 }}>{titulo}</div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.6, color: "#E8E0D4" }}>{texto}</p>
    </div>
  );
}

function Pill({ text }: { text: string }) {
  return <span style={{ background: "#2C2825", color: "#CFC7B8", fontSize: 11, padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}>{text}</span>;
}

const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#A89F92", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 };

function actionBtn(disabled: boolean): React.CSSProperties {
  return { background: disabled ? "#3a342c" : GOLD, color: disabled ? "#6b5d3f" : "#111", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer" };
}
function btn(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 10, padding: "10px 15px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
}
function smallBtn(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 8, padding: "6px 8px", fontWeight: 600, fontSize: 11.5, cursor: "pointer" };
}
