// Traduz falha da API da Anthropic em mensagem clara em português (28/09/2026).
// Motivo: em 05/09/2026 a Anthropic desligou a conta por falta de crédito e várias
// telas/crons mostravam o erro cru em inglês ou simplesmente não geravam nada, sem aviso.
// Só classifica o erro; não muda nenhuma regra de negócio.

export const IA_SEM_CREDITO = "IA indisponível: sem crédito na API da Anthropic";
export const IA_CHAVE_INVALIDA = "IA indisponível: chave da API da Anthropic inválida ou revogada";
export const IA_SEM_ACESSO = "IA indisponível: acesso à API da Anthropic bloqueado (conta sem crédito ou desativada)";

// Devolve a mensagem em português quando o erro é de crédito/chave/conta (não adianta
// tentar de novo); devolve "" para os demais (limite, sobrecarga, erro de rede etc.).
export function iaErroFatal(status: number, data: any): string {
  const tipo = String(data?.error?.type || "");
  const msg = String(data?.error?.message || "").toLowerCase();
  if (/credit balance|billing|purchase credits|plans & billing/.test(msg)) return IA_SEM_CREDITO;
  if (/organization.*(disabled|deactivated)|account.*(disabled|deactivated)/.test(msg)) return IA_SEM_CREDITO;
  if (status === 401 || tipo === "authentication_error" || /invalid x-api-key|invalid api key/.test(msg)) return IA_CHAVE_INVALIDA;
  if (status === 403 || tipo === "permission_error") return IA_SEM_ACESSO;
  return "";
}

// Mensagem para mostrar ao usuário: a clara em português quando é crédito/chave;
// senão, a mensagem original da API (ou o texto padrão).
export function iaErroMsg(status: number, data: any, padrao = "Falha na IA"): string {
  return iaErroFatal(status, data) || data?.error?.message || padrao;
}

// Para caminhos de fundo (webhook, cron) que caem em regra/fallback sem avisar ninguém:
// pelo menos deixa rastro legível no log do Worker.
export function iaLogFalha(onde: string, status: number, data: any): void {
  const fatal = iaErroFatal(status, data);
  console.error(`[IA ${onde}] ${fatal || "falha HTTP " + status}: ${String(data?.error?.message || "").slice(0, 200)}`);
}
