// Area Atividades do /painel (menu WorkFlowArk 2, 21/09/2026): a lista real de tarefas da
// carteira agrupada por status, filtro "minhas" ou "todas", concluir grava item unico
// (concluir() do contexto). O Quadro (arrasto) continua no legado ate migrar; o botao leva
// pra la pela ponte. Nada e criado sozinho.
import { useMemo, useState } from "react";
import { KanbanSquare, ListTodo } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, TarefaLinha, Vazio } from "@/components/next/ui";
import { STATUS_COR, STATUS_LABEL, aberta, ehMinha, hojeSP } from "@/components/next/dados";

const ORDEM = ["andamento", "aprovacao", "homologcli", "iniciar", "backlog"] as const;

const CSS = `
.nxv-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px}
.nxv-seg{display:inline-flex;background:var(--glass);border:1px solid var(--line);border-radius:999px;padding:3px}
.nxv-seg button{padding:6px 12px;border-radius:999px;font-size:12.5px;color:var(--ink2)}
.nxv-seg button.on{background:var(--glass2);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line2)}
.nxv-kpis{display:grid;gap:12px;grid-template-columns:repeat(4,1fr);margin-bottom:14px}
.nxv-grp{display:grid;gap:14px}
.nxv-h{display:flex;align-items:center;gap:8px}
.nxv-h i{width:8px;height:8px;border-radius:50%;display:inline-block}
@media (max-width:900px){.nxv-kpis{grid-template-columns:repeat(2,1fr)}}
`;

export function Atividades() {
  const { tarefas, member, nomes, concluir, abrirApp } = useNext();
  const [so, setSo] = useState<"minhas" | "todas">(member?.full_name ? "minhas" : "todas");
  const hoje = hojeSP();
  const base = useMemo(
    () => tarefas.filter(aberta).filter((t) => (so === "minhas" ? ehMinha(t, member) : true)),
    [tarefas, so, member],
  );
  const atrasadas = base.filter((t) => t.data && t.data < hoje).length;
  const paraHoje = base.filter((t) => t.data === hoje).length;
  const emAprov = base.filter((t) => t.status === "aprovacao" || t.status === "homologcli").length;
  const grupos = ORDEM.map((st) => ({
    st,
    itens: base
      .filter((t) => (t.status || "backlog") === st)
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999")),
  })).filter((g) => g.itens.length);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nxv-top">
        <div className="nxv-seg">
          <button type="button" className={so === "minhas" ? "on" : ""} onClick={() => setSo("minhas")}>Minhas</button>
          <button type="button" className={so === "todas" ? "on" : ""} onClick={() => setSo("todas")}>Toda a carteira</button>
        </div>
        <button type="button" className="nx-btn" style={{ marginLeft: "auto" }} onClick={() => abrirApp("tarefas")}>
          <KanbanSquare size={15} /> Abrir o quadro
        </button>
        <button type="button" className="nx-btn yel" onClick={() => abrirApp("tarefas")}>+ Tarefa</button>
      </div>
      <div className="nxv-kpis">
        <Kpi label="Abertas" value={base.length} detail={so === "minhas" ? "no seu nome" : "na carteira"} />
        <Kpi label="Atrasadas" value={atrasadas} tone={atrasadas ? "hot" : undefined} detail={atrasadas ? "precisa destravar" : "tudo em dia"} />
        <Kpi label="Vencem hoje" value={paraHoje} tone={paraHoje ? "warn" : undefined} detail="foco do dia" />
        <Kpi label="Em aprovação" value={emAprov} detail="interna ou do cliente" />
      </div>
      {grupos.length === 0 ? (
        <Vazio titulo="Nada aberto" texto={so === "minhas" ? "Nenhuma tarefa no seu nome. Veja a carteira toda." : "Nenhuma tarefa aberta na carteira."} />
      ) : (
        <div className="nxv-grp">
          {grupos.map((g) => (
            <Card
              key={g.st}
              title={STATUS_LABEL[g.st] || g.st}
              icon={<span className="nxv-h"><i style={{ background: STATUS_COR[g.st] || "#888" }} /></span>}
              count={g.itens.length}
              solid
            >
              {g.itens.map((t) => (
                <TarefaLinha
                  key={t.id}
                  t={t}
                  cliente={nomes[t.clienteId || ""]}
                  onConcluir={concluir}
                  mostrarResp={so === "todas"}
                  onAbrir={() => abrirApp("tarefas")}
                />
              ))}
            </Card>
          ))}
        </div>
      )}
      <p style={{ color: "var(--ink3)", fontSize: 12, marginTop: 14, display: "flex", gap: 6, alignItems: "center" }}>
        <ListTodo size={13} /> Concluir aqui grava só o item, como no app. O arrasto entre colunas fica no quadro até migrar.
      </p>
    </>
  );
}
