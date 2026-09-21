// Area Calendario do /next: semana (segunda a domingo, fuso de Sao Paulo) com prazos de
// tarefas abertas, postagens do editorial e captacoes. Navegacao por semana em estado
// local; nada grava daqui. Editorial completo em /calendario, reunioes no classico.
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import {
  STATUS_COR,
  aberta,
  captacoes,
  dataBR,
  editorial,
  hojeSP,
  type Editorial,
} from "@/components/next/dados";

const CSS = `
.nxc-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.nxc-nav .nx-btn{min-height:34px;padding:6px 10px;font-size:12px}
.nxc-nav .rng{font-size:13px;color:var(--ink2);font-variant-numeric:tabular-nums}
.nxc-week{display:grid;gap:8px;grid-template-columns:repeat(7,minmax(0,1fr))}
.nxc-day{padding:10px;border-radius:14px;background:var(--glass);border:1px solid var(--line);min-height:120px;display:flex;flex-direction:column;gap:6px;min-width:0}
.nxc-day.hoje{border-color:var(--yel);box-shadow:inset 0 0 0 1px var(--yel)}
.nxc-day .h{display:flex;align-items:baseline;gap:6px;font-size:11px;color:var(--ink2);text-transform:uppercase;letter-spacing:.08em}
.nxc-day .h b{font-size:15px;color:var(--ink);letter-spacing:0;text-transform:none;font-variant-numeric:tabular-nums}
.nxc-day.hoje .h b{color:var(--yel)}
.nxc-it{display:flex;align-items:center;gap:6px;font-size:12px;padding:5px 7px;border-radius:8px;background:var(--card);border:1px solid var(--line);width:100%;text-align:left;min-width:0}
.nxc-it i{width:7px;height:7px;border-radius:50%;flex:none}
.nxc-it span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxc-it small{font-size:9.5px;color:var(--ink3);letter-spacing:.06em;text-transform:uppercase;flex:none}
.nxc-it:hover{background:var(--glass2)}
.nxc-leg{display:flex;flex-wrap:wrap;gap:6px}
@media (max-width:900px){.nxc-week{grid-template-columns:1fr}.nxc-day{min-height:0}.nxc-day.vazio{opacity:.6}}
`;

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const COR_EDIT: Record<Editorial["status"], string> = {
  planejado: "var(--ink3)",
  agendado: "var(--blue)",
  postado: "var(--green)",
};

// Aritmetica de data em cima do texto AAAA-MM-DD (meio-dia UTC), pra nao depender do fuso do aparelho.
function addDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

export function Calendario() {
  const { carga, nomes, tarefas, abrirApp } = useNext();
  const st = useMemo(() => carga?.state || {}, [carga]);
  const hoje = hojeSP();
  const [desloc, setDesloc] = useState(0);

  const segundaBase = addDias(hoje, -((diaSemana(hoje) + 6) % 7));
  const inicio = addDias(segundaBase, desloc * 7);
  const fim = addDias(inicio, 6);

  const temEditorial = "wfa-editorial" in st;
  const temProducao = "wfa-producao" in st;

  const v = useMemo(() => {
    const dias = Array.from({ length: 7 }, (_, i) => addDias(inicio, i));
    const dentro = (d?: string) => !!d && d >= inicio && d <= fim;
    const prazos = tarefas.filter((t) => aberta(t) && dentro(t.data));
    const posts = editorial(st).filter((e) => dentro(e.data));
    const caps = captacoes(st).filter((c) => dentro(c.data));
    const porDia: Record<
      string,
      { prazos: typeof prazos; posts: typeof posts; caps: typeof caps }
    > = {};
    for (const d of dias) porDia[d] = { prazos: [], posts: [], caps: [] };
    for (const t of prazos) porDia[t.data!]?.prazos.push(t);
    for (const e of posts) porDia[e.data]?.posts.push(e);
    for (const c of caps) porDia[c.data!]?.caps.push(c);
    return { dias, prazos, posts, caps, porDia };
  }, [tarefas, st, inicio, fim]);
  const dias = v.dias;

  const rotulo =
    desloc === 0
      ? "Semana atual"
      : desloc === -1
        ? "Semana passada"
        : desloc === 1
          ? "Próxima semana"
          : `${desloc > 0 ? "+" : ""}${desloc} semana${Math.abs(desloc) === 1 ? "" : "s"}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Calendário</h1>
      <p className="nx-sub">
        Prazos, postagens e captações da semana, de segunda a domingo no fuso de São Paulo. Reuniões
        e agenda Google continuam no clássico.
      </p>

      <div className="nx-grid">
        <div className="c4 half">
          <Kpi
            label="Prazos na semana"
            value={v.prazos.length}
            title={`Tarefas abertas com prazo entre ${dataBR(inicio)} e ${dataBR(fim)}`}
            onOpen={() => abrirApp("tarefas")}
          />
        </div>
        <div className="c4 half">
          <Kpi
            label="Postagens"
            value={temEditorial ? v.posts.length : "sem acesso"}
            detail={
              temEditorial
                ? `${v.posts.filter((e) => e.status === "postado").length} já postadas`
                : "wfa-editorial não veio"
            }
            title={`Itens do editorial (wfa-editorial) com data entre ${dataBR(inicio)} e ${dataBR(fim)}, qualquer status`}
            onOpen={() => {
              window.location.href = "/calendario";
            }}
          />
        </div>
        <div className="c4">
          <Kpi
            label="Captações"
            value={temProducao ? v.caps.length : "sem acesso"}
            title={`Captações (wfa-producao) com data entre ${dataBR(inicio)} e ${dataBR(fim)}`}
            onOpen={() => abrirApp("producao")}
          />
        </div>

        <Card
          className="c12"
          title={rotulo}
          icon={<CalendarDays size={16} />}
          action={
            <div className="nxc-nav">
              <span className="rng">
                {dataBR(inicio)} a {dataBR(fim)}
              </span>
              <button
                type="button"
                className="nx-btn ghost"
                onClick={() => setDesloc((d) => d - 1)}
                aria-label="Semana anterior"
              >
                <ChevronLeft size={14} /> anterior
              </button>
              <button
                type="button"
                className="nx-btn ghost"
                onClick={() => setDesloc(0)}
                disabled={desloc === 0}
              >
                hoje
              </button>
              <button
                type="button"
                className="nx-btn ghost"
                onClick={() => setDesloc((d) => d + 1)}
                aria-label="Próxima semana"
              >
                próxima <ChevronRight size={14} />
              </button>
            </div>
          }
        >
          {v.prazos.length + v.posts.length + v.caps.length === 0 && (
            <Vazio
              titulo="Semana sem prazos, postagens ou captações"
              texto="Use as setas para ver outra semana."
            />
          )}
          <div className="nxc-week">
            {dias.map((d) => {
              const b = v.porDia[d];
              const vazio = b.prazos.length + b.posts.length + b.caps.length === 0;
              return (
                <div
                  key={d}
                  className={`nxc-day ${d === hoje ? "hoje" : ""} ${vazio ? "vazio" : ""}`}
                >
                  <div className="h">
                    <b>{d.slice(8, 10)}</b>
                    {DIAS[diaSemana(d)]}
                    {d === hoje && <Pill yel>hoje</Pill>}
                  </div>
                  {b.caps.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="nxc-it"
                      onClick={() => abrirApp("producao")}
                      title={[c.titulo, nomes[c.clienteId || ""], c.local, c.produtor]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <i
                        style={{
                          background: c.status === "concluida" ? "var(--green)" : "var(--yel)",
                        }}
                      />
                      <span>{c.titulo || nomes[c.clienteId || ""] || "Captação"}</span>
                      <small>capt.</small>
                    </button>
                  ))}
                  {b.posts.map((e) => (
                    <a
                      key={e.id}
                      className="nxc-it"
                      href="/calendario"
                      title={`${e.cliente} · ${e.formato} · ${e.status}`}
                    >
                      <i style={{ background: COR_EDIT[e.status] || "var(--ink3)" }} />
                      <span>{e.titulo || e.formato || "Post"}</span>
                      <small>{e.cliente ? e.cliente.split(/\s+/)[0] : "post"}</small>
                    </a>
                  ))}
                  {b.prazos.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="nxc-it"
                      onClick={() => abrirApp("tarefas")}
                      title={[t.title, nomes[t.clienteId || ""], t.resp]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      <i
                        style={{
                          background:
                            d < hoje ? "var(--red)" : STATUS_COR[t.status || "backlog"] || "#888",
                        }}
                      />
                      <span>{t.title || "(sem título)"}</span>
                      <small>{t.resp ? t.resp.split(/\s+/)[0] : "prazo"}</small>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="nxc-leg">
            <Pill cor="var(--yel)">captação</Pill>
            <Pill cor="var(--ink3)">post planejado</Pill>
            <Pill cor="var(--blue)">post agendado</Pill>
            <Pill cor="var(--green)">postado</Pill>
            <Pill cor="var(--red)">prazo vencido</Pill>
          </div>
        </Card>

        <Card className="c12" title="Outras agendas">
          <div className="nxc-nav">
            <a className="nx-btn" href="/calendario">
              Editorial completo
            </a>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("reunioes")}>
              Reuniões
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("agenda")}>
              Agenda Google
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
