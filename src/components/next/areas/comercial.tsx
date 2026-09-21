// Area Comercial do /next: funil do CRM (wfa-crm) em leitura. Nada e gravado aqui;
// mover lead, proposta e contrato continuam no app classico (abrirApp).
// `stage` e numero (0 Prospecção ... 5 Perdido); aberto = stage < 4.
import { useMemo } from "react";
import {
  AlertTriangle,
  CalendarClock,
  FileSignature,
  FileText,
  Filter,
  Handshake,
} from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Abrir, Card, Kpi, Vazio } from "@/components/next/ui";
import {
  CRM_STAGES,
  TZ,
  brl,
  dataBR,
  hojeSP,
  leadAberto,
  leadEtapa,
  leads,
  type Lead,
} from "@/components/next/dados";

const num = (v: unknown) => Number(v) || 0;

function LeadLinha({ l, onAbrir, hoje }: { l: Lead; onAbrir: () => void; hoje: string }) {
  const et = leadEtapa(l);
  const vencido = !!l.due && l.due < hoje;
  return (
    <div className="nx-row clk" onClick={onAbrir}>
      <span className="dot" style={{ background: et.cor }} />
      <span className="t">
        <b>{l.nm || "(lead sem nome)"}</b>
        <span>
          {[et.label, l.resp, num(l.val) ? brl(num(l.val)) : null, l.next]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className={`m ${vencido ? "late" : ""}`}>{l.due ? dataBR(l.due) : "sem data"}</span>
    </div>
  );
}

export function Comercial() {
  const { carga, abrirApp } = useNext();
  const st = carga?.state || {};
  const hoje = hojeSP();
  const mes = hoje.slice(0, 7);
  const mesNome = new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });

  const v = useMemo(() => {
    const todos = leads(st);
    const abertos = todos.filter(leadAberto);
    const ordDue = (a: Lead, b: Lead) =>
      String(a.due || "9999").localeCompare(String(b.due || "9999"));
    const d7 = new Date();
    d7.setDate(d7.getDate() + 7);
    const lim7 = d7.toLocaleDateString("en-CA", { timeZone: TZ });
    const emNegoc = abertos.filter((l) => Number(l.stage) === 2 || Number(l.stage) === 3);
    const fechados = todos.filter((l) => Number(l.stage) === 4);
    const carimbo = (l: Lead) => String(l.up || (l as Lead & { created?: string }).created || "");
    const fechadosMes = fechados.filter((l) => carimbo(l).startsWith(mes));
    const fechadosSemData = fechados.filter((l) => !carimbo(l)).length;
    const funil = CRM_STAGES.map((s) => {
      const ls = todos.filter((l) => (Number(l.stage) || 0) === s.idx);
      return { ...s, leads: ls, total: ls.reduce((a, l) => a + num(l.val), 0) };
    });
    return {
      todos,
      abertos,
      emNegoc,
      valorNegoc: emNegoc.reduce((a, l) => a + num(l.val), 0),
      fechadosMes,
      fechadosSemData,
      valorFechadosMes: fechadosMes.reduce((a, l) => a + num(l.val), 0),
      vencidos: abertos.filter((l) => l.due && l.due < hoje).sort(ordDue),
      proximos: abertos.filter((l) => l.due && l.due >= hoje && l.due <= lim7).sort(ordDue),
      semData: abertos.filter((l) => !l.due).length,
      funil,
      lim7,
    };
  }, [st, hoje, mes]);

  const irFunil = () => abrirApp("comercial");

  return (
    <>
      <h1 className="nx-h1">Comercial</h1>
      <p className="nx-sub">
        {v.todos.length === 0
          ? "Funil do CRM em leitura. Nenhum lead cadastrado até agora."
          : `${v.abertos.length} lead${v.abertos.length === 1 ? "" : "s"} em aberto no funil${v.semData ? `, ${v.semData} sem data de retorno` : ""}. Mover etapa, propostas e contratos continuam no clássico.`}
      </p>

      <div className="nx-grid">
        <div className="c3 half">
          <Kpi
            label="Leads abertos"
            value={v.abertos.length}
            detail={`de ${v.todos.length} no CRM`}
            title="Leads em Prospecção, Diagnóstico, Proposta ou Negociação (etapa abaixo de Fechado). Sem período: é a foto de agora."
            onOpen={irFunil}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Em proposta e negociação"
            value={brl(v.valorNegoc)}
            detail={`${v.emNegoc.length} lead${v.emNegoc.length === 1 ? "" : "s"}`}
            title="Soma do campo valor dos leads nas etapas Proposta e Negociação. Leads sem valor entram como zero."
            onOpen={irFunil}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Fechados no mês"
            value={v.fechadosMes.length}
            tone={v.fechadosMes.length ? "ok" : undefined}
            detail={
              v.fechadosMes.length
                ? brl(v.valorFechadosMes)
                : v.fechadosSemData
                  ? `${v.fechadosSemData} fechado${v.fechadosSemData === 1 ? "" : "s"} sem data`
                  : mesNome
            }
            title={`Leads na etapa Fechado cuja última alteração (carimbo up, ou data de criação) cai em ${mesNome}. É uma aproximação: o CRM não guarda a data do fechamento em si.`}
            onOpen={irFunil}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Follow-ups vencidos"
            value={v.vencidos.length}
            tone={v.vencidos.length ? "warn" : "ok"}
            detail={`próximos 7 dias: ${v.proximos.length}`}
            title="Leads em etapa aberta com data de retorno (due) anterior a hoje, no fuso de São Paulo."
            onOpen={irFunil}
          />
        </div>

        <Card
          className="c12"
          title="Funil por etapa"
          icon={<Filter size={16} />}
          count={v.todos.length}
          action={<Abrir onClick={irFunil}>Funil</Abrir>}
        >
          {v.todos.length === 0 ? (
            <Vazio
              titulo="Sem leads cadastrados"
              texto="Cadastre o primeiro lead no Funil do clássico e ele aparece aqui."
            />
          ) : (
            <div className="nx-cols">
              {v.funil.map((s) => (
                <div
                  key={s.key}
                  className="nx-col"
                  title={`${s.leads.length} lead(s) em ${s.label}, somando ${brl(s.total)} no campo valor`}
                >
                  <div className="h">
                    <i style={{ background: s.cor }} />
                    {s.label}
                    <b>{s.leads.length}</b>
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 300,
                      letterSpacing: "-.02em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {brl(s.total)}
                  </div>
                  {s.leads.slice(0, 3).map((l) => (
                    <div key={l.id} className="it">
                      {l.nm || "(sem nome)"}
                    </div>
                  ))}
                  {s.leads.length > 3 && (
                    <div className="nx-mute" style={{ fontSize: 11.5, marginTop: 6 }}>
                      +{s.leads.length - 3}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="c6"
          title="Follow-ups vencidos"
          icon={<AlertTriangle size={16} />}
          count={v.vencidos.length}
          action={<Abrir onClick={irFunil}>Funil</Abrir>}
        >
          {v.vencidos.length === 0 ? (
            <Vazio
              titulo={v.abertos.length ? "Nenhum retorno vencido" : "Sem leads abertos"}
              texto={
                v.abertos.length
                  ? "Todos os leads abertos estão com retorno em dia ou sem data."
                  : undefined
              }
            />
          ) : (
            <div>
              {v.vencidos.slice(0, 12).map((l) => (
                <LeadLinha key={l.id} l={l} hoje={hoje} onAbrir={irFunil} />
              ))}
              {v.vencidos.length > 12 && (
                <div className="nx-empty">+{v.vencidos.length - 12} no Funil</div>
              )}
            </div>
          )}
        </Card>

        <Card
          className="c6"
          title="Próximos 7 dias"
          icon={<CalendarClock size={16} />}
          count={v.proximos.length}
          action={<Abrir onClick={irFunil}>Funil</Abrir>}
        >
          {v.proximos.length === 0 ? (
            <Vazio
              titulo="Sem retornos marcados até o dia"
              texto={`Leads abertos com data entre hoje e ${dataBR(v.lim7)} aparecem aqui.`}
            />
          ) : (
            <div>
              {v.proximos.slice(0, 12).map((l) => (
                <LeadLinha key={l.id} l={l} hoje={hoje} onAbrir={irFunil} />
              ))}
              {v.proximos.length > 12 && (
                <div className="nx-empty">+{v.proximos.length - 12} no Funil</div>
              )}
            </div>
          )}
        </Card>

        <Card className="c12" title="Atalhos do clássico" icon={<Handshake size={16} />}>
          <p className="nx-mute" style={{ margin: 0, fontSize: 12.5 }}>
            Criar lead, mover etapa, gerar proposta e contrato ainda acontecem no WorkFlowArk
            clássico.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="nx-btn" onClick={irFunil}>
              <Filter size={14} /> Funil
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("propostas")}>
              <FileText size={14} /> Propostas
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("contratos")}>
              <FileSignature size={14} /> Contratos
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
