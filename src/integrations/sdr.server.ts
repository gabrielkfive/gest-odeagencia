// SDR — vendedor automático do WhatsApp do Gabriel (pedido de 06/09/2026).
// Leads de campanha caem na DM; este módulo responde sozinho como comercial da ARK,
// qualifica o lead e alimenta o funil da página Comercial (wfa-crm).
//
// Guardrails (nesta ordem, antes de qualquer resposta):
//   1. Só DM. Grupo nunca recebe resposta automática.
//   2. Só conversa NOVA (sem histórico anterior) ou já assumida pelo robô (conv.sdr).
//      Cliente antigo, equipe e papo pessoal caem fora já na triagem da IA (ehLead=false)
//      e a conversa fica marcada pra nunca mais ser tocada (conv.sdrOff).
//   3. Gabriel respondeu na mão? O robô SAI daquela conversa (pausa permanente até
//      "robo on <numero>"). A mensagem que o próprio robô enviou volta pelo webhook
//      (eco) e NÃO conta como resposta humana — ver sdrHandleFromMe.
//   4. Teto de 15 respostas automáticas por conversa por dia (anti-loop).
//   5. Kill switch global: "robo off" no WhatsApp do Gabriel, ou wfa-sdr.enabled=false.
//
// Estado (server-owned, fora do sync do cliente — mesmo modelo do wfa-whatsapp):
//   wfa-sdr   { enabled, persona, pausados{phone:{ts,motivo}}, lastInboundTs, stats }
//   wfa-leads { [phone]: { nome, negocio, cidade, interesse, estagio, resumo, crmId, ... } }

import { zapiEnv } from "./zapi.server";

const SDR_KEY = "wfa-sdr";
const LEADS_KEY = "wfa-leads";
const MAX_RESPOSTAS_DIA = 15;
const AI_MODEL = "claude-sonnet-4-6"; // vendedor precisa de conversa boa; caching segura o custo

export type SdrConfig = {
  enabled: boolean;
  persona: string;
  pausados: Record<string, { ts: number; motivo: string }>;
  lastInboundTs: number;
  stats: { respostas: number; leads: number };
};

async function readKey(db: any, key: string, fallback: any) {
  const { data: row } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
  return row?.data ?? fallback;
}

export async function sdrConfig(db: any): Promise<SdrConfig> {
  const raw = await readKey(db, SDR_KEY, null);
  const c = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: c.enabled !== false, // liga por padrão (pedido: automatizar de verdade)
    persona: String(c.persona || ""),
    pausados: c.pausados && typeof c.pausados === "object" ? c.pausados : {},
    lastInboundTs: Number(c.lastInboundTs) || 0,
    stats: c.stats && typeof c.stats === "object" ? c.stats : { respostas: 0, leads: 0 },
  };
}

export async function sdrSaveConfig(db: any, c: SdrConfig) {
  await db.from("workflowark_state").upsert({ key: SDR_KEY, data: c });
}

// Marca "chegou mensagem" (saúde do webhook). Escreve no máximo 1x/min.
export async function sdrTouchInbound(db: any) {
  try {
    const c = await sdrConfig(db);
    if (Date.now() - c.lastInboundTs < 60_000) return;
    c.lastInboundTs = Date.now();
    await sdrSaveConfig(db, c);
  } catch { /* saúde é best-effort */ }
}

// ============================== TRIAGEM ==============================

// A conversa é elegível pro SDR? (antes de gastar IA)
function conversaElegivel(conv: any): boolean {
  if (!conv) return true; // sem registro = contato novo em folha
  if (conv.sdrOff) return false; // IA já decidiu que não é lead (ou comando desligou)
  if (conv.sdr) return true; // robô já é dono da conversa
  const msgs: any[] = Array.isArray(conv.msgs) ? conv.msgs : [];
  // Conversa nova: pouquíssimas mensagens e NENHUMA resposta nossa antes desta.
  // Contato antigo (cliente, equipe, amigo) tem histórico e cai fora aqui.
  const temSaidaAntiga = msgs.some((m) => m.dir === "out");
  return msgs.length <= 3 && !temSaidaAntiga;
}

function hojeSP(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// ============================== IA ==============================

const PERSONA_BASE = `Você é o atendimento comercial da ARK Content, agência de marketing de Brasília especializada em gastronomia e negócios locais (restaurantes, bares, farmácias, clínicas, varejo). Fundador: Gabriel Andrade. Você conversa no WhatsApp da agência com pessoas que chegaram por anúncio ou indicação.

O QUE A ARK FAZ: gestão completa de redes sociais, captação e produção de vídeo profissional (Reels), tráfego pago (Meta e Google Ads), sites e landing pages, identidade de marca. Clientes atendidos: Farmácia Vivenda, Fercon, Cachu Restaurante, Vaca Velha, Babbo Giovanni, Martino Fogo & Brasa, entre outros.

SEU OBJETIVO, NESTA ORDEM:
1. Responder rápido e bem, como um comercial experiente e humano.
2. Entender o negócio da pessoa: nome dela, nome do negócio, ramo, cidade, principal desafio de marketing hoje.
3. Gerar desejo com prova concreta (ex.: "a gente cuida do marketing da Farmácia Vivenda e do Martino aqui em Brasília").
4. Levar pra uma conversa com o Gabriel: propor uma call rápida de 20 minutos e perguntar o melhor dia/horário.

REGRAS DE OURO:
- Mensagem CURTA de WhatsApp: 1 a 4 linhas. Uma pergunta por vez, nunca questionário.
- Tom brasileiro, caloroso e direto. Zero cara de robô, zero formalidade engessada.
- NUNCA use travessão (—) nem meia-risca (–). Separe ideias com vírgula ou ponto.
- NUNCA invente preço, prazo ou promessa. Se perguntarem valor: os planos são personalizados pro tamanho do negócio, e o Gabriel apresenta os números na conversa.
- NUNCA diga que você é uma IA, mas também NUNCA minta se perguntarem diretamente ("sou o assistente comercial da ARK" resolve).
- Se a pessoa claramente NÃO é lead comercial (assunto pessoal, número errado, cliente atual falando de entrega em andamento, fornecedor, equipe), marque ehLead=false e NÃO responda.
- Se a pessoa pedir pra falar com humano, ficar irritada ou o assunto fugir do seu alcance, marque notificarGabriel=true e diga que o Gabriel assume a conversa.

Responda SOMENTE com JSON válido, nada fora dele:
{"ehLead":true|false,"responder":true|false,"resposta":"texto da mensagem ou ''","nome":"nome da pessoa ou ''","negocio":"nome/ramo do negócio ou ''","cidade":"cidade ou ''","interesse":"o que a pessoa quer, em poucas palavras","estagio":"novo|conversando|qualificado|reuniao","notificarGabriel":true|false,"motivoNotificacao":"por que o Gabriel precisa entrar, ou ''","resumo":"resumo da conversa em 1-2 frases pro CRM"}
estagio=qualificado quando você já sabe negócio+necessidade. estagio=reuniao quando a pessoa aceitou conversar com o Gabriel ou deu horário.`;

type SdrAI = {
  ehLead: boolean; responder: boolean; resposta: string;
  nome: string; negocio: string; cidade: string; interesse: string;
  estagio: string; notificarGabriel: boolean; motivoNotificacao: string; resumo: string;
};

async function sdrAnalyze(conv: any, lead: any, persona: string, phone: string): Promise<SdrAI | null> {
  const key = zapiEnv("ANTHROPIC_API_KEY");
  if (!key) return null;
  const msgs: any[] = (Array.isArray(conv?.msgs) ? conv.msgs : []).slice(-25);
  const historico = msgs
    .map((m) => `${m.dir === "in" ? "LEAD" : "ARK"}: ${String(m.text || "").slice(0, 600)}`)
    .join("\n");
  const fichaLead = lead
    ? `Ficha atual do lead: ${JSON.stringify({ nome: lead.nome, negocio: lead.negocio, cidade: lead.cidade, interesse: lead.interesse, estagio: lead.estagio })}`
    : "Lead novo, sem ficha ainda.";
  const system: any[] = [{ type: "text", text: PERSONA_BASE, cache_control: { type: "ephemeral" } }];
  if (persona) system.push({ type: "text", text: "CONTEXTO EXTRA DA CAMPANHA ATUAL:\n" + persona.slice(0, 3000) });
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 900,
      system,
      messages: [{ role: "user", content: `Contato: ${conv?.nome || phone} (${phone}).\n${fichaLead}\n\nConversa até agora (última linha é a mensagem que acabou de chegar):\n${historico}\n\nDecida e responda com o JSON.` }],
    }),
  });
  if (!resp.ok) return null;
  const data: any = await resp.json();
  let raw: string = data?.content?.[0]?.text || "";
  raw = raw.replace(/```json|```/g, "").trim();
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  const j = JSON.parse(m[0]);
  return {
    ehLead: !!j.ehLead,
    responder: !!j.responder,
    resposta: String(j.resposta || "").replace(/[—–]/g, ","), // trava anti-travessão
    nome: String(j.nome || ""),
    negocio: String(j.negocio || ""),
    cidade: String(j.cidade || ""),
    interesse: String(j.interesse || ""),
    estagio: ["novo", "conversando", "qualificado", "reuniao"].includes(j.estagio) ? j.estagio : "conversando",
    notificarGabriel: !!j.notificarGabriel,
    motivoNotificacao: String(j.motivoNotificacao || ""),
    resumo: String(j.resumo || ""),
  };
}

// ============================== CRM (wfa-crm) ==============================

// Cria/atualiza o cartão do lead no funil da página Comercial. Auto-cura: se o
// cartão sumiu (save de cliente sobrescreveu o array), reinsere, exceto se o
// Gabriel EXCLUIU o lead (lápide em wfa-deleted-ids: exclusão é decisão humana).
const CRM_STAGE: Record<string, number> = { novo: 0, conversando: 0, qualificado: 1, reuniao: 2 };

async function upsertCrm(db: any, phone: string, lead: any, ai: SdrAI): Promise<string> {
  const crmId = "sdr-" + phone;
  const tombs = await readKey(db, "wfa-deleted-ids", []);
  if (Array.isArray(tombs) && tombs.includes(crmId)) return crmId; // excluído: respeita
  const arr = await readKey(db, "wfa-crm", []);
  const lista: any[] = Array.isArray(arr) ? arr : [];
  const nowIso = new Date().toISOString();
  const nome = ai.nome || lead?.nome || "";
  const negocio = ai.negocio || lead?.negocio || "";
  const nm = (nome && negocio ? `${nome} (${negocio})` : nome || negocio || "Lead WhatsApp " + phone).slice(0, 80);
  const stage = CRM_STAGE[ai.estagio] ?? 0;
  let card = lista.find((l) => l && l.id === crmId);
  if (!card) {
    card = {
      id: crmId, nm, resp: "Gabriel Andrade", contact: phone, source: "WhatsApp (robô SDR)",
      val: 0, stage, next: "", due: "", seg: negocio, obs: "", created: nowIso, hist: [],
    };
    lista.unshift(card);
  }
  card.nm = nm;
  if (stage > Number(card.stage || 0)) card.stage = stage; // só sobe sozinho, nunca desce
  card.next = ai.estagio === "reuniao" ? "Confirmar call com o Gabriel" : "Robô SDR conduzindo a conversa";
  card.obs = (ai.resumo || card.obs || "").slice(0, 500);
  if (negocio) card.seg = negocio;
  card.up = nowIso; // carimbo por item: a mescla do cliente respeita a edição mais nova
  if (!Array.isArray(card.hist)) card.hist = [];
  const now = new Date();
  card.hist.push({
    txt: ("🤖 " + (ai.resumo || "conversa em andamento")).slice(0, 200),
    date: now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    time: now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }),
  });
  card.hist = card.hist.slice(-30);
  await db.from("workflowark_state").upsert({ key: "wfa-crm", data: lista });
  return crmId;
}

// ============================== NÚCLEO ==============================

// Anota o texto que o robô acabou de enviar, pra reconhecer o eco do webhook.
function noteSent(conv: any, text: string) {
  if (!Array.isArray(conv.sdrSent)) conv.sdrSent = [];
  conv.sdrSent.push({ t: String(text).slice(0, 300), ts: Date.now() });
  conv.sdrSent = conv.sdrSent.filter((s: any) => Date.now() - s.ts < 10 * 60_000).slice(-8);
}

// Mensagem fromMe chegou pelo webhook. Retorna:
//   "echo"  = é a mensagem que o próprio robô mandou (NÃO gravar de novo, NÃO pausar)
//   "human" = Gabriel respondeu na mão -> robô sai desta conversa
//   "off"   = nada a fazer (conversa não é do robô)
export async function sdrHandleFromMe(db: any, msg: { phone: string; text: string }): Promise<"echo" | "human" | "off"> {
  try {
    const state = await readKey(db, "wfa-whatsapp", null);
    const conv = state?.conversas?.[msg.phone];
    if (!conv) return "off";
    const alvo = String(msg.text || "").slice(0, 300);
    if (Array.isArray(conv.sdrSent)) {
      const i = conv.sdrSent.findIndex((s: any) => s.t === alvo && Date.now() - s.ts < 10 * 60_000);
      if (i >= 0) {
        conv.sdrSent.splice(i, 1);
        await db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: state });
        return "echo";
      }
    }
    if (!conv.sdr) return "off";
    // Resposta humana numa conversa do robô: o humano assume, robô pausa (permanente).
    const c = await sdrConfig(db);
    c.pausados[msg.phone] = { ts: Date.now(), motivo: "Gabriel respondeu na mão" };
    await sdrSaveConfig(db, c);
    return "human";
  } catch {
    return "off";
  }
}

// Roda a cada mensagem RECEBIDA (DM). Retorna true se o SDR é dono da conversa
// (aí o webhook NÃO chama o JARVIS de sugestão, pra não duplicar).
export async function runSdrOnIncoming(db: any, msg: { phone: string; name?: string; text: string }): Promise<boolean> {
  try {
    await sdrTouchInbound(db);
    const cfg = await sdrConfig(db);
    if (!cfg.enabled) return false;
    if (cfg.pausados[msg.phone]) return false;

    const state = await readKey(db, "wfa-whatsapp", null);
    const conv = state?.conversas?.[msg.phone];
    if (!conversaElegivel(conv)) return false;

    // Anti-loop: teto diário por conversa.
    const hoje = hojeSP();
    if (conv?.sdrDia === hoje && Number(conv?.sdrCount || 0) >= MAX_RESPOSTAS_DIA) return true;

    const leadsRaw = await readKey(db, LEADS_KEY, {});
    const leads = leadsRaw && typeof leadsRaw === "object" ? leadsRaw : {};
    const lead = leads[msg.phone] || null;

    const ai = await sdrAnalyze(conv || { nome: msg.name, msgs: [{ dir: "in", text: msg.text }] }, lead, cfg.persona, msg.phone);
    if (!ai) return false; // IA indisponível: deixa o fluxo antigo (JARVIS sugerir) agir

    if (!ai.ehLead) {
      // Não é lead: nunca mais tocar nesta conversa; JARVIS continua cuidando dela.
      if (conv) {
        conv.sdrOff = true;
        await db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: state });
      }
      return false;
    }

    // ---- é lead: atualiza ficha + CRM ----
    const novoLead = !lead;
    const ficha = {
      phone: msg.phone,
      nome: ai.nome || lead?.nome || msg.name || "",
      negocio: ai.negocio || lead?.negocio || "",
      cidade: ai.cidade || lead?.cidade || "",
      interesse: ai.interesse || lead?.interesse || "",
      estagio: ai.estagio,
      resumo: ai.resumo || lead?.resumo || "",
      criadoEm: lead?.criadoEm || Date.now(),
      updatedAt: Date.now(),
      crmId: "",
    };
    ficha.crmId = await upsertCrm(db, msg.phone, lead, ai);
    leads[msg.phone] = ficha;
    await db.from("workflowark_state").upsert({ key: LEADS_KEY, data: leads });

    // ---- responde ----
    if (ai.responder && ai.resposta) {
      const { waSendText, appendWhatsapp } = await import("./zapi.server");
      await waSendText(msg.phone, ai.resposta);
      // grava a saída já marcada como do robô; o eco do webhook é deduplicado via sdrSent
      const state2 = await readKey(db, "wfa-whatsapp", null);
      const conv2 = state2?.conversas?.[msg.phone];
      if (conv2) {
        conv2.sdr = true;
        conv2.sdrCount = (conv2.sdrDia === hoje ? Number(conv2.sdrCount || 0) : 0) + 1;
        conv2.sdrDia = hoje;
        noteSent(conv2, ai.resposta);
        conv2.msgs.push({ dir: "out", text: ai.resposta, ts: Date.now(), ai: true });
        conv2.msgs = conv2.msgs.slice(-300);
        conv2.unread = 0;
        conv2.updatedAt = Date.now();
        await db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: state2 });
      } else {
        await appendWhatsapp(db, { phone: msg.phone, dir: "out", text: ai.resposta });
      }
      cfg.stats.respostas = Number(cfg.stats.respostas || 0) + 1;
    }
    if (novoLead) cfg.stats.leads = Number(cfg.stats.leads || 0) + 1;
    await sdrSaveConfig(db, cfg);

    // ---- avisa o Gabriel nos momentos que importam (sem flood) ----
    const { addNotificacao } = await import("./agent.server");
    const quem = ficha.nome || msg.name || msg.phone;
    if (novoLead) {
      await addNotificacao(db, { tipo: "comercial", texto: `🤝 Novo lead no WhatsApp: ${quem}${ficha.negocio ? " · " + ficha.negocio : ""}. O robô SDR assumiu a conversa.`, phone: msg.phone, nome: quem });
    }
    if (ai.estagio === "reuniao" || ai.notificarGabriel) {
      const motivo = ai.estagio === "reuniao" ? "quer marcar a call com você" : ai.motivoNotificacao || "precisa de você na conversa";
      await addNotificacao(db, { tipo: "comercial", texto: `🔥 Lead ${quem} (${msg.phone}) ${motivo}. Resumo: ${ai.resumo || ficha.interesse || "ver conversa"}`, phone: msg.phone, nome: quem });
      // Aviso também no WhatsApp do Gabriel (nota pra si mesmo), pra não depender do sino.
      try {
        const proprio = zapiEnv("SDR_AVISO_PHONE");
        if (proprio) {
          const { waSendText } = await import("./zapi.server");
          await waSendText(proprio, `🔥 SDR: lead ${quem} (${msg.phone}) ${motivo}.\nResumo: ${ai.resumo || ficha.interesse}`);
        }
      } catch { /* aviso é best-effort */ }
    }
    return true;
  } catch {
    return false; // nunca derruba o webhook
  }
}

// ============================== COMANDOS ("robo ...") ==============================

// Controle pelo próprio WhatsApp do Gabriel (fromMe), padrão do "jarvis <demanda>".
//   robo status | robo on | robo off | robo on 5561999... | robo off 5561999...
const SDR_CMD_RE = /^\s*(rob[oô]|sdr|vendedor)\b[\s,:.!-]*/i;

export async function handleSdrCommand(db: any, msg: { phone: string; fromMe: boolean; isGroup: boolean; text: string }): Promise<boolean> {
  const text = String(msg.text || "");
  if (!SDR_CMD_RE.test(text)) return false;
  if (msg.isGroup || !msg.fromMe) return false; // só o Gabriel, só em DM

  const resto = text.replace(SDR_CMD_RE, "").trim().toLowerCase();
  const { waSendText } = await import("./zapi.server");
  const responder = async (m: string) => { try { await waSendText(msg.phone, m); } catch { /* best-effort */ } };
  const cfg = await sdrConfig(db);

  const numero = (resto.match(/(\d{10,15})/) || [])[1] || "";
  if (/^off/.test(resto) && numero) {
    cfg.pausados[numero] = { ts: Date.now(), motivo: "comando robo off" };
    await sdrSaveConfig(db, cfg);
    await responder(`🤖 Ok, saí da conversa com ${numero}. Ela é toda sua.`);
    return true;
  }
  if (/^on/.test(resto) && numero) {
    delete cfg.pausados[numero];
    await sdrSaveConfig(db, cfg);
    await responder(`🤖 Voltei a cuidar da conversa com ${numero}.`);
    return true;
  }
  if (/^off/.test(resto)) {
    cfg.enabled = false;
    await sdrSaveConfig(db, cfg);
    await responder("🤖 Robô comercial DESLIGADO. Nenhuma resposta automática até você mandar \"robo on\".");
    return true;
  }
  if (/^on/.test(resto)) {
    cfg.enabled = true;
    await sdrSaveConfig(db, cfg);
    await responder("🤖 Robô comercial LIGADO. Lead novo na DM recebe resposta na hora.");
    return true;
  }
  // status (padrão)
  const leads = await readKey(db, LEADS_KEY, {});
  const lista = Object.values(leads || {}) as any[];
  const porEstagio = (e: string) => lista.filter((l) => l.estagio === e).length;
  const pausadas = Object.keys(cfg.pausados).length;
  await responder(
    `🤖 Robô comercial: ${cfg.enabled ? "LIGADO ✅" : "DESLIGADO ⛔"}\n` +
    `Leads: ${lista.length} (${porEstagio("qualificado")} qualificados, ${porEstagio("reuniao")} pedindo reunião)\n` +
    `Respostas enviadas: ${cfg.stats.respostas || 0}\n` +
    `Conversas que você assumiu: ${pausadas}\n\n` +
    `Comandos: robo on · robo off · robo off <numero> · robo on <numero>`,
  );
  return true;
}
