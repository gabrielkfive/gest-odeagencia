// Cartao de entrega de social do /next (copiado do cartao de post do Modo Criador):
// painel lateral que edita UMA tarefa real de wfa-tarefas e grava item unico com `up`.
// Campos novos (publicarEm, legenda, formato, briefing) sao aditivos: o legado ignora e
// preserva na mescla por item. Checklist e anexos usam o formato que o Kanban ja le
// (checklist {id,text,done}; attachments {id,name,url,tipo,at}).
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Link2, Plus, Save, Trash2, X } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Pill } from "@/components/next/ui";
import {
  STATUS_COR,
  STATUS_LABEL,
  dataBR,
  hojeSP,
  salvarTarefa,
  type Tarefa,
} from "@/components/next/dados";

export type Formato = "estatico" | "carrossel" | "reel" | "story";
export const FORMATOS: { id: Formato; label: string }[] = [
  { id: "estatico", label: "Estático" },
  { id: "carrossel", label: "Carrossel" },
  { id: "reel", label: "Reel" },
  { id: "story", label: "Story" },
];
export const formatoLabel = (f?: string) => FORMATOS.find((x) => x.id === f)?.label || "";

export type ChecklistItem = {
  id?: string;
  text?: string;
  t?: string;
  txt?: string;
  done?: boolean;
};
export type Anexo = {
  id?: string;
  name?: string;
  nome?: string;
  url?: string;
  tipo?: string;
  at?: string;
};
export type TarefaSocial = Omit<Tarefa, "checklist"> & {
  publicarEm?: string;
  legenda?: string;
  formato?: Formato | string;
  briefing?: string;
  attachments?: Anexo[];
  checklist?: ChecklistItem[];
};

const STATUS_IDS = ["backlog", "iniciar", "andamento", "aprovacao", "homologcli", "concluido"];

// Entrega de social = tarefa que ja tem data de publicacao ou formato.
export const ehSocial = (t: TarefaSocial) => !!(t.publicarEm || t.formato);
export const textoItem = (i: ChecklistItem) => String(i?.text ?? i?.t ?? i?.txt ?? "");
export const nomeAnexo = (a: Anexo) => String(a?.name || a?.nome || a?.url || "arquivo");

// "AAAA-MM-DDTHH:MM" (fuso local) para "dd/mm HH:MM".
export function publicarBR(s?: string): string {
  if (!s) return "";
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return String(s);
  return `${m[3]}/${m[2]}${m[4] ? ` ${m[4]}:${m[5]}` : ""}`;
}

export function novaEntrega(clienteId = ""): TarefaSocial {
  return {
    id: "t" + Date.now().toString(36),
    title: "",
    status: "backlog",
    clienteId,
    criadaEm: new Date().toISOString(),
    formato: "estatico",
    checklist: [],
    attachments: [],
  };
}

const CSS = `
.nxs-back{position:fixed;inset:0;z-index:45;background:rgba(0,0,0,.45)}
.nx .nxs-drawer{position:fixed;top:0;right:0;bottom:0;width:min(100vw,540px);z-index:46;overflow:auto;
  padding:16px;border-left:1px solid var(--line2);border-radius:0;display:flex;flex-direction:column;gap:14px;
  background:var(--card);color-scheme:dark}
.nx.claro .nxs-drawer{color-scheme:light}
.nxs-h{display:flex;align-items:flex-start;gap:10px}
.nxs-h .tit{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.nxs-h input.titulo{width:100%;background:none;border:0;border-bottom:1px solid var(--line);outline:0;color:var(--ink);
  font:inherit;font-size:19px;font-weight:600;letter-spacing:-.02em;padding:4px 0;min-width:0}
.nxs-h input.titulo:focus{border-bottom-color:var(--yel)}
.nxs-sec{display:flex;flex-direction:column;gap:6px;min-width:0}
.nxs-sec label.nx-h2,.nxs-sec span.nx-h2{display:flex;align-items:center;gap:6px}
.nxs-sec .nx-h2 small{font-weight:400;text-transform:none;letter-spacing:0;color:var(--ink3)}
.nxs-in,.nxs-sel,.nxs-ta{width:100%;max-width:100%;min-width:0;background:var(--glass);border:1px solid var(--line);border-radius:12px;
  padding:9px 12px;color:var(--ink);font:inherit;font-size:13.5px;outline:0;min-height:40px}
.nxs-in:focus,.nxs-sel:focus,.nxs-ta:focus{border-color:var(--yel)}
.nxs-sel{appearance:auto}
.nxs-sel option{color:#111;background:#fff}
.nxs-ta{resize:vertical;min-height:88px;line-height:1.45}
.nxs-2{display:grid;gap:10px;grid-template-columns:1fr 1fr}
.nxs-pills{display:flex;flex-wrap:wrap;gap:6px}
.nxs-pill{padding:7px 12px;border-radius:999px;font-size:12.5px;font-weight:600;background:var(--glass);border:1px solid var(--line);color:var(--ink2);min-height:34px}
.nxs-pill.on{background:var(--yel);color:#111;border-color:transparent}
.nxs-nota{font-size:11.5px;color:var(--ink3);margin:0}
.nxs-cont{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--ink3);margin-left:auto}
.nxs-ck{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line);min-height:36px}
.nxs-ck:first-child{border-top:0}
.nxs-ck input[type=checkbox]{width:18px;height:18px;accent-color:var(--yel);flex:none;margin:0}
.nxs-ck span{flex:1;min-width:0;font-size:13.5px;overflow-wrap:anywhere}
.nxs-ck span.done{text-decoration:line-through;color:var(--ink3)}
.nxs-ck button,.nxs-arq button{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--ink3);flex:none}
.nxs-ck button:hover,.nxs-arq button:hover{background:var(--glass2);color:var(--red)}
.nxs-arq{display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid var(--line);min-height:36px}
.nxs-arq:first-child{border-top:0}
.nxs-arq a{flex:1;min-width:0;font-size:13px;color:var(--ink);display:flex;align-items:center;gap:6px;overflow:hidden}
.nxs-arq a b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.nxs-add{display:flex;gap:8px;min-width:0}
.nxs-add .nxs-in{flex:1}
.nxs-add .nx-btn{flex:none;padding:0 12px;min-height:40px}
.nxs-foot{position:sticky;bottom:-16px;margin:auto -16px -16px;padding:12px 16px;display:flex;align-items:center;gap:10px;
  background:var(--card);border-top:1px solid var(--line);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.nxs-foot .msg{font-size:12px;color:var(--ink2);flex:1;min-width:0;overflow-wrap:anywhere}
.nxs-foot .msg.err{color:var(--red)}
.nxs-aviso{padding:14px;border-radius:14px;background:var(--glass);border:1px solid var(--line2);font-size:13px}
@media (max-width:900px){.nxs-2{grid-template-columns:1fr}.nx .nxs-drawer{padding:14px}.nxs-foot{margin:auto -14px -14px;padding:10px 14px;bottom:-14px}}
`;

// Marca de tempo "HH:MM" no fuso de Sao Paulo pro "Salvo HH:MM".
const horaAgora = () =>
  new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function EntregaSocial({
  tarefa,
  nova = false,
  onFechar,
}: {
  tarefa: TarefaSocial | null;
  nova?: boolean;
  onFechar: () => void;
}) {
  const { nomes, tarefas, recarregar, toast } = useNext();
  const [f, setF] = useState<TarefaSocial | null>(null);
  const [novoItem, setNovoItem] = useState("");
  const [novoLink, setNovoLink] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);

  // Copia local da tarefa: edita aqui, grava no Salvar.
  useEffect(() => {
    if (!tarefa) {
      setF(null);
      return;
    }
    setF({
      ...tarefa,
      checklist: Array.isArray(tarefa.checklist) ? tarefa.checklist.map((i) => ({ ...i })) : [],
      attachments: Array.isArray(tarefa.attachments)
        ? tarefa.attachments.map((a) => ({ ...a }))
        : [],
    });
    setMsg(null);
    setNovoItem("");
    setNovoLink("");
  }, [tarefa]);

  useEffect(() => {
    if (!tarefa) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [tarefa, onFechar]);

  const pessoas = useMemo(() => {
    const s = new Set<string>();
    for (const t of tarefas) {
      if (t.resp) s.add(String(t.resp).trim());
      for (const r of t.resps || []) if (r) s.add(String(r).trim());
    }
    return [...s].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [tarefas]);

  const clientes = useMemo(
    () =>
      Object.entries(nomes)
        .filter(([, n]) => n)
        .sort((a, b) => a[1].localeCompare(b[1])),
    [nomes],
  );

  if (!tarefa || !f) return null;

  const projeto = String(f.id).startsWith("pj:");
  const set = <K extends keyof TarefaSocial>(k: K, v: TarefaSocial[K]) =>
    setF((x) => (x ? { ...x, [k]: v } : x));

  const ck = f.checklist || [];
  const feitos = ck.filter((i) => i && i.done).length;
  const anexos = f.attachments || [];
  const legenda = f.legenda || "";
  const cliente = nomes[f.clienteId || ""] || "";
  const hoje = hojeSP();

  const addItem = () => {
    const text = novoItem.trim();
    if (!text) return;
    set("checklist", [...ck, { id: uid("c"), text, done: false }]);
    setNovoItem("");
  };
  const addLink = () => {
    const url = novoLink.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setMsg({ t: "Cole um link completo, começando com https://", err: true });
      return;
    }
    let name = "Link do Drive";
    try {
      const h = new URL(url).hostname;
      if (!/google\./i.test(h)) name = h;
    } catch {
      /* fica o nome padrao */
    }
    set("attachments", [
      ...anexos,
      { id: uid("at"), name, nome: name, url, tipo: "link", at: new Date().toISOString() },
    ]);
    setNovoLink("");
    setMsg(null);
  };

  const salvar = async () => {
    if (projeto) return;
    if (nova && !f.clienteId) {
      setMsg({ t: "Escolha o cliente antes de salvar.", err: true });
      return;
    }
    if (!String(f.title || "").trim()) {
      setMsg({ t: "Dê um título à entrega.", err: true });
      return;
    }
    setSalvando(true);
    setMsg(null);
    try {
      const novo: TarefaSocial = {
        ...f,
        title: String(f.title || "").trim(),
        publicarEm: f.publicarEm || "",
        legenda: f.legenda || "",
        briefing: f.briefing || "",
        formato: f.formato || "",
        checklist: ck.map((i) => ({ id: i.id || uid("c"), text: textoItem(i), done: !!i.done })),
        attachments: anexos,
      };
      await salvarTarefa(novo);
      setMsg({ t: `Salvo ${horaAgora()}` });
      toast(nova ? `Entrega criada: ${novo.title}` : `Salvo: ${novo.title}`);
      await recarregar();
    } catch (e) {
      setMsg({ t: (e as Error).message || "Não salvou.", err: true });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nxs-back" onClick={onFechar} />
      <aside className="glass nxs-drawer" role="dialog" aria-label="Cartão da entrega">
        <div className="nxs-h">
          <div className="tit">
            <span className="nx-h2">
              {nova ? "Nova entrega" : "Entrega de social"}
              {cliente ? ` · ${cliente}` : ""}
            </span>
            {projeto ? (
              <h2 className="nx-h3" style={{ fontSize: 19 }}>
                {f.title || "(sem título)"}
              </h2>
            ) : (
              <input
                className="titulo"
                value={f.title || ""}
                placeholder="Título da entrega"
                onChange={(e) => set("title", e.target.value)}
              />
            )}
          </div>
          <button type="button" className="nx-ico" aria-label="Fechar" onClick={onFechar}>
            <X size={16} />
          </button>
        </div>

        {projeto ? (
          <div className="nxs-aviso">
            Este é um cartão de projeto. Ele não abre no cartão de entrega: edite pelo quadro de
            Projetos no clássico.
          </div>
        ) : (
          <>
            {nova && (
              <div className="nxs-sec">
                <label className="nx-h2" htmlFor="nxs-cli">
                  Cliente
                </label>
                <select
                  id="nxs-cli"
                  className="nxs-sel"
                  value={f.clienteId || ""}
                  onChange={(e) => set("clienteId", e.target.value)}
                >
                  <option value="">Escolha o cliente</option>
                  {clientes.map(([id, n]) => (
                    <option key={id} value={id}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="nxs-sec">
              <span className="nx-h2">Formato</span>
              <div className="nxs-pills" role="radiogroup" aria-label="Formato">
                {FORMATOS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={f.formato === o.id}
                    className={`nxs-pill ${f.formato === o.id ? "on" : ""}`}
                    onClick={() => set("formato", o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="nxs-2">
              <div className="nxs-sec">
                <label className="nx-h2" htmlFor="nxs-data">
                  Prazo interno
                </label>
                <input
                  id="nxs-data"
                  type="date"
                  className="nxs-in"
                  value={f.data || ""}
                  onChange={(e) => set("data", e.target.value)}
                />
                <p className="nxs-nota">
                  {f.data && f.data < hoje && f.status !== "concluido"
                    ? `Vencido: era ${dataBR(f.data)}.`
                    : "Só a equipe vê. É por ele que o atraso é contado."}
                </p>
              </div>
              <div className="nxs-sec">
                <label className="nx-h2" htmlFor="nxs-pub">
                  <CalendarClock size={13} /> Data de publicação
                </label>
                <input
                  id="nxs-pub"
                  type="datetime-local"
                  className="nxs-in"
                  value={f.publicarEm || ""}
                  onChange={(e) => set("publicarEm", e.target.value)}
                />
                <p className="nxs-nota">Data e hora reais no Instagram. É o que o cliente vê.</p>
              </div>
            </div>

            <div className="nxs-2">
              <div className="nxs-sec">
                <label className="nx-h2" htmlFor="nxs-resp">
                  Responsável
                </label>
                <input
                  id="nxs-resp"
                  className="nxs-in"
                  list="nxs-pessoas"
                  value={f.resp || ""}
                  placeholder="Quem responde"
                  onChange={(e) => set("resp", e.target.value)}
                />
                <datalist id="nxs-pessoas">
                  {pessoas.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div className="nxs-sec">
                <label className="nx-h2" htmlFor="nxs-status">
                  Status
                </label>
                <select
                  id="nxs-status"
                  className="nxs-sel"
                  value={STATUS_IDS.includes(f.status || "") ? f.status : "backlog"}
                  onChange={(e) => set("status", e.target.value)}
                  style={{
                    borderLeft: `4px solid ${STATUS_COR[f.status || "backlog"] || "#888"}`,
                  }}
                >
                  {STATUS_IDS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="nxs-sec">
              <label className="nx-h2" htmlFor="nxs-brief">
                Briefing <small>instrução interna</small>
              </label>
              <textarea
                id="nxs-brief"
                className="nxs-ta"
                value={f.briefing || ""}
                placeholder="Descreva o briefing do conteúdo"
                onChange={(e) => set("briefing", e.target.value)}
              />
            </div>

            <div className="nxs-sec">
              <label className="nx-h2" htmlFor="nxs-leg">
                Legenda <small>vai pro ar</small>
                <span className="nxs-cont">
                  {legenda.length}
                  {legenda.length > 2200 ? " (acima de 2200 do Instagram)" : ""}
                </span>
              </label>
              <textarea
                id="nxs-leg"
                className="nxs-ta"
                value={legenda}
                placeholder="Digite a legenda que será publicada"
                onChange={(e) => set("legenda", e.target.value)}
              />
            </div>

            <div className="nxs-sec">
              <span className="nx-h2">
                Checklist
                {ck.length > 0 && (
                  <Pill yel={feitos === ck.length}>
                    {feitos}/{ck.length}
                  </Pill>
                )}
              </span>
              <div>
                {ck.map((i, idx) => (
                  <div key={i.id || idx} className="nxs-ck">
                    <input
                      type="checkbox"
                      checked={!!i.done}
                      aria-label={textoItem(i)}
                      onChange={() =>
                        set(
                          "checklist",
                          ck.map((x, k) => (k === idx ? { ...x, done: !x.done } : x)),
                        )
                      }
                    />
                    <span className={i.done ? "done" : ""}>{textoItem(i)}</span>
                    <button
                      type="button"
                      aria-label="Remover item"
                      onClick={() =>
                        set(
                          "checklist",
                          ck.filter((_, k) => k !== idx),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="nxs-add">
                <input
                  className="nxs-in"
                  value={novoItem}
                  placeholder="Adicionar item e dar Enter"
                  onChange={(e) => setNovoItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addItem();
                    }
                  }}
                />
                <button
                  type="button"
                  className="nx-btn ghost"
                  onClick={addItem}
                  aria-label="Adicionar item"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div className="nxs-sec">
              <span className="nx-h2">
                Arquivos
                {anexos.length > 0 && <Pill>{anexos.length}</Pill>}
              </span>
              <div>
                {anexos.length === 0 && <p className="nxs-nota">Nenhum arquivo anexado.</p>}
                {anexos.map((a, idx) => (
                  <div key={a.id || idx} className="nxs-arq">
                    <a href={a.url || "#"} target="_blank" rel="noreferrer noopener">
                      <Link2 size={14} style={{ flex: "none", color: "var(--ink3)" }} />
                      <b>{nomeAnexo(a)}</b>
                    </a>
                    <button
                      type="button"
                      aria-label="Remover arquivo"
                      onClick={() =>
                        set(
                          "attachments",
                          anexos.filter((_, k) => k !== idx),
                        )
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="nxs-add">
                <input
                  className="nxs-in"
                  value={novoLink}
                  placeholder="Colar link do Drive"
                  inputMode="url"
                  onChange={(e) => setNovoLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLink();
                    }
                  }}
                />
                <button
                  type="button"
                  className="nx-btn ghost"
                  onClick={addLink}
                  aria-label="Adicionar link"
                >
                  <Plus size={16} />
                </button>
              </div>
              <p className="nxs-nota">
                Sem upload por aqui: o arquivo fica no Drive e a tarefa guarda o link.
              </p>
            </div>

            <div className="nxs-foot">
              <span className={`msg ${msg?.err ? "err" : ""}`}>
                {msg
                  ? msg.t
                  : f.up
                    ? `Última alteração ${new Date(String(f.up)).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
              </span>
              <button type="button" className="nx-btn ghost" onClick={onFechar}>
                Fechar
              </button>
              <button type="button" className="nx-btn" onClick={salvar} disabled={salvando}>
                <Save size={14} /> {salvando ? "Salvando" : "Salvar"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
