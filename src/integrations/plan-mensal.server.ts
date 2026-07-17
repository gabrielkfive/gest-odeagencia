// Piloto automático do planejamento mensal (pedido do Gabriel, 16/07/2026):
// quando vira o mês, os loads seguintes disparam (em segundo plano, via waitUntil)
// a geração do planejamento de CADA cliente da carteira direto na aba Planejamento
// (wfa-planejamento) — sem cron externo, sem depender de botão.
//
// Regras do Gabriel:
// - cada cliente tem seu slot em wfa-planejamento: gerar um NUNCA apaga o outro;
// - se já existe plano do mês corrente (feito na mão), não sobrescreve;
// - UMA notificação por mês (quando a carteira inteira fechar), nada de flood;
// - idempotente pela marca wfa-plan-auto (claim antes de gerar — corrida segura).
//
// Um cliente por disparo: cada load gera no máximo 1 plano (~20-30s de IA), pra
// caber no waitUntil do Worker. Com o time abrindo o sistema o dia todo, a
// carteira inteira fecha nas primeiras horas do dia 1º.

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// Carteira do piloto automático (Squad Alpha fica fora — tem fluxo próprio).
// `nome` = como aparece na aba Planejamento; `extra` = instrução a mais pro prompt.
const CARTEIRA: { nome: string; extra?: string }[] = [
  { nome: "Farmácia Vivenda", extra: "3 captações/mês contratadas — distribua as ideias pensando em 3 dias de gravação." },
  { nome: "Fercon", extra: "2 captações/mês — estocar conteúdo nas gravações." },
  { nome: "Sasse Gifts", extra: "2 captações/mês; puxar pelas datas comemorativas do mês com antecedência." },
  { nome: "Cachu Restaurante", extra: "consistência diária qui-dom; food porn." },
  { nome: "Attraversiamo Café", extra: "surfar o momento viral e converter em movimento na loja." },
  { nome: "Brisa Doce Café", extra: "fase de inauguração — expectativa e apresentação." },
  { nome: "Fonseca & Cavalcanti", extra: "1 captação/mês; OBRIGATÓRIO respeitar os limites de publicidade da OAB." },
  { nome: "Vaca Velha", extra: "1 captação/mês; foco em fim de semana e grupos." },
  { nome: "Pizzaria Dgust", extra: "cliente novo em onboarding — primeira linha editorial." },
  { nome: "Kopi Coffee", extra: "cliente novo em onboarding — apresentar a marca." },
  { nome: "Café Lumière", extra: "cliente novo em onboarding — posicionamento inicial." },
];

// Mesma regra do planKey do app (workflowark.html): vivenda tem slot fixo.
function planKeySrv(nome: string): string {
  const s = String(nome || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (s.includes("vivenda")) return "vivenda";
  return s.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cliente";
}

function agoraSP(): Date {
  return new Date(Date.now() - 3 * 3600 * 1000); // aproximação America/Sao_Paulo (UTC-3)
}

export async function planMensalSeDevido(db: any): Promise<void> {
  try {
    const hoje = agoraSP();
    const ano = hoje.getUTCFullYear();
    const mesIdx = hoje.getUTCMonth();
    const mesTag = `${ano}-${String(mesIdx + 1).padStart(2, "0")}`;
    const nomeMes = `${MESES_PT[mesIdx].charAt(0).toUpperCase()}${MESES_PT[mesIdx].slice(1)} ${ano}`;

    // acha o primeiro cliente da carteira ainda sem o mês fechado
    const { data: mRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-plan-auto").maybeSingle();
    const marca = mRow?.data && typeof mRow.data === "object" && !Array.isArray(mRow.data) ? { ...mRow.data } : {};
    const pendente = CARTEIRA.find((c) => marca[planKeySrv(c.nome)] !== mesTag);
    if (!pendente) return;
    const slot = planKeySrv(pendente.nome);

    // claim primeiro: mesmo que a geração falhe, só tenta de novo no mês seguinte
    // (melhor um plano manual do que N chamadas de IA em loop)
    marca[slot] = mesTag;
    await db.from("workflowark_state").upsert({ key: "wfa-plan-auto", data: marca });

    const notificaSeFechou = async () => {
      if (!CARTEIRA.every((c) => marca[planKeySrv(c.nome)] === mesTag)) return;
      const { data: nRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
      const arr = Array.isArray(nRow?.data) ? nRow.data : [];
      arr.unshift({ id: "planauto" + Date.now(), ts: Date.now(), lido: false, tipo: "planejamento", texto: `🗓️ Planos de ${nomeMes} da carteira inteira (${CARTEIRA.length} clientes) prontos na aba Planejamento — troca o cliente no campo pra revisar cada um.` });
      await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
    };

    // plano do mês já existe (gerado na mão ou por outra via)? não mexe
    const { data: pRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-planejamento").maybeSingle();
    const plano = pRow?.data && typeof pRow.data === "object" && !Array.isArray(pRow.data) ? { ...pRow.data } : {};
    const atual = plano[slot];
    if (atual && String(atual.periodo || "").toLowerCase().includes(MESES_PT[mesIdx])) { await notificaSeFechou(); return; }

    const { zapiEnv } = await import("@/integrations/zapi.server");
    const aiKey = zapiEnv("ANTHROPIC_API_KEY");
    if (!aiKey) return;
    const { clienteBrief } = await import("@/integrations/clientes");
    const brief = clienteBrief(pendente.nome);
    if (!brief) { await notificaSeFechou(); return; } // sem cérebro = sem plano genérico

    const sys = [
      `Você é o PLANEJADOR DE CONTEÚDO sênior da ARK Content. Monta o calendário mensal de posts do cliente ${pendente.nome}.`,
      "REGRAS: cadência 2-3 posts/semana; Reels como motor; ganchos que param o scroll (nunca 'Olá pessoal', 'Nesse vídeo'); específico ao cliente, nada genérico.",
      pendente.extra ? `INSTRUÇÃO DO MÊS: ${pendente.extra}` : "",
      "Responda SOMENTE com JSON válido: {\"ideias\":[...]}.",
      "Cada ideia: {\"tema\":\"título específico\",\"angulo\":\"o ângulo/gancho em 1-2 frases\",\"legenda\":\"primeira linha da legenda\",\"formato\":\"Reels|Carrossel|Story|Foto\",\"produto\":\"produto/tema âncora\",\"data\":\"YYYY-MM-DD\",\"dia\":\"ex.: ter 05/08\"}",
      "CONTEXTO DO CLIENTE (siga à risca):\n" + brief,
    ].filter(Boolean).join("\n");
    const hojeStr = `${mesTag}-${String(hoje.getUTCDate()).padStart(2, "0")}`;
    const userMsg = `Hoje é ${hojeStr}. Monte o calendário de posts de ${pendente.nome} para ${nomeMes} (mês ${mesTag}). Gere 8 a 10 ideias com data dentro do mês e DE HOJE EM DIANTE (nunca no passado), variando formatos.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }], messages: [{ role: "user", content: userMsg }] }),
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) return;
    let raw: string = data?.content?.[0]?.text || "";
    raw = raw.replace(/```json|```/g, "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    let ideias: any[] = [];
    if (m) { try { ideias = JSON.parse(m[0])?.ideias || []; } catch { ideias = []; } }
    if (!Array.isArray(ideias) || !ideias.length) return;

    plano[slot] = {
      cliente: pendente.nome,
      periodo: nomeMes,
      ideias: ideias.slice(0, 16).map((i: any) => ({
        tema: String(i?.tema || "").slice(0, 160),
        angulo: String(i?.angulo || "").slice(0, 400),
        legenda: String(i?.legenda || "").slice(0, 400),
        dia: String(i?.dia || "").slice(0, 30),
        formato: String(i?.formato || "Reels").slice(0, 30),
        produto: String(i?.produto || "").slice(0, 60),
        data: /^\d{4}-\d{2}-\d{2}$/.test(String(i?.data || "")) ? String(i.data) : "",
      })),
      updatedAt: Date.now(),
      origem: "auto-mensal",
    };
    await db.from("workflowark_state").upsert({ key: "wfa-planejamento", data: plano });
    await notificaSeFechou();
  } catch { /* nunca pode derrubar o load de quem disparou */ }
}
