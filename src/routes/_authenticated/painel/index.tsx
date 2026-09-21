// Meu Dia V2: prioridades da pessoa, entregas da semana, aprovacoes e agenda, com dados
// reais. Concluir tarefa grava item unico (server merge por id). Sem receita/margem aqui:
// o financeiro tem area propria e so mostra o que o papel pode ver.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckSquare,
  Inbox,
  ListChecks,
  MessageSquare,
  Video,
  Zap,
} from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Abrir, Card, Kpi, Skeleton, TarefaLinha, Vazio } from "@/components/next/ui";
import {
  TZ,
  aberta,
  api,
  dataBR,
  demandas,
  ehMinha,
  filaSocial,
  hojeSP,
  notificacoes,
} from "@/components/next/dados";

export const Route = createFileRoute("/_authenticated/painel/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meu Dia · WorkFlowArk Next" }] }),
  component: MeuDiaV2,
});

type Evento = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
  meet: string;
};

const hora = (iso: string) =>
  iso.length > 10
    ? new Date(iso).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TZ,
      })
    : "dia todo";

function MeuDiaV2() {
  const { carga, member, carregando, nomes, tarefas, concluir, abrirApp, erro } = useNext();
  const [agenda, setAgenda] = useState<{
    connected: boolean;
    events: Evento[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    let vivo = true;
    api({ action: "google-my-events" })
      .then((j) => {
        if (vivo) setAgenda(j);
      })
      .catch((e) => {
        if (vivo) setAgenda({ connected: true, events: [], error: (e as Error).message });
      });
    return () => {
      vivo = false;
    };
  }, []);

  const hoje = hojeSP();
  const st = carga?.state || {};
  const agora = new Date();
  const h = Number(
    agora.toLocaleTimeString("pt-BR", { hour: "2-digit", hour12: false, timeZone: TZ }),
  );
  const saud = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = (member?.full_name || "").split(/\s+/)[0] || "";
  const dataLonga = agora.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

  const d7 = new Date(agora);
  d7.setDate(d7.getDate() + 7);
  const lim7 = d7.toLocaleDateString("en-CA", { timeZone: TZ });

  const v = useMemo(() => {
    const abertas = tarefas.filter(aberta);
    const minhas = abertas.filter((t) => ehMinha(t, member));
    const ord = (a: { data?: string }, b: { data?: string }) =>
      (a.data || "9999").localeCompare(b.data || "9999");
    return {
      minhas,
      atrasadas: minhas.filter((t) => t.data && t.data < hoje).sort(ord),
      hojeL: minhas.filter((t) => t.data === hoje),
      semAlvo: minhas.filter((t) => !t.data).length,
      entregas: abertas.filter((t) => t.data && t.data > hoje && t.data <= lim7).sort(ord),
      aprov: abertas.filter((t) => t.status === "aprovacao" || t.status === "homologcli"),
      feitasHoje: tarefas.filter(
        (t) => t.status === "concluido" && String(t.concluidaEm || "").startsWith(hoje),
      ).length,
      fila: filaSocial(st).filter((p) => p.status === "pendente"),
      dem: demandas(st)
        .filter((d) => !d.status || d.status === "nova" || d.status === "aberta")
        .slice(0, 5),
      atividade: notificacoes(st).slice(-8).reverse(),
      equipeAtrasadas: abertas.filter((t) => t.data && t.data < hoje).length,
    };
  }, [tarefas, member, hoje, lim7, st]);

  if (carregando && !carga)
    return (
      <>
        <h1 className="nx-h1">
          {saud}
          {primeiro ? `, ${primeiro}` : ""}
        </h1>
        <p className="nx-sub">{dataLonga}</p>
        <Skeleton />
      </>
    );
  if (!carga) return null;

  const eventosHoje = (agenda?.events || [])
    .filter((e) => new Date(e.end).getTime() > agora.getTime())
    .slice(0, 6);
  const prioridades = [...v.atrasadas, ...v.hojeL];
  const semNome = !member?.full_name;

  return (
    <div className="nx-in">
      <h1 className="nx-h1">
        {saud}
        {primeiro ? `, ${primeiro}` : ""}. <em>{dataLonga}.</em>
      </h1>
      <p className="nx-sub">
        {semNome
          ? "Seu nome ainda não está no cadastro, então as tarefas abaixo são da equipe inteira."
          : `${v.minhas.length} tarefa${v.minhas.length === 1 ? "" : "s"} aberta${v.minhas.length === 1 ? "" : "s"} com você${v.semAlvo ? `, ${v.semAlvo} sem prazo` : ""}. ${v.feitasHoje ? `${v.feitasHoje} concluída${v.feitasHoje === 1 ? "" : "s"} hoje.` : ""}`}
        {erro && <span style={{ color: "var(--yel)" }}> Mostrando a última leitura boa.</span>}
      </p>

      <div className="nx-grid">
        <div className="c3 half">
          <Kpi
            label="Atrasadas"
            value={v.atrasadas.length}
            tone={v.atrasadas.length ? "warn" : "ok"}
            detail={semNome ? "de toda a equipe" : `${v.equipeAtrasadas} na equipe`}
            title="Tarefas abertas com prazo antes de hoje (fuso de São Paulo)"
            onOpen={() => abrirApp("tarefas")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Para hoje"
            value={v.hojeL.length}
            tone="hot"
            detail={`prazo ${dataBR(hoje)}`}
            title="Tarefas abertas com prazo hoje"
            onOpen={() => abrirApp("tarefas")}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Aprovações"
            value={v.aprov.length + v.fila.length}
            detail={`${v.aprov.length} em homologação, ${v.fila.length} de agente`}
            title="Tarefas em Homologação ou Homologação do cliente, mais propostas de agente pendentes"
            onOpen={() => {}}
          />
        </div>
        <div className="c3 half">
          <Kpi
            label="Entregas em 7 dias"
            value={v.entregas.length}
            detail="equipe inteira"
            title={`Tarefas abertas com prazo entre amanhã e ${dataBR(lim7)}`}
            onOpen={() => abrirApp("tarefas")}
          />
        </div>

        <Card
          className="c8"
          title="Prioridades"
          icon={<Zap size={16} />}
          count={prioridades.length}
          action={<Abrir onClick={() => abrirApp("tarefas")}>Kanban</Abrir>}
        >
          {prioridades.length === 0 ? (
            <Vazio
              titulo="Nada atrasado nem para hoje"
              texto={
                v.minhas.length
                  ? "As próximas estão na lista de entregas."
                  : "Sem tarefas abertas no seu nome."
              }
            />
          ) : (
            <div>
              {prioridades.slice(0, 12).map((t) => (
                <TarefaLinha
                  key={t.id}
                  t={t}
                  cliente={nomes[t.clienteId || ""]}
                  onConcluir={concluir}
                />
              ))}
              {prioridades.length > 12 && (
                <div className="nx-empty">+{prioridades.length - 12} no Kanban</div>
              )}
            </div>
          )}
        </Card>

        <Card
          className="c4"
          title="Agenda de hoje"
          icon={<CalendarDays size={16} />}
          action={
            <Link to="/painel/$area" params={{ area: "calendario" }} search={{}} className="nx-link">
              Calendário
            </Link>
          }
        >
          {!agenda ? (
            <div className="nx-skel" style={{ minHeight: 80 }} />
          ) : !agenda.connected ? (
            <Vazio
              titulo="Agenda Google não conectada"
              texto="Conecte pelo Meu Dia clássico (Integrações)."
            />
          ) : agenda.error ? (
            <Vazio titulo="Agenda indisponível agora" texto={agenda.error} />
          ) : eventosHoje.length === 0 ? (
            <Vazio titulo="Sem compromissos restantes hoje" />
          ) : (
            <div>
              {eventosHoje.map((e) => (
                <a
                  key={e.id}
                  className="nx-row clk"
                  href={e.meet || undefined}
                  target={e.meet ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  <span className="m nx-mono" style={{ minWidth: 44 }}>
                    {hora(e.start)}
                  </span>
                  <span className="t">
                    <b>{e.title}</b>
                    {e.location && <span>{e.location}</span>}
                  </span>
                  {e.meet && <Video size={14} style={{ color: "var(--ink3)" }} />}
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="c4"
          title="Aprovações"
          icon={<CheckSquare size={16} />}
          count={v.aprov.length + v.fila.length}
          action={
            <Link to="/painel/$area" params={{ area: "aprovacoes" }} search={{}} className="nx-link">
              Ver todas
            </Link>
          }
        >
          {v.aprov.length + v.fila.length === 0 ? (
            <Vazio titulo="Nada aguardando aprovação" />
          ) : (
            <div>
              {v.aprov.slice(0, 4).map((t) => (
                <TarefaLinha
                  key={t.id}
                  t={t}
                  cliente={nomes[t.clienteId || ""]}
                  mostrarResp
                  onAbrir={() => abrirApp("tarefas")}
                />
              ))}
              {v.fila.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="nx-row clk"
                  onClick={() => (window.location.href = "/postagens")}
                >
                  <span className="dot" style={{ background: "var(--vio)" }} />
                  <span className="t">
                    <b>{p.tema || "Proposta de post"}</b>
                    <span>
                      {[p.cliente || nomes[p.clienteId || ""], p.formato, "agente"]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="c4"
          title="Próximas entregas"
          icon={<ListChecks size={16} />}
          count={v.entregas.length}
          action={<Abrir onClick={() => abrirApp("tarefas")} />}
        >
          {v.entregas.length === 0 ? (
            <Vazio titulo="Sem prazos nos próximos 7 dias" />
          ) : (
            <div>
              {v.entregas.slice(0, 7).map((t) => (
                <TarefaLinha
                  key={t.id}
                  t={t}
                  cliente={nomes[t.clienteId || ""]}
                  mostrarResp
                  onAbrir={() => abrirApp("tarefas")}
                />
              ))}
            </div>
          )}
        </Card>

        <Card
          className="c4"
          title="Demandas novas"
          icon={<Inbox size={16} />}
          count={v.dem.length}
          action={<Abrir onClick={() => abrirApp("demandas")} />}
        >
          {v.dem.length === 0 ? (
            <Vazio titulo="Sem demandas abertas" />
          ) : (
            <div>
              {v.dem.map((d) => (
                <div key={d.id} className="nx-row clk" onClick={() => abrirApp("demandas")}>
                  <span className="dot" style={{ background: "var(--blue)" }} />
                  <span className="t">
                    <b>{d.titulo || d.mensagem || "(sem título)"}</b>
                    <span>
                      {[d.cliente, d.origem, d.criadaEm ? dataBR(String(d.criadaEm)) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="c12"
          title="Atividade recente"
          icon={<MessageSquare size={16} />}
          action={<Abrir onClick={() => abrirApp("notificacoes")}>Notificações</Abrir>}
        >
          {v.atividade.length === 0 ? (
            <Vazio titulo="Sem registros recentes" />
          ) : (
            <div className="nx-cols">
              {v.atividade.map((n, i) => (
                <div key={n.id || i} className="nx-col">
                  <div className="h">
                    <i style={{ background: "var(--yel)" }} />
                    {String(n.origem || n.tipo || "sistema").toUpperCase()}
                    <b>
                      {n.ts
                        ? new Date(n.ts).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: TZ,
                          })
                        : ""}
                    </b>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink2)" }}>
                    {n.msg || n.texto || n.titulo || ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
