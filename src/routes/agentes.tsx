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
      </div>

      {loading ? <p style={{ color: "#888" }}>Carregando…</p> : visiveis.length === 0 ? (
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
                {i.tarefa && <div style={{ fontSize: 12, color: "#bbb" }}>Se aprovar, o PC cria a tarefa: <b>{i.tarefa.title}</b> · {i.tarefa.resp} · {i.tarefa.prio ?? "media"}</div>}
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
