// Area Clientes do /next: carteira (base fixa + wfa-clientes-custom) cruzada com as tarefas
// unificadas por clienteId, com sinal de saude explicado e painel "Cliente 360" em leitura.
// Nada e gravado aqui; Area do Cliente e Jornada continuam no classico.
import { useEffect, useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { Briefcase, Clapperboard, Handshake, ListChecks, Search, Send, X } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Pill, TarefaLinha, Vazio } from "@/components/next/ui";
import {
  aberta,
  brl,
  captacoes,
  dataBR,
  editorial,
  hojeSP,
  leadEtapa,
  leads,
  norm,
  type ClienteCustom,
  type Tarefa,
} from "@/components/next/dados";

const STATUS_FICHA: Record<string, { label: string; cor: string }> = {
  r: { label: "Urgente", cor: "var(--red)" },
  y: { label: "Em ajuste", cor: "var(--yel)" },
  gr: { label: "Saudável", cor: "var(--green)" },
  churn: { label: "Churn", cor: "var(--ink3)" },
};

type Linha = {
  id: string;
  nome: string;
  tipo?: string;
  plano?: string;
  status?: string;
  abertas: Tarefa[];
  atrasadas: number;
  proxima?: string;
  sinal: { label: string; cor: string; porque: string };
};

const CSS = `
.nxc-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.nxc-busca{flex:1;min-width:200px;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line)}
.nxc-busca input{flex:1;background:none;border:0;outline:0;color:var(--ink);font:inherit;min-width:0}
.nxc-busca input::placeholder{color:var(--ink3)}
.nxc-tr{cursor:pointer}
.nxc-tr:hover td{background:var(--glass2)}
.nxc-sinal{display:inline-flex;align-items:center;gap:6px;font-size:12px;white-space:nowrap}
.nxc-sinal i{width:8px;height:8px;border-radius:50%;flex:none}
.nxc-back{position:fixed;inset:0;z-index:45;background:rgba(0,0,0,.45)}
.nx .nxc-drawer{position:fixed;top:0;right:0;bottom:0;width:min(94vw,500px);z-index:46;overflow:auto;padding:18px;
  border-left:1px solid var(--line2);border-radius:0;display:flex;flex-direction:column;gap:14px;background:var(--card)}
.nxc-drawer-h{display:flex;align-items:flex-start;gap:10px}
.nxc-drawer-h h2{font-size:20px;font-weight:600;letter-spacing:-.02em;margin:0;flex:1;min-width:0}
.nxc-sec{display:flex;flex-direction:column;gap:6px}
.nxc-acoes{display:flex;gap:8px;flex-wrap:wrap}
@media (max-width:900px){.nxc-oculta{display:none}}
`;

export function Clientes() {
  const { carga, nomes, tarefas, abrirApp } = useNext();
  const search = useSearch({ from: "/_authenticated/painel/$area" }) as { q?: string };
  const [q, setQ] = useState(search.q || "");
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    setQ(search.q || "");
  }, [search.q]);
  useEffect(() => {
    if (!sel) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [sel]);

  const st = carga?.state || {};
  const hoje = hojeSP();

  const linhas = useMemo<Linha[]>(() => {
    const custom = (
      Array.isArray(st["wfa-clientes-custom"]) ? (st["wfa-clientes-custom"] as ClienteCustom[]) : []
    ).filter((c) => c?.id);
    const ficha = Object.fromEntries(custom.map((c) => [c.id, c]));
    const porCliente: Record<string, Tarefa[]> = {};
    for (const t of tarefas) {
      if (!aberta(t) || !t.clienteId) continue;
      (porCliente[t.clienteId] ||= []).push(t);
    }
    return Object.entries(nomes)
      .filter(([id, nome]) => id && nome)
      .map(([id, nome]) => {
        const f = ficha[id];
        const abertas = porCliente[id] || [];
        const atrasadas = abertas.filter((t) => t.data && t.data < hoje).length;
        const proxima = abertas
          .map((t) => t.data || "")
          .filter((d) => d && d >= hoje)
          .sort()[0];
        const sinal =
          f?.status === "churn"
            ? {
                label: "Fora da operação",
                cor: "var(--ink3)",
                porque: "Ficha marcada como churn no clássico.",
              }
            : atrasadas > 0
              ? {
                  label: "Atenção",
                  cor: "var(--red)",
                  porque: `${atrasadas} tarefa${atrasadas === 1 ? "" : "s"} aberta${atrasadas === 1 ? "" : "s"} com prazo vencido.`,
                }
              : abertas.length === 0
                ? {
                    label: "Sem atividade",
                    cor: "var(--ink3)",
                    porque: "Nenhuma tarefa aberta ligada a este cliente.",
                  }
                : {
                    label: "Em dia",
                    cor: "var(--green)",
                    porque: `${abertas.length} tarefa${abertas.length === 1 ? "" : "s"} aberta${abertas.length === 1 ? "" : "s"}, nenhuma atrasada.`,
                  };
        return {
          id,
          nome,
          tipo: f?.tipo,
          plano: f?.plano,
          status: f?.status,
          abertas,
          atrasadas,
          proxima,
          sinal,
        };
      })
      .sort(
        (a, b) =>
          b.atrasadas - a.atrasadas ||
          b.abertas.length - a.abertas.length ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
  }, [st, nomes, tarefas, hoje]);

  const filtradas = useMemo(() => {
    const k = norm(q);
    if (!k) return linhas;
    return linhas.filter(
      (l) => norm(l.nome).includes(k) || norm(l.tipo).includes(k) || norm(l.plano).includes(k),
    );
  }, [linhas, q]);

  const ativos = linhas.filter((l) => l.status !== "churn");
  const kpi = {
    comAtraso: ativos.filter((l) => l.atrasadas > 0).length,
    semAtividade: ativos.filter((l) => l.abertas.length === 0).length,
    churn: linhas.length - ativos.length,
  };

  const cliente = sel ? linhas.find((l) => l.id === sel) || null : null;
  const c360 = useMemo(() => {
    if (!cliente) return null;
    const nm = norm(cliente.nome);
    const primeira = nm.split(/\s+/)[0];
    return {
      leads: leads(st).filter((l) => {
        const n = norm(l.nm);
        return (
          !!n &&
          (n === nm ||
            n.includes(nm) ||
            nm.includes(n) ||
            (primeira.length > 3 && n.split(/\s+/)[0] === primeira))
        );
      }),
      capt: captacoes(st)
        .filter((c) => c.clienteId === cliente.id)
        .sort((a, b) => String(b.data || "").localeCompare(String(a.data || ""))),
      posts: editorial(st)
        .filter((e) => e.clienteId === cliente.id)
        .sort((a, b) => String(b.data || "").localeCompare(String(a.data || ""))),
    };
  }, [cliente, st]);

  return (
    <>
      <style>{CSS}</style>
      <h1 className="nx-h1">Clientes</h1>
      <p className="nx-sub">
        {linhas.length === 0
          ? "Nenhum cliente cadastrado ainda."
          : `${ativos.length} cliente${ativos.length === 1 ? "" : "s"} na carteira${kpi.churn ? `, ${kpi.churn} em churn` : ""}. O sinal de saúde vem só das tarefas abertas; a ficha completa continua no clássico.`}
      </p>

      <div className="nx-grid">
        <div className="c3 half">
          <Kpi
            label="Na carteira"
            value={ativos.length}
            detail="fora os em churn"
            title="Clientes da base fixa mais os cadastrados no clássico, sem os marcados como churn na ficha. Foto de agora."
            onOpen={() => abrirApp("lista-clientes")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Com atraso"
            value={kpi.comAtraso}
            tone={kpi.comAtraso ? "warn" : "ok"}
            detail="ao menos 1 tarefa vencida"
            title="Clientes ativos com pelo menos uma tarefa aberta cujo prazo é anterior a hoje (fuso de São Paulo)."
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Sem atividade"
            value={kpi.semAtividade}
            detail="nenhuma tarefa aberta"
            title="Clientes ativos sem nenhuma tarefa aberta ligada pelo clienteId. Pode ser cliente parado ou tarefa sem cliente marcado."
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Em churn"
            value={kpi.churn}
            detail="status da ficha"
            title="Clientes com status churn na ficha do clássico (wfa-clientes-custom)."
            onOpen={() => abrirApp("lista-clientes")}
          />
        </div>

        <Card
          className="c12"
          title="Carteira"
          icon={<Briefcase size={16} />}
          count={filtradas.length}
          action={
            <button type="button" className="nx-link" onClick={() => abrirApp("lista-clientes")}>
              Lista no clássico
            </button>
          }
        >
          <div className="nxc-tools">
            <label className="nxc-busca">
              <Search size={14} style={{ color: "var(--ink3)" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, tipo ou plano"
                aria-label="Buscar cliente"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Limpar busca"
                  style={{ color: "var(--ink3)", display: "grid" }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
          {linhas.length === 0 ? (
            <Vazio titulo="Sem clientes cadastrados" texto="Cadastre pelo clássico em Clientes." />
          ) : filtradas.length === 0 ? (
            <Vazio titulo={`Nada encontrado para "${q}"`} texto="Tente parte do nome." />
          ) : (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="nxc-oculta" title="Status manual da ficha no clássico">
                      Ficha
                    </th>
                    <th className="num" title="Tarefas abertas ligadas pelo clienteId">
                      Abertas
                    </th>
                    <th className="num" title="Abertas com prazo antes de hoje">
                      Atrasadas
                    </th>
                    <th
                      className="nxc-oculta"
                      title="Menor prazo entre as tarefas abertas a partir de hoje"
                    >
                      Próxima entrega
                    </th>
                    <th title="Atrasada maior que zero = Atenção. Nenhuma aberta = Sem atividade. Churn na ficha = Fora da operação.">
                      Sinal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((l) => {
                    const sf = l.status ? STATUS_FICHA[l.status] : null;
                    return (
                      <tr key={l.id} className="nxc-tr" onClick={() => setSel(l.id)}>
                        <td>
                          <b style={{ fontWeight: 500 }}>{l.nome}</b>
                          {(l.tipo || l.plano) && (
                            <div className="nx-mute" style={{ fontSize: 11.5 }}>
                              {[l.tipo, l.plano].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </td>
                        <td className="nxc-oculta">
                          {sf ? (
                            <Pill cor={sf.cor}>{sf.label}</Pill>
                          ) : (
                            <span className="nx-mute">sem ficha</span>
                          )}
                        </td>
                        <td className="num">{l.abertas.length}</td>
                        <td
                          className="num"
                          style={{
                            color: l.atrasadas ? "var(--red)" : undefined,
                            fontWeight: l.atrasadas ? 600 : 400,
                          }}
                        >
                          {l.atrasadas}
                        </td>
                        <td className="nxc-oculta">
                          {l.proxima ? (
                            dataBR(l.proxima)
                          ) : (
                            <span className="nx-mute">sem prazo</span>
                          )}
                        </td>
                        <td>
                          <span className="nxc-sinal" title={l.sinal.porque}>
                            <i style={{ background: l.sinal.cor }} />
                            {l.sinal.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {cliente && c360 && (
        <>
          <div className="nxc-back" onClick={() => setSel(null)} />
          <aside
            className="glass nxc-drawer"
            role="dialog"
            aria-label={`Cliente 360: ${cliente.nome}`}
          >
            <div className="nxc-drawer-h">
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="nx-h2">Cliente 360</span>
                <h2>{cliente.nome}</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                  {cliente.tipo && <Pill>{cliente.tipo}</Pill>}
                  {cliente.plano && <Pill>{cliente.plano}</Pill>}
                  {cliente.status && STATUS_FICHA[cliente.status] && (
                    <Pill cor={STATUS_FICHA[cliente.status].cor}>
                      {STATUS_FICHA[cliente.status].label}
                    </Pill>
                  )}
                  <span className="nxc-sinal" title={cliente.sinal.porque}>
                    <i style={{ background: cliente.sinal.cor }} />
                    {cliente.sinal.label}
                  </span>
                </div>
                <p className="nx-mute" style={{ margin: "6px 0 0", fontSize: 12 }}>
                  {cliente.sinal.porque}
                </p>
              </div>
              <button
                type="button"
                className="nx-ico"
                onClick={() => setSel(null)}
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="nxc-acoes">
              <button type="button" className="nx-btn" onClick={() => abrirApp("cliente")}>
                Área do Cliente
              </button>
              <button type="button" className="nx-btn ghost" onClick={() => abrirApp("jornada")}>
                Jornada
              </button>
            </div>

            <section className="nxc-sec">
              <div className="nx-card-h">
                <ListChecks size={15} style={{ color: "var(--yel)" }} />
                <span className="nx-h2">Tarefas abertas</span>
                <span className="nx-pill">{cliente.abertas.length}</span>
              </div>
              {cliente.abertas.length === 0 ? (
                <Vazio titulo="Nenhuma tarefa aberta" />
              ) : (
                <div>
                  {[...cliente.abertas]
                    .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"))
                    .slice(0, 10)
                    .map((t) => (
                      <TarefaLinha
                        key={t.id}
                        t={t}
                        mostrarResp
                        onAbrir={() => abrirApp("tarefas")}
                      />
                    ))}
                  {cliente.abertas.length > 10 && (
                    <div className="nx-empty">+{cliente.abertas.length - 10} no Kanban</div>
                  )}
                </div>
              )}
            </section>

            <section className="nxc-sec">
              <div className="nx-card-h">
                <Handshake size={15} style={{ color: "var(--yel)" }} />
                <span className="nx-h2">Leads com o mesmo nome</span>
                <span className="nx-pill">{c360.leads.length}</span>
              </div>
              {c360.leads.length === 0 ? (
                <Vazio titulo="Nenhum lead no CRM com este nome" />
              ) : (
                <div>
                  {c360.leads.slice(0, 6).map((l) => {
                    const et = leadEtapa(l);
                    return (
                      <div key={l.id} className="nx-row clk" onClick={() => abrirApp("comercial")}>
                        <span className="dot" style={{ background: et.cor }} />
                        <span className="t">
                          <b>{l.nm}</b>
                          <span>
                            {[et.label, l.resp, Number(l.val) ? brl(Number(l.val)) : null]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="m">{l.due ? dataBR(l.due) : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="nxc-sec">
              <div className="nx-card-h">
                <Clapperboard size={15} style={{ color: "var(--yel)" }} />
                <span className="nx-h2">Captações</span>
                <span className="nx-pill">{c360.capt.length}</span>
              </div>
              {c360.capt.length === 0 ? (
                <Vazio titulo="Nenhuma captação registrada" />
              ) : (
                <div>
                  {c360.capt.slice(0, 6).map((c) => (
                    <div key={c.id} className="nx-row clk" onClick={() => abrirApp("tarefas")}>
                      <span
                        className="dot"
                        style={{
                          background:
                            c.status === "concluida" || c.concluidaEm
                              ? "var(--green)"
                              : "var(--blue)",
                        }}
                      />
                      <span className="t">
                        <b>{c.titulo || c.local || "Captação"}</b>
                        <span>
                          {[
                            c.status,
                            c.produtor,
                            c.videos?.length
                              ? `${c.videos.length} vídeo${c.videos.length === 1 ? "" : "s"}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="m">{c.data ? dataBR(c.data) : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="nxc-sec">
              <div className="nx-card-h">
                <Send size={15} style={{ color: "var(--yel)" }} />
                <span className="nx-h2">Postagens do editorial</span>
                <span className="nx-pill">{c360.posts.length}</span>
              </div>
              {c360.posts.length === 0 ? (
                <Vazio titulo="Nenhuma postagem no editorial" />
              ) : (
                <div>
                  {c360.posts.slice(0, 8).map((e) => (
                    <div
                      key={e.id}
                      className="nx-row clk"
                      onClick={() => (window.location.href = "/calendario")}
                    >
                      <span
                        className="dot"
                        style={{
                          background:
                            e.status === "postado"
                              ? "var(--green)"
                              : e.status === "agendado"
                                ? "var(--blue)"
                                : "var(--ink3)",
                        }}
                      />
                      <span className="t">
                        <b>{e.titulo || "(sem título)"}</b>
                        <span>{[e.formato, e.status].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="m">{e.data ? dataBR(e.data) : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </>
      )}
    </>
  );
}
