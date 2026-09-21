// WorkFlowArk Next (20/09/2026): copia do WorkFlowArk em rota propria (/next), mesma
// autenticacao, mesmos dados, visual ARK Glass (escuro) e ARK Soft (claro). Sidebar por
// trabalho. Cada area le o estado real e leva pro fluxo existente quando a acao ainda mora
// no app legado (ponte por wfa-current-page). Nada de dado duplicado nem numero fabricado.
import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Menu, Moon, RefreshCw, Search, Sun, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CSS } from "@/components/next/estilo";
import { Ctx, type AreaId, type NextCtx } from "@/components/next/contexto";
import { MENUS, type Destino, type MenuDef } from "@/components/next/menus";
import {
  aberta,
  carregarEstado,
  captacoes,
  editorial,
  ehMinha,
  filaSocial,
  hojeSP,
  irParaApp,
  leadAberto,
  leadEtapa,
  leads,
  mapaClientes,
  norm,
  salvarTarefa,
  tarefasUnificadas,
  type Carga,
  type Tarefa,
} from "@/components/next/dados";

export const Route = createFileRoute("/_authenticated/painel")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "WorkFlowArk Next · ARK Content" },
      { name: "theme-color", content: "#08080a" },
    ],
  }),
  component: NextShell,
});

function NextShell() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [carga, setCarga] = useState<Carga | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null);
  const [menu, setMenu] = useState(false);
  const [busca, setBusca] = useState("");
  const [msg, setMsg] = useState("");
  const [claro, setClaro] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  // tema: guardado por aparelho; primeira vez segue o sistema
  useEffect(() => {
    try {
      const v = localStorage.getItem("nx-tema");
      if (v) setClaro(v === "claro");
      else setClaro(window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false);
    } catch {
      /* sem storage */
    }
  }, []);
  const trocarTema = () => {
    setClaro((c) => {
      try {
        localStorage.setItem("nx-tema", c ? "escuro" : "claro");
      } catch {
        /* sem storage */
      }
      return !c;
    });
  };

  const recarregar = useCallback(async () => {
    setErro("");
    try {
      const c = await carregarEstado();
      setCarga(c);
      setAtualizadoEm(new Date());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => {
    recarregar();
    // sync leve: a cada 60 s e ao voltar pra aba (o app legado usa 6 s com ?since; aqui a
    // leitura e completa, entao o intervalo e maior de proposito)
    const iv = setInterval(recarregar, 60000);
    const vis = () => {
      if (document.visibilityState === "visible") recarregar();
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [recarregar]);

  // atalho / pra busca, Esc fecha menu
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "/" && !/input|textarea/i.test((e.target as HTMLElement)?.tagName || "")) {
        e.preventDefault();
        buscaRef.current?.focus();
      }
      if (e.key === "Escape") {
        setMenu(false);
        setBusca("");
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  const toast = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? "" : cur)), 2600);
  }, []);

  const st = carga?.state || {};
  const nomes = useMemo(() => mapaClientes(st), [st]);
  const tarefas = useMemo(() => tarefasUnificadas(st, nomes), [st, nomes]);
  const member = carga?.member || null;

  const concluir = useCallback(
    async (t: Tarefa) => {
      const agora = new Date().toISOString();
      const novo: Tarefa = { ...t, status: "concluido", concluidaEm: agora, timerSince: null };
      try {
        await salvarTarefa(novo);
        // aplica local sem esperar o proximo load (mesmo item, mesmo id)
        setCarga((c) => {
          if (!c) return c;
          const lst = Array.isArray(c.state["wfa-tarefas"])
            ? (c.state["wfa-tarefas"] as Tarefa[])
            : [];
          return {
            ...c,
            state: {
              ...c.state,
              "wfa-tarefas": lst.map((x) => (x.id === t.id ? { ...novo, up: agora } : x)),
            },
          };
        });
        toast(`Concluída: ${t.title || "tarefa"}`);
      } catch (e) {
        toast(`Não salvou: ${(e as Error).message}`);
        throw e;
      }
    },
    [toast],
  );

  // contadores da sidebar (mesma regra das areas, sem contar cartao de projeto duas vezes)
  const hoje = hojeSP();
  const badges = useMemo(() => {
    const minhasAtrasadas = tarefas.filter(
      (t) => aberta(t) && ehMinha(t, member) && t.data && t.data < hoje,
    ).length;
    const aprov =
      tarefas.filter((t) => t.status === "aprovacao" || t.status === "homologcli").length +
      filaSocial(st).filter((p) => p.status === "pendente").length;
    const lds = leads(st).filter(leadAberto).length;
    const capt = captacoes(st).filter(
      (c) => c.status !== "concluida" && c.data && c.data >= hoje,
    ).length;
    const edit = editorial(st).filter((e) => e.data === hoje && e.status !== "postado").length;
    return {
      "": minhasAtrasadas,
      aprovacoes: aprov,
      comercial: lds,
      producao: capt,
      calendario: edit,
    } as Record<string, number>;
  }, [tarefas, st, member, hoje]);

  const areaAtual = (loc.pathname.replace(/^\/painel\/?/, "").split("/")[0] || "") as AreaId;

  // busca global: tarefas, leads e clientes; Enter abre o primeiro
  const resultados = useMemo(() => {
    const q = norm(busca);
    if (q.length < 2) return [];
    const out: { tipo: string; titulo: string; sub?: string; go: () => void }[] = [];
    for (const [id, nm] of Object.entries(nomes)) {
      if (norm(nm).includes(q))
        out.push({
          tipo: "Cliente",
          titulo: nm,
          go: () =>
            navigate({ to: "/painel/$area", params: { area: "clientes" }, search: { q: id } }),
        });
    }
    for (const t of tarefas) {
      if (aberta(t) && norm(t.title).includes(q))
        out.push({
          tipo: "Tarefa",
          titulo: t.title || "",
          sub: [nomes[t.clienteId || ""], t.resp].filter(Boolean).join(" · "),
          go: () => irParaApp("tarefas"),
        });
    }
    for (const l of leads(st)) {
      if (norm(l.nm).includes(q))
        out.push({
          tipo: "Lead",
          titulo: l.nm || "",
          sub: leadEtapa(l).label,
          go: () => navigate({ to: "/painel/$area", params: { area: "comercial" }, search: {} }),
        });
    }
    return out.slice(0, 8);
  }, [busca, nomes, tarefas, st, navigate]);

  const primeiro = (member?.full_name || member?.email || "").split(/[\s@]/)[0] || "";
  const ctx: NextCtx = {
    carga,
    member,
    carregando,
    erro,
    recarregar,
    nomes,
    tarefas,
    concluir,
    toast,
    abrirApp: irParaApp,
    claro,
    atualizadoEm,
  };

  // Layout do menu copiado dos benchmarks (AgencyFlow, Modo Criador) ou ARK; guardado por aparelho.
  const [menuId, setMenuId] = useState<MenuDef["id"]>("agencyflow");
  const [grupos, setGrupos] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { const v = localStorage.getItem("nx-menu"); if (v === "agencyflow" || v === "modocriador" || v === "ark") setMenuId(v); } catch { /* sem storage */ }
  }, []);
  const trocarMenu = (id: MenuDef["id"]) => { setMenuId(id); try { localStorage.setItem("nx-menu", id); } catch { /* sem storage */ } };
  const menuDef = MENUS.find((m) => m.id === menuId) || MENUS[0];
  const ir = (d: Destino) => {
    setMenu(false);
    if (d.tipo === "painel") {
      if (d.area === "") navigate({ to: "/painel" });
      else navigate({ to: "/painel/$area", params: { area: d.area }, search: {} });
    } else if (d.tipo === "classico") irParaApp(d.pagina);
    else window.location.href = d.href;
  };
  const ativo = (d: Destino) => d.tipo === "painel" && d.area === areaAtual;

  const sair = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className={`nx ${claro ? "claro" : ""}`} data-build="next-20260920a">
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
        <div className="nx-bg" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className="nx-shell">
          {/* dentro do shell de proposito: o shell cria contexto de empilhamento (z-index:1)
              e um backdrop fora dele ficaria por cima da sidebar, engolindo o toque no X */}
          <div className={`nx-backdrop ${menu ? "show" : ""}`} onClick={() => setMenu(false)} />
          <aside className={`nx-side glass ${menu ? "open" : ""}`} aria-label="Menu">
            <div className="nx-brand">
              <img src="/ark-mark.png" alt="ARK Content" />
              <div>
                <b>WorkFlowArk</b>
                <small>Next</small>
              </div>
              <button
                className="nx-ico burger"
                style={{ marginLeft: "auto", width: 34, height: 34 }}
                onClick={() => setMenu(false)}
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>
            </div>
            <div className="nx-sec">Menu · {menuDef.nome}</div>
            {menuDef.itens.map((it) => {
              const key = it.label;
              const aberto = !!grupos[key];
              const on = ativo(it.destino);
              const n = it.badge !== undefined ? badges[it.badge] || 0 : 0;
              return (
                <div key={key}>
                  <button
                    type="button"
                    className={`nx-it ${on ? "on" : ""}`}
                    onClick={() => {
                      if (it.filhos) setGrupos((g) => ({ ...g, [key]: !aberto }));
                      ir(it.destino);
                    }}
                  >
                    {it.Icon && <it.Icon size={17} strokeWidth={1.9} />}
                    <span>{it.label}</span>
                    {n > 0 && <span className={`n ${it.badge === "" || it.badge === "aprovacoes" ? "hot" : ""}`}>{n}</span>}
                    {it.filhos && (
                      <span style={{ marginLeft: n > 0 ? 6 : "auto", opacity: 0.6, fontSize: 10 }}>{aberto ? "▾" : "▸"}</span>
                    )}
                  </button>
                  {it.filhos && aberto && (
                    <div style={{ margin: "2px 0 6px 14px", paddingLeft: 10, borderLeft: "1px solid var(--line)" }}>
                      {it.filhos.map((f) => {
                        const fn = f.badge ? badges[f.badge] || 0 : 0;
                        return (
                          <button
                            key={f.label}
                            type="button"
                            className={`nx-it ${ativo(f.destino) ? "on" : ""}`}
                            style={{ minHeight: 34, fontSize: 13 }}
                            onClick={() => ir(f.destino)}
                          >
                            <span>{f.label}</span>
                            {fn > 0 && <span className="n hot">{fn}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="nx-sec">Layout do menu</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "0 6px 4px" }}>
              {MENUS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`nx-pill ${m.id === menuId ? "yel" : ""}`}
                  title={`Estrutura copiada: ${m.fonte}`}
                  onClick={() => trocarMenu(m.id)}
                >
                  {m.nome}
                </button>
              ))}
            </div>
            <div className="nx-sec">Sistema</div>
            <a className="nx-it" href="/app">
              <Menu size={17} strokeWidth={1.9} />
              <span>WorkFlowArk clássico</span>
            </a>
            <div className="nx-foot">
              {member?.full_name || member?.email || ""}
              {member?.role ? ` · ${member.role}` : ""}
              <br />
              <button
                type="button"
                onClick={sair}
                style={{ color: "var(--ink2)", padding: "6px 0" }}
              >
                Sair
              </button>
            </div>
          </aside>

          <main className="nx-main">
            <header className="nx-top glass">
              <button
                className="nx-ico burger"
                onClick={() => setMenu(true)}
                aria-label="Abrir menu"
              >
                <Menu size={18} />
              </button>
              <div className="nx-search" style={{ position: "relative" }}>
                <Search size={15} style={{ color: "var(--ink3)", flex: "none" }} />
                <input
                  ref={buscaRef}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && resultados[0]) {
                      resultados[0].go();
                      setBusca("");
                    }
                  }}
                  placeholder="Buscar tarefa, cliente ou lead"
                  aria-label="Buscar"
                />
                <kbd>/</kbd>
                {resultados.length > 0 && (
                  <div
                    className="nx-card solid"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "calc(100% + 8px)",
                      padding: 6,
                      gap: 0,
                      zIndex: 20,
                    }}
                    role="listbox"
                  >
                    {resultados.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        className="nx-row clk"
                        style={{ borderTop: i ? undefined : 0, width: "100%" }}
                        onClick={() => {
                          r.go();
                          setBusca("");
                        }}
                      >
                        <span className="nx-pill">{r.tipo}</span>
                        <span className="t">
                          <b>{r.titulo}</b>
                          {r.sub && <span>{r.sub}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span
                className={`nx-sync ${erro ? "err" : ""}`}
                title={erro || "Última leitura do servidor"}
              >
                {erro
                  ? "⚠ Sem dados novos"
                  : atualizadoEm
                    ? `✓ ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
              </span>
              <button
                className="nx-ico"
                onClick={recarregar}
                aria-label="Atualizar"
                title="Atualizar"
              >
                <RefreshCw size={16} />
              </button>
              <button
                className="nx-ico"
                onClick={trocarTema}
                aria-label="Trocar tema"
                title={claro ? "Tema escuro" : "Tema claro"}
              >
                {claro ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <button
                className="nx-ico"
                onClick={() => irParaApp("notificacoes")}
                aria-label="Notificações"
                title="Notificações"
              >
                <Bell size={16} />
                {(badges.aprovacoes || 0) > 0 && <span className="dot" />}
              </button>
              <span className="nx-av" title={member?.full_name || ""}>
                {(primeiro[0] || "A").toUpperCase()}
              </span>
            </header>

            {erro && !carga && (
              <div className="nx-alert err" role="alert">
                <span>Não consegui ler os dados: {erro}</span>
                <span style={{ flex: 1 }} />
                <button className="nx-btn ghost" onClick={recarregar}>
                  Tentar de novo
                </button>
              </div>
            )}
            <Outlet />
          </main>
        </div>
        {msg && (
          <div className="nx-toast" role="status">
            {msg}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}
