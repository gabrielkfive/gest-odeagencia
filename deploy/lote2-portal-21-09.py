# -*- coding: utf-8 -*-
"""Lote 2 (21/09): seções Aprovação e Entregas no portal público (src/routes/portal.tsx)."""
import io
p = 'src/routes/portal.tsx'
s = io.open(p, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s[:500] else '\n'
s = s.replace('\r\n', '\n')

old = 'type Data = { cliente?: string; periodo?: string; ideias?: Ideia[]; agency?: string; demandas?: DemandaItem[] };'
new = '''type Link = { nome: string; url: string; tipo?: string };
type Entrega = { id: string; titulo: string; formato?: string; publicarEm?: string; concluidaEm?: string; legenda?: string; links: Link[] };
type Aprovacao = { id: string; titulo: string; formato?: string; publicarEm?: string; briefing?: string; legenda?: string; desde?: string; links: Link[] };
type Data = { cliente?: string; periodo?: string; ideias?: Ideia[]; agency?: string; demandas?: DemandaItem[]; entregas?: Entrega[]; aprovacoes?: Aprovacao[] };'''
assert old in s; s = s.replace(old, new, 1)

old = '  const [sent, setSent] = useState(false);\n'
new = old + '''  const [coment, setComent] = useState<Record<string, string>>({});
  const [decidindo, setDecidindo] = useState("");
  const [feito, setFeito] = useState<Record<string, string>>({});

  // Aprovar ou pedir ajuste: grava na tarefa da equipe pelo mesmo token do portal
  async function decidir(id: string, acao: "aprovar" | "ajustar") {
    const texto = (coment[id] || "").trim();
    if (acao === "ajustar" && !texto) { setFeito((f) => ({ ...f, [id]: "Escreva o ajuste antes de enviar." })); return; }
    setDecidindo(id);
    try {
      const r = await fetch("/api/workflowark/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t, acao, id, comentario: texto }) });
      const j = await r.json();
      if (j?.error) { setFeito((f) => ({ ...f, [id]: j.error })); return; }
      setFeito((f) => ({ ...f, [id]: acao === "aprovar" ? "Aprovado. A equipe já foi avisada." : "Ajuste enviado. A equipe já foi avisada." }));
      setD((prev) => prev ? { ...prev, aprovacoes: (prev.aprovacoes || []).filter((a) => a.id !== id) } : prev);
    } catch { setFeito((f) => ({ ...f, [id]: "Não foi possível enviar. Tente novamente." })); }
    finally { setDecidindo(""); }
  }
'''
assert old in s; s = s.replace(old, new, 1)

old = '  const ideias = d?.ideias || [];\n'
new = old + '''  const aprovacoes = d?.aprovacoes || [];
  const entregas = d?.entregas || [];
  const fmtLabel = (f?: string) => ({ estatico: "Estático", carrossel: "Carrossel", reel: "Reel", story: "Story" } as Record<string, string>)[f || ""] || f || "";
  const fmtPub = (v?: string) => (v ? `${fmtDate(v)}${v.length >= 16 ? " às " + v.slice(11, 16) : ""}` : "");
'''
assert old in s; s = s.replace(old, new, 1)

anchor = '        <div style={{ marginTop: 30 }}><SectionTitle icon={<IconEdit size={18} />} text="Abrir uma demanda" /></div>'
assert anchor in s
bloco = '''        {(aprovacoes.length > 0 || Object.keys(feito).length > 0) && (
          <div style={{ marginTop: 30 }}>
            <SectionTitle icon={<IconCheck size={17} />} text={`Esperando a sua aprovação${aprovacoes.length ? ` · ${aprovacoes.length}` : ""}`} />
            {aprovacoes.length === 0 ? <p style={{ color: "#A8A29E", fontSize: 14 }}>Nada esperando você agora.</p> : null}
            {aprovacoes.map((a) => (
              <article key={a.id} style={{ background: SURFACE, border: `1px solid ${GOLD}55`, borderRadius: 16, padding: "17px 19px", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                  {a.formato ? <span style={{ ...tag, background: "#211B0F", color: GOLD, borderColor: "#3A2F12" }}>{fmtLabel(a.formato)}</span> : null}
                  {a.publicarEm ? <span style={tag}>publica {fmtPub(a.publicarEm)}</span> : null}
                </div>
                <h3 style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, marginBottom: 6, lineHeight: 1.25 }}>{a.titulo}</h3>
                {a.briefing ? <p style={{ fontSize: 13.5, color: "#B6AFA8", lineHeight: 1.55 }}>{a.briefing}</p> : null}
                {a.legenda ? <p style={{ fontSize: 13.5, color: "#E7E3DD", fontStyle: "italic", borderLeft: `2px solid ${GOLD}`, paddingLeft: 12, marginTop: 8 }}>“{a.legenda}”</p> : null}
                {a.links.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>{a.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ark-link" style={{ fontSize: 13 }}>Ver {l.nome}</a>)}</div> : null}
                {feito[a.id] ? <p style={{ color: "#CDE6CD", fontSize: 13.5, marginTop: 10 }}>{feito[a.id]}</p> : (
                  <div style={{ marginTop: 12 }}>
                    <textarea className="ark-field" value={coment[a.id] || ""} onChange={(e) => setComent((c) => ({ ...c, [a.id]: e.target.value }))} placeholder="Comentário (obrigatório para pedir ajuste)"
                      style={{ width: "100%", minHeight: 64, background: BG, border: `1px solid ${BORDER}`, borderRadius: 12, color: "#F5F3F0", padding: "11px 13px", fontSize: 14, fontFamily: SANS, resize: "vertical" }} />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button className="ark-btn" disabled={decidindo === a.id} onClick={() => decidir(a.id, "aprovar")} style={{ flex: 1, background: GOLD, color: "#1A1206", border: "none", borderRadius: 12, padding: "12px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Aprovar</button>
                      <button className="ark-btn" disabled={decidindo === a.id} onClick={() => decidir(a.id, "ajustar")} style={{ flex: 1, background: "transparent", color: "#F5F3F0", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Pedir ajuste</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
            {Object.entries(feito).filter(([id]) => !aprovacoes.some((a) => a.id === id)).map(([id, m]) => <p key={id} style={{ color: "#CDE6CD", fontSize: 13.5 }}>{m}</p>)}
          </div>
        )}

        <div style={{ marginTop: 30 }}><SectionTitle icon={<IconList />} text={`Entregas${entregas.length ? ` · ${entregas.length}` : ""}`} /></div>
        {entregas.length === 0 ? (
          <p style={{ color: "#A8A29E", fontSize: 14 }}>As entregas concluídas aparecem aqui, com o arquivo e a legenda.</p>
        ) : entregas.map((e) => (
          <article key={e.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "15px 19px", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 6, alignItems: "center" }}>
              {e.formato ? <span style={{ ...tag, background: "#211B0F", color: GOLD, borderColor: "#3A2F12" }}>{fmtLabel(e.formato)}</span> : null}
              <span style={tag}>{e.publicarEm ? `publica ${fmtPub(e.publicarEm)}` : `entregue ${fmtDate(e.concluidaEm)}`}</span>
            </div>
            <h3 style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, marginBottom: 4, lineHeight: 1.25 }}>{e.titulo}</h3>
            {e.legenda ? <p style={{ fontSize: 13.5, color: "#E7E3DD", fontStyle: "italic", borderLeft: `2px solid ${GOLD}`, paddingLeft: 12, marginTop: 6 }}>“{e.legenda}”</p> : null}
            {e.links.length ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>{e.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="ark-link" style={{ fontSize: 13 }}>Abrir {l.nome}</a>)}</div> : null}
          </article>
        ))}

'''
s = s.replace(anchor, bloco + anchor, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', nl))
print('portal ok')
