// Tipos do módulo puro de Entregas do portal (src/lib/entregas.js).
export type LinkEntrega = { nome: string; url: string; tipo?: string };
export type Entrega = { id: string; titulo: string; formato: string; publicarEm: string; concluidaEm: string; legenda: string; links: LinkEntrega[] };
export type Aprovacao = { id: string; titulo: string; formato: string; publicarEm: string; briefing: string; legenda: string; desde: string; links: LinkEntrega[] };
export function derivarEntregas(tarefas: any[], cliente: string, agoraIso?: string): { entregas: Entrega[]; aprovacoes: Aprovacao[] };
export function aplicarDecisaoCliente(tarefa: any, acao: "aprovar" | "ajustar" | string, comentario: string, agoraIso?: string): any;
