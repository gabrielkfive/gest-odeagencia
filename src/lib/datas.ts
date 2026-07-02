// Datas no fuso da ARK (America/Sao_Paulo), não em UTC.
// No Cloudflare Workers o runtime é UTC, então new Date().toISOString() dá a data
// UTC: das 21h à meia-noite de Brasília já é o dia seguinte. Isso quebrava prazos,
// idempotência dos agentes e a virada de mês. en-CA formata como YYYY-MM-DD.
export function dataSP(d?: Date): string {
  return (d ?? new Date()).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
export function hojeSP(): string {
  return dataSP(new Date());
}
