// Area Producao do /next: quadro resumido das tarefas unificadas (Kanban + cartoes de
// projeto), captacoes audiovisuais e projetos por cliente. Tudo lido de carga.state;
// nada grava daqui, as acoes levam pro fluxo do classico.
import { useMemo } from "react";
import { Clapperboard, FolderKanban, LayoutGrid, ListChecks, Sparkles } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Abrir, Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import {
  STATUS_COR,
  STATUS_LABEL,
  aberta,
  captacoes,
  dataBR,
  hojeSP,
  projetos,
  type Captacao,
  type Tarefa,
} from "@/components/next/dados";

const CSS = `
.nxp-kpis{display:grid;gap:14px;grid-template-columns:repeat(5,1fr)}
.nxp-chk{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;color:var(--ink3);margin-left:6px}
.nxp-it{display:flex;align-items:center;gap:6px;width:100%;text-align:left}
.nxp-it b{flex:1;min-width:0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxp-it small{color:var(--ink3);font-size:10.5px;white-space:nowrap}
.nxp-it small.late{color:var(--red);font-weight:600}
.nxp-atalhos{display:flex;flex-wrap:wrap;gap:8px}
.nxp-proj{display:grid;gap:0}
.nxp-proj .p{display:grid;gap:6px;padding:10px 6px;border-top:1px solid var(--line)}
.nxp-proj .p:first-child{border-top:0}
.nxp-proj .h{display:flex;align-items:center;gap:8px;min-width:0}
.nxp-proj .h b{font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxp-proj .h span{font-size:11px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
.nxp-modo{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.nxp-modo div{padding:10px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line);font-size:12.5px}
.nxp-modo b{display:block;font-weight:600;margin-bottom:2px}
.nxp-modo span{color:var(--ink3);font-size:11.5px}
@media (max-width:900px){.nxp-kpis{grid-template-columns:repeat(2,1fr);gap:10px}.nxp-kpis .nx-kpi:last-child{grid-column:span 2}}
`;

const ORDEM = ["backlog", "iniciar", "andamento", "aprovacao", "homologcli", "concluido"];
const ordData = (a: { data?: string }, b: { data?: string }) =>
  (a.data || "9999").localeCompare(b.data || "9999");

function chk(t: Tarefa): string {
  const c = Array.isArray(t.checklist) ? t.checklist : [];
  if (!c.length) return "";
  return `${c.filter((i) => i && i.done).length}/${c.length}`;
}

export function Producao() {
  const { carga, nomes, tarefas, abrirApp } = useNext();
  const st = useMemo(() => carga?.state || {}, [carga]);
  const hoje = hojeSP();

  const v = useMemo(() => {
    const abertas = tarefas.filter(aberta);
    const porStatus: Record<string, Tarefa[]> = {};
    for (const s of ORDEM) porStatus[s] = [];
    for (const t of tarefas) {
      const s = t.status && porStatus[t.status] ? t.status : "backlog";
      porStatus[s].push(t);
    }
    for (const s of ORDEM) porStatus[s].sort(ordData);
    const caps = captacoes(st);
    const capsAbertas = caps.filter((c) => c.status !== "concluida");
    const proximas = capsAbertas.filter((c) => c.data && c.data >= hoje).sort(ordData);
    const semEditor = capsAbertas.filter((c) => !c.editor);
    const projs = projetos(st)
      .map((p) => {
        const ts = p.tarefas || [];
        const feitas = ts.filter((x) => x.st === "concluido").length;
        return {
          p,
          nome: p.cliente || nomes[p.clienteId || ""] || "Projeto",
          total: ts.length,
          feitas,
          abertas: ts.length - feitas,
        };
      })
      .sort((a, b) => b.abertas - a.abertas || a.nome.localeCompare(b.nome));
    const comChecklist = abertas
      .filter((t) => Array.isArray(t.checklist) && t.checklist.length)
      .sort(ordData);
    return {
      abertas,
      porStatus,
      andamento: abertas.filter((t) => t.status === "andamento").length,
      homolog: abertas.filter((t) => t.status === "aprovacao" || t.status === "homologcli").length,
      atrasadas: abertas.filter((t) => t.data && t.data < hoje).length,
      caps,
      capsAbertas,
      proximas,
      semEditor,
      projs,
      comChecklist,
    };
  }, [tarefas, st, nomes, hoje]);

  const temProducao = "wfa-producao" in st;
  const temProjetos = "wfa-projetos" in st;

  const linhaCap = (c: Captacao, extra?: string) => {
    const pop = Array.isArray(c.pop) ? c.pop : [];
    const feito = pop.filter((i) => i && i.done).length;
    const videos = Array.isArray(c.videos) ? c.videos.length : 0;
    const atrasada = !!c.data && c.data < hoje;
    return (
      <div key={c.id} className="nx-row clk" onClick={() => abrirApp("producao")}>
        <span
          className="dot"
          style={{
            background:
              c.status === "concluida" ? "var(--green)" : atrasada ? "var(--red)" : "var(--yel)",
          }}
        />
        <span className="t">
          <b>{c.titulo || nomes[c.clienteId || ""] || "Captação"}</b>
          <span>
            {[
              c.titulo ? nomes[c.clienteId || ""] : null,
              c.local,
              c.produtor ? `produção ${c.produtor}` : "sem produtor",
              c.editor ? `edição ${c.editor}` : "sem editor",
              videos ? `${videos} vídeo${videos === 1 ? "" : "s"}` : null,
              pop.length ? `POP ${feito}/${pop.length}` : null,
              extra,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className={`m ${atrasada ? "late" : ""}`}>{dataBR(c.data)}</span>
      </div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Produção</h1>
      <p className="nx-sub">
        Quadro da equipe inteira: {v.abertas.length} tarefa{v.abertas.length === 1 ? "" : "s"}{" "}
        aberta{v.abertas.length === 1 ? "" : "s"} de {tarefas.length} no total, contando cartões de
        projeto uma vez só.
      </p>

      <div className="nx-grid">
        <div className="c12 nxp-kpis">
          <Kpi
            label="Abertas"
            value={v.abertas.length}
            title="Tarefas com status diferente de Concluído, no Kanban e nos projetos (cartão de projeto contado uma vez). Sem período."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Em andamento"
            value={v.andamento}
            tone="hot"
            title="Tarefas abertas na coluna Em andamento, agora."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Em homologação"
            value={v.homolog}
            title="Tarefas abertas em Homologação (interna) ou Homologação do cliente, agora."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Atrasadas"
            value={v.atrasadas}
            tone={v.atrasadas ? "warn" : "ok"}
            detail={`prazo antes de ${dataBR(hoje)}`}
            title="Tarefas abertas com prazo anterior a hoje, no fuso de São Paulo."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Todas"
            value={tarefas.length}
            detail="abertas e concluídas"
            title="Total de tarefas no estado, incluindo concluídas. Sem período."
            onOpen={() => abrirApp("tarefas")}
          />
        </div>

        <Card
          className="c12"
          title="Quadro por status"
          icon={<LayoutGrid size={16} />}
          action={<Abrir onClick={() => abrirApp("tarefas")}>Kanban completo</Abrir>}
        >
          {tarefas.length === 0 ? (
            <Vazio
              titulo="Nenhuma tarefa no estado"
              texto="Crie a primeira no Kanban do clássico."
            />
          ) : (
            <div className="nx-cols">
              {ORDEM.map((s) => {
                const lst = v.porStatus[s];
                return (
                  <div key={s} className="nx-col">
                    <div className="h">
                      <i style={{ background: STATUS_COR[s] }} />
                      {STATUS_LABEL[s]}
                      <b>{lst.length}</b>
                    </div>
                    {lst.length === 0 && (
                      <div className="nx-mute" style={{ fontSize: 12 }}>
                        vazia
                      </div>
                    )}
                    {lst.slice(0, 5).map((t) => {
                      const late = aberta(t) && !!t.data && t.data < hoje;
                      const c = chk(t);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className="it nxp-it"
                          onClick={() => abrirApp("tarefas")}
                          title={[t.title, nomes[t.clienteId || ""], t.resp]
                            .filter(Boolean)
                            .join(" · ")}
                        >
                          <b>{t.title || "(sem título)"}</b>
                          {c && <span className="nxp-chk">{c}</span>}
                          {t.data && (
                            <small className={late ? "late" : ""}>
                              {dataBR(t.data).slice(0, 5)}
                            </small>
                          )}
                        </button>
                      );
                    })}
                    {lst.length > 5 && (
                      <div className="nx-mute" style={{ fontSize: 11, marginTop: 6 }}>
                        +{lst.length - 5} no Kanban
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          className="c6"
          title="Captações"
          icon={<Clapperboard size={16} />}
          count={temProducao ? v.capsAbertas.length : undefined}
          action={<Abrir onClick={() => abrirApp("producao")}>Produção audiovisual</Abrir>}
        >
          {!temProducao ? (
            <Vazio
              titulo="Sem acesso a este bloco"
              texto="A leitura não trouxe wfa-producao. Pode ser permissão do papel ou o bloco ainda não existe no clássico."
            />
          ) : v.capsAbertas.length === 0 ? (
            <Vazio
              titulo="Nenhuma captação aberta"
              texto={
                v.caps.length
                  ? `${v.caps.length} concluída${v.caps.length === 1 ? "" : "s"} no histórico.`
                  : "Nenhuma captação cadastrada."
              }
            />
          ) : (
            <>
              <div>
                <div className="nx-h2" style={{ marginBottom: 6 }}>
                  Próximas ({v.proximas.length})
                </div>
                {v.proximas.length === 0 ? (
                  <div className="nx-mute" style={{ fontSize: 12.5 }}>
                    Nenhuma com data a partir de hoje.
                  </div>
                ) : (
                  v.proximas.slice(0, 6).map((c) => linhaCap(c))
                )}
              </div>
              <div>
                <div className="nx-h2" style={{ marginBottom: 6 }}>
                  Sem editor definido ({v.semEditor.length})
                </div>
                {v.semEditor.length === 0 ? (
                  <div className="nx-mute" style={{ fontSize: 12.5 }}>
                    Todas as captações abertas têm editor.
                  </div>
                ) : (
                  v.semEditor.slice(0, 6).map((c) => linhaCap(c, "definir editor no clássico"))
                )}
              </div>
            </>
          )}
        </Card>

        <Card
          className="c6"
          title="Projetos"
          icon={<FolderKanban size={16} />}
          count={temProjetos ? v.projs.length : undefined}
          action={<Abrir onClick={() => abrirApp("projetos")}>Quadro de projetos</Abrir>}
        >
          {!temProjetos ? (
            <Vazio titulo="Sem acesso a este bloco" texto="A leitura não trouxe wfa-projetos." />
          ) : v.projs.length === 0 ? (
            <Vazio titulo="Nenhum projeto cadastrado" />
          ) : (
            <div className="nxp-proj">
              {v.projs.slice(0, 10).map(({ p, nome, total, feitas, abertas }) => (
                <div key={p.id} className="p">
                  <div className="h">
                    <b>{nome}</b>
                    {p.sprint && <Pill>{p.sprint}</Pill>}
                    <span>
                      {abertas} aberta{abertas === 1 ? "" : "s"} · {feitas} concluída
                      {feitas === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="nx-bar" title={`${feitas} de ${total} concluídas`}>
                    <i style={{ width: total ? `${Math.round((feitas / total) * 100)}%` : "0%" }} />
                  </div>
                </div>
              ))}
              {v.projs.length > 10 && (
                <div className="nx-empty">+{v.projs.length - 10} no quadro de projetos</div>
              )}
            </div>
          )}
        </Card>

        <Card
          className="c8"
          title="Entregas com checklist"
          icon={<ListChecks size={16} />}
          count={v.comChecklist.length}
          action={<Abrir onClick={() => abrirApp("tarefas")} />}
        >
          {v.comChecklist.length === 0 ? (
            <Vazio
              titulo="Nenhuma tarefa aberta com checklist"
              texto="Checklist é preenchido no modal da tarefa, no clássico."
            />
          ) : (
            <div>
              {v.comChecklist.slice(0, 8).map((t) => {
                const late = !!t.data && t.data < hoje;
                return (
                  <div key={t.id} className="nx-row clk" onClick={() => abrirApp("tarefas")}>
                    <span
                      className="dot"
                      style={{ background: STATUS_COR[t.status || "backlog"] || "#888" }}
                    />
                    <span className="t">
                      <b>{t.title || "(sem título)"}</b>
                      <span>
                        {[nomes[t.clienteId || ""], t.resp, STATUS_LABEL[t.status || ""]]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <Pill yel>{chk(t)}</Pill>
                    <span className={`m ${late ? "late" : ""}`}>
                      {t.data ? dataBR(t.data) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="c4" title="Atalhos" icon={<Sparkles size={16} />}>
          <div className="nxp-atalhos">
            <button type="button" className="nx-btn" onClick={() => abrirApp("tarefas")}>
              Kanban
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("projetos")}>
              Projetos
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("producao")}>
              Produção audiovisual
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("briefings")}>
              Briefings
            </button>
          </div>
          <div className="nx-h2" style={{ marginTop: 6 }}>
            Modo Criador: o que a entrega de social tem hoje
          </div>
          <div className="nxp-modo">
            <div>
              <b>Prazo e checklist</b>
              <span>na tarefa (campos data e checklist)</span>
            </div>
            <div>
              <b>Briefing</b>
              <span>em Briefings, no clássico</span>
            </div>
            <div>
              <b>Formato e data de publicação</b>
              <span>no editorial (/calendario)</span>
            </div>
            <div>
              <b>Legenda e mídia</b>
              <span>no Estúdio (roteirista, legenda) e no Drive</span>
            </div>
          </div>
          <p className="nx-mute" style={{ fontSize: 11.5, margin: 0 }}>
            Ainda não existe um registro único juntando tudo isso por entrega. Este painel mostra o
            que o dado atual permite.
          </p>
        </Card>
      </div>
    </>
  );
}
