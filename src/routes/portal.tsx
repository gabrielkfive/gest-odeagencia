import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Portal PÚBLICO do cliente (sem login). Mostra o plano de conteúdo ao vivo e deixa
// o cliente abrir uma demanda. Token na URL (?t=). Design premium dark + gold (marca ARK).

export const Route = createFileRoute("/portal")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({
    meta: [{ title: "Portal do cliente · ARK Content" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Portal,
});

type Ideia = { data?: string; dia?: string; formato?: string; tema?: string; produto?: string; angulo?: string; legenda?: string };
type DemandaItem = { id: string; titulo: string; criadaEm?: string; status: string };
type Data = { cliente?: string; periodo?: string; ideias?: Ideia[]; agency?: string; demandas?: DemandaItem[] };

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function Portal() {
  const { t } = Route.useSearch();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [titulo, setTitulo] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!t) { setErr("Link inválido."); setLoading(false); return; }
    setErr(""); setLoading(true);
    fetch(`/api/workflowark/portal?t=${encodeURIComponent(t)}`)
      .then((r) => r.json())
      .then((j) => { if (j?.error) setErr(j.error); else setD(j); })
      .catch(() => setErr("Não foi possível carregar. Tente novamente."))
      .finally(() => setLoading(false));
  }, [t]);

  async function enviar() {
    if (!titulo.trim() && !msg.trim()) return;
    setSending(true);
    try {
      const r = await fetch("/api/workflowark/portal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t, titulo, mensagem: msg }),
      });
      const j = await r.json();
      if (j?.error) { setErr(j.error); return; }
      setSent(true); setTitulo(""); setMsg("");
      setD(prev => prev ? { ...prev, demandas: [{ id: "d" + Date.now(), titulo: titulo || "Demanda do cliente", criadaEm: new Date().toISOString(), status: "aberta" }, ...(prev.demandas || [])] } : prev);
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

  const ideias = d?.ideias || [];

  return (
    <div style={wrap}>
      <style>{globalCss}</style>
      <header style={{ background: "linear-gradient(160deg,#1A1510 0%,#0C0A09 100%)", borderBottom: `1px solid ${BORDER}`, padding: "32px 0 26px" }}>
        <div style={inner}>
          <div style={{ fontSize: 11, letterSpacing: ".24em", textTransform: "uppercase", color: GOLD, fontWeight: 600 }}>{d?.agency || "ARK Content"}</div>
          <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 700, margin: "10px 0 4px", letterSpacing: "-.01em", lineHeight: 1.1 }}>Olá, {d?.cliente || "cliente"}</h1>
          <p style={{ color: "#A8A29E", fontSize: 14.5 }}>Seu portal com a ARK Content — acompanhe o conteúdo e fale com a gente.</p>
        </div>
      </header>

      <div style={inner}>
        <SectionTitle icon={<IconCalendar />} text={`Seu plano de conteúdo${d?.periodo ? ` · ${d.periodo}` : ""}`} />
        {ideias.length === 0 ? (
          <p style={{ color: "#A8A29E", fontSize: 14 }}>Seu plano de conteúdo aparece aqui assim que a equipe publicar.</p>
        ) : ideias.map((i, idx) => (
          <article key={idx} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "17px 19px", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
              {i.dia ? <span style={tag}>{i.dia}</span> : null}
              {i.formato ? <span style={{ ...tag, background: "#211B0F", color: GOLD, borderColor: "#3A2F12" }}>{i.formato}</span> : null}
              {i.produto ? <span style={tag}>{i.produto}</span> : null}
            </div>
            {i.tema ? <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, marginBottom: 5, lineHeight: 1.25 }}>{i.tema}</h3> : null}
            {i.angulo ? <p style={{ fontSize: 13.5, color: "#B6AFA8", lineHeight: 1.55 }}>{i.angulo}</p> : null}
            {i.legenda ? <p style={{ fontSize: 13.5, color: "#E7E3DD", fontStyle: "italic", borderLeft: `2px solid ${GOLD}`, paddingLeft: 12, marginTop: 8 }}>“{i.legenda}”</p> : null}
          </article>
        ))}

        <div style={{ marginTop: 30 }}><SectionTitle icon={<IconEdit size={18} />} text="Abrir uma demanda" /></div>
        {sent ? (
          <div style={{ background: "#11210F", border: "1px solid #2C5C28", borderRadius: 16, padding: "22px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", width: 46, height: 46, borderRadius: "50%", background: "#1C7A3622", color: "#6FD17A", alignItems: "center", justifyContent: "center", marginBottom: 6 }}><IconCheck size={24} /></div>
            <p style={{ color: "#CDE6CD", fontSize: 14.5, fontWeight: 600, margin: "4px 0 4px" }}>Demanda enviada!</p>
            <p style={{ color: "#9BBF9B", fontSize: 13 }}>A equipe da ARK já recebeu. <button className="ark-link" onClick={() => setSent(false)}>Abrir outra</button></p>
          </div>
        ) : (
          <div>
            <input className="ark-field" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex: ajustar post de sexta)"
              style={{ width: "100%", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, color: "#F5F3F0", padding: "13px 15px", fontSize: 14.5, fontFamily: SANS, marginBottom: 10 }} />
            <textarea className="ark-field" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Conte o que você precisa…"
              style={{ width: "100%", minHeight: 104, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, color: "#F5F3F0", padding: "13px 15px", fontSize: 14.5, fontFamily: SANS, resize: "vertical" }} />
            <button className="ark-btn" disabled={sending} onClick={enviar} style={{ marginTop: 13, background: GOLD, color: "#1A1206", border: "none", borderRadius: 14, padding: "14px 24px", fontWeight: 700, fontSize: 15.5, cursor: "pointer" }}>
              {sending ? "Enviando…" : "Enviar demanda"}
            </button>
          </div>
        )}

        {(d?.demandas?.length ?? 0) > 0 && (
          <div style={{ marginTop: 30 }}>
            <SectionTitle icon={<IconList />} text="Suas solicitações" />
            {d!.demandas!.map(dm => (
              <div key={dm.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "13px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F3F0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dm.titulo}</div>
                  {dm.criadaEm && <div style={{ fontSize: 12, color: "#6B645D", marginTop: 2 }}>{fmtDate(dm.criadaEm)}</div>}
                </div>
                <StatusChip status={dm.status} />
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: "center", color: "#6B645D", fontSize: 11.5, marginTop: 36, letterSpacing: ".02em" }}>Powered by WorkFlowArk · ARK Content</p>
      </div>
    </div>
  );
}

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (<h2 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: GOLD, margin: "26px 0 13px" }}>{icon}{text}</h2>);
}

const tag: React.CSSProperties = { fontSize: 11, fontWeight: 600, background: "#241F1B", color: "#B6AFA8", border: "1px solid #322C27", borderRadius: 7, padding: "3px 9px" };

const globalCss = `
  *{box-sizing:border-box} body{margin:0}
  .ark-btn{transition:filter .2s ease, transform .12s ease}
  .ark-btn:hover{filter:brightness(1.07)} .ark-btn:active{transform:scale(.985)} .ark-btn:disabled{opacity:.55;cursor:default}
  .ark-btn:focus-visible,.ark-field:focus-visible{outline:2px solid ${GOLD};outline-offset:2px}
  .ark-field{transition:border-color .2s ease} .ark-field:focus{border-color:${GOLD}}
  .ark-link{background:none;border:none;color:${GOLD};cursor:pointer;font-weight:700;font-size:13px;text-decoration:underline;font-family:inherit;padding:0}
  @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
`;

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aberta:    { label: "Recebida",      color: "#6FD17A" },
  backlog:   { label: "Na fila",       color: "#A8A29E" },
  andamento: { label: "Em andamento",  color: GOLD },
  aprovacao: { label: "Aprovação",     color: "#93C5FD" },
  concluido: { label: "Concluído",     color: "#86EFAC" },
};
function StatusChip({ status }: { status: string }) {
  const s = STATUS_LABELS[status] || { label: status, color: "#A8A29E" };
  return <span style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.color + "22", borderRadius: 8, padding: "3px 9px", whiteSpace: "nowrap", flexShrink: 0 }}>{s.label}</span>;
}
function fmtDate(s?: string) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }); } catch { return ""; }
}
function IconList() { return (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>); }
function IconLock() { return (<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>); }
function IconCheck({ size = 18 }: { size?: number }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>); }
function IconEdit({ size = 18 }: { size?: number }) { return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>); }
function IconCalendar() { return (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>); }
function Spinner() { return (<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" aria-label="Carregando"><path d="M21 12a9 9 0 1 1-6.219-8.56"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" /></path></svg>); }
