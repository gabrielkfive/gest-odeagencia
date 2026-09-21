// Area Aprovacoes do /next: homologacao interna, homologacao do cliente e propostas de
// agente pendentes. Unica area que grava: aprovar usa concluir() do contexto e devolver
// grava item unico em wfa-tarefas com status "andamento" (servidor mescla por id).
// Cartao de projeto (pj:) nao grava daqui: vai pro quadro de Projetos.
import { useMemo, useState } from "react";
import { Bot, CheckSquare, Link2, UserCheck, Users } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import {
  STATUS_COR,
  dataBR,
  filaSocial,
  hojeSP,
  salvarTarefa,
  type Tarefa,
} from "@/components/next/dados";

const CSS = `
.nxa-kpis{display:grid;gap:14px;grid-template-columns:repeat(4,1fr)}
.nxa-row{display:grid;grid-template-columns:8px 1fr auto;gap:10px;align-items:center;padding:10px 6px;border-top:1px solid var(--line)}
.nxa-row:first-child{border-top:0}
.nxa-row .dot{width:8px;height:8px;border-radius:50%}
.nxa-row .t{min-width:0}
.nxa-row .t b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxa-row .t span{display:block;font-size:11.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxa-acts{display:flex;gap:6px;align-items:center}
.nxa-acts .nx-btn{min-height:32px;padding:6px 10px;font-size:12px}
.nxa-acts .nx-btn.ok{background:var(--green);color:#111}
.nxa-acts .busy{opacity:.5;pointer-events:none}
.nxa-wait{font-size:11px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
.nxa-wait.late{color:var(--red);font-weight:600}
.nxa-fluxo{display:flex;flex-wrap:wrap;gap:8px}
@media (max-width:900px){
  .nxa-kpis{grid-template-columns:repeat(2,1fr);gap:10px}
  .nxa-row{grid-template-columns:8px 1fr;row-gap:6px}
  .nxa-row .nxa-acts{grid-column:2}
}
`;

const ordData = (a: { data?: string }, b: { data?: string }) =>
  (a.data || "9999").localeCompare(b.data || "9999");

// Dias inteiros entre a entrada em homologacao e agora. Sem aprovacaoEm nao ha como saber.
function diasEsperando(t: Tarefa, agoraMs: number): number | null {
  const ms = t.aprovacaoEm ? Date.parse(String(t.aprovacaoEm)) : NaN;
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((agoraMs - ms) / 86400000));
}

function Linha({
  t,
  cliente,
  hoje,
  agoraMs,
  onAprovar,
  onDevolver,
  abrirApp,
}: {
  t: Tarefa;
  cliente?: string;
  hoje: string;
  agoraMs: number;
  onAprovar: (t: Tarefa) => Promise<void>;
  onDevolver: (t: Tarefa) => Promise<void>;
  abrirApp: (p: string) => void;
}) {
  const [busy, setBusy] = useState<"" | "ok" | "dev">("");
  const projeto = String(t.id).startsWith("pj:");
  const dias = diasEsperando(t, agoraMs);
  const late = !!t.data && t.data < hoje;
  const roda = async (qual: "ok" | "dev", fn: (t: Tarefa) => Promise<void>) => {
    setBusy(qual);
    try {
      await fn(t);
    } catch {
      /* o contexto ja avisou por toast */
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="nxa-row">
      <span className="dot" style={{ background: STATUS_COR[t.status || "aprovacao"] }} />
      <span className="t">
        <b>{t.title || "(sem título)"}</b>
        <span>
          {[
            cliente,
            t.resp ? `resp. ${t.resp}` : "sem responsável",
            t.data ? `prazo ${dataBR(t.data)}${late ? " (vencido)" : ""}` : "sem prazo",
          ].join(" · ")}
        </span>
      </span>
      <span className="nxa-acts">
        <span
          className={`nxa-wait ${dias !== null && dias >= 3 ? "late" : ""}`}
          title={
            t.aprovacaoEm
              ? `Entrou em homologação em ${dataBR(String(t.aprovacaoEm))}`
              : "A tarefa não tem carimbo de entrada em homologação (aprovacaoEm)"
          }
        >
          {dias === null
            ? "espera sem registro"
            : dias === 0
              ? "hoje"
              : `${dias} dia${dias === 1 ? "" : "s"}`}
        </span>
        {projeto ? (
          <button
            type="button"
            className="nx-btn ghost"
            onClick={() => abrirApp("projetos")}
            title="Cartão de projeto: a decisão é feita no quadro de Projetos"
          >
            abrir no quadro de Projetos
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`nx-btn ok ${busy ? "busy" : ""}`}
              onClick={() => roda("ok", onAprovar)}
              title="Aprovar: move para Concluído (grava no Kanban)"
            >
              {busy === "ok" ? "salvando" : "Aprovar"}
            </button>
            <button
              type="button"
              className={`nx-btn ghost ${busy ? "busy" : ""}`}
              onClick={() => roda("dev", onDevolver)}
              title="Devolver: volta para Em andamento (grava no Kanban)"
            >
              {busy === "dev" ? "salvando" : "Devolver"}
            </button>
          </>
        )}
      </span>
    </div>
  );
}

export function Aprovacoes() {
  const { carga, nomes, tarefas, concluir, toast, recarregar, abrirApp } = useNext();
  const st = useMemo(() => carga?.state || {}, [carga]);
  const hoje = hojeSP();
  const agoraMs = Date.now();

  const v = useMemo(() => {
    const interna = tarefas.filter((t) => t.status === "aprovacao").sort(ordData);
    const cliente = tarefas.filter((t) => t.status === "homologcli").sort(ordData);
    const fila = filaSocial(st).filter((p) => p.status === "pendente");
    const todas = [...interna, ...cliente];
    const antigas = todas.filter((t) => {
      const d = diasEsperando(t, agoraMs);
      return d !== null && d >= 3;
    }).length;
    const semCarimbo = todas.filter((t) => diasEsperando(t, agoraMs) === null).length;
    return { interna, cliente, fila, antigas, semCarimbo };
  }, [tarefas, st, agoraMs]);

  const devolver = async (t: Tarefa) => {
    try {
      await salvarTarefa({ ...t, status: "andamento" });
      toast(`Devolvida para andamento: ${t.title || "tarefa"}`);
      await recarregar();
    } catch (e) {
      toast(`Não salvou: ${(e as Error).message}`);
      throw e;
    }
  };

  const temFila = "wfa-social-fila" in st;
  const total = v.interna.length + v.cliente.length + v.fila.length;

  const lista = (lst: Tarefa[], vazio: string) =>
    lst.length === 0 ? (
      <Vazio titulo={vazio} />
    ) : (
      <div>
        {lst.map((t) => (
          <Linha
            key={t.id}
            t={t}
            cliente={nomes[t.clienteId || ""]}
            hoje={hoje}
            agoraMs={agoraMs}
            onAprovar={concluir}
            onDevolver={devolver}
            abrirApp={abrirApp}
          />
        ))}
      </div>
    );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Aprovações</h1>
      <p className="nx-sub">
        {total === 0
          ? "Nada aguardando decisão agora."
          : `${total} item${total === 1 ? "" : "s"} aguardando decisão. Aprovar conclui a tarefa; devolver manda de volta para Em andamento. As duas ações gravam no mesmo Kanban do clássico.`}
      </p>

      <div className="nx-grid">
        <div className="c12 nxa-kpis">
          <Kpi
            label="Homologação interna"
            value={v.interna.length}
            tone={v.interna.length ? "hot" : undefined}
            title="Tarefas com status Homologação (aprovacao), agora, equipe inteira."
          />
          <Kpi
            label="Homologação do cliente"
            value={v.cliente.length}
            title="Tarefas com status Homologação do cliente (homologcli), agora."
          />
          <Kpi
            label="Propostas de agente"
            value={temFila ? v.fila.length : "sem acesso"}
            title="Itens da fila do agente social (wfa-social-fila) com status pendente."
            onOpen={
              temFila
                ? () => {
                    window.location.href = "/postagens";
                  }
                : undefined
            }
          />
          <Kpi
            label="Esperando 3 dias ou mais"
            value={v.antigas}
            tone={v.antigas ? "warn" : "ok"}
            detail={v.semCarimbo ? `${v.semCarimbo} sem registro de entrada` : undefined}
            title="Tarefas em homologação cujo carimbo aprovacaoEm tem 3 dias ou mais. Tarefa sem carimbo não entra na conta."
          />
        </div>

        <Card
          className="c6"
          title="Homologação interna"
          icon={<CheckSquare size={16} />}
          count={v.interna.length}
        >
          {lista(v.interna, "Nada em homologação interna")}
        </Card>

        <Card
          className="c6"
          title="Homologação do cliente"
          icon={<UserCheck size={16} />}
          count={v.cliente.length}
        >
          {lista(v.cliente, "Nada em homologação do cliente")}
          <div className="nx-h2" style={{ marginTop: 4 }}>
            Fluxo do cliente
          </div>
          <div className="nxa-fluxo">
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("tarefas")}>
              <Link2 size={14} /> Gerar link de aprovação (no cartão da tarefa)
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("cliente")}>
              <Users size={14} /> Portal do cliente (Área do Cliente)
            </button>
          </div>
          <p className="nx-mute" style={{ fontSize: 11.5, margin: 0 }}>
            O link de aprovação é gerado no clássico (create-approval) e o cliente decide sem conta.
            Aqui só aparece o status que voltou para a tarefa.
          </p>
        </Card>

        <Card
          className="c12"
          title="Propostas de agente pendentes"
          icon={<Bot size={16} />}
          count={temFila ? v.fila.length : undefined}
          action={
            <a className="nx-link" href="/postagens">
              Fila do agente social
            </a>
          }
        >
          {!temFila ? (
            <Vazio titulo="Sem acesso a este bloco" texto="A leitura não trouxe wfa-social-fila." />
          ) : v.fila.length === 0 ? (
            <Vazio
              titulo="Nenhuma proposta pendente"
              texto="O agente social só entra aqui quando gera algo e a decisão ainda não foi tomada."
            />
          ) : (
            <div>
              {v.fila.map((p) => (
                <a key={p.id} className="nx-row clk" href="/postagens">
                  <span className="dot" style={{ background: "var(--vio)" }} />
                  <span className="t">
                    <b>{p.tema || p.gancho || "Proposta de post"}</b>
                    <span>
                      {[
                        p.cliente || nomes[p.clienteId || ""],
                        p.formato,
                        p.date ? `para ${dataBR(p.date)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <Pill cor="var(--vio)">decidir em /postagens</Pill>
                </a>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
