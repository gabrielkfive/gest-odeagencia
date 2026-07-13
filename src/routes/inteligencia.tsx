import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// INTELIGÊNCIA DE DADOS (pedido do Gabriel, 13/07/2026).
// Mesma camada de leitura que o Vivenda Hub ganhou, agora para a ARK:
// 1) Visão por demandado: demandas, execução, atrasos, entrega no prazo e tempo real
//    de execução (cronômetro timeSpent), lendo wfa-tarefas.
// 2) Visão financeira: importação de extratos bancários (CSV e OFX) na chave
//    wfa-extratos, contabilizados por mês, preparada para a futura integração Nibo.
// Design: dark + gold da marca ARK (mesmo padrão do /calendario e /postagens).

const BUILD = "inteligencia-v1 2026-07-13";

export const Route = createFileRoute("/inteligencia")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Inteligência · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Inteligencia,
});

type Tarefa = {
  id: string; title?: string; status?: string; data?: string; resp?: string;
  funcao?: string; clienteId?: string; prio?: string;
  criadaEm?: string; concluidaEm?: string; timeSpent?: number; timerSince?: string | null;
};
type Lancamento = {
  id: string; data: string; desc: string; valor: number;
  origem: "csv" | "ofx"; importadoEm: string;
};

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const MUTE = "#A89F92";
const RED = "#f87171";
const GREEN = "#4ade80";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const FIN_ROLES = new Set(["admin", "gestor", "financeiro"]);

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

function hojeYmd(): string {
  // "hoje" no fuso de Brasília, nunca em UTC (mesma regra do resto do sistema).
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p; // en-CA formata como YYYY-MM-DD
}
function mesDe(ymd: string): string { return ymd.slice(0, 7); }
function fmtHoras(seg: number): string {
  if (!seg || seg < 60) return "0h";
  const h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60);
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}` : `${m}min`;
}
function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDataBR(ymd?: string): string {
  if (!ymd || ymd.length < 10) return "sem prazo";
  return `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}`;
}

// ===== Parsers de extrato =====
// CSV genérico de banco: acha em cada linha uma data (dd/mm/aaaa ou aaaa-mm-dd) e um
// valor em formato brasileiro (1.234,56 com sinal). O resto vira descrição.
function parseValorBR(s: string): number | null {
  const t = s.replace(/["\sR$]/g, "");
  if (!/^-?\d{1,3}(\.\d{3})*(,\d{2})$|^-?\d+(,\d{2})$|^-?\d+(\.\d{2})?$/.test(t)) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}
function parseDataToken(s: string): string | null {
  const t = s.replace(/"/g, "").trim();
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}
function parseCSV(texto: string): Lancamento[] {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim());
  const out: Lancamento[] = [];
  const agora = new Date().toISOString();
  for (const linha of linhas) {
    const sep = linha.includes(";") ? ";" : ",";
    const cols = linha.split(sep).map((c) => c.trim());
    if (cols.length < 2) continue;
    let data: string | null = null; let valor: number | null = null; const descPartes: string[] = [];
    for (const c of cols) {
      const d = parseDataToken(c);
      if (d && !data) { data = d; continue; }
      const v = parseValorBR(c);
      if (v !== null && valor === null && /\d/.test(c) && (c.includes(",") || c.includes("-") || Math.abs(v) >= 1)) { valor = v; continue; }
      if (c && c.replace(/"/g, "").trim()) descPartes.push(c.replace(/"/g, "").trim());
    }
    if (!data || valor === null || valor === 0) continue;
    const desc = descPartes.join(" ").slice(0, 120) || "(sem descrição)";
    out.push({ id: `${data}|${valor.toFixed(2)}|${desc.slice(0, 40)}`, data, desc, valor, origem: "csv", importadoEm: agora });
  }
  return out;
}
function parseOFX(texto: string): Lancamento[] {
  const out: Lancamento[] = [];
  const agora = new Date().toISOString();
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  for (const b of blocos) {
    const dt = b.match(/<DTPOSTED>\s*(\d{8})/i)?.[1];
    const amt = b.match(/<TRNAMT>\s*(-?[\d.,]+)/i)?.[1];
    const memo = (b.match(/<MEMO>\s*([^<\r\n]+)/i)?.[1] || b.match(/<NAME>\s*([^<\r\n]+)/i)?.[1] || "(sem descrição)").trim();
    if (!dt || !amt) continue;
    const data = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    const valor = parseFloat(amt.replace(",", "."));
    if (isNaN(valor) || valor === 0) continue;
    out.push({ id: `${data}|${valor.toFixed(2)}|${memo.slice(0, 40)}`, data, desc: memo.slice(0, 120), valor, origem: "ofx", importadoEm: agora });
  }
  return out;
}

// ===== Métricas por demandado =====
type Pessoa = {
  nome: string; abertas: Tarefa[]; atrasadas: Tarefa[]; concluidasMes: Tarefa[];
  noPrazo: number; comPrazoAvaliado: number; tempoMes: number; proxima?: Tarefa;
};
function calcularPessoas(tarefas: Tarefa[], hoje: string): Pessoa[] {
  const mes = mesDe(hoje);
  const porNome = new Map<string, Pessoa>();
  const get = (nome: string) => {
    let p = porNome.get(nome);
    if (!p) { p = { nome, abertas: [], atrasadas: [], concluidasMes: [], noPrazo: 0, comPrazoAvaliado: 0, tempoMes: 0 }; porNome.set(nome, p); }
    return p;
  };
  for (const t of tarefas) {
    if (!t || !t.id) continue;
    const p = get((t.resp || "").trim() || "Sem responsável");
    if (t.status === "concluido") {
      const fim = (t.concluidaEm || t.criadaEm || "").slice(0, 10);
      if (fim && mesDe(fim) === mes) {
        p.concluidasMes.push(t);
        p.tempoMes += t.timeSpent || 0;
        if (t.data) { p.comPrazoAvaliado++; if (fim <= t.data) p.noPrazo++; }
      }
    } else {
      p.abertas.push(t);
      if (t.data && t.data < hoje) p.atrasadas.push(t);
    }
  }
  for (const p of porNome.values()) {
    const futuras = p.abertas.filter((t) => t.data && t.data >= hoje).sort((a, b) => (a.data! < b.data! ? -1 : 1));
    p.proxima = futuras[0];
    p.abertas.sort((a, b) => (a.data || "9999") < (b.data || "9999") ? -1 : 1);
  }
  return [...porNome.values()].sort((a, b) =>
    b.atrasadas.length - a.atrasadas.length || b.abertas.length - a.abertas.length || a.nome.localeCompare(b.nome));
}

function Inteligencia() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [extratos, setExtratos] = useState<Lancamento[]>([]);
  const [role, setRole] = useState("");
  const [aberto, setAberto] = useState<string>("");
  const [preview, setPreview] = useState<Lancamento[]>([]);
  const [previewNome, setPreviewNome] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mesFin, setMesFin] = useState(() => mesDe(hojeYmd()));
  const hoje = hojeYmd();

  const carregar = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const out = await authedFetch("load");
      const t = out?.state?.["wfa-tarefas"];
      setTarefas(Array.isArray(t) ? t : []);
      const e = out?.state?.["wfa-extratos"];
      setExtratos(Array.isArray(e) ? e : []);
      setRole(String(out?.member?.role || ""));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const pessoas = useMemo(() => calcularPessoas(tarefas, hoje), [tarefas, hoje]);
  const geral = useMemo(() => {
    const abertas = pessoas.reduce((s, p) => s + p.abertas.length, 0);
    const atrasadas = pessoas.reduce((s, p) => s + p.atrasadas.length, 0);
    const concluidas = pessoas.reduce((s, p) => s + p.concluidasMes.length, 0);
    const noPrazo = pessoas.reduce((s, p) => s + p.noPrazo, 0);
    const avaliadas = pessoas.reduce((s, p) => s + p.comPrazoAvaliado, 0);
    const tempo = pessoas.reduce((s, p) => s + p.tempoMes, 0);
    return { abertas, atrasadas, concluidas, taxa: avaliadas ? Math.round((noPrazo / avaliadas) * 100) : null, tempo };
  }, [pessoas]);

  const mesesDisponiveis = useMemo(() => {
    const s = new Set(extratos.map((l) => mesDe(l.data)));
    s.add(mesDe(hoje));
    return [...s].sort().reverse();
  }, [extratos, hoje]);
  const fin = useMemo(() => {
    const doMes = extratos.filter((l) => mesDe(l.data) === mesFin).sort((a, b) => (a.data < b.data ? 1 : -1));
    const entradas = doMes.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0);
    const saidas = doMes.filter((l) => l.valor < 0).reduce((s, l) => s + l.valor, 0);
    return { doMes, entradas, saidas, saldo: entradas + saidas };
  }, [extratos, mesFin]);

  async function receberArquivo(f: File) {
    setErr("");
    const texto = await f.text();
    const nome = f.name.toLowerCase();
    const parsed = nome.endsWith(".ofx") || texto.includes("<OFX") ? parseOFX(texto) : parseCSV(texto);
    if (!parsed.length) { setErr("Não achei lançamentos nesse arquivo. Formatos aceitos: CSV do banco (data, descrição, valor) ou OFX."); return; }
    const existentes = new Set(extratos.map((l) => l.id));
    const novos = parsed.filter((l) => !existentes.has(l.id));
    setPreview(novos); setPreviewNome(`${f.name}: ${parsed.length} lançamentos lidos, ${novos.length} novos (${parsed.length - novos.length} já estavam no histórico)`);
  }
  async function confirmarImport() {
    if (!preview.length) return;
    const prox = [...extratos, ...preview];
    const anterior = extratos;
    setExtratos(prox); setSalvando(true); setPreview([]); setPreviewNome("");
    try {
      await authedFetch("save-state", { action: "save-state", key: "wfa-extratos", data: prox });
      setMesFin(mesDe(preview[0].data));
    } catch (e) { setExtratos(anterior); setErr(e instanceof Error ? e.message : String(e)); }
    finally { setSalvando(false); }
  }

  const card: React.CSSProperties = { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" };
  const kpiNum: React.CSSProperties = { fontFamily: SERIF, fontSize: 30, fontWeight: 700, lineHeight: 1.1 };
  const lbl: React.CSSProperties = { fontSize: 12, color: MUTE, textTransform: "uppercase" as const, letterSpacing: 0.8 };
  const verFin = FIN_ROLES.has(role);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#EDE7DD", fontFamily: SANS, padding: "28px 4vw 60px" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 34, color: GOLD, margin: 0 }}>Inteligência</h1>
        <span style={{ color: MUTE, fontSize: 14 }}>ARK Content · leitura viva das demandas e do dinheiro</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <a href="/app" style={{ color: MUTE, fontSize: 13, textDecoration: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 12px" }}>← Sistema</a>
          <button onClick={carregar} style={{ background: "transparent", color: GOLD, border: `1px solid ${GOLD}55`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: SANS, fontSize: 13 }}>Atualizar</button>
        </span>
      </header>
      <div style={{ color: "#5d564c", fontSize: 11, marginBottom: 22 }}>build {BUILD}</div>

      {err && <div style={{ ...card, borderColor: RED, color: RED, marginBottom: 18 }}>{err}</div>}
      {loading ? <div style={{ color: MUTE, padding: 40 }}>Carregando os dados…</div> : (
        <>
          {/* ===== KPIs gerais ===== */}
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
            <div style={card}><div style={lbl}>Demandas abertas</div><div style={kpiNum}>{geral.abertas}</div></div>
            <div style={{ ...card, borderColor: geral.atrasadas ? `${RED}66` : BORDER }}><div style={lbl}>Atrasadas</div><div style={{ ...kpiNum, color: geral.atrasadas ? RED : GREEN }}>{geral.atrasadas}</div></div>
            <div style={card}><div style={lbl}>Concluídas no mês</div><div style={{ ...kpiNum, color: GREEN }}>{geral.concluidas}</div></div>
            <div style={card}><div style={lbl}>Entrega no prazo</div><div style={{ ...kpiNum, color: geral.taxa === null ? MUTE : geral.taxa >= 70 ? GREEN : geral.taxa >= 40 ? GOLD : RED }}>{geral.taxa === null ? "s/ dado" : `${geral.taxa}%`}</div></div>
            <div style={card}><div style={lbl}>Tempo executado (mês)</div><div style={kpiNum}>{fmtHoras(geral.tempo)}</div></div>
          </section>

          {/* ===== Por demandado ===== */}
          <h2 style={{ fontFamily: SERIF, fontSize: 22, color: GOLD, margin: "0 0 14px" }}>Por demandado</h2>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12, marginBottom: 34 }}>
            {pessoas.map((p) => {
              const taxa = p.comPrazoAvaliado ? Math.round((p.noPrazo / p.comPrazoAvaliado) * 100) : null;
              const abertoAqui = aberto === p.nome;
              return (
                <div key={p.nome} style={{ ...card, borderColor: p.atrasadas.length ? `${RED}55` : BORDER, cursor: "pointer" }} onClick={() => setAberto(abertoAqui ? "" : p.nome)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <strong style={{ fontFamily: SERIF, fontSize: 17 }}>{p.nome}</strong>
                    <span style={{ fontSize: 12, color: MUTE }}>{abertoAqui ? "fechar ▲" : "detalhar ▼"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
                    <span title="Demandas abertas"><b style={{ fontSize: 20 }}>{p.abertas.length}</b> <span style={{ color: MUTE, fontSize: 12 }}>abertas</span></span>
                    <span title="Abertas com prazo vencido"><b style={{ fontSize: 20, color: p.atrasadas.length ? RED : GREEN }}>{p.atrasadas.length}</b> <span style={{ color: MUTE, fontSize: 12 }}>atrasadas</span></span>
                    <span title="Concluídas neste mês"><b style={{ fontSize: 20, color: GREEN }}>{p.concluidasMes.length}</b> <span style={{ color: MUTE, fontSize: 12 }}>no mês</span></span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: MUTE }}>
                    <span>no prazo: <b style={{ color: taxa === null ? MUTE : taxa >= 70 ? GREEN : taxa >= 40 ? GOLD : RED }}>{taxa === null ? "s/ dado" : `${taxa}%`}</b></span>
                    <span>tempo no mês: <b style={{ color: "#EDE7DD" }}>{fmtHoras(p.tempoMes)}</b></span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: MUTE }}>
                    próxima entrega: <b style={{ color: GOLD }}>{p.proxima ? `${fmtDataBR(p.proxima.data)} · ${(p.proxima.title || "").slice(0, 34)}` : "nada agendado"}</b>
                  </div>
                  {abertoAqui && (
                    <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }} onClick={(e) => e.stopPropagation()}>
                      {p.abertas.length === 0 && <div style={{ color: MUTE, fontSize: 13 }}>Nenhuma demanda aberta.</div>}
                      {p.abertas.slice(0, 12).map((t) => {
                        const atrasada = t.data && t.data < hoje;
                        const hojeMesmo = t.data === hoje;
                        return (
                          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "5px 0", fontSize: 13, borderBottom: `1px dashed ${BORDER}` }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title || "Sem título"}</span>
                            <b style={{ color: atrasada ? RED : hojeMesmo ? GOLD : MUTE, whiteSpace: "nowrap" }}>{fmtDataBR(t.data)}{atrasada ? " · atrasada" : hojeMesmo ? " · hoje" : ""}</b>
                          </div>
                        );
                      })}
                      {p.abertas.length > 12 && <div style={{ color: MUTE, fontSize: 12, paddingTop: 6 }}>e mais {p.abertas.length - 12} demandas abertas.</div>}
                    </div>
                  )}
                </div>
              );
            })}
            {pessoas.length === 0 && <div style={{ ...card, color: MUTE }}>Nenhuma tarefa encontrada no sistema.</div>}
          </section>

          {/* ===== Financeiro ===== */}
          {verFin && (
            <>
              <h2 style={{ fontFamily: SERIF, fontSize: 22, color: GOLD, margin: "0 0 6px" }}>Financeiro · extratos</h2>
              <p style={{ color: MUTE, fontSize: 13, margin: "0 0 14px", maxWidth: 720 }}>
                Solte aqui o extrato do banco (CSV ou OFX). Eu leio, elimino duplicados e contabilizo entradas e saídas por mês.
                Quando a conta do Nibo estiver ativa, esta mesma tela passa a puxar os lançamentos direto de lá.
              </p>
              <section style={{ ...card, marginBottom: 14 }}>
                <input type="file" accept=".csv,.ofx,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) receberArquivo(f); e.target.value = ""; }}
                  style={{ color: MUTE, fontSize: 13 }} />
                {previewNome && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: GOLD }}>{previewNome}</div>
                    {preview.length > 0 && (
                      <>
                        <div style={{ maxHeight: 180, overflowY: "auto", margin: "10px 0", fontSize: 12.5 }}>
                          {preview.slice(0, 30).map((l) => (
                            <div key={l.id} style={{ display: "flex", gap: 10, padding: "3px 0", borderBottom: `1px dashed ${BORDER}` }}>
                              <span style={{ color: MUTE, whiteSpace: "nowrap" }}>{fmtDataBR(l.data)}</span>
                              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.desc}</span>
                              <b style={{ color: l.valor > 0 ? GREEN : RED, whiteSpace: "nowrap" }}>{fmtBRL(l.valor)}</b>
                            </div>
                          ))}
                          {preview.length > 30 && <div style={{ color: MUTE, paddingTop: 6 }}>e mais {preview.length - 30} lançamentos.</div>}
                        </div>
                        <button onClick={confirmarImport} disabled={salvando}
                          style={{ background: GOLD, color: "#1a1300", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, cursor: "pointer", fontFamily: SANS }}>
                          {salvando ? "Salvando…" : `Adicionar ${preview.length} ao histórico`}
                        </button>
                        <button onClick={() => { setPreview([]); setPreviewNome(""); }}
                          style={{ background: "transparent", color: MUTE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 14px", marginLeft: 10, cursor: "pointer", fontFamily: SANS }}>Descartar</button>
                      </>
                    )}
                  </div>
                )}
              </section>

              <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
                <div style={card}>
                  <div style={lbl}>Mês</div>
                  <select value={mesFin} onChange={(e) => setMesFin(e.target.value)}
                    style={{ background: BG, color: "#EDE7DD", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", marginTop: 6, fontFamily: SANS }}>
                    {mesesDisponiveis.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={card}><div style={lbl}>Entradas</div><div style={{ ...kpiNum, color: GREEN, fontSize: 24 }}>{fmtBRL(fin.entradas)}</div></div>
                <div style={card}><div style={lbl}>Saídas</div><div style={{ ...kpiNum, color: RED, fontSize: 24 }}>{fmtBRL(fin.saidas)}</div></div>
                <div style={card}><div style={lbl}>Resultado do mês</div><div style={{ ...kpiNum, color: fin.saldo >= 0 ? GREEN : RED, fontSize: 24 }}>{fmtBRL(fin.saldo)}</div></div>
              </section>

              <section style={{ ...card, marginBottom: 20 }}>
                {fin.doMes.length === 0 ? <div style={{ color: MUTE, fontSize: 13 }}>Nenhum lançamento neste mês. Importe um extrato acima.</div> : (
                  <div style={{ maxHeight: 380, overflowY: "auto", fontSize: 13 }}>
                    {fin.doMes.map((l) => (
                      <div key={l.id} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: `1px dashed ${BORDER}` }}>
                        <span style={{ color: MUTE, whiteSpace: "nowrap" }}>{fmtDataBR(l.data)}</span>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.desc}</span>
                        <span style={{ color: "#5d564c", fontSize: 11, alignSelf: "center" }}>{l.origem}</span>
                        <b style={{ color: l.valor > 0 ? GREEN : RED, whiteSpace: "nowrap" }}>{fmtBRL(l.valor)}</b>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section style={{ ...card, borderColor: `${GOLD}44` }}>
                <div style={{ fontFamily: SERIF, fontSize: 16, color: GOLD, marginBottom: 6 }}>Integração Nibo</div>
                <div style={{ color: MUTE, fontSize: 13, maxWidth: 720 }}>
                  Preparada e aguardando a conta. O Nibo tem API aberta de leitura de lançamentos e contas a pagar/receber.
                  Assim que a conta da ARK estiver cadastrada, me passe a chave de API do Nibo que eu ligo a importação automática aqui,
                  no lugar do upload manual. O histórico importado continua valendo.
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
