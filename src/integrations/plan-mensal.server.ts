// Piloto automático do planejamento mensal (pedido do Gabriel, 16/07/2026):
// quando vira o mês, o próximo load de qualquer usuário dispara (em segundo
// plano, via waitUntil) a geração do planejamento do mês da Vivenda direto na
// aba Planejamento (wfa-planejamento) — sem cron externo, sem depender de botão.
//
// Regras do Gabriel:
// - cada cliente tem seu slot em wfa-planejamento: gerar um NUNCA apaga o outro;
// - se já existe plano do mês corrente (feito na mão), não sobrescreve;
// - UMA notificação por mês, nada de flood;
// - idempotente pela marca wfa-plan-auto (claim antes de gerar — corrida segura).

const MESES_PT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

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

    // claim primeiro: mesmo que a geração falhe, só tenta de novo no mês seguinte
    // (melhor um mês manual do que N chamadas de IA em loop)
    const { data: mRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-plan-auto").maybeSingle();
    const marca = mRow?.data && typeof mRow.data === "object" && !Array.isArray(mRow.data) ? { ...mRow.data } : {};
    if (marca.vivenda === mesTag) return;
    await db.from("workflowark_state").upsert({ key: "wfa-plan-auto", data: { ...marca, vivenda: mesTag } });

    // plano do mês já existe (gerado na mão ou por outra via)? não mexe
    const { data: pRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-planejamento").maybeSingle();
    const plano = pRow?.data && typeof pRow.data === "object" && !Array.isArray(pRow.data) ? { ...pRow.data } : {};
    const atual = plano["vivenda"];
    if (atual && String(atual.periodo || "").toLowerCase().includes(MESES_PT[mesIdx])) return;

    const { zapiEnv } = await import("@/integrations/zapi.server");
    const aiKey = zapiEnv("ANTHROPIC_API_KEY");
    if (!aiKey) return;
    const { clienteBrief } = await import("@/integrations/clientes");
    const brief = clienteBrief("vivenda");

    const sys = [
      "Você é o PLANEJADOR DE CONTEÚDO sênior da ARK Content. Monta o calendário mensal de posts da Farmácia Vivenda (Brasília).",
      "REGRAS: cadência ter/qui/sáb; Reels 30-60s como motor, carrossel como manual de bolso; ganchos que param o scroll (nunca 'Olá pessoal', 'Nesse vídeo'); menos promessa, mais acompanhamento.",
      "Responda SOMENTE com JSON válido: {\"ideias\":[...]}.",
      "Cada ideia: {\"tema\":\"título específico\",\"angulo\":\"o ângulo/gancho em 1-2 frases\",\"legenda\":\"primeira linha da legenda\",\"formato\":\"Reels|Carrossel|Story|Foto\",\"produto\":\"produto/protocolo âncora\",\"data\":\"YYYY-MM-DD\",\"dia\":\"ex.: ter 05/08\"}",
      "CONTEXTO DO CLIENTE (siga à risca — pessoas, produtos, campanhas do momento):\n" + brief,
    ].join("\n");
    const userMsg = `Monte o calendário de posts da Vivenda para ${nomeMes} (mês ${mesTag}). Gere 10 ideias com data dentro do mês, cadência ter/qui/sáb, variando formatos e amarrando com as campanhas/protocolos do contexto.`;

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

    plano["vivenda"] = {
      cliente: "Farmácia Vivenda",
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

    const { data: nRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
    const arr = Array.isArray(nRow?.data) ? nRow.data : [];
    arr.unshift({ id: "planauto" + Date.now(), ts: Date.now(), lido: false, tipo: "planejamento", texto: `🗓️ Plano de ${nomeMes} da Vivenda pronto na aba Planejamento — revisa e manda pro Remerson aprovar.` });
    await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
  } catch { /* nunca pode derrubar o load de quem disparou */ }
}
