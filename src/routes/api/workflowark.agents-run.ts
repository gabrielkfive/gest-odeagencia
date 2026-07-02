import { createFileRoute } from "@tanstack/react-router";

// Agentes autônomos 24/7 (idempotente, 1x/dia). Roda o "Conselho de IA" sozinho:
// - resume o WhatsApp das últimas 24h
// - pra cada cliente prioritário, faz um DEBATE do conselho (nicho, referências,
//   parcerias) -> decisão + plano + tarefas reais (entram em wfa-tarefas)
// - guarda os briefings em wfa-conselho-briefings (o app mostra de manhã)
// - notifica em wfa-notificacoes
// Chamável por cron (Cloudflare/cron-job.org). Protegido por ?key=. ?force=1 força.
//   /api/workflowark/agents-run?key=<segredo RUN_KEY> (cron) ou Authorization: Bearer (UI)
import { isRunAuthorized, runSecret } from "@/integrations/run-auth.server";

// Mapeia a área/função sugerida pela IA para a PESSOA responsável (organograma da ARK).
// Assim o conselho atribui a tarefa a quem executa, não a um "agente".
function pessoaPorArea(area: string): string {
  const a = String(area || "").toLowerCase();
  if (/tr[áa]fego|ads|m[íi]dia paga|performance|campanha|gestor de tr/.test(a)) return "Danilo de Lima";
  if (/social|conte[úu]do|criador|community|instagram|reels/.test(a)) return "Maria Luiza";
  if (/account|cs|atendimento|sucesso do cliente|relacionamento/.test(a)) return "Lucas Rosi";
  if (/roteir/.test(a)) return "Maria Luiza";
  if (/design|arte|criativo|pe[çc]a/.test(a)) return "M. Portela";
  if (/edi[çc][ãa]o|editor|v[íi]deo|corte/.test(a)) return "Samuel Magalhães";
  if (/capta/.test(a)) return "Omar";
  if (/comercial|vendas|sdr|prospec|lead/.test(a)) return "Saulo";
  if (/diretor|opera|gest[ãa]o|estrat|ceo|financ/.test(a)) return "Gabriel Andrade";
  return "Gabriel Andrade"; // sem correspondência: cai pro Gabriel decidir
}

// Catálogo enxuto p/ dar contexto de nicho ao conselho (espelha CLIENTES_BASE do app).
const CLIENTES_CTX: { id: string; nm: string; seg: string; nota: string }[] = [
  { id: "vivenda", nm: "Vivenda", seg: "Farmácia de manipulação / dermocosméticos (cremes de ureia, NAC, cafeína)", nota: "MAIOR ticket, prioritário. 3 captações/mês. Plano de Copa. Decisores: Remerson (pai), Graziella, Yuri." },
  { id: "fercon", nm: "Fercon", seg: "Gastronomia", nota: "2 captações/mês, mais reativo que ativo — provocar pauta." },
  { id: "sasse", nm: "Sasse Gifts", seg: "Presentes / gifts personalizados", nota: "2 captações/mês." },
  { id: "cachu", nm: "Cachu Restaurante", seg: "Restaurante (food porn)", nota: "Acompanhar ROAS, conteúdo qui-dom; precisa de consistência diária." },
  { id: "attra", nm: "Attraversiamo Café", seg: "Cafeteria", nota: "Bombando (+1k seguidores em 3 dias) — surfar a onda e monetizar." },
  { id: "brisa", nm: "Brisa Doce Café", seg: "Cafeteria / doces", nota: "Onboarding + inauguração." },
  { id: "fonseca", nm: "Fonseca & Cavalcanti", seg: "Advocacia (compliance OAB)", nota: "1 captação/mês; conteúdo precisa respeitar limites de publicidade da OAB; autoridade." },
  { id: "vaca", nm: "Vaca Velha", seg: "Restaurante / churrascaria", nota: "1 captação/mês (2ª às vezes); ramp-up de receita." },
  { id: "dom", nm: "Dom Baruka", seg: "Restaurante (Squad Alpha)", nota: "URGENTE: cardápio + iFood + bebidas; auditoria iFood em curso." },
  { id: "stray", nm: "Stray House", seg: "Restaurante/bar (Squad Alpha)", nota: "Recuperação; ROAS ~5; subir criativos novos." },
  { id: "babbo", nm: "Babbo Giovanni", seg: "Restaurante italiano (Squad Alpha)", nota: "Em ajuste; precisa de uma roteirização interessante de Reels, viável de gravar e exportável pro Drive." },
  { id: "ark", nm: "ARK Content", seg: "A PRÓPRIA agência (marketing de gastronomia/varejo) — cliente interno", nota:
      "OBJETIVO: marcar o MÁXIMO de reuniões comerciais (conversão: 10 reuniões = 1 fechamento, então volume de reuniões é tudo). " +
      "Criativo CAMPEÃO no ar no Meta (desde anteontem trouxe 3 reuniões): fala sobre fazer produção audiovisual profissional pra ir mais longe. " +
      "Replicar o sucesso criando um novo criativo/roteiro usando o CASE ATTRAVERSIAMO: ganhou +3 mil seguidores em menos de 10 dias E, mais importante, viu diferença no CAIXA, no balcão e no movimento da loja (não só no Instagram). " +
      "Posicionamento ARK: profissionalismo da equipe de produção audiovisual (captação+edição) + atendimento de qualidade + comercial estabilizado, sempre buscando melhorias. " +
      "Entregar: uma roteirização de captação pra próxima semana com composição de imagens e CHAMADA PARA AÇÃO forte." },
];

export const Route = createFileRoute("/api/workflowark/agents-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const force = u.searchParams.get("force") === "1";
        // ?cliente=vivenda roda só um cliente (e ignora idempotência) — útil pro botão "rodar agora"
        const soCliente = u.searchParams.get("cliente") || "";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const db = supabaseAdmin as any;
          const hoje = new Date().toISOString().split("T")[0];
          // CONSELHO AUTOMÁTICO DESLIGADO (pedido do Gabriel, 16/06): vinha enchendo o sistema
          // de notificação e tarefa. Agora o conselho SÓ roda manualmente — o botão "Rodar
          // conselho agora" chama com ?force=1 (ou ?cliente=). Qualquer chamada automática
          // (cron externo sem force) não faz nada.
          if (!force && !soCliente) return Response.json({ ok: true, ran: false, motivo: "conselho automático desligado" });

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return Response.json({ error: "sem ANTHROPIC_API_KEY" }, { status: 500 });

          const callAI = async (sys: string, user: string, max = 900) => {
            const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: max, system: sys, messages: [{ role: "user", content: user }] }) });
            const d: any = await r.json().catch(() => ({}));
            return r.ok ? (d?.content?.[0]?.text || "") : "";
          };
          const parseJSON = (txt: string) => {
            if (!txt) return null;
            let s = String(txt).replace(/```json|```/g, "").trim();
            const m = s.match(/\{[\s\S]*\}/);
            if (!m) return null;
            let body = m[0];
            try { return JSON.parse(body); } catch {}
            // tenta reparar JSON truncado (resposta cortada por max_tokens): fecha aspas/colchetes
            try {
              let t = body.replace(/,\s*$/, "");
              const opens = (t.match(/\[/g) || []).length, closes = (t.match(/\]/g) || []).length;
              for (let i = 0; i < opens - closes; i++) t += "]";
              if (!t.trim().endsWith("}")) t += "}";
              return JSON.parse(t);
            } catch { return null; }
          };

          const notifs: any[] = [];

          // 1) Resumo do WhatsApp das últimas 24h ------------------------------------
          if (!soCliente) {
            const { data: waRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = waRow?.data && typeof waRow.data === "object" ? waRow.data : { conversas: {} };
            const convs: any[] = Object.values(st.conversas || {});
            const since = Date.now() - 24 * 3600 * 1000;
            let digest = "";
            convs.filter((c) => (c.updatedAt || 0) > since).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 25).forEach((c) => {
              const msgs = (c.msgs || []).filter((m: any) => (m.ts || 0) > since).slice(-8);
              if (!msgs.length) return;
              digest += `\n--- ${c.nome || c.phone}${c.isGroup ? " (grupo)" : ""} ---\n`;
              msgs.forEach((m: any) => { digest += `${m.dir === "out" ? "Você" : (m.sender || c.nome || "Contato")}: ${String(m.text || "").slice(0, 180)}\n`; });
            });
            if (digest.trim()) {
              const resumo = await callAI(
                "Você é o assistente da ARK Content. Resuma as conversas de WhatsApp das últimas 24h em poucas linhas: o que precisa de resposta/ação e leads. Curto e direto, em português.",
                `Conversas:\n${digest.slice(0, 11000)}`,
              );
              if (resumo) notifs.push({ tipo: "resumo", texto: "🧠 Resumo automático do dia (WhatsApp):\n" + resumo });
            }
            // EFETIVIDADE: o conselho usa o software pra entender se o atendimento está eficaz
            try {
              const c11: any[] = convs.filter((c) => !c.isGroup);
              const semana = Date.now() - 7 * 86400 * 1000;
              let pend = 0; const naoResp: string[] = []; let somaResp = 0, nResp = 0;
              c11.forEach((c) => {
                const msgs = (c.msgs || []).filter((m: any) => (m.ts || 0) > semana);
                if (!msgs.length) return;
                const last = msgs[msgs.length - 1];
                if (last && last.dir === "in") { pend++; if (naoResp.length < 10) naoResp.push(`${c.nome || c.phone}: "${String(last.text || "").slice(0, 70)}"`); }
                for (let i = 1; i < msgs.length; i++) { if (msgs[i].dir === "out" && msgs[i - 1].dir === "in" && msgs[i].ts && msgs[i - 1].ts) { somaResp += msgs[i].ts - msgs[i - 1].ts; nResp++; } }
              });
              if (c11.length) {
                const tmin = nResp ? Math.round(somaResp / nResp / 60000) : 0;
                const verdict = await callAI(
                  "Você é o Diretor de Operações IA da ARK. Avalie a EFETIVIDADE do atendimento no WhatsApp. Curto, em português: nota 0-10 + 1 frase do porquê + 2 ações pra melhorar conversão/tempo de resposta. Use os números.",
                  `7 dias (1:1): ${c11.length} conversas, ${pend} sem resposta, tempo médio de resposta ${tmin} min.\nNão respondidos:\n${naoResp.join("\n") || "nenhum"}`,
                  500,
                );
                if (verdict) notifs.push({ tipo: "efetividade", texto: `📊 Efetividade do WhatsApp (${pend} sem resposta · ${tmin} min médio):\n` + verdict });
              }
            } catch { /* */ }
          }

          // 2) Conselho autônomo POR CLIENTE ----------------------------------------
          // Pra não estourar o tempo da request (Cloudflare ~limite por request), o run
          // completo é INCREMENTAL: a cada chamada processa só quem ainda não tem briefing
          // de hoje, no máx. MAX_POR_CHAMADA. Várias chamadas no dia completam o conjunto.
          const MAX_POR_CHAMADA = 3;

          // tarefas existentes (pra anexar as novas)
          // SEGURANÇA CONTRA PERDA DE DADOS: se a leitura falhar, NÃO escrevemos nada em
          // wfa-tarefas (senão sobrescreveríamos as tarefas reais com uma lista curta).
          const { data: tRow, error: tErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          const tarefasLoadOk = !tErr;
          const tarefasBaseLen = Array.isArray(tRow?.data) ? tRow.data.length : 0;
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data.slice() : [];

          // briefings existentes (mantém os de hoje atualizados, descarta antigos > 14 dias)
          const { data: bRow } = await db.from("workflowark_state").select("data").eq("key", "wfa-conselho-briefings").maybeSingle();
          let briefings: any[] = Array.isArray(bRow?.data) ? bRow.data : [];
          briefings = briefings.filter((b) => (b.ts || 0) > Date.now() - 14 * 86400 * 1000);

          // agenda existente (pra ADICIONAR os alinhamentos do conselho — append-only)
          const { data: agRow, error: agErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-agenda-events").maybeSingle();
          const agendaOk = !agErr;
          const agenda: any[] = Array.isArray(agRow?.data) ? agRow.data.slice() : [];
          const agendaBaseLen = agenda.length;
          // próximo dia útil a partir de amanhã
          const proxDiaUtil = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + 1 + offset); while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; };

          // define quem o conselho vai debater AGORA
          const temHoje = (id: string) => briefings.some((b) => b.clienteId === id && b.date === hoje);
          let alvos = soCliente
            ? CLIENTES_CTX.filter((c) => c.id === soCliente)
            : CLIENTES_CTX.filter((c) => !temHoje(c.id)).slice(0, MAX_POR_CHAMADA);
          const faltam = soCliente ? 0 : CLIENTES_CTX.filter((c) => !temHoje(c.id)).length - alvos.length;

          const sysConselho =
            "Você é o CONSELHO DE IA da ARK Content (agência de marketing de gastronomia/varejo). " +
            "O conselho tem vozes: Diretor de Operações, Gestor de Tráfego, Social Media, Roteirista e Account/CS. " +
            "Eles se reúnem como um TIME INTERNO da agência: pensam fundo em CADA cliente e definem o que A ARK vai executar. " +
            "REGRAS DE QUALIDADE (críticas): " +
            "1) Traga só ideias ESPECÍFICAS deste cliente e do momento dele — nada de conselho genérico que qualquer IA daria (ex: 'poste mais', 'use stories', 'crie identidade visual'). Se não tiver uma ideia realmente boa e específica, traga MENOS itens. Qualidade vale mais que quantidade. " +
            "2) PROIBIDO falar de ESTOQUE, inventário ou 'capacidade de vender mais por causa de estoque'. Os clientes da ARK conseguem repor; estoque é irrelevante e não é assunto da agência. " +
            "3) Não repita o mesmo tipo de ideia entre clientes. Pense no ângulo, na narrativa, no produto-herói, na sazonalidade e na referência concreta do nicho. " +
            "4) 'alinhamentos' = ALINHAMENTOS INTERNOS do próprio time da ARK pra executar o plano (ex: 'Alinhamento de tráfego x social sobre a campanha', 'Revisão de roteiro com o Account'). NUNCA são tarefas pro Gabriel nem reuniões pra falar de estoque com o cliente. São a agenda do conselho. " +
            "Proponha também um ORÇAMENTO de mídia realista. Benchmarks Brasil 2025-26: Meta Ads Click-to-WhatsApp é o melhor pra PME (CPL R$5-25, conversão 15-30%); Google Ads CPL R$30-200. Regra: CPL máximo = ticket médio × taxa de conversão. Diga verba mensal, canal (geralmente Click-to-WhatsApp) e resultado esperado em leads. " +
            "Responda SOMENTE em JSON válido, sem texto fora do JSON. Ordem dos campos (preencha TODOS): " +
            '{"decisao":"frase única e forte, específica deste cliente",' +
            '"orcamento":"verba mensal + canal + resultado esperado (ex: R$1.500/mês em Click-to-WhatsApp ~ 60-100 leads)",' +
            '"roteiro":"roteiro curto de 1 Reel: gancho + 3 cenas + CTA (1 parágrafo)",' +
            '"plano":["passo específico 1","passo específico 2"],' +
            '"reunioes":["alinhamento INTERNO do time pra executar (com qual área)"],' +
            '"tarefas":[{"title":"ideia acionável, específica e não-óbvia","resp":"área (trafego, social, account, design, edicao, captacao, comercial)"}],' +
            '"referencias":["marca/criador real do nicho + por que olhar"],"parcerias":["ideia de parceria concreta e plausível na praça"],' +
            '"debate":[{"voz":"Gestor de Tráfego","fala":"..."},{"voz":"Social Media","fala":"..."}]}. ' +
            "Máx 2 passos, 2 ideias, 1 alinhamento interno, 2 referências, 1 parceria, 2 falas. Português, específico e prático.";

          let criadas = 0;
          for (const c of alvos) {
            const raw = await callAI(
              sysConselho,
              `Cliente: ${c.nm}. Segmento: ${c.seg}. Contexto: ${c.nota}. ` +
                `Debata o que ESTE cliente precisa AGORA pra vender mais e crescer em CONTEÚDO e MÍDIA — com referências reais do nicho e uma parceria plausível. ` +
                `Nada de estoque/inventário. Nada de conselho óbvio. Hoje é ${hoje}.`,
              2400,
            );
            const j = parseJSON(raw);
            if (!j) continue;
            const brief = {
              id: "brf" + c.id + "-" + hoje + "-" + Date.now(),
              clienteId: c.id,
              cliente: c.nm,
              date: hoje,
              ts: Date.now(),
              lido: false,
              debate: Array.isArray(j.debate) ? j.debate.slice(0, 3) : [],
              decisao: String(j.decisao || ""),
              plano: Array.isArray(j.plano) ? j.plano.slice(0, 2).map((x: any) => String(x)) : [],
              referencias: Array.isArray(j.referencias) ? j.referencias.slice(0, 2).map((x: any) => String(x)) : [],
              parcerias: Array.isArray(j.parcerias) ? j.parcerias.slice(0, 1).map((x: any) => String(x)) : [],
              reunioes: Array.isArray(j.reunioes) ? j.reunioes.slice(0, 1).map((x: any) => String(x)) : [],
              roteiro: String(j.roteiro || ""),
              orcamento: String(j.orcamento || ""),
              // IDEIAS (NÃO viram tarefa automaticamente — o Gabriel dá check pra promover).
              // Resolve o "muito volume": nada de auto-flood no Kanban.
              ideias: (Array.isArray(j.tarefas) ? j.tarefas : []).slice(0, 2).map((tk: any) => ({
                titulo: String(tk?.title || "").slice(0, 140), area: String(tk?.resp || ""), feito: false,
              })).filter((x: any) => x.titulo),
            };
            // PRESERVA o histórico: cada debate é ADICIONADO. Mantém os últimos 60.
            briefings.unshift(brief);
            // Apenas as REUNIÕES/ALINHAMENTOS entram direto NA AGENDA (não no Kanban)
            (Array.isArray(j.reunioes) ? j.reunioes : []).slice(0, 1).forEach((rm: any, i: number) => {
              if (String(rm || "").length < 4) return;
              const evTitle = (c.id === "ark" ? "" : c.nm + ": ") + String(rm || "").slice(0, 80);
              if (!agenda.some((e) => e.title === evTitle)) {
                agenda.push({ id: "ce" + Date.now() + i + c.id, date: proxDiaUtil(i), title: evTitle, time: i === 0 ? "10:00" : "15:00", type: "reuniao", origem: "conselho" });
              }
            });
            notifs.push({ tipo: "conselho", clienteId: c.id, texto: `🧠 Conselho debateu ${c.nm}: ${brief.decisao}` });
          }

          // persiste tudo — só grava tarefas se a leitura veio OK e o resultado é
          // estritamente maior (append-only). Nunca encolhe a lista real.
          let salvouTarefas = false;
          if (criadas && tarefasLoadOk && tarefas.length >= tarefasBaseLen + 1) {
            const { error: upErr } = await db.from("workflowark_state").upsert({ key: "wfa-tarefas", data: tarefas });
            salvouTarefas = !upErr;
          }
          await db.from("workflowark_state").upsert({ key: "wfa-conselho-briefings", data: briefings.slice(0, 60) });
          // grava os alinhamentos na agenda (append-only e só se a leitura veio OK)
          if (agendaOk && agenda.length > agendaBaseLen) { try { await db.from("workflowark_state").upsert({ key: "wfa-agenda-events", data: agenda.slice(-300) }); } catch { /* */ } }

          if (notifs.length) {
            const { data: nRow, error: nErr } = await db.from("workflowark_state").select("data").eq("key", "wfa-notificacoes").maybeSingle();
            // mesma proteção: só anexa notificações se a leitura veio OK
            if (!nErr) {
              const arr = Array.isArray(nRow?.data) ? nRow.data : [];
              notifs.forEach((n) => arr.unshift({ id: "auto" + Date.now() + Math.floor(Math.random() * 999), ts: Date.now(), lido: false, ...n }));
              await db.from("workflowark_state").upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
            }
          }
          // só marca "rodou hoje" quando TODOS os clientes já têm briefing de hoje
          if (!soCliente && faltam === 0) await db.from("workflowark_state").upsert({ key: "wfa-agents-lastrun", data: { date: hoje, ts: Date.now() } });
          // AUTO-ENCADEIA: se ainda faltam clientes e este lote produziu algo, dispara o
          // próximo lote em background (best-effort) — assim 1 chamada do cron cobre todos.
          if (!soCliente && faltam > 0 && criadas > 0) {
            try { fetch(`${u.origin}/api/workflowark/agents-run?key=${runSecret()}`).catch(() => {}); } catch { /* ignore */ }
          }
          return Response.json({ ok: true, ran: true, clientes: alvos.length, faltam, tarefas: criadas, tarefasSalvas: salvouTarefas, notificacoes: notifs.length });
        } catch (e) {
          return Response.json({ error: (e as Error)?.message || "falha" }, { status: 500 });
        }
      },
    },
  },
});
