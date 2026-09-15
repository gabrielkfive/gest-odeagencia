import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Página AUTENTICADA: fila dos AGENTES LOCAIS (modelos Ollama rodando no PC da ARK).
// O PC empurra leads, ideias, tarefas, conteúdo, propostas e melhorias pra
// /api/workflowark/agentes-locais; aqui o gestor filtra por área e aprova, recusa ou copia.
// Aprovar NÃO manda nada pra ninguém: o PC lê a decisão e executa (cria tarefa no kanban,
// monta o carrossel, guarda o lead). Regra "sem flood" preservada.

export const Route = createFileRoute("/agentes")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Agentes locais · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@700;800&display=swap" },
    ],
  }),
  component: Agentes,
});

type Item = {
  id: string; agente: string; tipo: string; titulo: string; corpo: string;
  status: "pendente" | "aprovado" | "recusado" | "executado";
  criado?: string; modelo?: string; resultado?: string; recebidoEm?: string;
  tarefa?: { title: string; resp: string; prio?: string; funcao?: string };
};

const AMARELO = "#FEEF02";
const BG = "#0D0D0D";
const SUP = "#161718";
const LINHA = "rgba(255,255,255,.09)";
const DISPLAY = "'Sora', 'Inter', system-ui, sans-serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

const TIPOS: Record<string, { rotulo: string; cor: string }> = {
  lead: { rotulo: "Prospecção", cor: "#7CE0A6" },
  ideia: { rotulo: "Ideias", cor: "#FFD166" },
  tarefa: { rotulo: "Tarefas", cor: AMARELO },
  conteudo: { rotulo: "Conteúdo ARK", cor: "#8AB4F8" },
  mensagem: { rotulo: "Follow-up", cor: "#F6A6FF" },
  proposta: { rotulo: "Propostas", cor: "#FFB86B" },
  melhoria: { rotulo: "Processos", cor: "#B0B0B0" },
  aviso: { rotulo: "Avisos", cor: "#FF6B6B" },
};
const AGENTES = [
  { k: "", l: "todos os agentes" }, { k: "prospeccao", l: "prospecção" }, { k: "ideias", l: "ideias" },
  { k: "conteudo_ark", l: "conteúdo da ARK" }, { k: "followup", l: "follow-up" },
  { k: "tarefas_equipe", l: "tarefas pra equipe" }, { k: "processos", l: "processos" }, { k: "proposta", l: "proposta" },
];

async function api(method: "GET" | "POST", body?: Record<string, unknown>) {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) { const r = await supabase.auth.refreshSession(); token = r.data.session?.access_token; }
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const res = await fetch("/api/workflowark/agentes-locais", {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Falha ao falar com o servidor.");
  return out;
}


// Campos estruturados de um lead: usa item.lead quando o PC mandou, senão lê do texto.
function campo(corpo: string, rotulo: string): string {
  const m = corpo.match(new RegExp(rotulo + ":[ ]?([^\\n]*?)(?=[ ]{2,}[A-ZÇÃÉ\\-]{2,}[A-ZÇÃÉ \\-]*:|\\n|$)"));
  return m ? m[1].trim() : "";
}
function leadDe(i: Item & { lead?: Record<string, string> }) {
  const l = i.lead ?? {};
  const c = i.corpo || "";
  const empresa = l.empresa || i.titulo.replace(/\s*\((alto|medio|médio|baixo)\)\s*$/i, "").replace(/^Alvo:\s*/i, "");
  return {
    empresa,
    encaixe: (l.encaixe || campo(c, "ENCAIXE") || "").toLowerCase().replace("médio", "medio"),
    decisor: l.decisor || campo(c, "DECISOR"),
    telefone: l.telefone || campo(c, "TELEFONE"),
    whatsapp: l.whatsapp || campo(c, "WHATSAPP"),
    instagram: l.instagram || campo(c, "INSTAGRAM"),
    produto: l.produto || campo(c, "PRODUTO"),
    nota: l.nota || campo(c, "NOTA"),
  };
}
const DIAS_ANTIGO = 7;
function ehAntigo(i: Item) {
  const d = new Date((i.criado || "").replace(" ", "T"));
  return !isNaN(d.getTime()) && (Date.now() - d.getTime()) / 86400000 > DIAS_ANTIGO;
}


function Agentes() {
  const [fila, setFila] = useState<Item[]>([]);
  const [cmd, setCmd] = useState<any>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("");
  const [agente, setAgente] = useState("");
  const [status, setStatus] = useState<string>("pendente");
  const [busy, setBusy] = useState("");
  const [copiado, setCopiado] = useState("");
  const [pedir, setPedir] = useState("");
  const [quem, setQuem] = useState("");
  const [vista, setVista] = useState<"cards" | "tabela">("cards");
  const [mostrarAntigos, setMostrarAntigos] = useState(false);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const out = await api("GET");
      setFila(Array.isArray(out.fila) ? out.fila : []);
      setCmd(out.cmd ?? null);
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    carregar();
    supabase.auth.getUser().then((r) => setQuem(r.data.user?.email ?? ""));
    const t = setInterval(carregar, 60000);
    return () => clearInterval(t);
  }, [carregar]);

  const ultimoContato = useMemo(() => {
    const ts = fila.map((i) => i.recebidoEm ?? "").filter(Boolean).sort().pop();
    return ts ? new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";
  }, [fila]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of fila) if (i.status === "pendente") c[i.tipo] = (c[i.tipo] ?? 0) + 1;
    return c;
  }, [fila]);

  const visiveis = fila.filter((i) =>
    (!tipo || i.tipo === tipo) && (!agente || i.agente === agente) && (status === "todos" || i.status === status));

  async function decidir(id: string, decisao: Item["status"]) {
    setBusy(id);
    try {
      await api("POST", { op: "decide", id, decisao, quem });
      setFila((prev) => prev.map((i) => (i.id === id ? { ...i, status: decisao } : i)));
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  async function copiar(i: Item) {
    try { await navigator.clipboard.writeText(`${i.titulo}\n\n${i.corpo}`); setCopiado(i.id); setTimeout(() => setCopiado(""), 1500); } catch { /* sem clipboard */ }
  }

  async function pedirRodada() {
    setBusy("cmd");
    try { await api("POST", { op: "cmd", agente: pedir || "todos", quem }); await carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  const btn = (fundo: string, cor: string): React.CSSProperties => ({
    background: fundo, color: cor, border: 0, borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontFamily: SANS, fontSize: 13,
  });

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#f2f2f2", fontFamily: SANS, padding: "22px clamp(14px,3vw,32px)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 800, letterSpacing: "-.03em", fontSize: 26 }}>ARK <span style={{ color: AMARELO }}>Agentes locais</span></h1>
          <div style={{ color: "#999", fontSize: 13, marginTop: 4 }}>
            Último contato do PC: {ultimoContato} · {fila.filter((i) => i.status === "pendente").length} pendentes
            {cmd ? ` · rodada pedida (${cmd.agente}) aguardando o PC` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={pedir} onChange={(e) => setPedir(e.target.value)} style={{ background: "#222", color: "#eee", border: 0, borderRadius: 8, padding: 8, fontFamily: SANS }}>
            {AGENTES.map((a) => <option key={a.k} value={a.k}>{a.l}</option>)}
          </select>
          <button onClick={pedirRodada} disabled={busy === "cmd"} style={btn(AMARELO, "#111")}>Pedir rodada no PC</button>
        </div>
      </div>

      {erro && <div style={{ background: "#2a0f0f", color: "#ff8a8a", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{erro}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Chip ativo={!tipo} onClick={() => setTipo("")} cor="#ccc">Todas as áreas</Chip>
        {Object.entries(TIPOS).map(([k, v]) => (
          <Chip key={k} ativo={tipo === k} onClick={() => setTipo(k)} cor={v.cor}>{v.rotulo}{contagem[k] ? ` · ${contagem[k]}` : ""}</Chip>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <select value={agente} onChange={(e) => setAgente(e.target.value)} style={{ background: "#222", color: "#eee", border: 0, borderRadius: 8, padding: 8, fontFamily: SANS }}>
          {AGENTES.map((a) => <option key={a.k} value={a.k}>{a.l}</option>)}
        </select>
        {["pendente", "aprovado", "executado", "recusado", "todos"].map((s) => (
          <Chip key={s} ativo={status === s} onClick={() => setStatus(s)} cor="#ccc">{s}</Chip>
        ))}
        <span style={{ width: 8 }} />
        <Chip ativo={vista === "cards"} onClick={() => setVista("cards")} cor="#7CE0A6">Cartões</Chip>
        <Chip ativo={vista === "tabela"} onClick={() => { setVista("tabela"); setTipo("lead"); }} cor="#7CE0A6">Tabela de leads</Chip>
      </div>

      {vista === "tabela" ? (() => {
        const leads = fila.filter((i) => i.tipo === "lead" && (status === "todos" || i.status === status) && (!agente || i.agente === agente));
        const ordem: Record<string, number> = { alto: 0, medio: 1, baixo: 2, "": 3 };
        const linhas = leads.map((i) => ({ i, l: leadDe(i), antigo: ehAntigo(i) }))
          .sort((a, b) => (ordem[a.l.encaixe] ?? 3) - (ordem[b.l.encaixe] ?? 3) || String(b.i.criado).localeCompare(String(a.i.criado)));
        const recentes = linhas.filter((x) => !x.antigo);
        const antigos = linhas.filter((x) => x.antigo);
        const visiveisT = mostrarAntigos ? linhas : recentes;
        const corEnc = (e: string) => e === "alto" ? AMARELO : e === "medio" ? "#8AB4F8" : "#777";
        const th: React.CSSProperties = { textAlign: "left", padding: "10px 10px", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: "#999", borderBottom: `1px solid ${LINHA}`, whiteSpace: "nowrap" };
        const td: React.CSSProperties = { padding: "10px 10px", fontSize: 13, borderBottom: `1px solid ${LINHA}`, verticalAlign: "top" };
        return (
          <div>
            <div style={{ color: "#999", fontSize: 13, marginBottom: 10 }}>
              {recentes.length} leads dos últimos {DIAS_ANTIGO} dias · {antigos.length} antigos escondidos
              {antigos.length > 0 && <button onClick={() => setMostrarAntigos(!mostrarAntigos)} style={{ marginLeft: 10, background: "#222", color: "#bbb", border: 0, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: SANS, fontSize: 12 }}>{mostrarAntigos ? "esconder antigos" : "mostrar antigos"}</button>}
            </div>
            <div style={{ overflowX: "auto", background: SUP, border: `1px solid ${LINHA}`, borderRadius: 12 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 980 }}>
                <thead><tr>
                  <th style={th}>Encaixe</th><th style={th}>Empresa</th><th style={th}>Decisor</th><th style={th}>Telefone</th><th style={th}>WhatsApp</th><th style={th}>Instagram</th><th style={th}>Produto</th><th style={th}>Nota</th><th style={th}>Quando</th><th style={th}>Status</th><th style={th}></th>
                </tr></thead>
                <tbody>
                  {visiveisT.map(({ i, l, antigo }) => (
                    <tr key={i.id} style={{ background: l.encaixe === "alto" ? "rgba(254,239,2,.07)" : "transparent", opacity: antigo ? .6 : 1 }}>
                      <td style={{ ...td, color: corEnc(l.encaixe), fontWeight: 700, textTransform: "uppercase", fontSize: 11 }}>{l.encaixe || "sem"}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{l.empresa}</td>
                      <td style={td}>{l.decisor && !/não identificado/i.test(l.decisor) ? l.decisor : <span style={{ color: "#666" }}>pedir o dono</span>}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{l.telefone}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{l.whatsapp ? <a style={{ color: AMARELO }} href={`https://wa.me/${l.whatsapp}`} target="_blank" rel="noopener">{l.whatsapp}</a> : ""}</td>
                      <td style={td}>{l.instagram ? <a style={{ color: "#8AB4F8" }} href={`https://instagram.com/${l.instagram.replace("@", "")}`} target="_blank" rel="noopener">{l.instagram}</a> : ""}</td>
                      <td style={td}>{l.produto}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{l.nota}</td>
                      <td style={{ ...td, whiteSpace: "nowrap", color: "#999" }}>{(i.criado || "").slice(0, 10)}</td>
                      <td style={{ ...td, color: i.status === "pendente" ? "#ccc" : AMARELO, whiteSpace: "nowrap" }}>{i.status}</td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>
                        {i.status === "pendente" ? (<>
                          <button disabled={busy === i.id} onClick={() => decidir(i.id, "aprovado")} style={btn(AMARELO, "#111")}>CRM</button>{" "}
                          <button disabled={busy === i.id} onClick={() => decidir(i.id, "recusado")} style={btn("#333", "#eee")}>Não</button>
                        </>) : <button onClick={() => copiar(i)} style={btn("#222", "#bbb")}>Copiar</button>}
                      </td>
                    </tr>
                  ))}
                  {visiveisT.length === 0 && <tr><td style={td} colSpan={11}>Nenhum lead com esse filtro.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        );
      })() : loading ? <p style={{ color: "#888" }}>Carregando…</p> : visiveis.length === 0 ? (
        <p style={{ color: "#888" }}>Nada aqui. O PC manda itens novos a cada rodada (todo dia 7h, ou quando você pede uma rodada).</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {visiveis.map((i) => {
            const t = TIPOS[i.tipo] ?? { rotulo: i.tipo, cor: "#ccc" };
            return (
              <article key={i.id} style={{ background: SUP, border: `1px solid ${LINHA}`, borderLeft: `4px solid ${t.cor}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <header style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#aaa", alignItems: "center" }}>
                  <span style={{ color: t.cor, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>{t.rotulo}</span>
                  <span>{i.agente} · {i.criado ?? ""} · {i.modelo ?? ""}</span>
                  {i.status !== "pendente" && <span style={{ marginLeft: "auto", color: AMARELO }}>{i.status}{i.resultado ? ` · ${i.resultado}` : ""}</span>}
                </header>
                <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 700, letterSpacing: "-.02em", fontSize: 16 }}>{i.titulo}</h3>
                <pre style={{ whiteSpace: "pre-wrap", fontFamily: SANS, fontSize: 13, lineHeight: 1.5, background: "#111", padding: 12, borderRadius: 8, margin: 0, maxHeight: 320, overflow: "auto" }}>{i.corpo}</pre>
                {i.tipo === "lead" ? <div style={{ fontSize: 12, color: "#bbb" }}>Se aprovar, o PC coloca no CRM (Prospecção, Saulo) com telefone e a mensagem.</div> : i.tarefa && <div style={{ fontSize: 12, color: "#bbb" }}>Se aprovar, o PC cria a tarefa: <b>{i.tarefa.title}</b> · {i.tarefa.resp} · {i.tarefa.prio ?? "media"}</div>}
                {i.status === "pendente" && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button disabled={busy === i.id} onClick={() => decidir(i.id, "aprovado")} style={btn(AMARELO, "#111")}>Aprovar</button>
                    <button disabled={busy === i.id} onClick={() => decidir(i.id, "recusado")} style={btn("#333", "#eee")}>Recusar</button>
                    <button onClick={() => copiar(i)} style={btn("#222", "#bbb")}>{copiado === i.id ? "Copiado" : "Copiar texto"}</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chip({ ativo, onClick, cor, children }: { ativo: boolean; onClick: () => void; cor: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background: ativo ? cor : "transparent", color: ativo ? "#111" : cor, border: `1px solid ${cor}`,
      borderRadius: 100, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SANS,
    }}>{children}</button>
  );
}
