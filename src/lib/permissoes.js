// Papéis e permissões da equipe (24/09/2026), vindo da tela Equipe da V3.
// Módulo puro, testado em deploy/teste-permissoes.mjs. O servidor importa este arquivo e o
// navegador carrega uma cópia IDÊNTICA em public/workflowark-permissoes-<data>.js (o teste
// compara os dois). Mudou aqui, copie para lá.
//
// Precedência: padrão do papel (acesso de antes), matriz do papel (Configurações > Equipe),
// ajuste da pessoa (só o que difere do padrão do papel), admin sempre tudo.

export const PAPEIS = [
  { v: "admin", nome: "Admin", desc: "Sempre tudo, inclusive equipe e pagamentos." },
  { v: "gestor", nome: "Gestor", desc: "Toda a operação e o financeiro. Não vê pagamentos." },
  { v: "financeiro", nome: "Financeiro", desc: "Financeiro e cobranças. Consulta o dia a dia." },
  { v: "operacao", nome: "Operação", desc: "Tarefas, clientes e o dia a dia. Não vê o financeiro." },
  { v: "comercial", nome: "Comercial", desc: "CRM, comercial e clientes. Não vê o financeiro." },
  { v: "marketing", nome: "Marketing", desc: "Tarefas, demandas e campanhas." },
  { v: "viewer", nome: "Visualização", desc: "Só consulta Meu Dia, agenda e processos." },
];

// Áreas da matriz. nav = abas do menu; blocos = chaves wfa-* que a área grava.
export const AREAS = [
  { k: "inicio", nome: "Meu Dia", nav: ["dashboard", "reunioes", "agenda", "meumes"], blocos: ["wfa-agenda-events", "wfa-widgets"] },
  { k: "atividades", nome: "Atividades", nav: ["tarefas", "demandas", "rotinas", "projetos", "producao", "briefings"], blocos: ["wfa-tarefas", "wfa-demandas", "wfa-rotinas", "wfa-projetos", "wfa-producao", "wfa-briefings", "wfa-inline-edits"] },
  { k: "clientes", nome: "Clientes", nav: ["lista-clientes", "jornada", "regua", "cliente", "marcas", "planejamentos"], blocos: ["wfa-regua", "wfa-jornada", "wfa-clientes-custom", "wfa-cliente-detalhes", "wfa-planejamentos", "wfa-cli-geo", "wfa-brand"] },
  { k: "comercial", nome: "Comercial", nav: ["comercial", "crm", "propostas", "contratos"], blocos: ["wfa-crm", "wfa-comercial", "wfa-propostas"] },
  { k: "financeiro", nome: "Financeiro", nav: ["financeiro", "cobranca"], blocos: ["wfa-fin", "wfa-cobranca", "wfa-planilha"] },
  { k: "pagamentos", nome: "Pagamentos", nav: ["acerto"], blocos: ["wfa-acerto", "wfa-acertosrec"] },
  { k: "conteudo", nome: "Conteúdo e IA", nav: ["planejamento", "legenda", "roteirista", "agentes", "conselho", "jarvis", "drive"], blocos: ["wfa-planejamento", "wfa-criativos", "wfa-conselho-briefings", "wfa-drive"] },
  { k: "gestao", nome: "Gestão", nav: ["okrs", "campanhas", "allhands", "warroom", "alpha", "organograma", "pops", "processos", "tutorial", "base-conhecimento", "integracoes"], blocos: ["wfa-okrs", "wfa-okrs-edits", "wfa-processos", "wfa-alpha", "wfa-alpha-am", "wfa-alpha-gt", "wfa-alpha-cr", "wfa-alpha-bs", "wfa-warroom"] },
  { k: "chat", nome: "Chat", nav: ["chat"], blocos: [] },
];

export const NAV_CHAVES = AREAS.flatMap((a) => a.nav).concat(["notificacoes"]);
const TUDO = NAV_CHAVES;
const BASE = ["dashboard", "reunioes", "agenda", "organograma", "pops", "processos", "meumes"];
// Sensíveis: fora do padrão de qualquer papel que não seja admin.
const SENSIVEIS = ["acerto", "notificacoes"];

// Acesso de antes (ROLE_ACCESS do app até 22/09/2026).
const PADRAO = {
  gestor: TUDO,
  comercial: BASE.concat(["comercial", "crm", "lista-clientes", "jornada", "regua", "tarefas"]),
  operacao: BASE.concat(["tarefas", "rotinas", "demandas", "lista-clientes", "jornada", "regua", "campanhas", "okrs"]),
  marketing: BASE.concat(["tarefas", "demandas", "lista-clientes", "campanhas"]),
  financeiro: BASE.concat(["financeiro", "cobranca", "campanhas"]),
  viewer: BASE,
  avaliador: BASE.concat(["lista-clientes", "jornada", "regua", "tarefas", "agentes", "conselho", "planejamento", "legenda", "cliente", "roteirista", "drive", "crm", "okrs", "campanhas", "tutorial", "integracoes"]),
};

const PAPEIS_MATRIZ = PAPEIS.map((p) => p.v).filter((v) => v !== "admin");
const areaPorK = Object.fromEntries(AREAS.map((a) => [a.k, a]));

/** Abas que o papel vê sem matriz nem ajuste. */
export function navPadrao(role) {
  const out = {};
  if (role === "admin") { for (const k of NAV_CHAVES) out[k] = true; return out; }
  const lista = PADRAO[role] || PADRAO.viewer;
  for (const k of NAV_CHAVES) out[k] = lista.includes(k) && !SENSIVEIS.includes(k);
  return out;
}

/** Estado padrão de uma célula da matriz: ver (todas as abas), parcial (algumas). */
export function celulaPadrao(role, area) {
  const a = areaPorK[area]; const nav = navPadrao(role);
  const n = a ? a.nav.filter((k) => nav[k]).length : 0;
  const ver = !!a && n === a.nav.length;
  // Editar segue o que já é visto: quem via parte da área já editava essas abas.
  return { ver, editar: n > 0, parcial: n > 0 && !ver };
}

/** Limpa a matriz vinda do navegador: só papel e área conhecidos, booleanos, Editar exige Ver. */
export function limparMatriz(v) {
  const out = {};
  if (!v || typeof v !== "object") return out;
  for (const p of PAPEIS_MATRIZ) {
    const linha = v[p];
    if (!linha || typeof linha !== "object") continue;
    for (const a of AREAS) {
      const c = linha[a.k];
      if (!c || typeof c !== "object") continue;
      const cel = {};
      if (typeof c.ver === "boolean") cel.ver = c.ver;
      if (typeof c.editar === "boolean") cel.editar = c.editar;
      if (cel.ver === false) cel.editar = false;
      if (cel.editar === true && cel.ver === undefined) cel.ver = true;
      if (!Object.keys(cel).length) continue;
      (out[p] ||= {})[a.k] = cel;
    }
  }
  return out;
}

/** Abas do papel já com a matriz, sem ajuste da pessoa. */
export function navDoPapel(role, matriz) {
  const out = navPadrao(role);
  if (role === "admin") return out;
  const linha = matriz && typeof matriz === "object" ? matriz[role] : null;
  if (linha && typeof linha === "object") {
    for (const a of AREAS) {
      const c = linha[a.k];
      if (c && typeof c.ver === "boolean") for (const k of a.nav) out[k] = c.ver;
    }
  }
  return out;
}

/** Ajuste da pessoa para gravar em permissions.ajustes: só o que difere do papel com a matriz. */
export function ajustesDaPessoa(role, nav, matriz) {
  const base = navDoPapel(role, matriz); const out = {};
  if (!nav || typeof nav !== "object") return out;
  for (const k of NAV_CHAVES) if (typeof nav[k] === "boolean" && nav[k] !== base[k]) out[k] = nav[k];
  return out;
}

/** Ajuste em vigor: permissions.ajustes (desde 24/09) vale inteiro; o mapa antigo
 *  permissions.nav (gravava todas as abas) só conta onde difere do padrão do papel. */
function ajustesEmVigor(member) {
  const perm = member && member.permissions;
  if (!perm || typeof perm !== "object") return {};
  if (perm.ajustes && typeof perm.ajustes === "object") {
    const out = {};
    for (const k of NAV_CHAVES) if (typeof perm.ajustes[k] === "boolean") out[k] = perm.ajustes[k];
    return out;
  }
  return ajustesDaPessoa(member.role, perm.nav, null);
}

/** Abas que o membro vê de fato. */
export function navEfetivo(member, matriz) {
  const role = member && member.role;
  const out = navDoPapel(role, matriz);
  if (role === "admin") return out;
  const aj = ajustesEmVigor(member);
  for (const k of Object.keys(aj)) out[k] = aj[k];
  return out;
}

// Blocos que dependem de Ver no servidor (quem não vê não recebe nem grava).
const BLOCO_ABA = { "wfa-cobranca": "cobranca", "wfa-acerto": "acerto", "wfa-acertosrec": "acerto" };

export function podeVerBloco(member, isAdmin, key, matriz) {
  const aba = BLOCO_ABA[key];
  if (!aba) return true;
  if (isAdmin || (member && member.role === "admin")) return true;
  return !!navEfetivo(member, matriz)[aba];
}

export function areaDoBloco(key) {
  if (String(key).startsWith("wfa-ckl-")) return "atividades";
  const a = AREAS.find((x) => x.blocos.includes(key));
  return a ? a.k : null;
}

/** Editar: só recusa quando a matriz desmarcou Ver ou Editar da área do bloco. */
export function podeEditarBloco(member, isAdmin, key, matriz) {
  if (isAdmin || (member && member.role === "admin")) return true;
  if (!podeVerBloco(member, isAdmin, key, matriz)) return false;
  const area = areaDoBloco(key);
  if (!area) return true;
  const c = matriz && matriz[member && member.role] && matriz[member.role][area];
  if (!c) return true;
  return c.ver !== false && c.editar !== false;
}
