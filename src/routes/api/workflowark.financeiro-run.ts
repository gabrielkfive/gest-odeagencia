import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// AGENTE FINANCEIRO da ARK (recebimentos + acerto).
//
// O que ele faz:
//   1. Le wfa-cobranca (quem paga a ARK) e wfa-acerto (quem a ARK paga).
//   2. Aplica a regua de cobranca por data (D-3, D0, D+3, D+7).
//   3. Monta a mensagem pronta de cada cobranca, ja com a chave Pix da ARK.
//   4. Monta a lista de acerto do dia 10, ja com a chave Pix de cada pessoa.
//   5. Aponta problemas: chave Pix faltando, registro duplicado, valor zerado.
//
// O que ele NAO faz, por decisao de projeto:
//   NAO envia WhatsApp. NAO marca ninguem como pago. NAO paga nada.
//   Este arquivo nao importa nenhuma funcao de envio. A unica saida possivel e
//   uma FILA DE PROPOSTAS (wfa-fin-fila) que o Gabriel aprova na tela.
//
// Uso:
//   GET /api/workflowark/financeiro-run?key=<RUN_KEY>          -> so relatorio (padrao)
//   GET /api/workflowark/financeiro-run?key=<RUN_KEY>&apply=1  -> grava a fila de propostas
//   &mes=2026-08  forca o mes de referencia (padrao: mes corrente em SP)
// ============================================================================

// Chave Pix de RECEBIMENTO da ARK (clientes pagam aqui).
// Origem: dados bancarios enviados pelo Gabriel no WhatsApp (C6 S.A.).
const ARK_PIX = {
  chave: "48674401000153",
  tipo: "CNPJ",
  banco: "C6 S.A.",
  titular: "Ark Content Solucoes de Marketing LTDA",
};

// Quem cobra cada cliente.
// Regra nova pedida pelo Gabriel: o Gabriel e o cobrador PADRAO de todo mundo.
// So continuam com outra pessoa os casos em que a proximidade ja funciona.
const COBRADOR_PADRAO = "Gabriel";
const COBRADOR_POR_PROXIMIDADE: Record<string, string> = {
  fercon: "Lucas Rosiron",
  fonseca: "Lucas Rosiron",
  nael: "Saulo",
};
function cobradorDe(clienteId: string): string {
  return COBRADOR_POR_PROXIMIDADE[clienteId] || COBRADOR_PADRAO;
}

const MESES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function brl(v: number): string {
  return (
    "R$ " +
    Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Vencimento dia 10; se cair no fim de semana, antecipa para a sexta.
// Espelha cobVencimento() do workflowark.html para nao haver duas verdades.
function vencimentoDoMes(ano: number, mes0: number): Date {
  let d = new Date(Date.UTC(ano, mes0, 10));
  const dow = d.getUTCDay();
  if (dow === 6) d = new Date(Date.UTC(ano, mes0, 9));
  else if (dow === 0) d = new Date(Date.UTC(ano, mes0, 8));
  return d;
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

// Regua de cobranca: o que fazer conforme a distancia ate o vencimento.
type Etapa = { etapa: string; tom: string; quando: string };

function etapaDaRegua(diasAteVenc: number): Etapa | null {
  if (diasAteVenc > 5) return null; // ainda cedo, nao incomoda o cliente
  if (diasAteVenc > 0) return { etapa: "lembrete", tom: "leve", quando: "D-3" };
  if (diasAteVenc === 0) return { etapa: "vencimento", tom: "leve", quando: "D0" };
  if (diasAteVenc >= -3) return { etapa: "cobranca", tom: "firme", quando: "D+3" };
  if (diasAteVenc >= -7) return { etapa: "cobranca-2", tom: "firme", quando: "D+7" };
  return { etapa: "escalar", tom: "direto", quando: "D+7 ou mais" };
}

function mensagemCobranca(valor: number, venc: Date, etapa: Etapa): string {
  const mes = MESES[venc.getUTCMonth()];
  const vt =
    String(venc.getUTCDate()).padStart(2, "0") +
    "/" +
    String(venc.getUTCMonth() + 1).padStart(2, "0");
  const pix =
    "\n\nChave Pix " +
    ARK_PIX.tipo +
    ": " +
    ARK_PIX.chave +
    "\n" +
    ARK_PIX.titular +
    " (" +
    ARK_PIX.banco +
    ")";
  const fecho =
    "\n\nAssim que efetuar, e so me mandar o comprovante. Qualquer coisa estou por aqui.";

  if (etapa.etapa === "lembrete") {
    return (
      "Oi! Tudo bem?\n\nPassando pra lembrar da mensalidade da ARK Content de " +
      mes +
      ", " +
      brl(valor) +
      ", que vence dia " +
      vt +
      "." +
      pix +
      fecho
    );
  }
  if (etapa.etapa === "vencimento") {
    return (
      "Oi! Tudo bem?\n\nHoje e o vencimento da mensalidade da ARK Content de " +
      mes +
      ", " +
      brl(valor) +
      "." +
      pix +
      fecho
    );
  }
  if (etapa.etapa === "cobranca") {
    return (
      "Oi! Tudo bem?\n\nA mensalidade de " +
      mes +
      " (" +
      brl(valor) +
      ") venceu dia " +
      vt +
      " e ainda nao identifiquei o pagamento.\n\n" +
      "Se ja pagou, me manda o comprovante que eu dou baixa. Se ainda nao, segue a chave." +
      pix
    );
  }
  if (etapa.etapa === "cobranca-2") {
    return (
      "Oi! Tudo bem?\n\nVoltando aqui na mensalidade de " +
      mes +
      " (" +
      brl(valor) +
      "), vencida em " +
      vt +
      ".\n\nConsegue me dar uma posicao de quando entra? " +
      "Se precisar ajustar a data, me fala que a gente combina." +
      pix
    );
  }
  return (
    "Oi! Tudo bem?\n\nA mensalidade de " +
    mes +
    " (" +
    brl(valor) +
    ") esta em aberto desde " +
    vt +
    ". Preciso alinhar isso com voce hoje " +
    "pra nao travar a operacao do mes. Pode me chamar?" +
    pix
  );
}

export const Route = createFileRoute("/api/workflowark/financeiro-run")({
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
          return (data?.data ?? {}) as Record<string, any>;
        };

        const cobranca = await ler("wfa-cobranca");
        const acerto = await ler("wfa-acerto");

        // Mes de referencia: America/Sao_Paulo.
        const agoraSP = new Date(
          new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
        );
        const mesParam = u.searchParams.get("mes");
        const ano = mesParam ? Number(mesParam.slice(0, 4)) : agoraSP.getFullYear();
        const mes0 = mesParam ? Number(mesParam.slice(5, 7)) - 1 : agoraSP.getMonth();
        const mesKey = ano + "-" + String(mes0 + 1).padStart(2, "0");
        const venc = vencimentoDoMes(ano, mes0);
        const hojeUTC = new Date(
          Date.UTC(agoraSP.getFullYear(), agoraSP.getMonth(), agoraSP.getDate()),
        );
        const dias = diasEntre(venc, hojeUTC);

        // ---------- RECEBIMENTOS (clientes pagam a ARK) ----------
        const receber: any[] = [];
        for (const [id, raw] of Object.entries(cobranca)) {
          const d = (raw || {}) as Record<string, any>;
          const nome = d._nome || id;
          const valor = Number(d._valor) || 0;
          const jaCobrado = Boolean(d.cobradoMeses && d.cobradoMeses[mesKey]);
          const jaPago = d.status === "pago" || d.pago === true;

          if (jaPago) continue;

          const etapa = etapaDaRegua(dias);
          if (!etapa) continue;
          // nao repete o lembrete leve em quem ja recebeu contato no mes
          if (jaCobrado && etapa.etapa === "lembrete") continue;

          receber.push({
            clienteId: id,
            cliente: nome,
            valor,
            vencimento: venc.toISOString().slice(0, 10),
            etapa: etapa.etapa,
            quando: etapa.quando,
            cobrador: cobradorDe(id),
            cobradorAnterior: d.resp || "(vazio)",
            mudouDeCobrador: (d.resp || "") !== cobradorDe(id),
            destino: d.whatsapp || null,
            faltaWhatsapp: !d.whatsapp,
            mensagem: valor > 0 ? mensagemCobranca(valor, venc, etapa) : null,
            bloqueio: valor > 0 ? null : "valor do plano nao cadastrado",
          });
        }

        // ---------- ACERTO (a ARK paga a equipe) ----------
        const pagar: any[] = [];
        const semPix: string[] = [];
        const vazios: string[] = [];
        const porNome: Record<string, string[]> = {};

        for (const [id, raw] of Object.entries(acerto)) {
          if (id === "__seeded") continue;
          const d = (raw || {}) as Record<string, any>;
          const nome = String(d.nome || d._nome || id);
          const valor = Number(d.valor || d._valor) || 0;

          // agrupa por nome normalizado pra detectar registro duplicado
          const chaveNome = nome.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (chaveNome) {
            if (!porNome[chaveNome]) porNome[chaveNome] = [];
            porNome[chaveNome].push(id);
          }

          if (valor <= 0) {
            vazios.push(id);
            continue;
          }
          if (!d.pix) semPix.push(nome);

          const jaPago =
            Boolean(d.pagoMeses && d.pagoMeses[mesKey]) ||
            d.pagoMes === mesKey ||
            d.status === "pago";
          if (jaPago) continue;

          pagar.push({
            id,
            nome,
            valor,
            categoria: d.cat || "(sem categoria)",
            pix: d.pix || null,
            faltaPix: !d.pix,
            vencimento: venc.toISOString().slice(0, 10),
          });
        }

        // duplicados: mesmo nome normalizado em mais de um registro.
        // somaIndevida = tudo alem do maior valor, que e o que infla o custo fixo.
        const valorDe = (i: string) => {
          const r = (acerto[i] || {}) as Record<string, any>;
          return Number(r.valor || r._valor) || 0;
        };
        const duplicados = Object.entries(porNome)
          .filter(([, ids]) => ids.length > 1)
          .map(([nome, ids]) => ({
            nome,
            ids,
            valores: ids.map(valorDe),
            somaIndevida: ids
              .map(valorDe)
              .sort((a, b) => b - a)
              .slice(1)
              .reduce((s, v) => s + v, 0),
          }))
          .filter((x) => x.somaIndevida > 0);

        const totalPagarMes = pagar.reduce((s, p) => s + p.valor, 0);
        const totalReceberMes = receber.reduce((s, r) => s + r.valor, 0);
        const inflacaoDuplicados = duplicados.reduce((s, d) => s + d.somaIndevida, 0);

        const relatorio = {
          ok: true,
          build: "20260825-agentes-1",
          modo: aplicar ? "fila-gravada" : "somente-relatorio",
          // esta rota nunca envia. E garantia estrutural: nao existe import de envio.
          enviouAlgo: false,
          mesRef: mesKey,
          vencimento: venc.toISOString().slice(0, 10),
          diasAteVencimento: dias,
          pixDaArk: ARK_PIX,
          receber: { qtd: receber.length, total: totalReceberMes, itens: receber },
          pagar: { qtd: pagar.length, total: totalPagarMes, itens: pagar },
          problemas: {
            acertoSemPix: semPix,
            acertoRegistroVazio: vazios,
            acertoDuplicados: duplicados,
            custoFixoInflado: inflacaoDuplicados,
            cobrancaSemWhatsapp: receber.filter((r) => r.faltaWhatsapp).map((r) => r.cliente),
          },
        };

        if (aplicar) {
          const fila = {
            geradoEm: new Date().toISOString(),
            mesRef: mesKey,
            status: "aguardando-aprovacao",
            propostas: receber.map((r) => ({ ...r, aprovado: false })),
            pagamentos: pagar.map((p) => ({ ...p, aprovado: false })),
          };
          await db.from("workflowark_state").upsert({ key: "wfa-fin-fila", data: fila });

          const { data: nRow } = await db
            .from("workflowark_state")
            .select("data")
            .eq("key", "wfa-notificacoes")
            .maybeSingle();
          const arr = Array.isArray(nRow?.data) ? nRow.data : [];
          arr.unshift({
            id: "fin-" + mesKey + "-" + Date.now(),
            tipo: "financeiro",
            titulo:
              "Financeiro " +
              mesKey +
              ": " +
              receber.length +
              " cobrancas e " +
              pagar.length +
              " pagamentos aguardando sua aprovacao",
            texto:
              "Nada foi enviado. Abra o Financeiro para revisar e aprovar. " +
              "Custo fixo inflado por duplicata: " +
              brl(inflacaoDuplicados) +
              ".",
            criadoEm: new Date().toISOString(),
            lida: false,
          });
          await db
            .from("workflowark_state")
            .upsert({ key: "wfa-notificacoes", data: arr.slice(0, 200) });
        }

        return Response.json(relatorio);
      },
    },
  },
});
