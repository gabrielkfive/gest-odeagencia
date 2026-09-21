import { createFileRoute } from "@tanstack/react-router";
// JavaScript puro de propósito (mesmo import do state.ts; o teste em deploy/ usa direto no Node).
// @ts-ignore
import { mesclarChave } from "@/lib/merge-estado.js";

// Endpoint PÚBLICO do formulário da landing /conheca.
// POST /api/workflowark/lead-site  (JSON: nome, empresa, whatsapp, email, mensagem, site)
//
// Grava UM lead em wfa-crm no mesmo formato do create_lead do MCP (id "crm...",
// stage 0 = Prospecção, resp Saulo, source "Site /conheca"), usando a mesma regra de
// mescla por item do state.ts (mesclarChave + UPDATE ... WHERE updated_at = lido,
// até 4 tentativas). Nunca sobrescreve a lista inteira.
//
// Dedupe: mesmo WhatsApp (só dígitos) em lead aberto (stage < 4) dos últimos 7 dias
// responde {ok:true, repetido:true} e não grava de novo.
//
// SEGURANÇA (o que existe e o que NÃO existe):
// - Honeypot: campo "site" preenchido = robô. Responde 200 {ok:true} e não grava.
// - Limite por IP em memória do isolate: 5 envios por 10 minutos. É um Map que vive
//   só enquanto o isolate do Worker vive; cada isolate/região tem o seu, e reinício
//   zera. Segura formulário sendo martelado por engano, NÃO substitui Turnstile ou
//   equivalente contra bot distribuído. Se a landing virar alvo, ligar Turnstile
//   (chave em vars do Worker) e validar o token aqui antes de gravar.
// - Content-Type precisa ser JSON; corpo acima de 8 KB é recusado.
// - Erros 400 em português; 500 genérico sem detalhe. Nada de segredo ou dado
//   pessoal no log (só id do lead e resultado).

const MAX_CORPO = 8 * 1024;
const JANELA_MS = 10 * 60 * 1000;
const MAX_POR_JANELA = 5;
const DIAS_DEDUPE = 7;
const TENTATIVAS = 4;
const CHAVE = "wfa-crm";

// Origens externas autorizadas a postar aqui (landings fora do WorkFlowArk).
// A landing ArkMed vive no Worker ark-content; sem CORS o navegador barra o POST.
const ORIGENS_EXTERNAS = new Set([
  "https://ark-content.arkcontent.workers.dev",
  "https://arkmed.arkcontent.workers.dev",
]);
// Rótulo de origem por landing; qualquer valor fora da lista cai no padrão /conheca.
const ORIGENS_LEAD: Record<string, { source: string; seg: string }> = {
  arkmed: { source: "Landing ArkMed", seg: "ArkMed" },
};
let origemPedido = "";

function cors(init?: ResponseInit): ResponseInit {
  if (!origemPedido || !ORIGENS_EXTERNAS.has(origemPedido)) return init || {};
  const h = new Headers(init?.headers);
  h.set("Access-Control-Allow-Origin", origemPedido);
  h.set("Vary", "Origin");
  return { ...init, headers: h };
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, cors(init));
}

// ---- Limite por IP (memória do isolate) -----------------------------------------
const envios = new Map<string, number[]>();

function ipDe(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "desconhecido"
  );
}

function passouDoLimite(ip: string): boolean {
  const agora = Date.now();
  const lista = (envios.get(ip) || []).filter((t) => agora - t < JANELA_MS);
  if (lista.length >= MAX_POR_JANELA) {
    envios.set(ip, lista);
    return true;
  }
  lista.push(agora);
  envios.set(ip, lista);
  // Faxina barata pra o Map não crescer sem parar num isolate longevo.
  if (envios.size > 2000) {
    for (const [k, v] of envios) if (!v.some((t) => agora - t < JANELA_MS)) envios.delete(k);
  }
  return false;
}

// ---- Validação ---------------------------------------------------------------------
type Entrada = { nome: string; empresa: string; whatsapp: string; email: string; mensagem: string; origem: string };

function texto(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function validar(
  body: Record<string, unknown>,
): { ok: true; dados: Entrada } | { ok: false; erro: string } {
  const nome = texto(body.nome, 120);
  if (!nome) return { ok: false, erro: "Diga seu nome." };
  const empresa = texto(body.empresa, 120);
  const whatsapp = String(body.whatsapp ?? "").replace(/\D/g, "");
  if (whatsapp.length < 10 || whatsapp.length > 13)
    return {
      ok: false,
      erro: "WhatsApp inválido. Informe o número com DDD, só dígitos (10 a 13).",
    };
  const email = texto(body.email, 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, erro: "E-mail inválido." };
  const mensagem = typeof body.mensagem === "string" ? body.mensagem.trim().slice(0, 1000) : "";
  const origem = texto(body.origem, 40).toLowerCase();
  return { ok: true, dados: { nome, empresa, whatsapp, email, mensagem, origem } };
}

// ---- Gravação em wfa-crm com mescla por item ----------------------------------------
function novoLead(d: Entrada) {
  const now = new Date().toISOString();
  const obs = [d.mensagem, d.email ? `E-mail: ${d.email}` : ""]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
  const rotulo = ORIGENS_LEAD[d.origem] || { source: "Site /conheca", seg: "Landing" };
  return {
    id: "crm" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nm: d.empresa ? `${d.empresa} (${d.nome})` : d.nome,
    contact: d.whatsapp,
    seg: rotulo.seg,
    val: 0,
    next: "",
    obs,
    resp: "Saulo",
    source: rotulo.source,
    stage: 0,
    due: "",
    hist: [],
    created: now,
    up: now,
  };
}

function ehRepetido(lista: unknown[], whatsapp: string): boolean {
  const limite = Date.now() - DIAS_DEDUPE * 86400000;
  return lista.some((l: any) => {
    if (!l || typeof l !== "object") return false;
    const contato = String(l.contact ?? "").replace(/\D/g, "");
    if (!contato || contato !== whatsapp) return false;
    const stage = Number(l.stage);
    if (!(Number.isFinite(stage) && stage < 4)) return false;
    const criado = new Date(String(l.created || l.up || "")).getTime();
    return Number.isFinite(criado) && criado >= limite;
  });
}

type Gravacao = { ok: true; repetido: boolean; id?: string } | { ok: false };

async function gravarLead(db: any, d: Entrada): Promise<Gravacao> {
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const { data: row, error: e1 } = await db
      .from("workflowark_state")
      .select("data,updated_at")
      .eq("key", CHAVE)
      .maybeSingle();
    if (e1) {
      console.error(`[lead-site] leitura de ${CHAVE} falhou`);
      return { ok: false };
    }
    const atual: unknown[] = Array.isArray(row?.data) ? row.data : [];
    // Dedupe olhando a leitura mais fresca possível (dentro do laço).
    if (ehRepetido(atual, d.whatsapp)) return { ok: true, repetido: true };

    let deletados: unknown[] = [];
    try {
      const { data: lap } = await db
        .from("workflowark_state")
        .select("data")
        .eq("key", "wfa-deleted-ids")
        .maybeSingle();
      if (Array.isArray(lap?.data)) deletados = lap.data;
    } catch {
      /* sem lápide: mescla sem ela */
    }

    const lead = novoLead(d);
    const mesclado = mesclarChave(CHAVE, atual, [lead], deletados);

    if (!row) {
      const { error } = await db.from("workflowark_state").insert({ key: CHAVE, data: mesclado });
      if (!error) return { ok: true, repetido: false, id: lead.id };
      continue; // alguém inseriu no meio: relê e mescla de novo
    }
    const { data: gravadas, error } = await db
      .from("workflowark_state")
      .update({ data: mesclado })
      .eq("key", CHAVE)
      .eq("updated_at", row.updated_at)
      .select("key");
    if (error) {
      console.error(`[lead-site] update de ${CHAVE} falhou`);
      return { ok: false };
    }
    if (Array.isArray(gravadas) && gravadas.length)
      return { ok: true, repetido: false, id: lead.id };
    console.warn(`[lead-site] tentativa ${tentativa + 1}: updated_at mudou no meio, repetindo`);
  }
  return { ok: false };
}

// ---- Rota ---------------------------------------------------------------------------
export const Route = createFileRoute("/api/workflowark/lead-site")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        origemPedido = request.headers.get("origin") || "";
        const h = new Headers();
        if (ORIGENS_EXTERNAS.has(origemPedido)) {
          h.set("Access-Control-Allow-Origin", origemPedido);
          h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
          h.set("Access-Control-Allow-Headers", "Content-Type");
          h.set("Access-Control-Max-Age", "86400");
          h.set("Vary", "Origin");
        }
        return new Response(null, { status: 204, headers: h });
      },
      POST: async ({ request }) => {
        origemPedido = request.headers.get("origin") || "";
        const ct = (request.headers.get("content-type") || "").toLowerCase();
        if (!ct.includes("application/json"))
          return json({ error: "Envie o formulário em JSON." }, { status: 415 });

        const declarado = Number(request.headers.get("content-length") || 0);
        if (declarado > MAX_CORPO)
          return json({ error: "Mensagem grande demais." }, { status: 413 });
        const bruto = await request.text();
        if (bruto.length > MAX_CORPO)
          return json({ error: "Mensagem grande demais." }, { status: 413 });

        let body: Record<string, unknown>;
        try {
          const parsed = JSON.parse(bruto);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
            throw new Error("formato");
          body = parsed;
        } catch {
          return json(
            { error: "Não entendi o envio. Recarregue a página e tente de novo." },
            { status: 400 },
          );
        }

        // Honeypot: robô preencheu "site". Finge sucesso e não grava nada.
        if (typeof body.site === "string" && body.site.trim()) return json({ ok: true });

        if (passouDoLimite(ipDe(request)))
          return json(
            { error: "Muitos envios seguidos. Aguarde alguns minutos e tente de novo." },
            { status: 429 },
          );

        const v = validar(body);
        if (!v.ok) return json({ error: v.erro }, { status: 400 });

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const r = await gravarLead(supabaseAdmin as any, v.dados);
          if (!r.ok)
            return json(
              { error: "Não foi possível registrar agora. Tente de novo em instantes." },
              { status: 500 },
            );
          console.log(`[lead-site] ${r.repetido ? "repetido" : "novo lead " + r.id}`);
          return json(r.repetido ? { ok: true, repetido: true } : { ok: true });
        } catch {
          console.error("[lead-site] falha inesperada ao gravar");
          return json(
            { error: "Não foi possível registrar agora. Tente de novo em instantes." },
            { status: 500 },
          );
        }
      },
    },
  },
});
