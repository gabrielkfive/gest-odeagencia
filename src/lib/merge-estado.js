/*
 Mescla por item do estado do WorkFlowArk, no SERVIDOR.

 Por que existe (10/09/2026): o save-state gravava a lista inteira (upsert cego). Duas
 pessoas editando na mesma janela de 6s, a ultima que salvava apagava a mudanca da outra
 no servidor. O cliente mescla por item ao LER, mas so reempurrava quando faltava um id,
 nunca quando o conteudo era mais novo: a versao velha ficava no servidor e os outros
 aparelhos viam o cartao na coluna antiga ("mandei pra homologacao do cliente e voltou").

 Regra (a MESMA do cliente, wfaMergeById / wfaMergeProjetos em public/workflowark-sync-*.js;
 deploy/teste-merge-estado.mjs prova que as duas concordam):
   - uniao por id;
   - conflito de id: vence o carimbo `up` mais novo; so um lado tem `up`: esse lado; nenhum
     tem: vence quem esta salvando (comportamento de antes);
   - wfa-projetos: alem do projeto, as TAREFAS de um mesmo projeto mesclam tarefa a tarefa
     pelo t.up (senao duas pessoas em tarefas diferentes do mesmo projeto brigam pelo
     projeto todo);
   - lapide (wfa-deleted-ids): id apagado nunca volta, nem projeto nem tarefa de projeto.
 Ordem: a de quem esta salvando primeiro, depois o que so existia no servidor.

 JavaScript puro (sem TypeScript) de proposito: o teste em deploy/ importa direto no Node.
*/

export const CHAVES_MESCLA = [
  "wfa-tarefas",
  "wfa-agenda-events",
  "wfa-conselho-briefings",
  "wfa-notificacoes",
  "wfa-crm",
  "wfa-producao",
  "wfa-briefings",
  "wfa-planejamentos",
  "wfa-demandas",
  "wfa-rotinas",
  "wfa-clientes-custom",
  "wfa-alpha",
  "wfa-alpha-am",
  "wfa-alpha-gt",
  "wfa-alpha-cr",
  "wfa-projetos",
];

export const CHAVES_LAPIDE = [
  "wfa-tarefas",
  "wfa-agenda-events",
  "wfa-crm",
  "wfa-producao",
  "wfa-briefings",
  "wfa-planejamentos",
  "wfa-demandas",
  "wfa-rotinas",
  "wfa-clientes-custom",
  "wfa-alpha",
  "wfa-alpha-am",
  "wfa-alpha-gt",
  "wfa-alpha-cr",
  "wfa-projetos",
];

const lista = (v) => (Array.isArray(v) ? v : []);
const temId = (o) => o && typeof o === "object" && o.id != null && o.id !== "";

// Devolve o item que vence entre `a` (quem esta salvando) e `b` (o que o servidor tinha).
function vencedor(a, b) {
  if (a.up && b.up) return a.up > b.up ? a : b;
  if (a.up) return a;
  if (b.up) return b;
  return a; // sem carimbo dos dois lados: quem salva vence (era assim antes)
}

/* Lista simples de objetos com id. `novo` = o que o cliente mandou; `atual` = o que o
   servidor tinha. Ordem: a do cliente primeiro, depois o que so existia no servidor. */
export function mesclarPorId(atual, novo, deletados) {
  const del = deletados instanceof Set ? deletados : new Set(lista(deletados));
  const porId = new Map();
  const ordem = [];
  lista(novo).forEach((o) => {
    if (temId(o) && !porId.has(o.id)) {
      ordem.push(o.id);
      porId.set(o.id, o);
    }
  });
  lista(atual).forEach((o) => {
    if (!temId(o)) return;
    if (!porId.has(o.id)) {
      ordem.push(o.id);
      porId.set(o.id, o);
      return;
    }
    porId.set(o.id, vencedor(porId.get(o.id), o));
  });
  return ordem.map((id) => porId.get(id)).filter((o) => !del.has(o.id));
}

/* Tarefas de um projeto: uniao por id; conflito pelo t.up; sem carimbo dos dois lados fica
   a versao de quem venceu o projeto (base). */
export function mesclarTarefasProjeto(base, outro, deletados) {
  const del = deletados instanceof Set ? deletados : new Set(lista(deletados));
  const porId = new Map();
  const ordem = [];
  lista(base).forEach((t) => {
    if (temId(t) && !porId.has(t.id)) {
      ordem.push(t.id);
      porId.set(t.id, t);
    }
  });
  lista(outro).forEach((t) => {
    if (!temId(t)) return;
    if (!porId.has(t.id)) {
      ordem.push(t.id);
      porId.set(t.id, t);
      return;
    }
    const b = porId.get(t.id);
    if (t.up && b.up) {
      if (t.up > b.up) porId.set(t.id, t);
    } else if (t.up && !b.up) porId.set(t.id, t);
  });
  return ordem.map((id) => porId.get(id)).filter((t) => !del.has(t.id));
}

export function mesclarProjetos(atual, novo, deletados) {
  const del = deletados instanceof Set ? deletados : new Set(lista(deletados));
  const porId = new Map();
  const ordem = [];
  lista(novo).forEach((p) => {
    if (temId(p) && !porId.has(p.id)) {
      ordem.push(p.id);
      porId.set(p.id, p);
    }
  });
  lista(atual).forEach((p) => {
    if (!temId(p)) return;
    if (!porId.has(p.id)) {
      ordem.push(p.id);
      porId.set(p.id, p);
      return;
    }
    const n = porId.get(p.id);
    const venc = vencedor(n, p);
    const perd = venc === n ? p : n;
    const m = Object.assign({}, venc);
    m.tarefas = mesclarTarefasProjeto(venc.tarefas, perd.tarefas, del);
    porId.set(p.id, m);
  });
  return ordem.map((id) => porId.get(id)).filter((p) => !del.has(p.id));
}

/* Ponto unico usado pelo save-state. Chave fora da lista de mescla, ou valor que nao e
   lista: devolve o que o cliente mandou (comportamento de sempre). */
export function mesclarChave(key, atual, novo, deletados) {
  if (!CHAVES_MESCLA.includes(key) || !Array.isArray(novo)) return novo;
  const del = CHAVES_LAPIDE.includes(key) ? deletados : [];
  if (key === "wfa-projetos") return mesclarProjetos(atual, novo, del);
  return mesclarPorId(atual, novo, del);
}
