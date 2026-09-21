// Area Clientes do /next: carteira a esquerda e a ficha "Cliente 360" a direita, em abas.
// Organizacao copiada do padrao AgencyFlow (ficha com abas: visao geral, tarefas, entregas,
// aprovacoes, financeiro, ficha, saude), mas todo numero vem do estado real:
// tarefas unificadas por clienteId, editorial, producao, crm, cobranca (so pra quem tem
// acesso) e a ficha livre do classico (wfa-cliente-detalhes). Nada de score inventado.
// Grava so o que as outras areas ja gravam: concluir() do contexto e devolver homologacao
// por item unico em wfa-tarefas (servidor mescla por id).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  Activity,
  Briefcase,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  ListChecks,
  Search,
  Send,
  Wallet,
  X,
} from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Kpi, Pill, TarefaLinha, Vazio } from "@/components/next/ui";
import {
  STATUS_COR,
  STATUS_LABEL,
  aberta,
  brl,
  captacoes,
  dataBR,
  editorial,
  hojeSP,
  leadEtapa,
  leads,
  norm,
  salvarTarefa,
  type ClienteCustom,
  type Editorial,
  type Tarefa,
} from "@/components/next/dados";

const STATUS_FICHA: Record<string, { label: string; cor: string }> = {
  r: { label: "Urgente", cor: "var(--red)" },
  y: { label: "Em ajuste", cor: "var(--yel)" },
  gr: { label: "Saudável", cor: "var(--green)" },
  churn: { label: "Churn", cor: "var(--ink3)" },
};

const TIPO_LABEL: Record<string, string> = { ARK: "ARK Direto", ALPHA: "Squad Alpha" };

// Campos da ficha livre do classico (cliDetalhe em workflowark-app). Chave desconhecida
// aparece do mesmo jeito, com a propria chave como rotulo.
const ROTULOS: Record<string, string> = {
  empresa: "Empresa / Razão social",
  responsavel: "Account responsável",
  email: "E-mail",
  telefone: "Telefone / WhatsApp",
  instagram: "Instagram",
  nicho: "Nicho",
  inicio: "Início do contrato",
  valor: "Valor do contrato",
  localizacao: "Localização",
  origem: "Origem do cliente",
  briefing: "Briefing",
  linkInsta: "Link do Instagram",
  linkDrive: "Pasta no Drive",
  linkContrato: "Contrato",
  linkAds: "Conta de anúncios",
};
const GRUPOS_FICHA: { titulo: string; chaves: string[] }[] = [
  {
    titulo: "Informações gerais",
    chaves: [
      "empresa",
      "responsavel",
      "email",
      "telefone",
      "instagram",
      "nicho",
      "inicio",
      "valor",
      "localizacao",
      "origem",
    ],
  },
  { titulo: "Briefing", chaves: ["briefing"] },
  { titulo: "Links e acessos", chaves: ["linkInsta", "linkDrive", "linkContrato", "linkAds"] },
];

type Aba = "visao" | "tarefas" | "entregas" | "aprovacoes" | "financeiro" | "ficha" | "saude";
const ABAS: { id: Aba; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "tarefas", label: "Tarefas" },
  { id: "entregas", label: "Entregas" },
  { id: "aprovacoes", label: "Aprovações" },
  { id: "financeiro", label: "Financeiro" },
  { id: "ficha", label: "Ficha" },
  { id: "saude", label: "Saúde" },
];

type Filtro = "ativos" | "churn" | "todos";

type Sinal = {
  nivel: "alerta" | "aviso" | "ok" | "fora";
  label: string;
  cor: string;
  porque: string;
};

type Linha = {
  id: string;
  nome: string;
  tipo?: string;
  plano?: string;
  status?: string;
  valorCustom?: number;
  todas: Tarefa[];
  abertas: Tarefa[];
  atrasadas: Tarefa[];
  homolog: Tarefa[];
  concluidasMes: number;
  concluidasMesAnt: number;
  entregasMes: Editorial[];
  proxima?: string;
  aprovParadaDias: number | null;
  sinais: Sinal[];
  sinal: Sinal;
};

const NIVEL_COR: Record<Sinal["nivel"], string> = {
  alerta: "var(--red)",
  aviso: "var(--yel)",
  ok: "var(--green)",
  fora: "var(--ink3)",
};

const CSS = `
.nxc-split{display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);gap:14px;align-items:start}
.nxc-lista{position:sticky;top:76px;max-height:calc(100vh - 96px);overflow:auto}
.nxc-tools{display:flex;flex-direction:column;gap:8px}
.nxc-busca{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line)}
.nxc-busca input{flex:1;background:none;border:0;outline:0;color:var(--ink);font:inherit;min-width:0}
.nxc-busca input::placeholder{color:var(--ink3)}
.nxc-seg{display:flex;gap:4px;padding:3px;border-radius:12px;background:var(--glass);border:1px solid var(--line)}
.nxc-seg button{flex:1;padding:6px 8px;border-radius:9px;font-size:12px;color:var(--ink2);white-space:nowrap}
.nxc-seg button.on{background:var(--yel);color:#111;font-weight:700}
.nxc-cli{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:12px;width:100%;text-align:left;min-height:48px;border-top:1px solid var(--line)}
.nxc-cli:first-child{border-top:0}
.nxc-cli:hover{background:var(--glass2)}
.nxc-cli.on{background:var(--glass2);box-shadow:inset 0 0 0 1px var(--line2)}
.nxc-cli .av{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:var(--glass2);border:1px solid var(--line);font-size:11px;font-weight:800;flex:none}
.nxc-cli.on .av{background:var(--yel);color:#111;border-color:transparent}
.nxc-cli .t{flex:1;min-width:0}
.nxc-cli .t b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxc-cli .t span{display:block;font-size:11px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxc-cli .n{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--ink3);white-space:nowrap}
.nxc-cli .n.late{color:var(--red);font-weight:700}
.nxc-sinal{display:inline-flex;align-items:center;gap:6px;font-size:12px;white-space:nowrap}
.nxc-sinal i{width:8px;height:8px;border-radius:50%;flex:none}
.nxc-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.nxc-head h2{font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0}
.nxc-head .pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center}
.nxc-head .acao{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.nxc-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none}
.nxc-tabs::-webkit-scrollbar{display:none}
.nxc-tab{padding:7px 13px;border-radius:999px;border:1px solid var(--line);background:var(--glass);font-size:12.5px;color:var(--ink2);white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.nxc-tab:hover{background:var(--glass2);color:var(--ink)}
.nxc-tab.on{background:var(--yel);color:#111;border-color:transparent;font-weight:700}
.nxc-tab .n{font-family:ui-monospace,monospace;font-size:10.5px;opacity:.75}
.nxc-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.nxc-sec{display:flex;flex-direction:column;gap:8px}
.nxc-sec-h{display:flex;align-items:center;gap:8px}
.nxc-sec-h .sp{flex:1}
.nxc-acoes{display:flex;gap:8px;flex-wrap:wrap}
.nxc-mes{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--ink2)}
.nxc-mes b{min-width:120px;text-align:center;font-weight:600;color:var(--ink);text-transform:capitalize}
.nxc-apr{display:grid;grid-template-columns:8px 1fr auto;gap:10px;align-items:center;padding:10px 6px;border-top:1px solid var(--line)}
.nxc-apr:first-child{border-top:0}
.nxc-apr .dot{width:8px;height:8px;border-radius:50%}
.nxc-apr .t{min-width:0}
.nxc-apr .t b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxc-apr .t span{display:block;font-size:11.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxc-apr .acts{display:flex;gap:6px;align-items:center}
.nxc-apr .acts .nx-btn{min-height:32px;padding:6px 10px;font-size:12px}
.nxc-apr .acts .nx-btn.ok{background:var(--green);color:#111}
.nxc-apr .acts .busy{opacity:.5;pointer-events:none}
.nxc-kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.nxc-kv .it{padding:10px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line);min-width:0}
.nxc-kv .it small{display:block;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin-bottom:3px}
.nxc-kv .it div{font-size:13px;word-break:break-word;white-space:pre-wrap}
.nxc-kv .it.wide{grid-column:1/-1}
.nxc-kv a{color:var(--yel);display:inline-flex;align-items:center;gap:4px}
.nxc-saude{display:flex;flex-direction:column;gap:8px}
.nxc-saude .it{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--line)}
.nxc-saude .it i{width:10px;height:10px;border-radius:50%;flex:none;margin-top:4px}
.nxc-saude .it b{display:block;font-weight:600}
.nxc-saude .it span{font-size:12.5px;color:var(--ink2)}
.nxc-fin{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.nxc-voltar{display:none}
@media (max-width:900px){
  .nxc-split{grid-template-columns:1fr}
  .nxc-lista{position:static;max-height:none}
  .nxc-lista.compacta .nxc-rolo{max-height:240px;overflow:auto}
  .nxc-kpis{grid-template-columns:repeat(2,1fr)}
  .nxc-apr{grid-template-columns:8px 1fr;row-gap:6px}
  .nxc-apr .acts{grid-column:2}
  .nxc-head .acao{margin-left:0;width:100%}
  .nxc-voltar{display:inline-flex}
}
`;

const ordData = (a: { data?: string }, b: { data?: string }) =>
  (a.data || "9999").localeCompare(b.data || "9999");

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const mesAnterior = (mesKey: string) => {
  const [y, m] = mesKey.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};
const mesSeguinte = (mesKey: string) => {
  const [y, m] = mesKey.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};
const nomeMes = (mesKey: string) => {
  const [y, m] = mesKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

// Dias inteiros desde a entrada em homologacao. Sem carimbo aprovacaoEm nao ha como saber.
function diasEsperando(t: Tarefa, agoraMs: number): number | null {
  const ms = t.aprovacaoEm ? Date.parse(String(t.aprovacaoEm)) : NaN;
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((agoraMs - ms) / 86400000));
}

const ehLink = (v: string) => /^https?:\/\//i.test(v);

export function Clientes() {
  const { carga, nomes, tarefas, concluir, toast, recarregar, abrirApp } = useNext();
  const search = useSearch({ from: "/_authenticated/painel/$area" }) as { q?: string };
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [sel, setSel] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("visao");
  const [mesEnt, setMesEnt] = useState(() => hojeSP().slice(0, 7));
  const [verConcluidas, setVerConcluidas] = useState(false);
  const fichaRef = useRef<HTMLDivElement | null>(null);

  const st = carga?.state || {};
  const hoje = hojeSP();
  const mesKey = hoje.slice(0, 7);
  const mesAntKey = mesAnterior(mesKey);
  const agoraMs = Date.now();

  // ?q=<clienteId> (vem da busca global) abre a ficha; qualquer outro texto vira busca.
  useEffect(() => {
    const v = search.q || "";
    if (v && nomes[v]) {
      setSel(v);
      setQ("");
    } else {
      setQ(v);
    }
  }, [search.q, nomes]);

  const escolher = (id: string | null) => {
    setSel(id);
    navigate({
      to: "/painel/$area",
      params: { area: "clientes" },
      search: id ? { q: id } : {},
      replace: true,
    });
    if (id && typeof window !== "undefined" && window.innerWidth <= 900) {
      setTimeout(
        () => fichaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        30,
      );
    }
  };

  const temEditorial = "wfa-editorial" in st;
  const temCobranca = "wfa-cobranca" in st;

  const linhas = useMemo<Linha[]>(() => {
    const custom = (
      Array.isArray(st["wfa-clientes-custom"]) ? (st["wfa-clientes-custom"] as ClienteCustom[]) : []
    ).filter((c) => c?.id);
    const ficha = Object.fromEntries(custom.map((c) => [c.id, c]));
    const porCliente: Record<string, Tarefa[]> = {};
    for (const t of tarefas) {
      if (!t.clienteId) continue;
      (porCliente[t.clienteId] ||= []).push(t);
    }
    const edPorCliente: Record<string, Editorial[]> = {};
    for (const e of editorial(st)) {
      if (!e.clienteId || !String(e.data || "").startsWith(mesKey)) continue;
      (edPorCliente[e.clienteId] ||= []).push(e);
    }
    return Object.entries(nomes)
      .filter(([id, nome]) => id && nome)
      .map(([id, nome]) => {
        const f = ficha[id];
        const todas = porCliente[id] || [];
        const abertas = todas.filter(aberta);
        const atrasadas = abertas.filter((t) => !!t.data && t.data < hoje);
        const homolog = abertas.filter(
          (t) => t.status === "aprovacao" || t.status === "homologcli",
        );
        const concluidasEm = (k: string) =>
          todas.filter((t) => t.status === "concluido" && String(t.concluidaEm || "").startsWith(k))
            .length;
        const entregasMes = (edPorCliente[id] || []).sort(ordData);
        const proxima = abertas
          .map((t) => t.data || "")
          .filter((d) => d && d >= hoje)
          .sort()[0];
        const diasParada = homolog
          .map((t) => diasEsperando(t, agoraMs))
          .filter((d): d is number => d !== null);
        const aprovParadaDias = diasParada.length ? Math.max(...diasParada) : null;

        const sinais: Sinal[] = [];
        if (f?.status === "churn") {
          sinais.push({
            nivel: "fora",
            label: "Fora da operação",
            cor: NIVEL_COR.fora,
            porque: "Ficha marcada como churn no clássico. Os outros sinais deixam de valer.",
          });
        } else {
          if (atrasadas.length)
            sinais.push({
              nivel: "alerta",
              label: "Tarefa atrasada",
              cor: NIVEL_COR.alerta,
              porque: `${atrasadas.length} tarefa${atrasadas.length === 1 ? "" : "s"} aberta${atrasadas.length === 1 ? "" : "s"} com prazo antes de hoje (${dataBR(hoje)}).`,
            });
          if (aprovParadaDias !== null && aprovParadaDias >= 3)
            sinais.push({
              nivel: "alerta",
              label: "Aprovação parada",
              cor: NIVEL_COR.alerta,
              porque: `Há tarefa em homologação parada há ${aprovParadaDias} dia${aprovParadaDias === 1 ? "" : "s"} (carimbo aprovacaoEm). Regra: 3 dias ou mais.`,
            });
          if (temEditorial && entregasMes.length === 0)
            sinais.push({
              nivel: "aviso",
              label: "Sem entrega no editorial",
              cor: NIVEL_COR.aviso,
              porque: `Nenhuma postagem deste cliente no editorial em ${nomeMes(mesKey)}.`,
            });
          if (abertas.length === 0)
            sinais.push({
              nivel: "aviso",
              label: "Sem tarefa aberta",
              cor: NIVEL_COR.aviso,
              porque:
                "Nenhuma tarefa aberta ligada pelo clienteId. Pode ser cliente parado ou tarefa sem cliente marcado.",
            });
        }
        const sinal: Sinal = sinais.find((s) => s.nivel === "fora") ||
          sinais.find((s) => s.nivel === "alerta") ||
          sinais.find((s) => s.nivel === "aviso") || {
            nivel: "ok",
            label: "Em dia",
            cor: NIVEL_COR.ok,
            porque: `${abertas.length} tarefa${abertas.length === 1 ? "" : "s"} aberta${abertas.length === 1 ? "" : "s"}, nenhuma atrasada, nenhuma homologação parada${temEditorial ? " e com entrega no editorial do mês" : ""}.`,
          };
        return {
          id,
          nome,
          tipo: f?.tipo,
          plano: f?.plano,
          status: f?.status,
          valorCustom: Number(f?.valor) || undefined,
          todas,
          abertas,
          atrasadas,
          homolog,
          concluidasMes: concluidasEm(mesKey),
          concluidasMesAnt: concluidasEm(mesAntKey),
          entregasMes,
          proxima,
          aprovParadaDias,
          sinais,
          sinal,
        };
      })
      .sort(
        (a, b) =>
          b.atrasadas.length - a.atrasadas.length ||
          b.abertas.length - a.abertas.length ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
  }, [st, nomes, tarefas, hoje, mesKey, mesAntKey, agoraMs, temEditorial]);

  const filtradas = useMemo(() => {
    const k = norm(q);
    return linhas.filter((l) => {
      if (filtro === "ativos" && l.status === "churn") return false;
      if (filtro === "churn" && l.status !== "churn") return false;
      if (!k) return true;
      return norm(l.nome).includes(k) || norm(l.tipo).includes(k) || norm(l.plano).includes(k);
    });
  }, [linhas, q, filtro]);

  const ativos = linhas.filter((l) => l.status !== "churn");
  const churn = linhas.length - ativos.length;

  const cliente = sel ? linhas.find((l) => l.id === sel) || null : null;

  const extra = useMemo(() => {
    if (!cliente) return null;
    const nm = norm(cliente.nome);
    const primeira = nm.split(/\s+/)[0];
    const det = st["wfa-cliente-detalhes"];
    const fichaLivre =
      det && typeof det === "object" && !Array.isArray(det)
        ? ((det as Record<string, unknown>)[cliente.id] as Record<string, unknown> | undefined)
        : undefined;
    const cob = st["wfa-cobranca"];
    const cobCli =
      cob && typeof cob === "object" && !Array.isArray(cob)
        ? ((cob as Record<string, unknown>)[cliente.id] as Record<string, unknown> | undefined)
        : undefined;
    return {
      leads: leads(st).filter((l) => {
        const n = norm(l.nm);
        return (
          !!n &&
          (n === nm ||
            n.includes(nm) ||
            nm.includes(n) ||
            (primeira.length > 3 && n.split(/\s+/)[0] === primeira))
        );
      }),
      capt: captacoes(st)
        .filter((c) => c.clienteId === cliente.id)
        .sort((a, b) => String(b.data || "").localeCompare(String(a.data || ""))),
      postsMes: editorial(st)
        .filter((e) => e.clienteId === cliente.id && String(e.data || "").startsWith(mesEnt))
        .sort(ordData),
      fichaLivre: fichaLivre && typeof fichaLivre === "object" ? fichaLivre : null,
      cobCli: cobCli && typeof cobCli === "object" ? cobCli : null,
    };
  }, [cliente, st, mesEnt]);

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

  const abaCount: Partial<Record<Aba, number>> = cliente
    ? {
        tarefas: cliente.abertas.length,
        entregas: cliente.entregasMes.length,
        aprovacoes: cliente.homolog.length,
        saude: cliente.sinais.length,
      }
    : {};

  return (
    <>
      <style>{CSS}</style>
      <h1 className="nx-h1">Clientes</h1>
      <p className="nx-sub">
        {linhas.length === 0
          ? "Nenhum cliente cadastrado ainda."
          : `${ativos.length} cliente${ativos.length === 1 ? "" : "s"} na carteira${churn ? `, ${churn} em churn` : ""}. Escolha um para abrir a ficha completa: tarefas, entregas, aprovações, financeiro e sinal de saúde explicado.`}
      </p>

      <div className="nxc-split">
        <Card
          className={`nxc-lista ${cliente ? "compacta" : ""}`}
          title="Carteira"
          icon={<Briefcase size={16} />}
          count={filtradas.length}
          action={
            <button type="button" className="nx-link" onClick={() => abrirApp("lista-clientes")}>
              Clássico
            </button>
          }
        >
          <div className="nxc-tools">
            <label className="nxc-busca">
              <Search size={14} style={{ color: "var(--ink3)" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, tipo ou plano"
                aria-label="Buscar cliente"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label="Limpar busca"
                  style={{ color: "var(--ink3)", display: "grid" }}
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="nxc-seg" role="tablist" aria-label="Filtro da carteira">
              {(
                [
                  ["ativos", `Ativos (${ativos.length})`],
                  ["churn", `Churn (${churn})`],
                  ["todos", `Todos (${linhas.length})`],
                ] as [Filtro, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={filtro === id ? "on" : ""}
                  onClick={() => setFiltro(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {linhas.length === 0 ? (
            <Vazio titulo="Sem clientes cadastrados" texto="Cadastre pelo clássico em Clientes." />
          ) : filtradas.length === 0 ? (
            <Vazio
              titulo={q ? `Nada encontrado para "${q}"` : "Nenhum cliente neste filtro"}
              texto={q ? "Tente parte do nome." : undefined}
            />
          ) : (
            <div className="nxc-rolo">
              {filtradas.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`nxc-cli ${sel === l.id ? "on" : ""}`}
                  onClick={() => escolher(l.id)}
                  title={l.sinal.porque}
                >
                  <span className="av">{iniciais(l.nome) || "?"}</span>
                  <span className="t">
                    <b>{l.nome}</b>
                    <span>
                      <i
                        style={{
                          display: "inline-block",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: l.sinal.cor,
                          marginRight: 5,
                          verticalAlign: "middle",
                        }}
                      />
                      {l.sinal.label}
                      {l.plano ? ` · ${l.plano}` : ""}
                    </span>
                  </span>
                  <span
                    className={`n ${l.atrasadas.length ? "late" : ""}`}
                    title={
                      l.atrasadas.length
                        ? `${l.atrasadas.length} atrasada${l.atrasadas.length === 1 ? "" : "s"} de ${l.abertas.length} aberta${l.abertas.length === 1 ? "" : "s"}`
                        : `${l.abertas.length} tarefa${l.abertas.length === 1 ? "" : "s"} aberta${l.abertas.length === 1 ? "" : "s"}`
                    }
                  >
                    {l.atrasadas.length
                      ? `${l.atrasadas.length}/${l.abertas.length}`
                      : l.abertas.length}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>

        <div ref={fichaRef} style={{ minWidth: 0, scrollMarginTop: 70 }}>
          {!cliente || !extra ? (
            <Card solid className="c12">
              <Vazio
                titulo="Escolha um cliente na lista"
                texto="A ficha abre aqui com visão geral, tarefas, entregas, aprovações, financeiro, dados da ficha e saúde."
              />
            </Card>
          ) : (
            <Card solid className="c12" id="ficha-cliente">
              <div className="nxc-head">
                <button
                  type="button"
                  className="nx-ico nxc-voltar"
                  onClick={() => escolher(null)}
                  aria-label="Voltar para a lista"
                >
                  <ChevronLeft size={16} />
                </button>
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <span className="nx-h2">Cliente 360</span>
                  <h2>{cliente.nome}</h2>
                  <div className="pills">
                    {cliente.tipo && <Pill>{TIPO_LABEL[cliente.tipo] || cliente.tipo}</Pill>}
                    {cliente.plano && <Pill>{cliente.plano}</Pill>}
                    {cliente.status && STATUS_FICHA[cliente.status] && (
                      <Pill cor={STATUS_FICHA[cliente.status].cor}>
                        {STATUS_FICHA[cliente.status].label}
                      </Pill>
                    )}
                    <span className="nxc-sinal" title={cliente.sinal.porque}>
                      <i style={{ background: cliente.sinal.cor }} />
                      {cliente.sinal.label}
                    </span>
                  </div>
                </div>
                <div className="acao">
                  <button type="button" className="nx-btn" onClick={() => abrirApp("cliente")}>
                    Área do Cliente
                  </button>
                  <button
                    type="button"
                    className="nx-ico"
                    onClick={() => escolher(null)}
                    aria-label="Fechar ficha"
                    title="Fechar ficha"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="nxc-tabs" role="tablist" aria-label="Abas da ficha">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="tab"
                    aria-selected={aba === a.id}
                    className={`nxc-tab ${aba === a.id ? "on" : ""}`}
                    onClick={() => setAba(a.id)}
                  >
                    {a.label}
                    {abaCount[a.id] !== undefined && <span className="n">{abaCount[a.id]}</span>}
                  </button>
                ))}
              </div>

              {aba === "visao" && (
                <VisaoGeral
                  c={cliente}
                  mesKey={mesKey}
                  mesAntKey={mesAntKey}
                  temEditorial={temEditorial}
                  hoje={hoje}
                  onIr={setAba}
                  concluir={concluir}
                  abrirApp={abrirApp}
                />
              )}

              {aba === "tarefas" && (
                <div className="nxc-sec">
                  <div className="nxc-sec-h">
                    <ListChecks size={15} style={{ color: "var(--yel)" }} />
                    <span className="nx-h2">Tarefas abertas</span>
                    <span className="nx-pill">{cliente.abertas.length}</span>
                    <span className="sp" />
                    <button
                      type="button"
                      className="nx-link"
                      onClick={() => setVerConcluidas((v) => !v)}
                    >
                      {verConcluidas
                        ? "Esconder concluídas"
                        : `Concluídas no mês (${cliente.concluidasMes})`}
                    </button>
                    <button type="button" className="nx-link" onClick={() => abrirApp("tarefas")}>
                      Kanban
                    </button>
                  </div>
                  {cliente.abertas.length === 0 ? (
                    <Vazio
                      titulo="Nenhuma tarefa aberta"
                      texto="Tarefa ligada a este cliente pelo clienteId aparece aqui. Cartão de projeto conclui pelo quadro de Projetos."
                    />
                  ) : (
                    <div>
                      {[...cliente.abertas].sort(ordData).map((t) => (
                        <TarefaLinha
                          key={t.id}
                          t={t}
                          mostrarResp
                          onConcluir={concluir}
                          onAbrir={() =>
                            abrirApp(String(t.id).startsWith("pj:") ? "projetos" : "tarefas")
                          }
                        />
                      ))}
                    </div>
                  )}
                  {verConcluidas && (
                    <>
                      <div className="nxc-sec-h" style={{ marginTop: 6 }}>
                        <span className="nx-h2">Concluídas em {nomeMes(mesKey)}</span>
                        <span className="nx-pill">{cliente.concluidasMes}</span>
                      </div>
                      {cliente.concluidasMes === 0 ? (
                        <Vazio titulo="Nada concluído neste mês" />
                      ) : (
                        <div>
                          {cliente.todas
                            .filter(
                              (t) =>
                                t.status === "concluido" &&
                                String(t.concluidaEm || "").startsWith(mesKey),
                            )
                            .sort((a, b) =>
                              String(b.concluidaEm || "").localeCompare(
                                String(a.concluidaEm || ""),
                              ),
                            )
                            .map((t) => (
                              <div key={t.id} className="nx-row">
                                <span
                                  className="dot"
                                  style={{ background: STATUS_COR.concluido }}
                                />
                                <span className="t">
                                  <b>{t.title || "(sem título)"}</b>
                                  <span>{[t.resp, "Concluída"].filter(Boolean).join(" · ")}</span>
                                </span>
                                <span className="m">{dataBR(String(t.concluidaEm || ""))}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {aba === "entregas" && (
                <div className="nxc-sec">
                  <div className="nxc-sec-h">
                    <Send size={15} style={{ color: "var(--yel)" }} />
                    <span className="nx-h2">Editorial</span>
                    <span className="nx-pill">{extra.postsMes.length}</span>
                    <span className="sp" />
                    <span className="nxc-mes">
                      <button
                        type="button"
                        className="nx-ico"
                        style={{ width: 30, height: 30 }}
                        onClick={() => setMesEnt(mesAnterior(mesEnt))}
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <b>{nomeMes(mesEnt)}</b>
                      <button
                        type="button"
                        className="nx-ico"
                        style={{ width: 30, height: 30 }}
                        onClick={() => setMesEnt(mesSeguinte(mesEnt))}
                        aria-label="Mês seguinte"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </span>
                    <a href="/calendario" className="nx-link">
                      Calendário <ExternalLink size={12} />
                    </a>
                  </div>
                  {!temEditorial ? (
                    <Vazio
                      titulo="Editorial não veio no carregamento"
                      texto="O bloco wfa-editorial não chegou para este papel."
                    />
                  ) : extra.postsMes.length === 0 ? (
                    <Vazio
                      titulo={`Nenhuma postagem em ${nomeMes(mesEnt)}`}
                      texto="Postagens do editorial ligadas a este cliente aparecem aqui por status."
                    />
                  ) : (
                    <div className="nx-cols">
                      {(
                        [
                          ["planejado", "Planejado", "var(--ink3)"],
                          ["agendado", "Agendado", "var(--blue)"],
                          ["postado", "Postado", "var(--green)"],
                        ] as const
                      ).map(([stt, label, cor]) => {
                        const lst = extra.postsMes.filter((e) => e.status === stt);
                        return (
                          <div key={stt} className="nx-col">
                            <div className="h">
                              <i style={{ background: cor }} />
                              {label}
                              <b>{lst.length}</b>
                            </div>
                            {lst.length === 0 ? (
                              <div className="nx-mute" style={{ fontSize: 12 }}>
                                nenhuma
                              </div>
                            ) : (
                              lst.map((e) => (
                                <div
                                  key={e.id}
                                  className="it"
                                  title={`${e.titulo || "(sem título)"} · ${e.formato || ""} · ${dataBR(e.data)}`}
                                >
                                  {dataBR(e.data).slice(0, 5)} · {e.titulo || "(sem título)"}
                                  {e.formato ? ` · ${e.formato}` : ""}
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="nxc-sec-h" style={{ marginTop: 8 }}>
                    <span className="nx-h2">Captações</span>
                    <span className="nx-pill">{extra.capt.length}</span>
                    <span className="sp" />
                    <button type="button" className="nx-link" onClick={() => abrirApp("producao")}>
                      Produção
                    </button>
                  </div>
                  {extra.capt.length === 0 ? (
                    <Vazio titulo="Nenhuma captação registrada" />
                  ) : (
                    <div>
                      {extra.capt.slice(0, 6).map((c) => (
                        <div key={c.id} className="nx-row clk" onClick={() => abrirApp("producao")}>
                          <span
                            className="dot"
                            style={{
                              background:
                                c.status === "concluida" || c.concluidaEm
                                  ? "var(--green)"
                                  : "var(--blue)",
                            }}
                          />
                          <span className="t">
                            <b>{c.titulo || c.local || "Captação"}</b>
                            <span>
                              {[
                                c.status,
                                c.produtor,
                                c.videos?.length
                                  ? `${c.videos.length} vídeo${c.videos.length === 1 ? "" : "s"}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          <span className="m">{c.data ? dataBR(c.data) : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {aba === "aprovacoes" && (
                <div className="nxc-sec">
                  <div className="nxc-sec-h">
                    <CheckSquare size={15} style={{ color: "var(--yel)" }} />
                    <span className="nx-h2">Em homologação</span>
                    <span className="nx-pill">{cliente.homolog.length}</span>
                    <span className="sp" />
                    <button type="button" className="nx-link" onClick={() => abrirApp("tarefas")}>
                      Kanban
                    </button>
                  </div>
                  <p className="nx-mute" style={{ margin: 0, fontSize: 12 }}>
                    Aprovar conclui a tarefa. Devolver manda de volta para Em andamento. As duas
                    gravam no mesmo Kanban do clássico.
                  </p>
                  {cliente.homolog.length === 0 ? (
                    <Vazio titulo="Nada aguardando aprovação deste cliente" />
                  ) : (
                    <div>
                      {[...cliente.homolog].sort(ordData).map((t) => (
                        <LinhaAprov
                          key={t.id}
                          t={t}
                          hoje={hoje}
                          agoraMs={agoraMs}
                          onAprovar={concluir}
                          onDevolver={devolver}
                          abrirApp={abrirApp}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {aba === "financeiro" && (
                <div className="nxc-sec">
                  <div className="nxc-sec-h">
                    <Wallet size={15} style={{ color: "var(--yel)" }} />
                    <span className="nx-h2">Cobrança</span>
                    <span className="sp" />
                    <button
                      type="button"
                      className="nx-link"
                      onClick={() => abrirApp("financeiro")}
                    >
                      Financeiro no clássico
                    </button>
                  </div>
                  {!temCobranca ? (
                    <Vazio
                      titulo="Sem acesso"
                      texto="O bloco de cobrança não chega para o seu papel. Quem tem acesso vê valor e cobrança do mês aqui."
                    />
                  ) : (
                    <FinanceiroCliente
                      c={cliente}
                      cob={extra.cobCli}
                      mesKey={mesKey}
                      mesAntKey={mesAntKey}
                    />
                  )}
                </div>
              )}

              {aba === "ficha" && (
                <div className="nxc-sec">
                  <div className="nxc-sec-h">
                    <ClipboardList size={15} style={{ color: "var(--yel)" }} />
                    <span className="nx-h2">Ficha do clássico</span>
                    <span className="sp" />
                  </div>
                  <div className="nxc-acoes">
                    <button type="button" className="nx-btn" onClick={() => abrirApp("cliente")}>
                      Área do Cliente
                    </button>
                    <button
                      type="button"
                      className="nx-btn ghost"
                      onClick={() => abrirApp("jornada")}
                    >
                      Jornada
                    </button>
                    <button
                      type="button"
                      className="nx-btn ghost"
                      onClick={() => abrirApp("contratos")}
                    >
                      Contratos
                    </button>
                  </div>
                  <div className="nxc-kv">
                    <div className="it">
                      <small>Tipo</small>
                      <div>
                        {cliente.tipo ? TIPO_LABEL[cliente.tipo] || cliente.tipo : "não informado"}
                      </div>
                    </div>
                    <div className="it">
                      <small>Plano</small>
                      <div>{cliente.plano || "não informado"}</div>
                    </div>
                    <div className="it">
                      <small>Status da ficha</small>
                      <div>
                        {cliente.status && STATUS_FICHA[cliente.status]
                          ? STATUS_FICHA[cliente.status].label
                          : "sem ficha no clássico"}
                      </div>
                    </div>
                    {cliente.valorCustom ? (
                      <div className="it">
                        <small>Valor cadastrado</small>
                        <div>{brl(cliente.valorCustom)}</div>
                      </div>
                    ) : null}
                  </div>
                  <FichaLivre dados={extra.fichaLivre} />

                  <div className="nxc-sec-h" style={{ marginTop: 8 }}>
                    <span className="nx-h2">No CRM com o mesmo nome</span>
                    <span className="nx-pill">{extra.leads.length}</span>
                    <span className="sp" />
                    <button type="button" className="nx-link" onClick={() => abrirApp("comercial")}>
                      Comercial
                    </button>
                  </div>
                  {extra.leads.length === 0 ? (
                    <Vazio titulo="Nenhum lead no CRM com este nome" />
                  ) : (
                    <div>
                      {extra.leads.slice(0, 6).map((l) => {
                        const et = leadEtapa(l);
                        return (
                          <div
                            key={l.id}
                            className="nx-row clk"
                            onClick={() => abrirApp("comercial")}
                          >
                            <span className="dot" style={{ background: et.cor }} />
                            <span className="t">
                              <b>{l.nm}</b>
                              <span>
                                {[et.label, l.resp, Number(l.val) ? brl(Number(l.val)) : null]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                            <span className="m">{l.due ? dataBR(l.due) : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {aba === "saude" && (
                <div className="nxc-sec">
                  <div className="nxc-sec-h">
                    <Activity size={15} style={{ color: "var(--yel)" }} />
                    <span className="nx-h2">Sinal de saúde</span>
                    <span className="nxc-sinal" title={cliente.sinal.porque}>
                      <i style={{ background: cliente.sinal.cor }} />
                      {cliente.sinal.label}
                    </span>
                  </div>
                  <p className="nx-mute" style={{ margin: 0, fontSize: 12 }}>
                    Não existe nota numérica. Cada sinal abaixo vem de uma regra simples sobre os
                    dados reais e diz por que acendeu. O pior sinal manda no rótulo da lista.
                  </p>
                  <div className="nxc-saude">
                    {cliente.sinais.length === 0 ? (
                      <div className="it">
                        <i style={{ background: NIVEL_COR.ok }} />
                        <div>
                          <b>Em dia</b>
                          <span>{cliente.sinal.porque}</span>
                        </div>
                      </div>
                    ) : (
                      cliente.sinais.map((s) => (
                        <div key={s.label} className="it">
                          <i style={{ background: s.cor }} />
                          <div>
                            <b>{s.label}</b>
                            <span>{s.porque}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="nxc-sec-h" style={{ marginTop: 6 }}>
                    <span className="nx-h2">Regras conferidas</span>
                  </div>
                  <div className="nxc-kv">
                    <div className="it">
                      <small>Atrasadas</small>
                      <div>
                        {cliente.atrasadas.length} de {cliente.abertas.length} aberta
                        {cliente.abertas.length === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="it">
                      <small>Homologação parada</small>
                      <div>
                        {cliente.homolog.length === 0
                          ? "nada em homologação"
                          : cliente.aprovParadaDias === null
                            ? `${cliente.homolog.length} sem carimbo aprovacaoEm`
                            : `mais antiga há ${cliente.aprovParadaDias} dia${cliente.aprovParadaDias === 1 ? "" : "s"}`}
                      </div>
                    </div>
                    <div className="it">
                      <small>Editorial de {nomeMes(mesKey)}</small>
                      <div>
                        {!temEditorial
                          ? "bloco não carregado para este papel"
                          : `${cliente.entregasMes.length} postagem${cliente.entregasMes.length === 1 ? "" : "s"}`}
                      </div>
                    </div>
                    <div className="it">
                      <small>Ficha</small>
                      <div>
                        {cliente.status && STATUS_FICHA[cliente.status]
                          ? STATUS_FICHA[cliente.status].label
                          : "sem status manual"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function VisaoGeral({
  c,
  mesKey,
  mesAntKey,
  temEditorial,
  hoje,
  onIr,
  concluir,
  abrirApp,
}: {
  c: Linha;
  mesKey: string;
  mesAntKey: string;
  temEditorial: boolean;
  hoje: string;
  onIr: (a: Aba) => void;
  concluir: (t: Tarefa) => Promise<void>;
  abrirApp: (p: string) => void;
}) {
  const dif = c.concluidasMes - c.concluidasMesAnt;
  const postadas = c.entregasMes.filter((e) => e.status === "postado").length;
  const proximas = [...c.abertas].sort(ordData).slice(0, 5);
  return (
    <div className="nxc-sec" style={{ gap: 12 }}>
      <div className="nxc-kpis">
        <Kpi
          label="Abertas"
          value={c.abertas.length}
          detail="tarefas em andamento"
          title="Tarefas com status diferente de concluído ligadas a este cliente pelo clienteId, incluindo cartões de projeto fora do backlog (contados uma vez só)."
          onOpen={() => onIr("tarefas")}
        />
        <Kpi
          label="Atrasadas"
          value={c.atrasadas.length}
          tone={c.atrasadas.length ? "warn" : "ok"}
          detail="prazo antes de hoje"
          title={`Tarefas abertas com prazo anterior a ${dataBR(hoje)} (fuso de São Paulo). Tarefa sem prazo não conta.`}
          onOpen={() => onIr("tarefas")}
        />
        <Kpi
          label="Concluídas no mês"
          value={c.concluidasMes}
          detail={`vs mês anterior: ${c.concluidasMesAnt} (${dif > 0 ? "+" : ""}${dif})`}
          tone={dif > 0 ? "ok" : undefined}
          title={`Tarefas concluídas com carimbo concluidaEm em ${nomeMes(mesKey)}, comparadas com a mesma regra em ${nomeMes(mesAntKey)}. Cartão de projeto não tem carimbo e não entra.`}
        />
        <Kpi
          label="Em homologação"
          value={c.homolog.length}
          tone={c.aprovParadaDias !== null && c.aprovParadaDias >= 3 ? "warn" : undefined}
          detail={
            c.aprovParadaDias === null
              ? "interna e do cliente"
              : `mais antiga há ${c.aprovParadaDias} dia${c.aprovParadaDias === 1 ? "" : "s"}`
          }
          title="Tarefas abertas com status Homologação ou Homologação do cliente. O tempo parado vem do carimbo aprovacaoEm; sem carimbo não dá para medir."
          onOpen={() => onIr("aprovacoes")}
        />
        <Kpi
          label="Entregas do mês"
          value={temEditorial ? c.entregasMes.length : "n/d"}
          detail={
            temEditorial
              ? `${postadas} postada${postadas === 1 ? "" : "s"}`
              : "editorial não carregado"
          }
          title={`Postagens do editorial (wfa-editorial) deste cliente com data em ${nomeMes(mesKey)}, em qualquer status. "Postadas" conta só o status postado.`}
          onOpen={() => onIr("entregas")}
        />
      </div>

      <div className="nxc-sec">
        <div className="nxc-sec-h">
          <ListChecks size={15} style={{ color: "var(--yel)" }} />
          <span className="nx-h2">Próximos prazos</span>
          <span className="sp" />
          <button type="button" className="nx-link" onClick={() => onIr("tarefas")}>
            Todas as tarefas
          </button>
        </div>
        {proximas.length === 0 ? (
          <Vazio titulo="Nenhuma tarefa aberta" texto={c.sinal.porque} />
        ) : (
          <div>
            {proximas.map((t) => (
              <TarefaLinha
                key={t.id}
                t={t}
                mostrarResp
                onConcluir={concluir}
                onAbrir={() => abrirApp(String(t.id).startsWith("pj:") ? "projetos" : "tarefas")}
              />
            ))}
          </div>
        )}
      </div>

      <div className="nxc-sec">
        <div className="nxc-sec-h">
          <Activity size={15} style={{ color: "var(--yel)" }} />
          <span className="nx-h2">Por que este sinal</span>
          <span className="sp" />
          <button type="button" className="nx-link" onClick={() => onIr("saude")}>
            Ver regras
          </button>
        </div>
        <div className="nxc-saude">
          <div className="it">
            <i style={{ background: c.sinal.cor }} />
            <div>
              <b>{c.sinal.label}</b>
              <span>{c.sinal.porque}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinhaAprov({
  t,
  hoje,
  agoraMs,
  onAprovar,
  onDevolver,
  abrirApp,
}: {
  t: Tarefa;
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
    <div className="nxc-apr">
      <span className="dot" style={{ background: STATUS_COR[t.status || ""] || "#888" }} />
      <span className="t">
        <b>{t.title || "(sem título)"}</b>
        <span
          title={
            t.aprovacaoEm
              ? `Entrou em homologação em ${dataBR(String(t.aprovacaoEm))}`
              : "A tarefa não tem carimbo de entrada em homologação (aprovacaoEm)"
          }
        >
          {[
            STATUS_LABEL[t.status || ""],
            t.resp,
            dias === null ? "sem carimbo" : `há ${dias} dia${dias === 1 ? "" : "s"}`,
            t.data ? `prazo ${dataBR(t.data)}${late ? " (vencido)" : ""}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className="acts">
        {projeto ? (
          <button type="button" className="nx-btn ghost" onClick={() => abrirApp("projetos")}>
            Quadro de Projetos
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`nx-btn ok ${busy ? "busy" : ""}`}
              title="Aprovar: conclui a tarefa (grava no Kanban)"
              onClick={() => roda("ok", onAprovar)}
            >
              Aprovar
            </button>
            <button
              type="button"
              className={`nx-btn ghost ${busy ? "busy" : ""}`}
              title="Devolver: volta para Em andamento (grava no Kanban)"
              onClick={() => roda("dev", onDevolver)}
            >
              Devolver
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function FinanceiroCliente({
  c,
  cob,
  mesKey,
  mesAntKey,
}: {
  c: Linha;
  cob: Record<string, unknown> | null;
  mesKey: string;
  mesAntKey: string;
}) {
  const meses =
    cob && cob.cobradoMeses && typeof cob.cobradoMeses === "object"
      ? (cob.cobradoMeses as Record<string, unknown>)
      : {};
  const cobradoEm = (k: string) => (cob ? cob.cobradoMes === k || !!meses[k] : false);
  const valor = c.valorCustom || Number(cob?._valor) || 0;
  const mesAtual = cobradoEm(mesKey);
  const mesAnt = cobradoEm(mesAntKey);
  const feitas = Number(cob?.feitas) || 0;
  const resp = String(cob?.resp || "");
  return (
    <>
      {!cob && !valor ? (
        <Vazio
          titulo="Sem cobrança cadastrada"
          texto="Este cliente não tem valor nem registro de cobrança no Financeiro do clássico."
        />
      ) : (
        <div className="nxc-fin">
          <Kpi
            label="Valor mensal"
            value={valor ? brl(valor) : "n/d"}
            detail={
              valor ? (c.valorCustom ? "cadastro do cliente" : "planilha de cobrança") : "sem valor"
            }
            title="Valor do contrato: primeiro o campo valor da ficha do clássico (wfa-clientes-custom); se não houver, o _valor da cobrança."
          />
          <Kpi
            label={nomeMes(mesKey).split(" ")[0]}
            value={mesAtual ? "Cobrado" : "Em aberto"}
            tone={mesAtual ? "ok" : "warn"}
            detail="cobrança deste mês"
            title={`Cobrado quando cobradoMes é igual a ${mesKey} ou cobradoMeses[${mesKey}] está marcado no bloco wfa-cobranca.`}
          />
          <Kpi
            label={nomeMes(mesAntKey).split(" ")[0]}
            value={mesAnt ? "Cobrado" : "Sem marca"}
            tone={mesAnt ? "ok" : undefined}
            detail="mês anterior, mesma regra"
            title={`Mesma regra aplicada a ${mesAntKey}. "Sem marca" pode ser cliente novo ou cobrança não registrada.`}
          />
          <Kpi
            label="Cobranças feitas"
            value={feitas}
            detail={resp ? `resp. ${resp}` : "sem responsável"}
            title="Contador feitas do bloco wfa-cobranca deste cliente, como o clássico registra."
          />
        </div>
      )}
    </>
  );
}

function FichaLivre({ dados }: { dados: Record<string, unknown> | null }) {
  if (!dados || Object.keys(dados).length === 0)
    return (
      <Vazio
        titulo="Ficha livre vazia"
        texto="Os campos preenchidos na ficha do clássico (wfa-cliente-detalhes) aparecem aqui em leitura."
      />
    );
  const valorTxt = (v: unknown) =>
    v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  const usadas = new Set<string>();
  const blocos = GRUPOS_FICHA.map((g) => {
    const itens = g.chaves
      .map((k) => {
        usadas.add(k);
        return [k, valorTxt(dados[k])] as [string, string];
      })
      .filter(([, v]) => v.trim());
    return { titulo: g.titulo, itens };
  }).filter((b) => b.itens.length);
  const outros = Object.entries(dados)
    .filter(([k]) => !usadas.has(k))
    .map(([k, v]) => [k, valorTxt(v)] as [string, string])
    .filter(([, v]) => v.trim());
  if (outros.length) blocos.push({ titulo: "Outros campos", itens: outros });
  if (blocos.length === 0) return <Vazio titulo="Ficha livre sem campo preenchido" />;
  return (
    <>
      {blocos.map((b) => (
        <div key={b.titulo} className="nxc-sec">
          <div className="nxc-sec-h">
            <span className="nx-h2">{b.titulo}</span>
          </div>
          <div className="nxc-kv">
            {b.itens.map(([k, v]) => (
              <div key={k} className={`it ${k === "briefing" || v.length > 120 ? "wide" : ""}`}>
                <small>{ROTULOS[k] || k}</small>
                <div>
                  {ehLink(v) ? (
                    <a href={v} target="_blank" rel="noreferrer">
                      {v.replace(/^https?:\/\//i, "").slice(0, 60)}
                      {v.length > 68 ? "…" : ""} <ExternalLink size={11} />
                    </a>
                  ) : (
                    v
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
