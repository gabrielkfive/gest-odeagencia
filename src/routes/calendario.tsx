import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// CALENDÁRIO EDITORIAL (pendência da maratona de junho).
// Grade mensal por cliente: o que vai ao ar em cada dia. Entradas manuais +
// importação das propostas APROVADAS da fila do Agente Social Media (/postagens).
// Dados na chave wfa-editorial (via /api/workflowark/state, save-state).
// Design: dark + gold da marca ARK (mesmo padrão do /postagens).

export const Route = createFileRoute("/calendario")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Calendário Editorial · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Calendario,
});

type Entrada = {
  id: string; clienteId: string; cliente: string; data: string; // YYYY-MM-DD
  titulo: string; formato: string;
  status: "planejado" | "agendado" | "postado";
  origem: "manual" | "fila"; propostaId?: string;
};
type Proposta = {
  id: string; clienteId: string; cliente: string; status: string;
  formato: string; tema: string; melhorDia?: string;
};

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const STATUS_COR: Record<Entrada["status"], string> = { planejado: "#A89F92", agendado: GOLD, postado: "#4ade80" };
const PROX_STATUS: Record<Entrada["status"], Entrada["status"]> = { planejado: "agendado", agendado: "postado", postado: "planejado" };

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

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function hojeYmd(): string { return ymd(new Date()); }

function Calendario() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [fila, setFila] = useState<Proposta[]>([]);
  const [mesBase, setMesBase] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [clienteFiltro, setClienteFiltro] = useState<string>("todos");
  const [diaSel, setDiaSel] = useState<string>(hojeYmd());
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoCliente, setNovoCliente] = useState("");
  const [novoFormato, setNovoFormato] = useState("Reels");
  const [salvando, setSalvando] = useState(false);
  const [mostraFila, setMostraFila] = useState(false);

  const carregar = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const out = await authedFetch("load");
      const e = out?.state?.["wfa-editorial"];
      setEntradas(Array.isArray(e) ? e : []);
      const f = out?.state?.["wfa-social-fila"];
      setFila(Array.isArray(f) ? f : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function persistir(prox: Entrada[]) {
    const anterior = entradas;
    setEntradas(prox); setSalvando(true);
    try { await authedFetch("save-state", { action: "save-state", key: "wfa-editorial", data: prox }); }
    catch (e) { setEntradas(anterior); setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSalvando(false); }
  }

  const clientes = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entradas) if (e.clienteId) m.set(e.clienteId, e.cliente || e.clienteId);
    for (const p of fila) if (p.clienteId) m.set(p.clienteId, p.cliente || p.clienteId);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [entradas, fila]);

  function addManual() {
    const titulo = novoTitulo.trim();
    if (!titulo || !diaSel) return;
    const cid = novoCliente || clientes[0]?.[0] || "geral";
    const nome = clientes.find(([k]) => k === cid)?.[1] || cid;
    persistir([...entradas, {
      id: "ed_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      clienteId: cid, cliente: nome, data: diaSel, titulo, formato: novoFormato,
      status: "planejado", origem: "manual",
    }]);
    setNovoTitulo("");
  }

  function importarDaFila(p: Proposta) {
    persistir([...entradas, {
      id: "ed_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      clienteId: p.clienteId, cliente: p.cliente, data: diaSel,
      titulo: p.tema, formato: p.formato || "Reels",
      status: "agendado", origem: "fila", propostaId: p.id,
    }]);
  }

  function ciclarStatus(id: string) {
    persistir(entradas.map((e) => (e.id === id ? { ...e, status: PROX_STATUS[e.status] } : e)));
  }
  function remover(id: string) {
    persistir(entradas.filter((e) => e.id !== id));
  }

  // dias do mês em grade (domingo inicia a semana)
  const dias = useMemo(() => {
    const first = new Date(mesBase);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); out.push(d); }
    return out;
  }, [mesBase]);

  const porDia = useMemo(() => {
    const m = new Map<string, Entrada[]>();
    for (const e of entradas) {
      if (clienteFiltro !== "todos" && e.clienteId !== clienteFiltro) continue;
      const arr = m.get(e.data) || []; arr.push(e); m.set(e.data, arr);
    }
    return m;
  }, [entradas, clienteFiltro]);

  const jaImportadas = useMemo(() => new Set(entradas.map((e) => e.propostaId).filter(Boolean)), [entradas]);
  const aprovadasSemDia = fila.filter((p) => (p.status === "aprovada" || p.status === "agendada") && !jaImportadas.has(p.id));

  const mesNome = mesBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const hoje = hojeYmd();

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#F5F0E8", fontFamily: SANS, padding: "24px 16px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: SERIF, fontSize: 30, margin: 0, color: GOLD }}>Calendário Editorial</h1>
            <p style={{ margin: "4px 0 0", color: "#A89F92", fontSize: 14 }}>
              O que vai ao ar, por cliente e por dia. {salvando ? "Salvando…" : " "}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth() - 1, 1))} style={btn(SURFACE, "#CFC7B8", BORDER)}>‹</button>
            <b style={{ minWidth: 170, textAlign: "center", textTransform: "capitalize" }}>{mesNome}</b>
            <button onClick={() => setMesBase(new Date(mesBase.getFullYear(), mesBase.getMonth() + 1, 1))} style={btn(SURFACE, "#CFC7B8", BORDER)}>›</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
          <button onClick={() => setClienteFiltro("todos")}
            style={{ ...pill(clienteFiltro === "todos") }}>Todos</button>
          {clientes.map(([cid, nome]) => (
            <button key={cid} onClick={() => setClienteFiltro(cid)} style={{ ...pill(clienteFiltro === cid) }}>{nome}</button>
          ))}
        </div>

        {err && <div style={{ background: "#3a1414", border: "1px solid #5a2020", color: "#ffd5d5", padding: 12, borderRadius: 10, marginBottom: 16 }}>{err}</div>}
        {loading && <p style={{ color: "#A89F92" }}>Carregando o calendário…</p>}

        {!loading && (
          <>
            {/* composer: adicionar no dia selecionado */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ color: "#A89F92", fontSize: 13 }}>Adicionar em <b style={{ color: GOLD }}>{diaSel.split("-").reverse().join("/")}</b>:</span>
              <input value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()}
                placeholder="Título da postagem (ex.: bastidores da cozinha)"
                style={{ flex: "1 1 220px", background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", color: "#F5F0E8", fontSize: 13.5 }} />
              <select value={novoCliente} onChange={(e) => setNovoCliente(e.target.value)}
                style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", color: "#F5F0E8", fontSize: 13.5 }}>
                {!clientes.length && <option value="">geral</option>}
                {clientes.map(([cid, nome]) => <option key={cid} value={cid}>{nome}</option>)}
              </select>
              <select value={novoFormato} onChange={(e) => setNovoFormato(e.target.value)}
                style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", color: "#F5F0E8", fontSize: 13.5 }}>
                {["Reels", "Carrossel", "Story", "Foto", "Live", "Outro"].map((f) => <option key={f}>{f}</option>)}
              </select>
              <button onClick={addManual} style={btn(GOLD, "#111")}>+ Adicionar</button>
              <button onClick={() => setMostraFila(!mostraFila)} style={btn(SURFACE, GOLD, BORDER)}>
                📥 Aprovadas sem dia ({aprovadasSemDia.length})
              </button>
            </div>

            {mostraFila && (
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
                {!aprovadasSemDia.length && <p style={{ margin: 0, color: "#A89F92", fontSize: 13.5 }}>Nenhuma proposta aprovada esperando dia. Aprove em <a href="/postagens" style={{ color: GOLD }}>/postagens</a>.</p>}
                {aprovadasSemDia.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${BORDER}`, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5 }}><b style={{ color: GOLD }}>{p.cliente}</b> · {p.tema} <span style={{ color: "#A89F92" }}>({p.formato}{p.melhorDia ? " · sugerido: " + p.melhorDia : ""})</span></span>
                    <button onClick={() => importarDaFila(p)} style={btn(GOLD, "#111")}>Colocar em {diaSel.split("-").reverse().slice(0, 2).join("/")}</button>
                  </div>
                ))}
              </div>
            )}

            {/* grade do mês */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map((d) => (
                <div key={d} style={{ color: "#A89F92", fontSize: 11, fontWeight: 700, textTransform: "uppercase", textAlign: "center", padding: "4px 0" }}>{d}</div>
              ))}
              {dias.map((d) => {
                const k = ymd(d);
                const doMes = d.getMonth() === mesBase.getMonth();
                const items = porDia.get(k) || [];
                const sel = k === diaSel;
                return (
                  <div key={k} onClick={() => setDiaSel(k)}
                    style={{ background: sel ? "#241f18" : SURFACE, border: `1px solid ${sel ? GOLD : k === hoje ? "#5a4a20" : BORDER}`,
                      borderRadius: 10, minHeight: 86, padding: 6, cursor: "pointer", opacity: doMes ? 1 : 0.38 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: k === hoje ? GOLD : "#A89F92", marginBottom: 4 }}>{d.getDate()}</div>
                    {items.map((e) => (
                      <div key={e.id} title={`${e.cliente} · ${e.titulo} (${e.status}) — clique: muda status · shift+clique: remove`}
                        onClick={(ev) => { ev.stopPropagation(); if (ev.shiftKey) remover(e.id); else ciclarStatus(e.id); }}
                        style={{ background: BG, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${STATUS_COR[e.status]}`,
                          borderRadius: 6, padding: "3px 6px", marginBottom: 3, fontSize: 11, lineHeight: 1.35, overflow: "hidden" }}>
                        <b style={{ color: GOLD }}>{e.cliente}</b> <span style={{ color: "#E8E0D4" }}>{e.titulo}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            <p style={{ textAlign: "center", color: "#6b6357", fontSize: 12, marginTop: 20 }}>
              Clique no dia pra selecionar · clique numa postagem pra mudar o status (planejado → agendado → postado) · shift+clique remove.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function pill(ativo: boolean): React.CSSProperties {
  return { background: ativo ? GOLD : SURFACE, color: ativo ? "#111" : "#CFC7B8", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
}
function btn(bg: string, color: string, border?: string): React.CSSProperties {
  return { background: bg, color, border: border ? `1px solid ${border}` : 0, borderRadius: 10, padding: "10px 15px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
}
