// Contexto do /next fora do arquivo de rota: o code splitting do TanStack separa o
// componente da rota num modulo virtual, e um createContext dentro do arquivo de rota
// vira DUAS instancias (useNext "fora do /next" mesmo dentro dele). Aqui e um modulo so.
import { createContext, useContext } from "react";
import {
  Bot, Briefcase, CalendarDays, CheckSquare, Clapperboard, Handshake, PieChart, Settings,
  Sunrise, UsersRound, Wallet, Workflow,
} from "lucide-react";
import type { Carga, Member, Tarefa } from "./dados";

export type NextCtx = {
  carga: Carga | null;
  member: Member | null;
  carregando: boolean;
  erro: string;
  recarregar: () => Promise<void>;
  nomes: Record<string, string>;
  tarefas: Tarefa[];
  concluir: (t: Tarefa) => Promise<void>;
  toast: (msg: string) => void;
  abrirApp: (pagina: string) => void;
  claro: boolean;
  atualizadoEm: Date | null;
};
export const Ctx = createContext<NextCtx | null>(null);
export function useNext(): NextCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNext fora do /next");
  return c;
}

export const AREAS = [
  { id: "", label: "Meu Dia", Icon: Sunrise, legado: "dashboard" },
  { id: "comercial", label: "Comercial", Icon: Handshake, legado: "comercial" },
  { id: "atividades", label: "Atividades", Icon: CheckSquare, legado: "tarefas" },
  { id: "clientes", label: "Clientes", Icon: Briefcase, legado: "lista-clientes" },
  { id: "producao", label: "Produção", Icon: Clapperboard, legado: "tarefas" },
  { id: "aprovacoes", label: "Aprovações", Icon: CheckSquare, legado: "tarefas" },
  { id: "calendario", label: "Calendário", Icon: CalendarDays, legado: "reunioes" },
  { id: "financeiro", label: "Financeiro", Icon: Wallet, legado: "financeiro" },
  { id: "equipe", label: "Equipe", Icon: UsersRound, legado: "organograma" },
  { id: "relatorios", label: "Relatórios", Icon: PieChart, legado: "meumes" },
  { id: "automacoes", label: "Automações", Icon: Workflow, legado: "rotinas" },
  { id: "hermes", label: "Hermes", Icon: Bot, legado: "jarvis" },
  { id: "configuracoes", label: "Configurações", Icon: Settings, legado: "integracoes" },
] as const;
export type AreaId = (typeof AREAS)[number]["id"];

