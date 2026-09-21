// Area Producao do /next: entregas de social (cartao editavel, grava na tarefa real),
// contagem por status com link pro Kanban, captacoes audiovisuais e projetos por cliente.
// Tudo lido de carga.state; a unica gravacao daqui e o cartao de entrega (EntregaSocial).
import { useMemo, useState } from "react";
import {
  Clapperboard,
  FolderKanban,
  Instagram,
  LayoutGrid,
  ListChecks,
  Plus,
  Sparkles,
} from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Abrir, Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import {
  EntregaSocial,
  ehSocial,
  formatoLabel,
  novaEntrega,
  publicarBR,
  textoItem,
  type TarefaSocial,
} from "@/components/next/entrega-social";
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
.nxp-atalhos{display:flex;flex-wrap:wrap;gap:8px}
.nxp-proj{display:grid;gap:0}
.nxp-proj .p{display:grid;gap:6px;padding:10px 6px;border-top:1px solid var(--line)}
.nxp-proj .p:first-child{border-top:0}
.nxp-proj .h{display:flex;align-items:center;gap:8px;min-width:0}
.nxp-proj .h b{font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxp-proj .h span{font-size:11px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
.nxp-st{display:flex;flex-wrap:wrap;gap:8px}
.nxp-st button{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line);font-size:12.5px;color:var(--ink2);min-height:38px}
.nxp-st button:hover{background:var(--glass2);color:var(--ink)}
.nxp-st i{width:8px;height:8px;border-radius:50%;flex:none}
.nxp-st b{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--ink)}
.nxp-soc{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:9px 6px;border-top:1px solid var(--line);min-height:48px;cursor:pointer;border-radius:10px;text-align:left;width:100%}
.nxp-soc:first-child{border-top:0}
.nxp-soc:hover{background:var(--glass2)}
.nxp-soc .fmt{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;padding:4px 8px;border-radius:8px;background:var(--glass2);border:1px solid var(--line);color:var(--ink2);white-space:nowrap;min-width:64px;text-align:center}
.nxp-soc .t{min-width:0}
.nxp-soc .t b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxp-soc .t span{display:block;font-size:11.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxp-soc .d{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:11px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
.nxp-soc .d b{font-weight:600;color:var(--ink)}
.nxp-soc .d .late{color:var(--red);font-weight:600}
@media (max-width:900px){
  .nxp-kpis{grid-template-columns:repeat(2,1fr);gap:10px}.nxp-kpis .nx-kpi:last-child{grid-column:span 2}
  .nxp-soc{grid-template-columns:1fr auto;row-gap:4px}
  .nxp-soc .fmt{grid-column:1 / -1;justify-self:start;min-width:0}
}
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
  const [sel, setSel] = useState<{ t: TarefaSocial; nova: boolean } | null>(null);

  const v = useMemo(() => {
    const abertas = tarefas.filter(aberta);
    const porStatus: Record<string, number> = {};
    for (const s of ORDEM) porStatus[s] = 0;
    for (const t of tarefas) {
      const s = t.status && t.status in porStatus ? t.status : "backlog";
      porStatus[s] += 1;
    }
    const social = (abertas as TarefaSocial[])
      .filter(ehSocial)
      .sort(
        (a, b) => (a.publicarEm || "9999").localeCompare(b.publicarEm || "9999") || ordData(a, b),
      );
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
      social,
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

  const abrirCartao = (t: Tarefa) => setSel({ t: t as TarefaSocial, nova: false });
  const novaEnt = () => setSel({ t: novaEntrega(), nova: true });

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
        {v.abertas.length} tarefa{v.abertas.length === 1 ? "" : "s"} aberta
        {v.abertas.length === 1 ? "" : "s"} de {tarefas.length}, contando cartões de projeto uma vez
        só.
      </p>

      <div className="nx-grid">
        <Card
          className="c12"
          title="Entregas de social"
          icon={<Instagram size={16} />}
          count={v.social.length}
          action={
            <button type="button" className="nx-btn" onClick={novaEnt}>
              <Plus size={14} /> Nova entrega
            </button>
          }
        >
          {v.social.length === 0 ? (
            <Vazio
              titulo="Nenhuma entrega de social aberta"
              texto="Uma tarefa vira entrega quando ganha formato ou data de publicação. Crie a primeira em Nova entrega ou abra uma tarefa do checklist abaixo."
            />
          ) : (
            <div>
              {v.social.map((t) => {
                const ck = Array.isArray(t.checklist) ? t.checklist : [];
                const feitos = ck.filter((i) => i && i.done).length;
                const late = !!t.data && t.data < hoje;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="nxp-soc"
                    onClick={() => abrirCartao(t)}
                    title={ck.map(textoItem).join(", ") || undefined}
                  >
                    <span className="fmt">{formatoLabel(t.formato) || "post"}</span>
                    <span className="t">
                      <b>{t.title || "(sem título)"}</b>
                      <span>
                        {[
                          nomes[t.clienteId || ""],
                          t.resp,
                          STATUS_LABEL[t.status || ""],
                          ck.length ? `checklist ${feitos}/${ck.length}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="d">
                      <b>
                        {t.publicarEm
                          ? `publica ${publicarBR(t.publicarEm)}`
                          : "sem data de publicação"}
                      </b>
                      <span className={late ? "late" : ""}>
                        {t.data ? `prazo ${dataBR(t.data).slice(0, 5)}` : "sem prazo"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

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
          title="Por status"
          icon={<LayoutGrid size={16} />}
          action={<Abrir onClick={() => abrirApp("tarefas")}>Kanban completo</Abrir>}
        >
          {tarefas.length === 0 ? (
            <Vazio
              titulo="Nenhuma tarefa no estado"
              texto="Crie a primeira no Kanban do clássico."
            />
          ) : (
            <div className="nxp-st">
              {ORDEM.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => abrirApp("tarefas")}
                  title={`${STATUS_LABEL[s]}: abrir no Kanban`}
                >
                  <i style={{ background: STATUS_COR[s] }} />
                  {STATUS_LABEL[s]}
                  <b>{v.porStatus[s]}</b>
                </button>
              ))}
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
              texto="Abra uma entrega de social e adicione itens no cartão."
            />
          ) : (
            <div>
              {v.comChecklist.slice(0, 8).map((t) => {
                const late = !!t.data && t.data < hoje;
                const projeto = String(t.id).startsWith("pj:");
                return (
                  <div
                    key={t.id}
                    className="nx-row clk"
                    onClick={() => (projeto ? abrirApp("projetos") : abrirCartao(t))}
                    title={
                      projeto ? "Cartão de projeto: abre no quadro de Projetos" : "Abrir cartão"
                    }
                  >
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
        </Card>
      </div>

      <EntregaSocial tarefa={sel?.t || null} nova={!!sel?.nova} onFechar={() => setSel(null)} />
    </>
  );
}
