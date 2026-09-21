// Sidebars copiadas dos benchmarks (21/09/2026, pedido do Gabriel): a estrutura exata de
// grupos e subitens do AgencyFlow (05-MATRIZ, E01 a E05) e do Modo Criador (06, s35), cada
// item apontando pra tela NOSSA que faz aquele trabalho. Terceira opcao: menu ARK original.
import type { ComponentType } from "react";
import {
  BarChart3, BookOpen, Briefcase, CalendarDays, CheckSquare, Clapperboard, FileSignature, FolderOpen,
  Handshake, HelpCircle, Home, Image, Inbox, Instagram, Landmark, LayoutDashboard, ListTodo, PieChart,
  Settings, ShoppingBag, Sunrise, Trash2, UserCircle, Users, UsersRound, Wallet, Wrench, Bot, KanbanSquare,
} from "lucide-react";

export type Destino =
  | { tipo: "painel"; area: string }
  | { tipo: "classico"; pagina: string }
  | { tipo: "href"; href: string };
export type ItemMenu = { label: string; Icon?: ComponentType<{ size?: number; strokeWidth?: number }>; destino: Destino; filhos?: ItemMenu[]; badge?: string };
export type MenuDef = { id: "v2" | "agencyflow" | "modocriador" | "ark"; nome: string; fonte: string; itens: ItemMenu[] };

const P = (area: string): Destino => ({ tipo: "painel", area });
const C = (pagina: string): Destino => ({ tipo: "classico", pagina });
const H = (href: string): Destino => ({ tipo: "href", href });

// Estrutura aprovada pelo Gabriel em 21/09/2026 (base v2, workflowark-v2.arkcontent.workers.dev):
// CRM acima de Início, Atividades com subtópicos (Quadro, Lista, Projetos, Gestão de clientes),
// sem lista de clientes na lateral (software pra empresa, não pra cliente).
export const MENU_V2: MenuDef = {
  id: "v2", nome: "WorkFlowArk 2", fonte: "base v2 aprovada em 21/09",
  itens: [
    { label: "CRM", Icon: Handshake, destino: P("comercial"), badge: "comercial" },
    { label: "Início", Icon: Home, destino: P(""), badge: "" },
    { label: "Atividades", Icon: KanbanSquare, destino: P("atividades"), badge: "atividades", filhos: [
      { label: "Quadro", destino: C("tarefas") },
      { label: "Lista", destino: P("atividades") },
      { label: "Projetos", destino: C("projetos") },
      { label: "Gestão de clientes", destino: P("clientes") },
    ] },
    { label: "Clientes", Icon: Briefcase, destino: P("clientes") },
    { label: "Entregas", Icon: CheckSquare, destino: P("aprovacoes"), badge: "aprovacoes" },
    { label: "Produção", Icon: Clapperboard, destino: P("producao"), badge: "producao" },
    { label: "Calendário", Icon: CalendarDays, destino: P("calendario"), badge: "calendario" },
    { label: "Financeiro", Icon: Wallet, destino: P("financeiro") },
    { label: "Equipe", Icon: UsersRound, destino: P("equipe") },
    { label: "Relatórios", Icon: BarChart3, destino: P("relatorios") },
    { label: "Hermes", Icon: Bot, destino: P("hermes") },
    { label: "Configurações", Icon: Settings, destino: P("configuracoes") },
  ],
};

export const MENU_AGENCYFLOW: MenuDef = {
  id: "agencyflow", nome: "AgencyFlow", fonte: "estrutura observada em E01 a E05",
  itens: [
    { label: "Início", Icon: Home, destino: P(""), badge: "" },
    { label: "Clientes", Icon: Briefcase, destino: P("clientes"), filhos: [
      { label: "Gestão de clientes", destino: P("clientes") },
      { label: "Análise de churn", destino: P("clientes") },
      { label: "Contratos", destino: C("contratos") },
    ] },
    { label: "Projetos", Icon: Clapperboard, destino: P("producao"), filhos: [
      { label: "Gestão de entregas", destino: P("producao") },
      { label: "Tarefas", destino: C("tarefas") },
      { label: "Agenda de projetos", destino: P("calendario") },
      { label: "Aprovação de conteúdo", destino: P("aprovacoes"), badge: "aprovacoes" },
      { label: "Fornecedores", destino: C("alpha") },
      { label: "Creators", destino: P("equipe") },
    ] },
    { label: "Comercial", Icon: Handshake, destino: P("comercial"), badge: "comercial", filhos: [
      { label: "CRM", destino: P("comercial") },
      { label: "Esteira de produtos", destino: C("propostas") },
    ] },
    { label: "Finanças", Icon: Wallet, destino: P("financeiro"), filhos: [
      { label: "Recebimentos", destino: P("financeiro") },
      { label: "Contas a pagar", destino: C("acerto") },
      { label: "Inadimplência", destino: C("cobranca") },
      { label: "Relatórios", destino: P("relatorios") },
    ] },
    { label: "Recursos Humanos", Icon: UsersRound, destino: P("equipe"), filhos: [
      { label: "Colaboradores", destino: P("equipe") },
      { label: "Organograma", destino: C("organograma") },
      { label: "Rotinas", destino: P("automacoes") },
    ] },
    { label: "Toolkit", Icon: Wrench, destino: C("integracoes"), filhos: [
      { label: "Integrações", destino: C("integracoes") },
      { label: "Drive", destino: C("drive") },
      { label: "Notificações", destino: C("notificacoes") },
    ] },
    { label: "Gestão de usuários", Icon: Users, destino: P("configuracoes") },
    { label: "Perfil", Icon: UserCircle, destino: P("configuracoes") },
  ],
};

export const MENU_MODOCRIADOR: MenuDef = {
  id: "modocriador", nome: "Modo Criador", fonte: "barra lateral observada (s35, v2-026)",
  itens: [
    { label: "Minhas demandas", Icon: ListTodo, destino: P(""), badge: "" },
    { label: "Dashboard", Icon: LayoutDashboard, destino: P("relatorios") },
    { label: "Clientes", Icon: FolderOpen, destino: P("clientes"), filhos: [
      { label: "Social media", destino: P("clientes") },
      { label: "Novo cliente", destino: C("lista-clientes") },
    ] },
    { label: "Biblioteca", Icon: BookOpen, destino: C("drive") },
    { label: "Instagram", Icon: Instagram, destino: H("/calendario"), filhos: [
      { label: "Atividade", destino: C("campanhas") },
      { label: "Calendário", destino: H("/calendario") },
    ] },
    { label: "Vendas", Icon: ShoppingBag, destino: P("comercial"), badge: "comercial" },
    { label: "Seleção de fotos", Icon: Image, destino: C("drive") },
    { label: "Lixeira", Icon: Trash2, destino: C("tarefas") },
    { label: "Visão geral", Icon: PieChart, destino: P("relatorios"), filhos: [
      { label: "Jornada do cliente", destino: C("jornada") },
      { label: "Margem por cliente", destino: P("financeiro") },
      { label: "Pagamentos", destino: C("cobranca") },
    ] },
    { label: "Financeiro", Icon: Landmark, destino: P("financeiro"), filhos: [
      { label: "Seu plano", destino: P("financeiro") },
    ] },
    { label: "Equipe", Icon: UsersRound, destino: P("equipe"), filhos: [
      { label: "Rotina", destino: P("automacoes") },
      { label: "Membros", destino: P("equipe") },
      { label: "Relatório", destino: P("relatorios") },
      { label: "Auditoria de produção", destino: C("notificacoes") },
    ] },
    { label: "Ajuda", Icon: HelpCircle, destino: C("tutorial") },
  ],
};

export const MENU_ARK: MenuDef = {
  id: "ark", nome: "ARK", fonte: "áreas por trabalho",
  itens: [
    { label: "Meu Dia", Icon: Sunrise, destino: P(""), badge: "" },
    { label: "Comercial", Icon: Handshake, destino: P("comercial"), badge: "comercial" },
    { label: "Clientes", Icon: Briefcase, destino: P("clientes") },
    { label: "Produção", Icon: Clapperboard, destino: P("producao"), badge: "producao" },
    { label: "Aprovações", Icon: CheckSquare, destino: P("aprovacoes"), badge: "aprovacoes" },
    { label: "Calendário", Icon: CalendarDays, destino: P("calendario"), badge: "calendario" },
    { label: "Financeiro", Icon: Wallet, destino: P("financeiro") },
    { label: "Equipe", Icon: UsersRound, destino: P("equipe") },
    { label: "Relatórios", Icon: BarChart3, destino: P("relatorios") },
    { label: "Automações", Icon: Inbox, destino: P("automacoes") },
    { label: "Hermes", Icon: FileSignature, destino: P("hermes") },
    { label: "Configurações", Icon: Settings, destino: P("configuracoes") },
  ],
};

export const MENUS: MenuDef[] = [MENU_V2, MENU_AGENCYFLOW, MENU_MODOCRIADOR, MENU_ARK];
