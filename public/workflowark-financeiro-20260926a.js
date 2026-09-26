// Cálculo do Financeiro (26/09/2026), no molde da tela Financeiro da V3.
// Módulo puro, testado em deploy/teste-financeiro.mjs. O navegador carrega uma cópia
// IDÊNTICA em public/workflowark-financeiro-<data>.js (o teste compara os dois).
// Fonte única: meses da planilha (receitas e a pagar) e as baixas de Cobranças e Acerto.
// Nada é inventado: sem dado, o número fica vazio.

/** Número de texto pt-BR ("2.083,33") ou número; lixo vira zero. */
export function num(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  const t = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

const nomeOk = (x) => !!String((x && x.nome) || "").trim();

/** Resumo de um mês. cobrado(nome) e pago(nome) dizem o que já teve baixa. */
export function resumoMes(m, cobrado, pago) {
  const rec = (m && m.receitas) || [];
  const pag = (m && m.pagar) || [];
  let receita = 0, custo = 0, recebido = 0, despesas = 0, pagoT = 0, clientes = 0;
  for (const x of rec) {
    const v = num(x.valor);
    receita += v; custo += num(x.custo);
    if (v > 0) clientes++;
    if (v > 0 && nomeOk(x) && cobrado(x.nome)) recebido += v;
  }
  for (const x of pag) {
    const v = num(x.valor);
    despesas += v;
    if (v > 0 && nomeOk(x) && pago(x.nome)) pagoT += v;
  }
  const resultado = receita - despesas;
  return {
    receita, custo, despesas, resultado,
    margem: receita > 0 ? (resultado / receita) * 100 : null,
    recebido, aReceber: receita - recebido,
    pago: pagoT, aPagar: despesas - pagoT,
    clientes, ticket: clientes ? receita / clientes : null,
  };
}

/** Meses em ordem de data (mk "AAAA-MM"); sem data vão para o fim, na ordem original. */
export function mesesOrdenados(meses) {
  return (meses || [])
    .map((m, i) => ({ m, i }))
    .sort((a, b) => {
      const ka = a.m.mk || "9999-99", kb = b.m.mk || "9999-99";
      return ka < kb ? -1 : ka > kb ? 1 : a.i - b.i;
    })
    .map((x) => x.m);
}

/** Série para os gráficos: um mês por data (o primeiro lançado), os últimos n. */
export function serieMeses(meses, n) {
  const vistos = new Set(); const out = [];
  for (const m of mesesOrdenados(meses)) {
    if (!m.mk || vistos.has(m.mk)) continue;
    vistos.add(m.mk);
    const r = resumoMes(m, () => false, () => false);
    out.push({ mk: m.mk, id: m.id, nome: m.nome, receita: r.receita, despesas: r.despesas, resultado: r.resultado, ticket: r.ticket });
  }
  return out.slice(-(n || 12));
}

/** Cobranças de meses anteriores ao atual que ainda não tiveram baixa. */
export function inadimplencia(meses, cobradoEm, mkAtual) {
  const out = []; const vistos = new Set();
  for (const m of mesesOrdenados(meses)) {
    if (!m.mk || m.mk >= mkAtual || vistos.has(m.mk)) continue;
    vistos.add(m.mk);
    (m.receitas || []).forEach((x, i) => {
      const v = num(x.valor);
      if (v > 0 && nomeOk(x) && !cobradoEm(x.nome, m.mk)) out.push({ mk: m.mk, mes: m.nome, mesId: m.id, i, nome: String(x.nome).trim(), valor: v });
    });
  }
  return out;
}

export function variacao(atual, anterior) {
  if (anterior == null || !anterior) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export const CATEGORIAS = [
  { k: "equipe", nome: "Equipe" },
  { k: "socio", nome: "Sócios e comissões" },
  { k: "fornecedor", nome: "Fornecedores e impostos" },
];

/** DRE do mês pelo que está lançado na planilha, comparado ao mês anterior. */
export function dre(m, anterior, classificar) {
  const linha = (a, b) => ({ atual: a, anterior: b, variacao: b == null ? null : variacao(a, b) });
  const porCat = (mes) => {
    const out = {}; for (const c of CATEGORIAS) out[c.k] = 0;
    for (const x of (mes && mes.pagar) || []) {
      const k = classificar(x.nome || "");
      out[k in out ? k : "equipe"] += num(x.valor);
    }
    return out;
  };
  const ra = resumoMes(m, () => false, () => false);
  const rb = anterior ? resumoMes(anterior, () => false, () => false) : null;
  const ca = porCat(m), cb = anterior ? porCat(anterior) : null;
  return {
    receita: linha(ra.receita, rb ? rb.receita : null),
    custos: CATEGORIAS.map((c) => ({
      k: c.k, nome: c.nome, ...linha(ca[c.k], cb ? cb[c.k] : null),
      pctReceita: ra.receita > 0 ? (ca[c.k] / ra.receita) * 100 : null,
    })),
    custoTotal: linha(ra.despesas, rb ? rb.despesas : null),
    resultado: linha(ra.resultado, rb ? rb.resultado : null),
    margem: { atual: ra.margem, anterior: rb ? rb.margem : null },
  };
}
