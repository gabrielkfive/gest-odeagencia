import { createFileRoute } from "@tanstack/react-router";
import { hojeSP } from "@/lib/datas";

// AGENTE SOCIAL MEDIA AUTÔNOMO (pedido do Gabriel, 29/06).
// Diferente do Conselho (que DEBATE): este agente PRODUZ. Trabalho complementar, não
// redundante. Para cada cliente, gera propostas CONCRETAS de postagem (formato + gancho +
// roteiro + legenda + CTA + ideia de captação), prontas pra copiar e agendar no Speedpost.
// NÃO posta sozinho: tudo cai numa FILA DE APROVAÇÃO (wfa-social-fila). Respeita a regra
// "sem flood": nada vai pro ar sem o Gabriel/Danilo aprovarem em 1 toque.
//
// Autônomo: chamável por cron, protegido por ?key=. Idempotente por dia. Incremental
// (poucos clientes por chamada pra não estourar o tempo da request no Cloudflare).
//   /api/workflowark/social-run?key=<RUN_KEY>            -> roda o lote do dia
//   /api/workflowark/social-run?key=<RUN_KEY>&cliente=vivenda  -> só um cliente (botão "gerar agora")
//   /api/workflowark/social-run?key=<RUN_KEY>&force=1    -> ignora idempotência
// (auth em @/integrations/run-auth.server, importado dinamicamente no handler)

// Quantos clientes processar por chamada (limite de tempo da request).
const MAX_POR_CHAMADA = 3;
// Quantas propostas por cliente por rodada (qualidade > volume; evita flood).
const PROPOSTAS_POR_CLIENTE = 2;

// Catálogo enxuto de clientes (espelha o do conselho). Mantém o agente focado no nicho real.
const CLIENTES_CTX: { id: string; nm: string; seg: string; nota: string }[] = [
  { id: "vivenda", nm: "Vivenda", seg: "Farmácia de manipulação / dermocosméticos (cremes de ureia, NAC, cafeína)", nota: "MAIOR ticket, prioritário. 3 captações/mês. Decisores: Remerson, Graziella, Yuri. Conteúdo de autoridade dermatológica + prova social." },
  { id: "fercon", nm: "Fercon", seg: "Gastronomia", nota: "Mais reativo que ativo — provocar pauta forte." },
  { id: "vaca", nm: "Vaca Velha", seg: "Restaurante / churrascaria", nota: "Food porn de carne, fogo, corte. Ramp-up de receita." },
  { id: "cachu", nm: "Cachu Restaurante", seg: "Restaurante (food porn)", nota: "Conteúdo qui-dom; precisa de consistência diária; acompanhar ROAS." },
  { id: "attra", nm: "Attraversiamo Café", seg: "Cafeteria", nota: "Bombando — surfar a onda, converter seguidor em movimento de balcão." },
  { id: "brisa", nm: "Brisa Doce Café", seg: "Cafeteria / doces", nota: "Inauguração e doces autorais; gerar desejo." },
  { id: "fonseca", nm: "Fonseca & Cavalcanti", seg: "Advocacia (compliance OAB)", nota: "Respeitar limites de publicidade da OAB; autoridade, nunca promessa de resultado." },
];

export const Route = createFileRoute("/api/workflowark/social-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const { isRunAuthorized, runSecret } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const force = u.searchParams.get("force") === "1";
        const soCliente = u.searchParams.get("cliente") || "";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const hoje = hojeSP();

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return Response.json({ error: "sem ANTHROPIC_API_KEY" }, { status: 500 });

          const callAI = async (sys: string, user: string, max = 1400) => {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
              // prompt caching no system (regra nº3: ~80% menos custo de input)
              body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: max,
                system: [{ type: "text", text: sys, cache_control: { type: "ephemeral" } }],
                messages: [{ role: "user", content: user }],
              }),
            });
            const d: any = await r.json().catch(() => ({}));
            if (!r.ok) { lastAiErr = `HTTP ${r.status}: ${d?.error?.message || JSON.stringify(d).slice(0, 200)}`; return ""; }
            const txt = d?.content?.[0]?.text || "";
            if (!txt) lastAiErr = `resposta sem texto (stop_reason: ${d?.stop_reason || "?"})`;
            lastRaw = txt;
            return txt;
          };
          let lastAiErr = ""; let lastRaw = "";
          const debug = u.searchParams.get("debug") === "1";
          const parseJSON = (txt: string) => {
            if (!txt) return null;
            const s = String(txt).replace(/```json|```/g, "").trim();
            const m = s.match(/\{[\s\S]*\}/);
            if (!m) return null;
            let body = m[0];
            try { return JSON.parse(body); } catch { /* tenta reparar truncado */ }
            try {
              let t = body.replace(/,\s*$/, "");
              const opens = (t.match(/\[/g) || []).length, closes = (t.match(/\]/g) || []).length;
              for (let i = 0; i < opens - closes; i++) t += "]";
              if (!t.trim().endsWith("}")) t += "}";
              return JSON.parse(t);
            } catch { return null; }
          };

          // FILA existente. SEGURANÇA CONTRA PERDA DE DADOS: se a leitura falhar, não grava
          // nada (senão sobrescreveria a fila real com lista curta). Mantém só os últimos 14 dias.
          const { data: fRow, error: fErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-social-fila").maybeSingle();
          if (fErr) return Response.json({ error: "falha ao ler a fila" }, { status: 500 });
          let fila: any[] = Array.isArray(fRow?.data) ? fRow.data.slice() : [];
          fila = fila.filter((p) => (p.ts || 0) > Date.now() - 14 * 86400 * 1000);
          const filaBaseLen = fila.length;

          // Idempotência: por padrão só gera pra quem ainda não tem proposta de hoje.
          const temHoje = (id: string) => fila.some((p) => p.clienteId === id && p.date === hoje);
          const alvos = soCliente
            ? CLIENTES_CTX.filter((c) => c.id === soCliente)
            : CLIENTES_CTX.filter((c) => force || !temHoje(c.id)).slice(0, MAX_POR_CHAMADA);
          const faltam = soCliente ? 0 : CLIENTES_CTX.filter((c) => force || !temHoje(c.id)).length - alvos.length;

          const sysSocial =
            "Você é o SOCIAL MEDIA da ARK Content (agência de marketing de gastronomia/varejo). " +
            "Você NÃO espera ser demandado: você cria porque o cliente precisa e porque DÁ ROI. " +
            "Sua entrega é uma PROPOSTA DE POSTAGEM pronta pra produzir e agendar — não conselho genérico. " +
            "REGRAS DE QUALIDADE (críticas): " +
            "1) Específico DESTE cliente e do momento dele. Nada de 'poste mais', 'use stories', 'crie identidade'. " +
            "2) Cada proposta tem um ângulo/produto-herói diferente — não repita entre as propostas. " +
            "3) Gancho dos 3 primeiros segundos forte (padrão de scroll-stop), CTA clara que leva a ação/venda. " +
            "4) Legenda no tom da marca, com gancho na 1ª linha, corpo curto e CTA + 3-5 hashtags relevantes. " +
            "5) A captação descreve o que PRECISA ser gravado/fotografado (planos, produto, ambiente) — viável de executar. " +
            "Responda SOMENTE em JSON válido, sem texto fora do JSON. Formato: " +
            '{"propostas":[{"formato":"Reel|Story|Carrossel","tema":"título curto da pauta",' +
            '"gancho":"frase dos 3 primeiros segundos","roteiro":"gancho + 3 cenas + CTA num parágrafo",' +
            '"legenda":"legenda completa pronta pra colar","cta":"chamada pra ação",' +
            '"captacao":"o que gravar/fotografar (planos e produto)","melhor_dia":"sugestão de dia/horário"}]}. ' +
            "Português, prático, pronto pra usar.";

          const novas: any[] = [];
          for (const c of alvos) {
            const raw = await callAI(
              sysSocial,
              `Cliente: ${c.nm}. Segmento: ${c.seg}. Contexto: ${c.nota}. ` +
                `Crie ${PROPOSTAS_POR_CLIENTE} propostas de postagem que ESTE cliente deveria publicar nos próximos dias pra gerar movimento/venda. ` +
                `Cada uma com ângulo diferente. Hoje é ${hoje}.`,
            );
            const j = parseJSON(raw);
            const props = Array.isArray(j?.propostas) ? j.propostas.slice(0, PROPOSTAS_POR_CLIENTE) : [];
            props.forEach((p: any, i: number) => {
              if (!p || (!p.roteiro && !p.legenda)) return;
              novas.push({
                id: "soc" + c.id + "-" + hoje + "-" + Date.now() + i,
                clienteId: c.id,
                cliente: c.nm,
                date: hoje,
                ts: Date.now(),
                status: "pendente", // pendente | aprovada | recusada | agendada
                formato: String(p.formato || "Reel"),
                tema: String(p.tema || "").slice(0, 120),
                gancho: String(p.gancho || "").slice(0, 240),
                roteiro: String(p.roteiro || "").slice(0, 1200),
                legenda: String(p.legenda || "").slice(0, 1500),
                cta: String(p.cta || "").slice(0, 200),
                captacao: String(p.captacao || "").slice(0, 600),
                melhorDia: String(p.melhor_dia || "").slice(0, 80),
                origem: "agente-social",
              });
            });
          }

          // Append-only: só grava se de fato cresceu (nunca encolhe a fila real).
          let salvou = false;
          if (novas.length) {
            const novaFila = novas.concat(fila); // novas no topo
            if (novaFila.length >= filaBaseLen + novas.length) {
              const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-social-fila", data: novaFila.slice(0, 200) });
              salvou = !upErr;
            }
          }

          // UMA notificação resumida (o app já mostra wfa-notificacoes). Sem flood.
          if (salvou && novas.length) {
            const { data: nRow, error: nErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
            if (!nErr) {
              const arr = Array.isArray(nRow?.data) ? nRow.data : [];
              const clientesTxt = [...new Set(novas.map((p) => p.cliente))].join(", ");
              arr.unshift({
                id: "social" + Date.now() + Math.floor(Math.random() * 999),
                ts: Date.now(), lido: false, tipo: "social",
                texto: `📲 Social Media: ${novas.length} postagem(ns) prontas pra aprovar (${clientesTxt}).`,
              });
              await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
            }
          }

          // marca "rodou hoje" só quando todos os clientes já têm proposta de hoje
          if (!soCliente && faltam === 0) await db.from("workflowark_state").upsert({ key: "wfa-social-lastrun", data: { date: hoje, ts: Date.now() } });
          // auto-encadeia o próximo lote (best-effort), como o conselho faz
          if (!soCliente && faltam > 0 && novas.length > 0) {
            try { fetch(`${u.origin}/api/workflowark/social-run?key=${await runSecret()}${force ? "&force=1" : ""}`).catch(() => {}); } catch { /* ignore */ }
          }
          return Response.json({ ok: true, clientes: alvos.length, propostas: novas.length, salvou, faltam, ...(debug ? { aiErr: lastAiErr, raw: lastRaw.slice(0, 1500) } : {}) });
        } catch (e) {
          return Response.json({ error: (e as Error)?.message || "falha" }, { status: 500 });
        }
      },
    },
  },
});
