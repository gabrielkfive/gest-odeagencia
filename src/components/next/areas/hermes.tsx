// Area Hermes do /next: porta de entrada da inteligencia do produto. O resumo do dia e
// montado LOCALMENTE a partir de carga.state (sem chamar IA): frases com numeros reais e
// uma lista "o que eu faria agora" ordenada (atrasadas primeiro). Execucao autonoma continua
// passando pela fila com aprovacao humana (/agentes). Nada grava daqui.
import { useMemo } from "react";
import { Bot, ListOrdered, Sparkles } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import {
  aberta,
  dataBR,
  ehMinha,
  filaSocial,
  hojeSP,
  leadAberto,
  leadEtapa,
  leads,
  type Tarefa,
} from "@/components/next/dados";

const CSS = `
.nxh-kpis{display:grid;gap:14px;grid-template-columns:repeat(4,1fr)}
.nxh-resumo{display:grid;gap:8px}
.nxh-resumo p{margin:0;font-size:15px;line-height:1.5;color:var(--ink)}
.nxh-resumo p b{color:var(--yel);font-weight:600;font-variant-numeric:tabular-nums}
.nxh-btns{display:flex;flex-wrap:wrap;gap:8px}
.nxh-n{width:24px;height:24px;border-radius:8px;display:grid;place-items:center;background:var(--glass2);border:1px solid var(--line);font-size:11px;font-weight:700;flex:none;font-variant-numeric:tabular-nums}
.nxh-n.hot{background:var(--yel);color:#111;border-color:transparent}
.nxh-nota{padding:12px 14px;border-radius:14px;border:1px solid var(--line2);background:var(--glass);font-size:12.5px;color:var(--ink2);line-height:1.5}
.nxh-nota b{color:var(--ink)}
@media (max-width:900px){.nxh-kpis{grid-template-columns:repeat(2,1fr);gap:10px}.nxh-resumo p{font-size:14px}}
`;

type Acao = {
  id: string;
  tipo: "atraso" | "hoje" | "aprov" | "crm";
  titulo: string;
  sub: string;
  go: () => void;
};

const s = (n: number, um: string, mais: string) => (n === 1 ? um : mais);
const ordData = (a: { data?: string }, b: { data?: string }) =>
  (a.data || "9999").localeCompare(b.data || "9999");

export function Hermes() {
  const { carga, member, nomes, tarefas, abrirApp } = useNext();
  const st = useMemo(() => carga?.state || {}, [carga]);
  const hoje = hojeSP();
  const temCrm = "wfa-crm" in st;
  const temFila = "wfa-social-fila" in st;
  const primeiro = (member?.full_name || "").split(/\s+/)[0] || "";

  const v = useMemo(() => {
    const abertas = tarefas.filter(aberta);
    const atrasadas = abertas.filter((t) => t.data && t.data < hoje).sort(ordData);
    const paraHoje = abertas.filter((t) => t.data === hoje);
    const aprov = abertas.filter((t) => t.status === "aprovacao" || t.status === "homologcli");
    const fila = filaSocial(st).filter((p) => p.status === "pendente");
    const lds = leads(st).filter(leadAberto);
    const followVencidos = lds
      .filter((l) => l.due && l.due < hoje)
      .sort((a, b) => (a.due || "").localeCompare(b.due || ""));
    const minhasAtrasadas = atrasadas.filter((t) => ehMinha(t, member)).length;
    const minhasHoje = paraHoje.filter((t) => ehMinha(t, member)).length;

    const acoes: Acao[] = [];
    const subT = (t: Tarefa) =>
      [nomes[t.clienteId || ""], t.resp, t.data ? `prazo ${dataBR(t.data)}` : null]
        .filter(Boolean)
        .join(" · ");
    for (const t of atrasadas)
      acoes.push({
        id: `a:${t.id}`,
        tipo: "atraso",
        titulo: t.title || "(sem título)",
        sub: subT(t),
        go: () => abrirApp("tarefas"),
      });
    for (const t of paraHoje)
      acoes.push({
        id: `h:${t.id}`,
        tipo: "hoje",
        titulo: t.title || "(sem título)",
        sub: subT(t),
        go: () => abrirApp("tarefas"),
      });
    for (const t of aprov)
      acoes.push({
        id: `p:${t.id}`,
        tipo: "aprov",
        titulo: t.title || "(sem título)",
        sub: subT(t),
        go: () => {
          window.location.href = "/next/aprovacoes";
        },
      });
    for (const l of followVencidos)
      acoes.push({
        id: `c:${l.id}`,
        tipo: "crm",
        titulo: l.nm || "(lead sem nome)",
        sub: [leadEtapa(l).label, l.resp, l.due ? `follow-up ${dataBR(l.due)}` : null, l.next]
          .filter(Boolean)
          .join(" · "),
        go: () => {
          window.location.href = "/next/comercial";
        },
      });

    return {
      abertas,
      atrasadas,
      paraHoje,
      aprov,
      fila,
      followVencidos,
      minhasAtrasadas,
      minhasHoje,
      acoes,
      lds,
    };
  }, [tarefas, st, member, nomes, hoje, abrirApp]);

  // Frases do resumo: so entram as que tem base no dado (3 a 5).
  const frases: string[] = [];
  frases.push(
    v.abertas.length === 0
      ? "A equipe não tem tarefa aberta no estado agora."
      : `A equipe tem ${v.abertas.length} ${s(v.abertas.length, "tarefa aberta", "tarefas abertas")}, ${v.atrasadas.length} ${s(v.atrasadas.length, "atrasada", "atrasadas")} e ${v.paraHoje.length} com prazo hoje (${dataBR(hoje)}).`,
  );
  if (primeiro && (v.minhasAtrasadas || v.minhasHoje)) {
    frases.push(
      `No seu nome, ${primeiro}: ${v.minhasAtrasadas} ${s(v.minhasAtrasadas, "atrasada", "atrasadas")} e ${v.minhasHoje} para hoje.`,
    );
  }
  frases.push(
    v.aprov.length + v.fila.length === 0
      ? "Nada aguardando aprovação, nem em homologação nem na fila do agente social."
      : `${v.aprov.length} ${s(v.aprov.length, "tarefa espera", "tarefas esperam")} decisão em homologação${temFila ? ` e ${v.fila.length} ${s(v.fila.length, "proposta de agente está", "propostas de agente estão")} pendente${v.fila.length === 1 ? "" : "s"}` : ""}.`,
  );
  if (temCrm) {
    frases.push(
      v.followVencidos.length === 0
        ? `No CRM, ${v.lds.length} ${s(v.lds.length, "lead aberto", "leads abertos")} e nenhum follow-up vencido.`
        : `No CRM, ${v.followVencidos.length} ${s(v.followVencidos.length, "follow-up venceu", "follow-ups venceram")} e ${s(v.followVencidos.length, "ainda não foi feito", "ainda não foram feitos")}, de ${v.lds.length} ${s(v.lds.length, "lead aberto", "leads abertos")}.`,
    );
  } else {
    frases.push("O bloco do CRM não veio nesta leitura, então follow-ups ficam de fora do resumo.");
  }
  if (v.atrasadas.length > 0) {
    const mais = v.atrasadas[0];
    frases.push(
      `O atraso mais antigo é "${mais.title || "(sem título)"}", prazo ${dataBR(mais.data)}${nomes[mais.clienteId || ""] ? `, ${nomes[mais.clienteId || ""]}` : ""}.`,
    );
  }

  const COR: Record<Acao["tipo"], string> = {
    atraso: "var(--red)",
    hoje: "var(--yel)",
    aprov: "var(--vio)",
    crm: "var(--blue)",
  };
  const ROT: Record<Acao["tipo"], string> = {
    atraso: "atrasada",
    hoje: "hoje",
    aprov: "aprovar",
    crm: "follow-up",
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Hermes</h1>
      <p className="nx-sub">
        Inteligência do produto. O resumo abaixo é montado aqui mesmo a partir dos dados carregados,
        sem chamar modelo de IA. JARVIS, agentes e Conselho continuam nos lugares de sempre.
      </p>

      <div className="nx-grid">
        <div className="c12 nxh-kpis">
          <Kpi
            label="Atrasadas"
            value={v.atrasadas.length}
            tone={v.atrasadas.length ? "warn" : "ok"}
            title="Tarefas abertas da equipe com prazo antes de hoje (fuso de São Paulo)."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Para hoje"
            value={v.paraHoje.length}
            tone="hot"
            title={`Tarefas abertas com prazo em ${dataBR(hoje)}.`}
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Aprovações"
            value={v.aprov.length + (temFila ? v.fila.length : 0)}
            detail={`${v.aprov.length} em homologação${temFila ? `, ${v.fila.length} de agente` : ""}`}
            title="Tarefas em Homologação ou Homologação do cliente, mais propostas pendentes do agente social."
            onOpen={() => {
              window.location.href = "/next/aprovacoes";
            }}
          />
          <Kpi
            label="Follow-ups vencidos"
            value={temCrm ? v.followVencidos.length : "sem acesso"}
            tone={v.followVencidos.length ? "warn" : undefined}
            title="Leads abertos (fora de Fechado e Perdido) com data de follow-up (due) antes de hoje."
            onOpen={
              temCrm
                ? () => {
                    window.location.href = "/next/comercial";
                  }
                : undefined
            }
          />
        </div>

        <Card className="c8" title="Resumo do dia" icon={<Sparkles size={16} />}>
          <div className="nxh-resumo">
            {frases.slice(0, 5).map((f, i) => (
              <p key={i}>{f}</p>
            ))}
          </div>
          <div className="nxh-btns">
            <button type="button" className="nx-btn" onClick={() => abrirApp("jarvis")}>
              <Bot size={14} /> Abrir JARVIS
            </button>
            <a className="nx-btn ghost" href="/agentes">
              Fila dos agentes
            </a>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("conselho")}>
              Conselho de IA
            </button>
          </div>
          <div className="nxh-nota">
            <b>Como o Hermes age.</b> Ele lê o estado e sugere; qualquer execução autônoma (criar
            tarefa, montar conteúdo, mandar mensagem) entra na fila de /agentes e só acontece depois
            que uma pessoa aprova. Este painel não dispara nada.
          </div>
        </Card>

        <Card
          className="c4"
          title="O que eu faria agora"
          icon={<ListOrdered size={16} />}
          count={v.acoes.length}
        >
          {v.acoes.length === 0 ? (
            <Vazio
              titulo="Nada urgente pelo dado"
              texto="Sem atraso, sem prazo hoje, sem aprovação pendente e sem follow-up vencido."
            />
          ) : (
            <div>
              {v.acoes.slice(0, 12).map((a, i) => (
                <div key={a.id} className="nx-row clk" onClick={a.go}>
                  <span className={`nxh-n ${i < 3 ? "hot" : ""}`}>{i + 1}</span>
                  <span className="t">
                    <b>{a.titulo}</b>
                    <span>{a.sub}</span>
                  </span>
                  <Pill cor={COR[a.tipo]}>{ROT[a.tipo]}</Pill>
                </div>
              ))}
              {v.acoes.length > 12 && (
                <div className="nx-empty">+{v.acoes.length - 12} depois destas</div>
              )}
            </div>
          )}
          <p className="nx-mute" style={{ fontSize: 11.5, margin: 0 }}>
            Ordem: atrasadas (mais antiga primeiro), depois prazo de hoje, aprovações e follow-ups
            vencidos.
          </p>
        </Card>
      </div>
    </>
  );
}
