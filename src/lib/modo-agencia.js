/* Modo agência (23/09/2026): mesma regra de public/workflowark-agencia-20260923a.js, para as
   telas React (entrada, /app). Domínio que não é da ARK = agência. No domínio da ARK só com
   ?agencia=1 (demonstração); ?agencia=0 desliga. A escolha fica salva em wfa-modo para
   sobreviver ao redirect pro login e à volta do Google. Teste: deploy/teste-agencia.mjs. */

export const HOSTS_ARK = ["workflowark.arkcontent.workers.dev", "localhost", "127.0.0.1", ""];

export function hostDaArk(host) {
  host = String(host || "").toLowerCase();
  return HOSTS_ARK.indexOf(host) >= 0 || /-workflowark\.arkcontent\.workers\.dev$/.test(host);
}

export function decidirModo(o) {
  const busca = String((o && o.busca) || "");
  const m = busca.match(/[?&]agencia=([01])/);
  if (m) return m[1] === "1" ? "agencia" : "ark";
  const salvo = o && o.salvo;
  if (salvo === "agencia" || salvo === "ark") return salvo;
  return hostDaArk(o && o.host) ? "ark" : "agencia";
}

/* Lê o endereço, guarda o ?agencia= se veio, e devolve o modo. Storage quebrado não derruba. */
export function lerEGuardarModo(loc, storage) {
  const busca = String((loc && loc.search) || "");
  let salvo = null;
  try { salvo = storage ? storage.getItem("wfa-modo") : null; } catch { salvo = null; }
  const m = busca.match(/[?&]agencia=([01])/);
  if (m) {
    try { if (storage) storage.setItem("wfa-modo", m[1] === "1" ? "agencia" : "ark"); } catch { /* aba privada */ }
  }
  return decidirModo({ host: loc && loc.hostname, busca, salvo });
}
