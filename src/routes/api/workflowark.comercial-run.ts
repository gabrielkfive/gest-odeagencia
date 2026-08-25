import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// AGENTE COMERCIAL da ARK. Duas tarefas que hoje sao manuais e ja falharam.
//
//   1. LEAD FECHADO SEM COBRANCA
//      Quando um lead chega na etapa 4 (Fechado) com valor, alguem precisa
//      lembrar de criar a linha de cobranca. Quando esquece, a ARK entrega o
//      servico e nao fatura. Aconteceu com o lead "Fabio" (R$ 1.500).
//      Aqui isso vira deteccao automatica.
//
//   2. FOLLOW-UP VENCIDO
//      Lead com "proxima acao" cuja data ja passou. Junta tudo, agrupa por
//      responsavel e monta UM resumo por pessoa. Um aviso por dia por pessoa,
//      nunca um alerta por lead, pra nao virar flood.
//
// O que NAO faz: nao envia mensagem, nao move lead de etapa, nao cria cobranca
// sozinho. Sem apply=1 nao grava nada. Este arquivo nao importa envio.
//
// Uso:
//   GET /api/workflowark/comercial-run?key=<RUN_KEY>          -> so relatorio
//   GET /api/workflowark/comercial-run?key=<RUN_KEY>&apply=1  -> grava fila + notifica
// ============================================================================

const ETAPAS = ["Prospeccao", "Diagnostico", "Proposta", "Negociacao", "Fechado", "Perdido"];
const ETAPA_FECHADO = 4;
const ETAPA_PERDIDO = 5;

function brl(v: number): string {
  return (
    "R$ " +
    Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// normaliza nome pra comparar lead do CRM com linha de cobranca.
// "Fabio - Agencia de marketing" e "plan-fabio" precisam bater.
function normNome(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function diasAtraso(due: string, hoje: Date): number | null {
  if (!due) return null;
  const d = new Date(due + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  return Math.round((hoje.getTime() - d.getTime()) / 86400000);
}

export const Route = createFileRoute("/api/workflowark/comercial-run")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const { isRunAuthorized } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const aplicar = u.searchParams.get("apply") === "1";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const ler = async (key: string) => {
          const { data } = await db
            .from("workflowark_state")
            .select("data")
            .eq("key", key)
            .maybeSingle();
          return data?.data ?? null;
        };

        const crm = (await ler("wfa-crm")) || [];
        const cobranca = (await ler("wfa-cobranca")) || {};
        const leads: any[] = Array.isArray(crm) ? crm : [];

        const agoraSP = new Date(
          new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
        );
        const hoje = new Date(
          Date.UTC(agoraSP.getFullYear(), agoraSP.getMonth(), agoraSP.getDate()),
        );

        // nomes que ja existem na cobranca, normalizados
        const jaCobrados = new Set<string>();
        for (const [id, raw] of Object.entries(cobranca as Record<string, any>)) {
          const d = (raw || {}) as Record<string, any>;
          jaCobrados.add(normNome(d._nome || id));
          jaCobrados.add(normNome(id.replace(/^plan-/, "")));
        }

        // ---------- 1. FECHADO SEM COBRANCA ----------
        const fechadoSemCobranca: any[] = [];
        for (const l of leads) {
          if (Number(l.stage) !== ETAPA_FECHADO) continue;
          const valor = Number(l.val) || 0;
          if (valor <= 0) continue;

          const alvo = normNome(l.nm);
          // casa por conter, porque "Fabio - Agencia" e "fabio" nao batem exato
          let achou = false;
          for (const c of jaCobrados) {
            if (!c) continue;
            if (alvo.includes(c) || c.includes(alvo)) {
              achou = true;
              break;
            }
          }
          if (achou) continue;

          fechadoSemCobranca.push({
            leadId: l.id,
            lead: l.nm,
            valor,
            responsavel: l.resp || "(ninguem)",
            fechadoEm: l.up || l.created || null,
            sugestao: {
              idCobranca: "plan-" + normNome(l.nm).slice(0, 24),
              nome: l.nm,
              valorMensal: valor,
            },
            impacto: "servico fechado sem linha de cobranca, risco de entregar e nao faturar",
          });
        }

        // ---------- 2. FOLLOW-UP VENCIDO ----------
        const vencidos: any[] = [];
        for (const l of leads) {
          const stage = Number(l.stage);
          if (stage === ETAPA_FECHADO) continue; // ja fechou, nao e follow-up
          const atraso = diasAtraso(l.due, hoje);
          if (atraso === null || atraso < 0) continue;

          vencidos.push({
            leadId: l.id,
            lead: l.nm,
            etapa: ETAPAS[stage] || String(stage),
            perdido: stage === ETAPA_PERDIDO,
            valor: Number(l.val) || 0,
            diasAtraso: atraso,
            proximaAcao: l.next || "(sem proxima acao definida)",
            responsavel: l.resp || "(ninguem)",
            contato: l.contact || null,
            semResponsavel: !l.resp || l.resp === "Outro",
          });
        }
        vencidos.sort((a, b) => b.diasAtraso - a.diasAtraso);

        // agrupa por responsavel: UM resumo por pessoa, nao um alerta por lead
        const porResponsavel: Record<string, any> = {};
        for (const v of vencidos) {
          const r = v.responsavel;
          if (!porResponsavel[r]) {
            porResponsavel[r] = { responsavel: r, qtd: 0, valorParado: 0, leads: [], resumo: "" };
          }
          porResponsavel[r].qtd++;
          porResponsavel[r].valorParado += v.valor;
          porResponsavel[r].leads.push(v);
        }
        for (const r of Object.values(porResponsavel) as any[]) {
          const linhas = r.leads
            .slice(0, 8)
            .map(
              (l: any) =>
                "- " +
                l.lead +
                " (" +
                l.etapa +
                "), " +
                l.diasAtraso +
                " dias parado. Proxima acao: " +
                l.proximaAcao,
            )
            .join("\n");
          r.resumo =
            "Follow-up vencido, " +
            r.qtd +
            " leads" +
            (r.valorParado > 0 ? ", " + brl(r.valorParado) + " parados" : "") +
            ":\n" +
            linhas;
        }

        const semDono = vencidos.filter((v) => v.semResponsavel);
        const valorParadoTotal = vencidos.reduce((s, v) => s + v.valor, 0);
        const receitaNaoFaturada = fechadoSemCobranca.reduce((s, f) => s + f.valor, 0);

        const relatorio = {
          ok: true,
          build: "20260825-agentes-1",
          modo: aplicar ? "fila-gravada" : "somente-relatorio",
          enviouAlgo: false,
          hoje: hoje.toISOString().slice(0, 10),
          fechadoSemCobranca: {
            qtd: fechadoSemCobranca.length,
            receitaNaoFaturada,
            itens: fechadoSemCobranca,
          },
          followUpVencido: {
            qtd: vencidos.length,
            valorParado: valorParadoTotal,
            semResponsavel: semDono.length,
            porResponsavel: Object.values(porResponsavel),
          },
        };

        if (aplicar) {
          // acrescenta na fila financeira, sem apagar o que ja estava la
          const filaAtual = (await ler("wfa-fin-fila")) || {};
          const fila = {
            ...filaAtual,
            atualizadoEm: new Date().toISOString(),
            novasCobrancas: fechadoSemCobranca.map((f) => ({ ...f, aprovado: false })),
          };
          await db.from("workflowark_state").upsert({ key: "wfa-fin-fila", data: fila });

          const nRow = (await ler("wfa-notificacoes")) || [];
          const arr = Array.isArray(nRow) ? nRow : [];
          if (fechadoSemCobranca.length) {
            arr.unshift({
              id: "com-cob-" + Date.now(),
              tipo: "comercial",
              titulo:
                fechadoSemCobranca.length +
                " lead(s) fechado(s) sem linha de cobranca, " +
                brl(receitaNaoFaturada) +
                " em risco",
              texto:
                fechadoSemCobranca.map((f) => f.lead + " (" + brl(f.valor) + ")").join(", ") +
                ". Nada foi criado, abra o Financeiro para aprovar.",
              criadoEm: new Date().toISOString(),
              lida: false,
            });
          }
          // um resumo por responsavel, nunca um por lead
          for (const r of Object.values(porResponsavel) as any[]) {
            arr.unshift({
              id: "com-follow-" + normNome(r.responsavel) + "-" + Date.now(),
              tipo: "comercial",
              titulo: "Follow-up vencido de " + r.responsavel + ": " + r.qtd + " leads",
              texto: r.resumo,
              criadoEm: new Date().toISOString(),
              lida: false,
            });
          }
          await db
            .from("workflowark_state")
            .upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
        }

        return Response.json(relatorio);
      },
    },
  },
});
