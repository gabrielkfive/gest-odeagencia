import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Página PÚBLICA (sem login) onde o cliente aprova o plano de conteúdo.
// Lê/grava via /api/workflowark/approve usando o token da URL (?t=).
// Design: premium dark + gold (marca ARK), Playfair Display (títulos) + Inter (corpo).

export const Route = createFileRoute("/aprovar")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({
    meta: [{ title: "Aprovação de conteúdo · ARK Content" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Aprovar,
});

type Ideia = { data?: string; dia?: string; formato?: string; tema?: string; produto?: string; angulo?: string; legenda?: string };
type Approval = { cliente?: string; periodo?: string; ideias?: Ideia[]; status?: string; items?: Record<string, string>; feedback?: string; agency?: string; decidedAt?: string };

const GOLD = "#E3B341";        // dourado claro p/ contraste em fundo escuro (AA)
const GOLD_CTA = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function Aprovar() {
  const { t } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ap, setAp] = useState<Approval | null>(null);
  const [items, setItems] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!t) { setErr("Link inválido."); setLoading(false); return; }
    setErr(""); setLoading(true);
    fetch(`/api/workflowark/approve?t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) { setErr(d.error); return; }
        setAp(d.approval);
        setItems(d.approval?.items || {});
        setFeedback(d.approval?.feedback || "");
        if (d.approval?.status && d.approval.status !== "pending") setDone(true);
      })
      .catch(() => setErr("Não foi possível carregar. Tente novamente."))
      .finally(() => setLoading(false));
  }, [t]);

  const setItem = (i: number, v: string) => setItems((p) => ({ ...p, [i]: p[String(i)] === v ? "" : v }));

  async function submit(status: "approved" | "changes") {
    setSending(true);
    try {
      const r = await fetch("/api/workflowark/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, items, feedback, status }),
      });
      const d = await r.json();
      if (d?.error) { setErr(d.error); return; }
      setDone(true);
    } catch { setErr("Não foi possível enviar. Tente novamente."); }
    finally { setSending(false); }
  }

  const wrap: React.CSSProperties = { minHeight: "100dvh", background: BG, color: "#F5F3F0", fontFamily: SANS, padding: "0 0 64px", WebkitFontSmoothing: "antialiased" };
  const inner: React.CSSProperties = { maxWidth: 720, margin: "0 auto", padding: "0 20px" };

  if (loading) return <div style={{ ...wrap, display: "grid", placeItems: "center" }}><Spinner /></div>;
  if (err) return (
    <div style={{ ...wrap, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div style={{ maxWidth: 380 }}><IconLock /><p style={{ color: "#A8A29E", marginTop: 14, fontSize: 15, lineHeight: 1.5 }}>{err}</p></div>
    </div>
  );

  const ideias = ap?.ideias || [];
  const nApproved = Object.values(items).filter((v) => v === "approved").length;
  const nChanges = Object.values(items).filter((v) => v === "changes").length;

  return (
    <div style={wrap}>
      <style>{globalCss}</style>
      <header style={{ background: "linear-gradient(160deg,#1A1510 0%,#0C0A09 100%)", borderBottom: `1px solid ${BORDER}`, padding: "32px 0 26px" }}>
        <div style={inner}>
          <div style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: GOLD, fontWeight: 600 }}>{ap?.agency || "ARK Content"}</div>
          <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, margin: "10px 0 6px", letterSpacing: "-.01em", lineHeight: 1.1 }}>Aprovação de conteúdo</h1>
          <p style={{ color: "#A8A29E", fontSize: 14.5 }}>
            {ap?.cliente ? <b style={{ color: "#F5F3F0", fontWeight: 600 }}>{ap.cliente}</b> : null}{ap?.periodo ? ` · ${ap.periodo}` : ""} · {ideias.length} ideia{ideias.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div style={inner}>
        {done ? (
          <div style={{ background: "#11210F", border: "1px solid #2C5C28", borderRadius: 16, padding: "24px", margin: "24px 0", textAlign: "center" }}>
            <div style={{ display: "inline-flex", width: 52, height: 52, borderRadius: "50%", background: "#1C7A3622", color: "#6FD17A", alignItems: "center", justifyContent: "center", marginBottom: 8 }}><IconCheck size={26} /></div>
            <h2 style={{ fontFamily: SERIF, fontSize: 21, fontWeight: 700, margin: "4px 0 6px" }}>Resposta enviada</h2>
            <p style={{ color: "#B7D3B7", fontSize: 14, lineHeight: 1.5 }}>A ARK Content recebeu sua avaliação{ap?.status === "approved" ? " — conteúdo aprovado." : ap?.status === "changes" ? " — vamos ajustar e te retornar." : "."} Pode fechar esta página.</p>
          </div>
        ) : (
          <p style={{ color: "#A8A29E", fontSize: 14, lineHeight: 1.6, margin: "22px 0 16px" }}>
            Revise as ideias abaixo. Aprove cada uma, marque a que precisa de ajuste e, se quiser, deixe um comentário. No fim, escolha <b style={{ color: "#F5F3F0" }}>Aprovar tudo</b> ou <b style={{ color: "#F5F3F0" }}>Pedir ajustes</b>.
          </p>
        )}

        {ideias.map((i, idx) => {
          const dec = items[String(idx)] || "";
          const ring = dec === "approved" ? "#2C5C28" : dec === "changes" ? "#7A5A1F" : BORDER;
          return (
            <article key={idx} style={{ background: SURFACE, border: `1px solid ${ring}`, borderRadius: 16, padding: "18px 20px", marginBottom: 13, transition: "border-color .2s ease" }}>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 9 }}>
                {i.dia ? <span style={tag}>{i.dia}</span> : null}
                {i.formato ? <span style={{ ...tag, background: "#211B0F", color: GOLD, borderColor: "#3A2F12" }}>{i.formato}</span> : null}
                {i.produto ? <span style={tag}>{i.produto}</span> : null}
              </div>
              {i.tema ? <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, marginBottom: 6, lineHeight: 1.25 }}>{i.tema}</h3> : null}
              {i.angulo ? <p style={{ fontSize: 13.5, color: "#B6AFA8", lineHeight: 1.55, marginBottom: 8 }}>{i.angulo}</p> : null}
              {i.legenda ? <p style={{ fontSize: 13.5, color: "#E7E3DD", fontStyle: "italic", borderLeft: `2px solid ${GOLD}`, paddingLeft: 12, marginBottom: 14 }}>“{i.legenda}”</p> : null}
              {!done && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="ark-btn" onClick={() => setItem(idx, "approved")} style={choice(dec === "approved", "#2F7A33")}><IconCheck size={15} /> Aprovar</button>
                  <button className="ark-btn" onClick={() => setItem(idx, "changes")} style={choice(dec === "changes", "#9A6A1F")}><IconEdit size={15} /> Ajustar</button>
                </div>
              )}
              {done && dec ? <div style={{ fontSize: 12.5, color: dec === "approved" ? "#6FD17A" : "#E0B34F", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>{dec === "approved" ? <IconCheck size={14} /> : <IconEdit size={14} />}{dec === "approved" ? "Aprovado" : "Pediu ajuste"}</div> : null}
            </article>
          );
        })}

        {!done && (
          <>
            <textarea className="ark-field" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comentário geral (opcional) — o que ajustar, ideias, observações…"
              style={{ width: "100%", minHeight: 92, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, color: "#F5F3F0", padding: "13px 15px", fontSize: 14.5, fontFamily: SANS, resize: "vertical", marginTop: 8 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button className="ark-btn" disabled={sending} onClick={() => submit("approved")} style={{ flex: 1, minWidth: 200, background: GOLD_CTA, color: "#1A1206", border: "none", borderRadius: 14, padding: "15px 18px", fontWeight: 700, fontSize: 15.5, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <IconCheck size={17} /> {sending ? "Enviando…" : `Aprovar tudo${nApproved ? ` (${nApproved})` : ""}`}
              </button>
              <button className="ark-btn" disabled={sending} onClick={() => submit("changes")} style={{ flex: 1, minWidth: 200, background: "transparent", color: "#F5F3F0", border: `1px solid #4A443E`, borderRadius: 14, padding: "15px 18px", fontWeight: 600, fontSize: 15.5, cursor: "pointer" }}>
                Pedir ajustes{nChanges ? ` (${nChanges})` : ""}
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: "center", color: "#6B645D", fontSize: 11.5, marginTop: 34, letterSpacing: ".02em" }}>Powered by WorkFlowArk · ARK Content</p>
      </div>
    </div>
  );
}

const tag: React.CSSProperties = { fontSize: 11, fontWeight: 600, background: "#241F1B", color: "#B6AFA8", border: "1px solid #322C27", borderRadius: 7, padding: "3px 9px" };
function choice(active: boolean, color: string): React.CSSProperties {
  return { flex: 1, background: active ? color : "transparent", color: active ? "#fff" : "#CFC9C2", border: `1px solid ${active ? color : "#3E3833"}`, borderRadius: 11, padding: "10px 12px", fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .2s ease" };
}

const globalCss = `
  *{box-sizing:border-box}
  body{margin:0}
  .ark-btn{transition:filter .2s ease, transform .12s ease, background-color .2s ease, border-color .2s ease;}
  .ark-btn:hover{filter:brightness(1.07)}
  .ark-btn:active{transform:scale(.985)}
  .ark-btn:disabled{opacity:.55;cursor:default}
  .ark-btn:focus-visible,.ark-field:focus-visible{outline:2px solid ${GOLD};outline-offset:2px}
  .ark-field{transition:border-color .2s ease}
  .ark-field:focus{border-color:${GOLD}}
  @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
`;

function IconLock() {
  return (<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
}
function IconCheck({ size = 18 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>);
}
function IconEdit({ size = 18 }: { size?: number }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>);
}
function Spinner() {
  return (<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" aria-label="Carregando"><path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" /></path></svg>);
}
