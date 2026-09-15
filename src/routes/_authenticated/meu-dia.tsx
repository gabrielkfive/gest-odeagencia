import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, CheckCircle2, Clock, ExternalLink, Link2, MapPin, RefreshCw, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassDock, GlassEffect, GlassFilter } from "@/components/ui/liquid-glass";
import { SmokeyBackground } from "@/components/ui/smokey-background";
import { ArkAppIcon } from "@/components/ui/ark-app-icons";
import clientesBase from "@/lib/clientes-base.json";

// Meu Dia em vidro (15/09/2026): a agenda Google do proprio membro no centro, as tarefas
// do dia ao lado e o dock das areas. Le o estado pela API (nao grava nada: concluir tarefa
// continua no Kanban, onde o sync por item protege o dado).

export const Route = createFileRoute("/_authenticated/meu-dia")({
  ssr: false,
  head: () => ({ meta: [{ title: "Meu Dia · WorkFlowArk" }] }),
  component: MeuDia,
});

type Tarefa = { id: string; title?: string; resp?: string; data?: string; prio?: string; status?: string; clienteId?: string; concluidaEm?: string; criadaEm?: string };
type Evento = { id: string; title: string; start: string; end: string; allDay: boolean; location: string; link: string; meet: string; attendees: number };
type Member = { id: string; full_name?: string | null; email?: string; role?: string };

const TZ = "America/Sao_Paulo";
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const norm = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const hora = (iso: string) => (iso.length > 10 ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ }) : "");
const dataBR = (d: string) => (d ? d.split("-").reverse().join("/") : "sem data");

async function api(body: Record<string, unknown> | null) {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const r = await fetch("/api/workflowark/state", {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Erro ${r.status}`);
  return j;
}

function MeuDia() {
  const [member, setMember] = useState<Member | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [clientes, setClientes] = useState<Record<string, string>>({});
  const [agenda, setAgenda] = useState<{ connected: boolean; events: Evento[]; email?: string; error?: string } | null>(null);
  const [erro, setErro] = useState("");
  const [agora, setAgora] = useState(new Date());
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    setCarregando(true); setErro("");
    try {
      const j = await api(null);
      setMember(j.member || null);
      const st = j.state || {};
      setTarefas(Array.isArray(st["wfa-tarefas"]) ? st["wfa-tarefas"] : []);
      // nomes: lista base do app (src/lib/clientes-base.json) + clientes criados pelo Gabriel
      const custom = Array.isArray(st["wfa-clientes-custom"]) ? st["wfa-clientes-custom"] : [];
      setClientes({ ...(clientesBase as Record<string, string>), ...Object.fromEntries(custom.map((c: any) => [c.id, c.nm || c.nome || ""])) });
    } catch (e) { setErro((e as Error).message); }
    try { setAgenda(await api({ action: "google-my-events" })); }
    catch (e) { setAgenda({ connected: true, events: [], error: (e as Error).message }); }
    setCarregando(false);
  };
  useEffect(() => { carregar(); const t = setInterval(() => setAgora(new Date()), 30000); return () => clearInterval(t); }, []);

  const conectarAgenda = async () => {
    try { const j = await api({ action: "google-link-start" }); if (j?.url) window.location.href = j.url; }
    catch (e) { setErro((e as Error).message); }
  };

  const hoje = hojeSP();
  const minhas = useMemo(() => {
    const nome = norm(member?.full_name || ""); const primeiro = nome.split(/\s+/)[0] || "";
    const isMine = (t: Tarefa) => { const r = norm(t.resp || ""); if (!r) return false; if (r === nome) return true; return !!primeiro && r.split(/\s+/)[0] === primeiro; };
    const src = nome ? tarefas.filter(isMine) : tarefas;
    const aberta = (t: Tarefa) => t.status !== "concluido";
    return {
      atrasadas: src.filter((t) => aberta(t) && t.data && t.data < hoje).sort((a, b) => (a.data || "").localeCompare(b.data || "")),
      hoje: src.filter((t) => aberta(t) && t.data === hoje),
      proximas: src.filter((t) => aberta(t) && (!t.data || t.data > hoje)).sort((a, b) => ((a.data || "9999") as string).localeCompare((b.data || "9999") as string)).slice(0, 6),
      feitas: src.filter((t) => t.status === "concluido" && String(t.concluidaEm || "").startsWith(hoje)).length,
    };
  }, [tarefas, member, hoje]);

  const saudacao = (() => { const h = Number(agora.toLocaleTimeString("pt-BR", { hour: "2-digit", hour12: false, timeZone: TZ })); return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"; })();
  const primeiroNome = (member?.full_name || "").split(/\s+/)[0] || "";
  const dataLonga = agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const proximoEvento = agenda?.events.find((e) => !e.allDay && new Date(e.end).getTime() > agora.getTime());

  const dock = [
    { icon: <ArkAppIcon name="tarefas" size={44} />, label: "Tarefas", href: "/app" },
    { icon: <ArkAppIcon name="agenda" size={44} />, label: "Agenda", href: "/calendario" },
    { icon: <ArkAppIcon name="propostas" size={44} />, label: "Propostas", href: "/propostas" },
    { icon: <ArkAppIcon name="contratos" size={44} />, label: "Contratos", href: "/contratos.html" },
    { icon: <ArkAppIcon name="comercial" size={44} />, label: "Comercial", href: "/comercial.html" },
    { icon: <ArkAppIcon name="paginas" size={44} />, label: "Páginas", href: "/paginas" },
  ];

  const Card = ({ title, icon, count, children, className = "" }: { title: string; icon: React.ReactNode; count?: string | number; children: React.ReactNode; className?: string }) => (
    <GlassEffect className={`rounded-3xl ${className}`}>
      <div className="flex h-full flex-col p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-[#FFC700]">{icon}</span>
          <span className="text-[12px] font-bold uppercase tracking-[.08em] text-white/85">{title}</span>
          {count !== undefined && <span className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-white/80">{count}</span>}
        </div>
        <div className="min-h-0 flex-1 text-[13px] text-white/90">{children}</div>
      </div>
    </GlassEffect>
  );

  const TarefaRow = ({ t, tom }: { t: Tarefa; tom: "red" | "yel" | "mute" }) => (
    <a href="/app" className="flex items-center gap-3 border-b border-white/10 py-2 last:border-0 hover:bg-white/5">
      <span className={"h-2 w-2 flex-shrink-0 rounded-full " + (tom === "red" ? "bg-red-400" : tom === "yel" ? "bg-[#FFC700]" : "bg-white/40")} />
      <span className="min-w-0 flex-1 truncate">{t.title || "(sem título)"}{t.clienteId && clientes[t.clienteId] ? <span className="text-white/50"> · {clientes[t.clienteId]}</span> : null}</span>
      <span className="flex-shrink-0 font-mono text-[10.5px] text-white/50">{dataBR(t.data || "")}</span>
    </a>
  );

  return (
    <div className="fixed inset-0 overflow-auto bg-[#0a0a0a] font-[Inter,system-ui,sans-serif] text-white">
      <GlassFilter />
      <SmokeyBackground color="#8A6A00" backdropBlurAmount="sm" className="fixed" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(0,0,0,.2)_0%,rgba(0,0,0,.7)_70%)]" />

      <div className="relative z-10 mx-auto flex max-w-[1240px] flex-col gap-5 px-4 pb-10 pt-6 sm:px-6">
        {/* Cabecalho: saudacao, data, relogio e dock */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/ark-mark.png" alt="" className="h-9 w-9 object-contain" />
              <span className="text-sm font-extrabold">WorkFlowArk<sup className="ml-px text-[8px] font-semibold text-[#FFC700] align-super">®</sup></span>
              <span className="text-white/40">/</span><span className="text-sm text-white/70">Meu Dia</span>
            </div>
            <h1 className="mt-3 text-[clamp(28px,4vw,44px)] font-extrabold leading-none tracking-[-.02em]">
              {saudacao}{primeiroNome ? `, ${primeiroNome}` : ""}.
            </h1>
            <p className="mt-2 text-[15px] capitalize text-white/70">{dataLonga}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[44px] font-bold leading-none tabular-nums tracking-[-.04em]">{agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ })}</div>
            <div className="mt-1 text-[12px] text-[#FFC700]">{proximoEvento ? `Próximo: ${hora(proximoEvento.start)} · ${proximoEvento.title}` : "Sem próximos compromissos hoje"}</div>
          </div>
        </header>

        <div className="max-w-full overflow-x-auto"><GlassDock items={dock} /></div>

        {erro && <div className="rounded-xl border border-red-300/40 bg-red-500/20 px-3 py-2.5 text-[12.5px] text-red-100">{erro}</div>}

        {/* Numeros do dia */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { v: minhas.atrasadas.length, l: "Atrasadas", c: "text-red-300" },
            { v: minhas.hoje.length, l: "Vencem hoje", c: "text-[#FFC700]" },
            { v: agenda?.events.length ?? 0, l: "Compromissos", c: "text-white" },
            { v: minhas.feitas, l: "Concluídas hoje", c: "text-emerald-300" },
          ].map((k) => (
            <GlassEffect key={k.l} className="rounded-2xl">
              <div className="px-4 py-3.5">
                <div className={`text-[26px] font-extrabold leading-none tabular-nums ${k.c}`}>{carregando ? "…" : k.v}</div>
                <div className="mt-1 text-[11px] font-semibold text-white/60">{k.l}</div>
              </div>
            </GlassEffect>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
          {/* Agenda Google de hoje */}
          <Card title="Agenda Google de hoje" icon={<CalendarDays size={15} />} count={agenda?.connected ? agenda.events.length : undefined}>
            {agenda === null ? (
              <div className="py-6 text-center text-white/50">Lendo sua agenda…</div>
            ) : !agenda.connected ? (
              <div className="flex flex-col items-start gap-3 py-2">
                <p className="text-white/80">Conecte a sua conta Google uma vez e os compromissos do dia aparecem aqui, com link do Meet.</p>
                <button onClick={conectarAgenda} className="flex items-center gap-2 rounded-lg bg-[#FFC700] px-4 py-2.5 text-[13px] font-extrabold text-[#0a0a0a] hover:bg-[#ffd53d]">
                  <Link2 size={15} /> Conectar minha Agenda Google
                </button>
              </div>
            ) : agenda.error ? (
              <div className="py-3 text-red-200">{agenda.error} <button onClick={conectarAgenda} className="ml-2 underline">reconectar</button></div>
            ) : agenda.events.length === 0 ? (
              <div className="py-6 text-center text-white/50">Dia livre na agenda{agenda.email ? ` de ${agenda.email}` : ""}.</div>
            ) : (
              <ul className="flex flex-col">
                {agenda.events.map((e) => {
                  const passou = !e.allDay && new Date(e.end).getTime() < agora.getTime();
                  const rolando = !e.allDay && new Date(e.start).getTime() <= agora.getTime() && !passou;
                  return (
                    <li key={e.id} className={"flex items-start gap-3 border-b border-white/10 py-3 last:border-0 " + (passou ? "opacity-45" : "")}>
                      <div className="w-[52px] flex-shrink-0 font-mono text-[12px] font-bold tabular-nums text-[#FFC700]">
                        {e.allDay ? "dia" : hora(e.start)}<div className="text-[10px] font-normal text-white/50">{e.allDay ? "todo" : hora(e.end)}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {rolando && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
                          <span className="truncate font-semibold">{e.title}</span>
                        </div>
                        {(e.location || e.attendees > 0) && (
                          <div className="mt-0.5 flex flex-wrap gap-3 text-[11.5px] text-white/55">
                            {e.location && <span className="flex items-center gap-1"><MapPin size={11} />{e.location}</span>}
                            {e.attendees > 0 && <span>{e.attendees} convidado{e.attendees > 1 ? "s" : ""}</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        {e.meet && <a href={e.meet} target="_blank" rel="noreferrer" title="Entrar no Meet" className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/20 text-emerald-200 hover:bg-emerald-400/30"><Video size={15} /></a>}
                        {e.link && <a href={e.link} target="_blank" rel="noreferrer" title="Abrir no Google Agenda" className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20"><ExternalLink size={14} /></a>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {agenda?.connected && (
              <div className="mt-3 flex items-center gap-3 text-[11px] text-white/45">
                <button onClick={carregar} className="flex items-center gap-1 hover:text-white"><RefreshCw size={11} /> atualizar</button>
                <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white">abrir Google Agenda <ArrowUpRight size={11} /></a>
                {agenda.email && <span className="ml-auto">{agenda.email}</span>}
              </div>
            )}
          </Card>

          {/* Tarefas do dia */}
          <div className="flex flex-col gap-5">
            <Card title="Minhas tarefas" icon={<CheckCircle2 size={15} />} count={minhas.atrasadas.length + minhas.hoje.length}>
              {carregando ? (
                <div className="py-6 text-center text-white/50">Carregando…</div>
              ) : minhas.atrasadas.length + minhas.hoje.length === 0 ? (
                <div className="py-6 text-center text-white/50">Nada vencendo hoje. Agência rodando.</div>
              ) : (
                <div className="flex flex-col">
                  {minhas.atrasadas.length > 0 && <div className="mb-1 text-[10px] font-bold uppercase tracking-[.08em] text-red-300/80">Atrasadas</div>}
                  {minhas.atrasadas.map((t) => <TarefaRow key={t.id} t={t} tom="red" />)}
                  {minhas.hoje.length > 0 && <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-[.08em] text-[#FFC700]/80">Vencem hoje</div>}
                  {minhas.hoje.map((t) => <TarefaRow key={t.id} t={t} tom="yel" />)}
                </div>
              )}
              <div className="mt-3 text-[11px] text-white/45"><a href="/app" className="hover:text-white">Concluir e mover é no Kanban →</a></div>
            </Card>
            <Card title="Próximas" icon={<Clock size={15} />} count={minhas.proximas.length}>
              {minhas.proximas.length === 0 ? <div className="py-4 text-center text-white/50">Sem próximas com data.</div> : minhas.proximas.map((t) => <TarefaRow key={t.id} t={t} tom="mute" />)}
            </Card>
          </div>
        </div>

        <footer className="pb-2 text-center text-[11px] text-white/35">
          <Link to="/app" className="hover:text-white">Voltar ao painel completo</Link>
        </footer>
      </div>
    </div>
  );
}
