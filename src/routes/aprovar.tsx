import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Página PÚBLICA (sem login) onde o cliente aprova o plano de conteúdo.
// Lê/grava via /api/workflowark/approve usando o token da URL (?t=).

export const Route = createFileRoute("/aprovar")({
  validateSearch: (s: Record<string, unknown>) => ({ t: typeof s.t === "string" ? s.t : "" }),
  head: () => ({ meta: [{ title: "Aprovação de conteúdo · ARK Content" }] }),
  component: Aprovar,
});

type Ideia = { data?: string; dia?: string; formato?: string; tema?: string; produto?: string; angulo?: string; legenda?: string };
type Approval = { cliente?: string; periodo?: string; ideias?: Ideia[]; status?: string; items?: Record<string, string>; feedback?: string; agency?: string; decidedAt?: string };

const GOLD = "#FFC700";
const INK = "#1a1a1a";

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

  const setItem = (i: number, v: string) =>
    setItems((p) => ({ ...p, [i]: p[i] === v ? "" : v }));

  async function submit(status: "approved" | "changes") {
    setSending(true);
    try {
      const r = await fetch("/api/workflowark/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t, items, feedback, status }),
      });
      const d = await r.json();
      if (d?.error) { setErr(d.error); return; }
      setDone(true);
    } catch { setErr("Não foi possível enviar. Tente novamente."); }
    finally { setSending(false); }
  }

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#0d0d0d", color: "#fff", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif", padding: "0 0 60px" };
  const inner: React.CSSProperties = { maxWidth: 760, margin: "0 auto", padding: "0 18px" };

  if (loading) return <div style={{ ...wrap, display: "grid", placeItems: "center" }}><p style={{ color: "#888" }}>Carregando…</p></div>;
  if (err) return <div style={{ ...wrap, display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}><div><div style={{ fontSize: 40 }}>🔒</div><p style={{ color: "#bbb", maxWidth: 360 }}>{err}</p></div></div>;

  const ideias = ap?.ideias || [];
  const nApproved = Object.values(items).filter((v) => v === "approved").length;
  const nChanges = Object.values(items).filter((v) => v === "changes").length;

  return (
    <div style={wrap}>
      <header style={{ background: `linear-gradient(135deg,#15120a,#000)`, borderBottom: `1px solid #2a2415`, padding: "26px 0 22px" }}>
        <div style={inner}>
          <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: GOLD, fontWeight: 700 }}>{ap?.agency || "ARK Content"}</div>
          <h1 style={{ fontSize: 25, fontWeight: 800, margin: "8px 0 4px", letterSpacing: "-.02em" }}>Aprovação de conteúdo</h1>
          <p style={{ color: "#bdbdbd", fontSize: 14 }}>
            {ap?.cliente ? <b style={{ color: "#fff" }}>{ap.cliente}</b> : null}{ap?.periodo ? ` · ${ap.periodo}` : ""} · {ideias.length} ideia{ideias.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div style={inner}>
        {done ? (
          <div style={{ background: "#11240f", border: "1px solid #1f7a1f", borderRadius: 14, padding: "20px 22px", margin: "22px 0", textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>✓</div>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0" }}>Resposta enviada!</h2>
            <p style={{ color: "#cfe8cf", fontSize: 13.5 }}>A ARK Content recebeu sua avaliação{ap?.status === "approved" ? " — conteúdo aprovado 🎉" : ap?.status === "changes" ? " — vamos ajustar e te retornar." : "."} Pode fechar esta página.</p>
          </div>
        ) : (
          <p style={{ color: "#9a9a9a", fontSize: 13, margin: "20px 0 14px" }}>
            Veja as ideias abaixo. Você pode aprovar cada uma, marcar a que precisa de ajuste e deixar um comentário. No fim, escolha <b style={{ color: "#fff" }}>Aprovar tudo</b> ou <b style={{ color: "#fff" }}>Pedir ajustes</b>.
          </p>
        )}

        {ideias.map((i, idx) => {
          const dec = items[String(idx)] || "";
          return (
            <div key={idx} style={{ background: "#161616", border: `1px solid ${dec === "approved" ? "#1f7a1f" : dec === "changes" ? "#9a6a1f" : "#262626"}`, borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {i.dia ? <span style={tag}>{i.dia}</span> : null}
                {i.formato ? <span style={{ ...tag, background: "#23200f", color: GOLD }}>{i.formato}</span> : null}
                {i.produto ? <span style={tag}>{i.produto}</span> : null}
              </div>
              {i.tema ? <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{i.tema}</div> : null}
              {i.angulo ? <div style={{ fontSize: 13, color: "#bdbdbd", lineHeight: 1.5, marginBottom: 8 }}>{i.angulo}</div> : null}
              {i.legenda ? <div style={{ fontSize: 13, color: "#e9e7e0", fontStyle: "italic", borderLeft: `2px solid ${GOLD}`, paddingLeft: 10, marginBottom: 12 }}>“{i.legenda}”</div> : null}
              {!done && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setItem(idx, "approved")} style={btn(dec === "approved", "#1f7a1f")}>✓ Aprovar</button>
                  <button onClick={() => setItem(idx, "changes")} style={btn(dec === "changes", "#9a6a1f")}>✎ Ajustar</button>
                </div>
              )}
              {done && dec ? <div style={{ fontSize: 12, color: dec === "approved" ? "#7ad17a" : "#e0b34f", fontWeight: 700 }}>{dec === "approved" ? "✓ Aprovado" : "✎ Pediu ajuste"}</div> : null}
            </div>
          );
        })}

        {!done && (
          <>
            <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comentário geral (opcional) — o que ajustar, ideias, observações…"
              style={{ width: "100%", minHeight: 90, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 12, color: "#fff", padding: "12px 14px", fontSize: 14, fontFamily: "inherit", resize: "vertical", marginTop: 6 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button disabled={sending} onClick={() => submit("approved")} style={{ flex: 1, minWidth: 200, background: GOLD, color: "#000", border: "none", borderRadius: 12, padding: "14px 18px", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                {sending ? "Enviando…" : `Aprovar tudo${nApproved ? ` (${nApproved}✓)` : ""}`}
              </button>
              <button disabled={sending} onClick={() => submit("changes")} style={{ flex: 1, minWidth: 200, background: "transparent", color: "#fff", border: "1px solid #444", borderRadius: 12, padding: "14px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Pedir ajustes{nChanges ? ` (${nChanges}✎)` : ""}
              </button>
            </div>
          </>
        )}

        <p style={{ textAlign: "center", color: "#5a5a5a", fontSize: 11, marginTop: 30 }}>Powered by WorkFlowArk · {INK ? "ARK Content" : ""}</p>
      </div>
    </div>
  );
}

const tag: React.CSSProperties = { fontSize: 11, fontWeight: 700, background: "#202020", color: "#bdbdbd", borderRadius: 6, padding: "2px 8px" };
function btn(active: boolean, color: string): React.CSSProperties {
  return { flex: 1, background: active ? color : "transparent", color: active ? "#fff" : "#cfcfcf", border: `1px solid ${active ? color : "#3a3a3a"}`, borderRadius: 9, padding: "9px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
}
