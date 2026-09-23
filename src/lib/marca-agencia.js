/* Marca da agência (23/09/2026, pedido do Gabriel: "se for a agência do Zé vai ser WorkFlowZé").
   Mesma regra do núcleo de public/workflowark-agencia-20260923c.js; deploy/teste-agencia.mjs
   prova que as duas concordam. */

const GENERICAS = ["agencia", "digital", "marketing", "mkt", "comunicacao", "studio", "estudio", "content",
  "conteudo", "criativa", "criativo", "publicidade", "propaganda", "midia", "media", "social", "ltda", "me",
  "eireli", "grupo", "company", "co", "do", "da", "de", "dos", "das", "e", "&", "the"];
const LIMITE = 13;

function semAcento(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
function capitaliza(p) { return p ? p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR") : ""; }

export function nomeCurto(marca) {
  const m = marca || {};
  const curto = String(m.short || "").trim();
  if (curto) return curto.slice(0, LIMITE);
  const palavras = String(m.name || "").replace(/[.,;:!?()"'/\\]/g, " ").split(/\s+/).filter(Boolean);
  if (!palavras.length) return "";
  const uteis = palavras.filter((p) => GENERICAS.indexOf(semAcento(p)) < 0);
  return capitaliza((uteis[0] || palavras[0]).slice(0, LIMITE));
}

export function nomeProduto(marca) {
  const c = nomeCurto(marca);
  if (!c || semAcento(c) === "ark") return "WorkFlowArk";
  return "WorkFlow" + c;
}

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

// O sistema escreve texto escuro sobre a cor de destaque em vários lugares; cor muito escura some.
export function corAceita(hex) {
  return /^#[0-9a-f]{6}$/i.test(String(hex || "")) && luminancia(hex) >= 0.12;
}

export function corSobre(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(String(hex || ""))) return "#111111";
  const l = luminancia(hex);
  return (l + 0.05) / (0.0056 + 0.05) >= (1.05) / (l + 0.05) ? "#111111" : "#ffffff";
}
