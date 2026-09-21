// Area Relatorios do /next: foto do mes atual a partir das tarefas unificadas, com a regra
// de cada numero escrita no title e comparacao com o mes anterior pela mesma regra.
// Retrabalho nao existe no dado: a tela diz isso em vez de inventar.
import { useMemo } from "react";
import { BarChart3, Building2, CalendarRange, Info, PieChart, Users } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Vazio } from "@/components/next/ui";
import { STATUS_COR, STATUS_LABEL, TZ, aberta, hojeSP, type Tarefa } from "@/components/next/dados";

const CSS = `
.nxr-bars{display:flex;flex-direction:column;gap:9px}
.nxr-bar{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:8px;align-items:center}
.nxr-bar .l{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;margin-bottom:4px;min-width:0}
.nxr-bar .l span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxr-bar .n{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;text-align:right;color:var(--ink2);font-variant-numeric:tabular-nums}
.nxr-comp{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nxr-comp .b{padding:12px;border-radius:14px;background:var(--glass);border:1px solid var(--line)}
.nxr-comp .b small{display:block;color:var(--ink3);font-size:11px;letter-spacing:.08em;text-transform:uppercase}
.nxr-comp .b b{display:block;font-size:24px;font-weight:300;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.nxr-delta{font-size:12px;font-weight:600}
`;

const mesLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};
const mesAnteriorDe = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// Foto de um mes: concluidas com concluidaEm no mes; pontualidade so entre as que tem prazo.
function foto(tarefas: Tarefa[], mes: string) {
  const concluidas = tarefas.filter(
    (t) => t.status === "concluido" && String(t.concluidaEm || "").startsWith(mes),
  );
  const comPrazo = concluidas.filter((t) => t.data);
  const noPrazo = comPrazo.filter((t) => String(t.concluidaEm).slice(0, 10) <= String(t.data));
  return {
    concluidas: concluidas.length,
    comPrazo: comPrazo.length,
    noPrazo: noPrazo.length,
    pontualidade: comPrazo.length ? Math.round((noPrazo.length / comPrazo.length) * 100) : null,
  };
}

const delta = (a: number | null, b: number | null, unidade = "") => {
  if (a == null || b == null) return "sem base";
  const d = a - b;
  return `${d > 0 ? "+" : ""}${d}${unidade}`;
};

function Barras({
  itens,
  cor,
}: {
  itens: { label: string; n: number; cor?: string }[];
  cor?: string;
}) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  return (
    <div className="nxr-bars">
      {itens.map((i) => (
        <div key={i.label} className="nxr-bar">
          <div>
            <div className="l">
              <span>{i.label}</span>
            </div>
            <div className="nx-bar">
              <i
                style={{
                  width: `${Math.round((i.n / max) * 100)}%`,
                  background: i.cor || cor || "var(--yel)",
                }}
              />
            </div>
          </div>
          <span className="n">{i.n}</span>
        </div>
      ))}
    </div>
  );
}

function top10(abertas: Tarefa[], chave: (t: Tarefa) => string) {
  const m: Record<string, number> = {};
  for (const t of abertas) m[chave(t)] = (m[chave(t)] || 0) + 1;
  return Object.entries(m)
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, 10);
}

export function Relatorios() {
  const { tarefas, nomes, abrirApp } = useNext();
  const hoje = hojeSP();
  const mes = hoje.slice(0, 7);
  const mesAnt = mesAnteriorDe(mes);
  const hojeLonga = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

  const v = useMemo(() => {
    const atual = foto(tarefas, mes);
    const anterior = foto(tarefas, mesAnt);
    const abertas = tarefas.filter(aberta);
    const semConclusao = tarefas.filter((t) => t.status === "concluido" && !t.concluidaEm).length;
    const ordem = ["backlog", "iniciar", "andamento", "aprovacao", "homologcli"];
    const porStatus = ordem
      .map((s) => ({
        label: STATUS_LABEL[s],
        n: abertas.filter((t) => (t.status || "backlog") === s).length,
        cor: STATUS_COR[s],
      }))
      .concat(
        Object.keys(
          abertas.reduce<Record<string, 1>>((m, t) => {
            const s = t.status || "backlog";
            if (!ordem.includes(s)) m[s] = 1;
            return m;
          }, {}),
        ).map((s) => ({
          label: s,
          n: abertas.filter((t) => t.status === s).length,
          cor: "var(--ink3)",
        })),
      )
      .filter((i) => i.n > 0);
    return {
      atual,
      anterior,
      abertas,
      semConclusao,
      porStatus,
      porResp: top10(abertas, (t) => t.resp || t.resps?.[0] || "Sem responsável"),
      porCliente: top10(abertas, (t) => (t.clienteId && nomes[t.clienteId]) || "Sem cliente"),
      atrasadas: abertas.filter((t) => t.data && t.data < hoje).length,
    };
  }, [tarefas, nomes, mes, mesAnt, hoje]);

  const nomeMes = mesLabel(mes);
  const nomeAnt = mesLabel(mesAnt);
  const semDado = tarefas.length === 0;

  return (
    <>
      <style>{CSS}</style>
      <h1 className="nx-h1">Relatórios</h1>
      <p className="nx-sub">
        {semDado
          ? "Nenhuma tarefa carregada, então não há o que medir."
          : `Foto de ${nomeMes} até ${hojeLonga}, comparada com ${nomeAnt} pela mesma regra. Cada número explica sua definição ao passar o mouse.`}
      </p>

      <div className="nx-grid">
        <div className="c3 half">
          <Kpi
            label="Concluídas no mês"
            value={v.atual.concluidas}
            tone={v.atual.concluidas ? "ok" : undefined}
            detail={`${delta(v.atual.concluidas, v.anterior.concluidas)} vs ${nomeAnt}`}
            title={`Tarefas com status concluído e data de conclusão (concluidaEm) dentro de ${nomeMes}. Tarefas de projeto não guardam concluidaEm e ficam fora.${v.semConclusao ? ` ${v.semConclusao} concluída(s) sem data de conclusão também ficam fora.` : ""}`}
            onOpen={() => abrirApp("meumes")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Pontualidade"
            value={v.atual.pontualidade == null ? "sem base" : v.atual.pontualidade}
            unit={v.atual.pontualidade == null ? undefined : "%"}
            detail={
              v.atual.pontualidade == null
                ? "nenhuma concluída com prazo no mês"
                : `${v.atual.noPrazo} de ${v.atual.comPrazo} no prazo, ${delta(v.atual.pontualidade, v.anterior.pontualidade, " pts")} vs ${nomeAnt}`
            }
            title={`Entre as concluídas em ${nomeMes} que tinham prazo, quantas foram concluídas até o dia do prazo (concluidaEm menor ou igual a data). Concluídas sem prazo não entram.`}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Abertas agora"
            value={v.abertas.length}
            detail={`${v.atrasadas} atrasada${v.atrasadas === 1 ? "" : "s"}`}
            title="Tarefas com status diferente de concluído, contando as de projeto fora do backlog uma vez só. Foto de agora, não do mês."
            onOpen={() => abrirApp("tarefas")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Retrabalho"
            value="sem dado"
            detail="não existe no registro"
            title="O sistema não guarda quantas vezes uma tarefa voltou de homologação. Sem esse campo não dá para medir retrabalho; o número não é zero, é desconhecido."
          />
        </div>

        <Card
          className="c4"
          title="Abertas por status"
          icon={<PieChart size={16} />}
          count={v.abertas.length}
        >
          {v.porStatus.length === 0 ? (
            <Vazio titulo="Nenhuma tarefa aberta" />
          ) : (
            <Barras itens={v.porStatus} />
          )}
        </Card>

        <Card
          className="c4"
          title="Abertas por responsável"
          icon={<Users size={16} />}
          action={
            <span className="nx-mute" style={{ fontSize: 11 }}>
              top 10
            </span>
          }
        >
          {v.porResp.length === 0 ? (
            <Vazio titulo="Nenhuma tarefa aberta" />
          ) : (
            <Barras itens={v.porResp} cor="var(--blue)" />
          )}
        </Card>

        <Card
          className="c4"
          title="Abertas por cliente"
          icon={<Building2 size={16} />}
          action={
            <span className="nx-mute" style={{ fontSize: 11 }}>
              top 10
            </span>
          }
        >
          {v.porCliente.length === 0 ? (
            <Vazio titulo="Nenhuma tarefa aberta" />
          ) : (
            <Barras itens={v.porCliente} cor="var(--vio)" />
          )}
        </Card>

        <Card
          className="c8"
          title={`${nomeMes} contra ${nomeAnt}`}
          icon={<CalendarRange size={16} />}
        >
          {semDado ? (
            <Vazio titulo="Sem tarefas para comparar" />
          ) : (
            <div className="nxr-comp">
              <div
                className="b"
                title={`Concluídas com concluidaEm em ${nomeMes} e em ${nomeAnt}, mesma regra.`}
              >
                <small>Concluídas</small>
                <b>
                  {v.atual.concluidas}{" "}
                  <span className="nx-mute" style={{ fontSize: 14 }}>
                    vs {v.anterior.concluidas}
                  </span>
                </b>
                <span
                  className="nxr-delta"
                  style={{
                    color:
                      v.atual.concluidas >= v.anterior.concluidas ? "var(--green)" : "var(--red)",
                  }}
                >
                  {delta(v.atual.concluidas, v.anterior.concluidas)}
                </span>
              </div>
              <div
                className="b"
                title="Pontualidade nos dois meses, só entre concluídas com prazo. Sem base quando nenhuma concluída teve prazo."
              >
                <small>Pontualidade</small>
                <b>
                  {v.atual.pontualidade == null ? "sem base" : `${v.atual.pontualidade}%`}{" "}
                  <span className="nx-mute" style={{ fontSize: 14 }}>
                    vs{" "}
                    {v.anterior.pontualidade == null ? "sem base" : `${v.anterior.pontualidade}%`}
                  </span>
                </b>
                <span
                  className="nxr-delta"
                  style={{
                    color:
                      (v.atual.pontualidade ?? 0) >= (v.anterior.pontualidade ?? 0)
                        ? "var(--green)"
                        : "var(--red)",
                  }}
                >
                  {delta(v.atual.pontualidade, v.anterior.pontualidade, " pts")}
                </span>
              </div>
              <div
                className="b"
                title={`Concluídas com prazo em ${nomeMes} e em ${nomeAnt}: a base da pontualidade.`}
              >
                <small>Com prazo</small>
                <b>
                  {v.atual.comPrazo}{" "}
                  <span className="nx-mute" style={{ fontSize: 14 }}>
                    vs {v.anterior.comPrazo}
                  </span>
                </b>
                <span className="nxr-delta nx-mute">
                  {delta(v.atual.comPrazo, v.anterior.comPrazo)}
                </span>
              </div>
              <div
                className="b"
                title="Período: mês atual do primeiro dia até hoje; mês anterior inteiro. A comparação é de mês parcial contra mês cheio."
              >
                <small>Período</small>
                <b style={{ fontSize: 14, fontWeight: 500 }}>
                  01/{mes.slice(5, 7)} a {hoje.slice(8, 10)}/{hoje.slice(5, 7)}
                </b>
                <span className="nx-mute" style={{ fontSize: 12 }}>
                  contra {nomeAnt} inteiro
                </span>
              </div>
            </div>
          )}
        </Card>

        <Card className="c4" title="Ler no clássico" icon={<BarChart3 size={16} />}>
          <p className="nx-mute" style={{ margin: 0, fontSize: 12.5 }}>
            Meu Mês fecha o mês por pessoa; All Hands é a leitura da equipe inteira. Os dois
            continuam no clássico.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="nx-btn" onClick={() => abrirApp("meumes")}>
              Meu Mês
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("allhands")}>
              All Hands
            </button>
          </div>
          <div className="nx-alert" style={{ fontSize: 12 }}>
            <Info size={14} style={{ flex: "none", color: "var(--ink3)" }} />
            <span>
              Mês parcial contra mês inteiro. Retrabalho e horas por tarefa não entram nesta foto.
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
