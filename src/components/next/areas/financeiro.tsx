// Area Financeiro do /next: leitura de wfa-planilha (mes ativo) e wfa-cobranca (mensalidades).
// Os blocos so chegam para gestor, financeiro e admin; sem bloco a tela diz "sem acesso",
// nunca zero. Cobrar (WhatsApp), marcar pago e lancar continuam no classico.
import { useMemo } from "react";
import { Lock, MessageCircle, Receipt, Wallet } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import { TZ, brl, financeiro } from "@/components/next/dados";

export function Financeiro() {
  const { carga, nomes, abrirApp, member } = useNext();
  const st = carga?.state || {};
  const fin = useMemo(() => financeiro(st, nomes), [st, nomes]);
  const temPlan = !!st["wfa-planilha"];
  const temCob = !!st["wfa-cobranca"];
  const mesNome = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });

  if (!fin.disponivel) {
    return (
      <>
        <h1 className="nx-h1">Financeiro</h1>
        <p className="nx-sub">Planilha do mês e cobranças por cliente, em leitura.</p>
        <div className="nx-grid">
          <Card className="c12" title="Sem acesso a este bloco" icon={<Lock size={16} />}>
            <Vazio
              titulo="O servidor não enviou os blocos financeiros para o seu papel"
              texto={`Planilha e cobrança chegam só para gestor, financeiro e admin${member?.role ? ` (você está como ${member.role})` : ""}. Se precisar, peça o ajuste de papel; enquanto isso o clássico segue com a mesma regra.`}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="nx-btn ghost" onClick={() => abrirApp("financeiro")}>
                Abrir Financeiro no clássico
              </button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const cobradas = fin.cobranca.filter((c) => c.cobrado);
  const pendentes = fin.cobranca.filter((c) => !c.cobrado);
  const valorPend = pendentes.reduce((a, c) => a + c.valor, 0);
  const valorCob = cobradas.reduce((a, c) => a + c.valor, 0);

  return (
    <>
      <h1 className="nx-h1">Financeiro</h1>
      <p className="nx-sub">
        {temPlan ? `Planilha de ${fin.mesNome}` : "Planilha do mês não recebida"}
        {temCob
          ? `, ${fin.cobranca.length} mensalidade${fin.cobranca.length === 1 ? "" : "s"} cadastrada${fin.cobranca.length === 1 ? "" : "s"}`
          : ", cobrança não recebida"}
        . Leitura apenas; lançar, cobrar e acertar continuam no clássico.
      </p>

      <div className="nx-grid">
        <div className="c3 half">
          <Kpi
            label="A receber no mês"
            value={temPlan ? brl(fin.receber) : "sem dado"}
            detail={temPlan ? fin.mesNome : "planilha não recebida"}
            title={`Soma do campo valor das receitas da planilha do mês ativo (${fin.mesNome || "mês ativo"}) em wfa-planilha. Não separa recebido de previsto.`}
            onOpen={() => abrirApp("financeiro")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Custos"
            value={temPlan ? brl(fin.custos) : "sem dado"}
            detail={temPlan ? "receitas + contas a pagar" : "planilha não recebida"}
            title="Soma do campo custo das receitas mais o valor das contas a pagar do mês ativo em wfa-planilha."
            onOpen={() => abrirApp("financeiro")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Sobra"
            value={temPlan ? brl(fin.sobra) : "sem dado"}
            tone={!temPlan ? undefined : fin.sobra < 0 ? "warn" : "ok"}
            detail={temPlan ? "a receber menos custos" : "planilha não recebida"}
            title="A receber no mês menos custos, como calculado acima. Não é margem por cliente nem caixa: é o saldo da planilha do mês."
            onOpen={() => abrirApp("financeiro")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Mensalidades"
            value={temCob ? `${cobradas.length}/${fin.cobranca.length}` : "sem dado"}
            tone={temCob && pendentes.length ? "warn" : undefined}
            detail={
              temCob
                ? `${pendentes.length} pendente${pendentes.length === 1 ? "" : "s"}, ${brl(valorPend)}`
                : "cobrança não recebida"
            }
            title={`Cobradas sobre o total de clientes com valor em wfa-cobranca. Cobrada = marcada com cobradoMes igual a ${mesNome}.`}
            onOpen={() => abrirApp("cobranca")}
          />
        </div>

        <Card
          className="c8"
          title="Cobrança por cliente"
          icon={<Receipt size={16} />}
          count={fin.cobranca.length}
          action={
            <button type="button" className="nx-link" onClick={() => abrirApp("cobranca")}>
              Cobranças
            </button>
          }
        >
          {!temCob ? (
            <Vazio
              titulo="Bloco de cobrança não recebido"
              texto="Só a planilha chegou para o seu papel."
            />
          ) : fin.cobranca.length === 0 ? (
            <Vazio
              titulo="Sem cobranças cadastradas"
              texto="Clientes com valor de mensalidade aparecem aqui quando cadastrados no clássico."
            />
          ) : (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th className="num" title="Campo valor da mensalidade em wfa-cobranca">
                      Mensalidade
                    </th>
                    <th
                      title={`Cobrado = marcado em ${mesNome}; pendente = ainda não marcado neste mês`}
                    >
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fin.cobranca.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b style={{ fontWeight: 500 }}>{c.nome}</b>
                      </td>
                      <td className="num">{brl(c.valor)}</td>
                      <td>
                        {c.cobrado ? (
                          <Pill cor="var(--green)">Cobrado</Pill>
                        ) : (
                          <Pill cor="var(--yel)">Pendente</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="nx-mute" style={{ fontSize: 12 }}>
                      Total
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {brl(valorCob + valorPend)}
                    </td>
                    <td className="nx-mute" style={{ fontSize: 12 }}>
                      {brl(valorCob)} cobrado, {brl(valorPend)} pendente
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card className="c4" title="Ações no clássico" icon={<Wallet size={16} />}>
          <p className="nx-mute" style={{ margin: 0, fontSize: 12.5 }}>
            Disparo de cobrança por WhatsApp, marcar mensalidade como cobrada, lançamentos da
            planilha e acerto de contas continuam no WorkFlowArk clássico. Aqui é só leitura.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" className="nx-btn" onClick={() => abrirApp("cobranca")}>
              <MessageCircle size={14} /> Cobranças
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("financeiro")}>
              <Wallet size={14} /> Planilha do mês
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("acerto")}>
              Acerto de contas
            </button>
          </div>
          <p className="nx-mute" style={{ margin: 0, fontSize: 11.5 }}>
            Margem por cliente, ticket médio e capacidade não aparecem aqui: o dado por cliente
            ainda não está ligado à planilha.
          </p>
        </Card>
      </div>
    </>
  );
}
