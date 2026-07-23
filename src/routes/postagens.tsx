import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/authed-fetch";

// Página AUTENTICADA: fila de aprovação do AGENTE SOCIAL MEDIA.
// Mostra as propostas geradas por /api/workflowark/social-run (wfa-social-fila) e deixa o
// gestor APROVAR / RECUSAR em 1 toque e COPIAR a legenda pro Speedpost.
// Lê via GET /api/workflowark/state e grava a decisão via action "social-decide".
// Design: dark + gold da marca ARK (mesmo do /aprovar).

export const Route = createFileRoute("/postagens")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Postagens · Agente Social Media · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Postagens,
});

type Proposta = {
  id: string; clienteId: string; cliente: string; date: string; ts: number;
  status: "pendente" | "aprovada" | "recusada" | "agendada";
  formato: string; tema: string; gancho: string; roteiro: string; legenda: string;
  cta: string; captacao: string; melhorDia: string;
};

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";


const FILTROS = [
  { k: "pendente", l: "⏳ Pendentes" },
  { k: "aprovada", l: "✅ Aprovadas" },
  { k: "recusada", l: "✕ Recusadas" },
  { k: "todas", l: "Todas" },
] as const;

function Postagens() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [fila, setFila] = useState<Proposta[]>([]);
  const [filtro, setFiltro] = useState<string>("pendente");
  const [busy, setBusy] = useState<string>("");
  const [copied, setCopied] = useState<string>("");
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const out = await authedFetch("load");
      const f = out?.state?.["wfa-social-fila"];
      setFila(Array.isArray(f) ? f : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function decidir(id: string, decisao: Proposta["status"]) {
    setBusy(id);
    try {
      await authedFetch("social-decide", { id, decisao });
      setFila((prev) => prev.map((p) => (p.id === id ? { ...p, status: decisao } : p)));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  async function copiar(p: Proposta) {
    const txt = `${p.legenda}${p.cta ? "\n\n" + p.cta : ""}`.trim();
    try { await navigator.clipboard.writeText(txt); setCopied(p.id); setTimeout(() => setCopied(""), 1800); }
    catch { setErr("Não consegui copiar. Selecione o texto manualmente."); }
  }

  // Gera mais propostas agora (chama o agente — autenticado pela sessão do usuário;
  // a antiga key fixa "ark-2026" virou segredo de servidor só pra cron).
  async function gerarAgora() {
    setGerando(true); setErr("");
    try {
      let { data } = await supabase.auth.getSession();
      let token = data.session?.access_token;
      if (!token) { const rr = await supabase.auth.refreshSession(); token = rr.data.session?.access_token; }
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      const r = await fetch(`/api/workflowark/social-run?force=1`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "Falha ao gerar.");
      await carregar();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setGerando(false); }
  }

  const visiveis = fila
    .filter((p) => (filtro === "todas" ? true : p.status === filtro))
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const nPend = fila.filter((p) => p.status === "pendente").length;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#F5F0E8", fontFamily: SANS, padding: "24px 16px" }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 30, margin: 0, color: GOLD }}>Postagens</h1>
            <p style={{ margin: "4px 0 0", color: "#A89F92", fontSize: 14 }}>
              Agente Social Media · {nPend} aguardando sua aprovação
            </p>
          </div>
          <button onClick={gerarAgora} disabled={gerando}
            style={{ background: gerando ? "#3a342c" : GOLD, color: "#111", border: 0, borderRadius: 10, padding: "11px 16px", fontWeight: 700, fontSize: 14, cursor: gerando ? "default" : "pointer" }}>
            {gerando ? "Gerando…" : "✨ Gerar agora"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "18px 0", flexWrap: "wrap" }}>
          {FILTROS.map((f) => (
            <button key={f.k} onClick={() => setFiltro(f.k)}
              style={{ background: filtro === f.k ? GOLD : SURFACE, color: filtro === f.k ? "#111" : "#CFC7B8", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {f.l}
            </button>
          ))}
        </div>

        {err && <div style={{ background: "#3a1414", border: "1px solid #5a2020", color: "#ffd5d5", padding: 12, borderRadius: 10, marginBottom: 16 }}>{err}</div>}
        {loading && <p style={{ color: "#A89F92" }}>Carregando a fila…</p>}
        {!loading && !visiveis.length && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#A89F92" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <p>Nada por aqui. Toque em <b style={{ color: GOLD }}>Gerar agora</b> pra o agente criar propostas.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {visiveis.map((p) => (
            <article key={p.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ background: GOLD, color: "#111", fontWeight: 700, fontSize: 12, padding: "3px 9px", borderRadius: 6 }}>{p.cliente}</span>
                  <span style={{ color: "#CFC7B8", fontSize: 12, border: `1px solid ${BORDER}`, padding: "3px 9px", borderRadius: 6 }}>{p.formato}</span>
                  {p.melhorDia && <span style={{ color: "#A89F92", fontSize: 12 }}>📅 {p.melhorDia}</span>}
                </div>
                <Status s={p.status} />
              </div>

              <h3 style={{ fontFamily: SERIF, fontSize: 19, margin: "12px 0 4px", color: "#F5F0E8" }}>{p.tema}</h3>
              {p.gancho && <p style={{ margin: "0 0 10px", color: GOLD, fontStyle: "italic", fontSize: 14 }}>“{p.gancho}”</p>}

              {p.roteiro && <Bloco titulo="🎬 Roteiro" texto={p.roteiro} />}
              {p.legenda && <Bloco titulo="✍️ Legenda" texto={p.legenda} />}
              {p.cta && <Bloco titulo="📣 CTA" texto={p.cta} />}
              {p.captacao && <Bloco titulo="🎥 O que gravar" texto={p.captacao} />}

              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                {p.status !== "aprovada" && (
                  <button onClick={() => decidir(p.id, "aprovada")} disabled={busy === p.id}
                    style={btn("#1f7a3d", "#fff")}>✅ Aprovar</button>
                )}
                {p.status !== "recusada" && (
                  <button onClick={() => decidir(p.id, "recusada")} disabled={busy === p.id}
                    style={btn("#5a2020", "#ffd5d5")}>✕ Recusar</button>
                )}
                <button onClick={() => copiar(p)} style={btn(SURFACE, GOLD, BORDER)}>
                  {copied === p.id ? "✓ Copiado!" : "📋 Copiar legenda"}
                </button>
                {p.status === "aprovada" && (
                  <button onClick={() => decidir(p.id, "agendada")} disabled={busy === p.id} style={btn(GOLD, "#111")}>
                    🗓️ Marcar como agendada
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "#6b6357", fontSize: 12, marginTop: 28 }}>
          As aprovadas você copia e agenda no Speedpost. O agente nunca posta sozinho.
        </p>
      </div>
    </div>
  );
}

function Status({ s }: { s: Proposta["status"] }) {
  const map: Record<string, [string, string]> = {
    pendente: ["⏳ Pendente", "#A89F92"], aprovada: ["✅ Aprovada", "#4ade80"],
    recusada: ["✕ Recusada", "#f87171"], agendada: ["🗓️ Agendada", GOLD],
  };
  const [txt, cor] = map[s] || map.pendente;
  return <span style={{ color: cor, fontSize: 13, fontWeight: 600 }}>{txt}</span>;
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: "#A89F92", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{titulo}</div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.6, color: "#E8E0D4" }}>{texto}</p>
    </div>
  );
}

function btn(bg: string, color: string, border?: string): React.CSSProperties {
  return { background: bg, color, border: border ? `1px solid ${border}` : 0, borderRadius: 10, padding: "10px 15px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
}
