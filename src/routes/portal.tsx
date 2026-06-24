import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Portal PÚBLICO do cliente (sem login). Mostra o plano de conteúdo ao vivo e deixa
// o cliente abrir uma demanda. Token na URL (?t=).

export const Route = createFileRoute("/portal")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({ meta: [{ title: "Portal do cliente · ARK Content" }] }),
  component: Portal,
});

type Ideia = { data?: string; dia?: string; formato?: string; tema?: string; produto?: string; angulo?: string; legenda?: string };
type Data = { cliente?: string; periodo?: string; ideias?: Ideia[]; agency?: string };

const GOLD = "#FFC700";

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
    } catch { setErr("Não foi possível enviar. Tente novamente."); }
    finally { setSending(false); }
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0d0d0d", color: "#fff", fontFamily: "system-ui,-apple-system,Segoe UI,Roboto,sans-serif", padding: "0 0 60px" };
  const inner: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 18px" };

  if (loading) return <div style={{ ...wrap, display: "grid", placeItems: "center" }}><p style={{ color: "#888" }}>Carregando…</p></div>;
  if (err) return <div style={{ ...wrap, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}><div><div style={{ fontSize: 40 }}>🔒</div><p style={{ color: "#bbb", maxWidth: 360 }}>{err}</p></div></div>;

  const ideias = d?.ideias || [];

  return (
    <div style={wrap}>
      <header style={{ background: "linear-gradient(135deg,#15120a,#000)", borderBottom: "1px solid #2a2415", padding: "26px 0 22px" }}>
        <div style={inner}>
          <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>{d?.agency || "ARK Content"}</div>
          <h1 style={{ fontSize: 25, fontWeight: 800, margin: "8px 0 2px", letterSpacing: "-.02em" }}>Olá, {d?.cliente || "cliente"} 👋</h1>
          <p style={{ color: "#bdbdbd", fontSize: 14 }}>Seu portal com a ARK Content — acompanhe o conteúdo e fale com a gente.</p>
        </div>
      </header>

      <div style={inner}>
        <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: GOLD, margin: "24px 0 12px" }}>
          📅 Seu plano de conteúdo{d?.periodo ? ` · ${d.periodo}` : ""}
        </h2>
        {ideias.length === 0 ? (
          <p style={{ color: "#9a9a9a", fontSize: 13 }}>Seu plano de conteúdo aparece aqui assim que a equipe publicar. 🎬</p>
        ) : ideias.map((i, idx) => (
          <div key={idx} style={{ background: "#161616", border: "1px solid #262626", borderRadius: 14, padding: "15px 17px", marginBottom: 11 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 7 }}>
              {i.dia ? <span style={tag}>{i.dia}</span> : null}
              {i.formato ? <span style={{ ...tag, background: "#23200f", color: GOLD }}>{i.formato}</span> : null}
              {i.produto ? <span style={tag}>{i.produto}</span> : null}
            </div>
            {i.tema ? <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 5 }}>{i.tema}</div> : null}
            {i.angulo ? <div style={{ fontSize: 13, color: "#bdbdbd", lineHeight: 1.5 }}>{i.angulo}</div> : null}
            {i.legenda ? <div style={{ fontSize: 13, color: "#e9e7e0", fontStyle: "italic", borderLeft: `2px solid ${GOLD}`, paddingLeft: 10, marginTop: 8 }}>“{i.legenda}”</div> : null}
          </div>
        ))}

        <h2 style={{ fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: GOLD, margin: "30px 0 12px" }}>✍️ Abrir uma demanda</h2>
        {sent ? (
          <div style={{ background: "#11240f", border: "1px solid #1f7a1f", borderRadius: 14, padding: "18px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 30 }}>✓</div>
            <p style={{ color: "#cfe8cf", fontSize: 14, fontWeight: 700, margin: "6px 0 2px" }}>Demanda enviada!</p>
            <p style={{ color: "#9bbf9b", fontSize: 12.5 }}>A equipe da ARK já recebeu. <button onClick={() => setSent(false)} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", fontWeight: 700, fontSize: 12.5, textDecoration: "underline" }}>Abrir outra</button></p>
          </div>
        ) : (
          <div>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ex: ajustar post de sexta)"
              style={{ width: "100%", background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", padding: "12px 14px", fontSize: 14, marginBottom: 9 }} />
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Conte o que você precisa…"
              style={{ width: "100%", minHeight: 100, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
            <button disabled={sending} onClick={enviar} style={{ marginTop: 12, background: GOLD, color: "#000", border: "none", borderRadius: 12, padding: "13px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              {sending ? "Enviando…" : "Enviar demanda"}
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", color: "#5a5a5a", fontSize: 11, marginTop: 34 }}>Powered by WorkFlowArk · ARK Content</p>
      </div>
    </div>
  );
}

const tag: React.CSSProperties = { fontSize: 11, fontWeight: 700, background: "#202020", color: "#bdbdbd", borderRadius: 6, padding: "2px 8px" };
