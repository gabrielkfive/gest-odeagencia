// Regra de entrada de conta nova (24/09/2026). Módulo puro, testado em deploy/teste-acesso.mjs.
// Conta criada por quem não foi convidado NÃO entra na operação: fica pendente (active false)
// até o admin liberar em Configurações > Equipe. Volta a regra anterior a 17/09, agora que o
// sistema está sendo anunciado pra fora e qualquer um pode criar conta.
const PAPEIS = new Set(["admin", "gestor", "financeiro", "operacao", "comercial", "marketing", "viewer"]);

// emailVerificado: true só quando o provedor provou o e-mail (Google). Cadastro por senha
// não prova nada, então mesmo com e-mail de convidado fica pendente (auditoria 24/09).
export function papelNovoMembro({ isFirst, existente, emailVerificado = false }) {
  if (isFirst) return { role: "admin", active: true };
  if (existente) {
    const role = PAPEIS.has(String(existente.role)) ? String(existente.role) : "viewer";
    return { role, active: emailVerificado && existente.active !== false };
  }
  return { role: "viewer", active: false };
}
