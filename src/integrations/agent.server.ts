// Assistente (JARVIS) — analisa mensagens do WhatsApp, cria tarefas e notifica.
// Usa IA (Claude Haiku) quando ANTHROPIC_API_KEY está setada; cai para regras se falhar.
import { zapiEnv } from "./zapi.server";

const AI_MODEL = "claude-haiku-4-5";
const AI_SYS = `Você é o assistente operacional da ARK Content (agência de marketing gastronômico em Brasília). Recebe mensagens de WhatsApp (clientes, equipe, grupos) e decide a ação.
Áreas e responsáveis: Edição/vídeo -> Luckas Gomes (funcao "Editor"); Tráfego/anúncios/campanha -> Danilo de Lima ("Gestor de Tráfego"); Arte/design/post/story -> M. Portela ("Designer"); Social/conteúdo/legenda -> Maria Luiza ("Social Media"); Site/landing -> Bruno ("Marketing"); Reunião/agenda/comercial/orçamento -> Gabriel Andrade ("Account Manager").
Clientes: Vivenda, Lunna's, Fercon, Shopping dos Uniformes, Bella Vita, Vaca Velha, Fonseca & Cavalcanti, Sasse Gifts, Dom Baruk, Cachu, Stray House, Babbo Giovanni, Attraversiamo, Martino, Brisa Doce, Valhalla.
Responda SOMENTE com um JSON válido (nada fora dele), neste formato:
{"isDemand":true|false,"intent":"alteracao_video|arte|trafego|site|reuniao|comercial|duvida|outro","titulo":"título curto da tarefa, incluindo o cliente quando houver","funcao":"a função responsável","resp":"nome do responsável","cliente":"nome do cliente ou ''","prazoDias":2,"resposta_sugerida":"resposta curta e natural no tom de um dono de agência brasileiro (informal, direto, sem ser robótico), ou ''"}
isDemand=true quando a mensagem pede algo que vira tarefa (alterar/refazer vídeo, criar arte, subir campanha, marcar reunião, fazer site, pedir orçamento). Se for só conversa ou dúvida, isDemand=false mas ainda preencha resposta_sugerida.`;

type AIResult = {
  isDemand: boolean; intent: string; titulo: string; funcao: string;
  resp: string; cliente: string; prazoDias: number; resposta_sugerida: string;
};

async function aiAnalyze(text: string, name?: string): Promise<AIResult | null> {
  const key = zapiEnv("ANTHROPIC_API_KEY");
  if (!key) return null;
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: AI_MODEL,
      max_tokens: 500,
      system: AI_SYS,
      messages: [{ role: "user", content: `Mensagem recebida${name ? ` de ${name}` : ""}:\n"""${text}"""` }],
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
    isDemand: !!j.isDemand,
    intent: j.intent || "outro",
    titulo: j.titulo || "Demanda do WhatsApp",
    funcao: j.funcao || "",
    resp: j.resp || "",
    cliente: j.cliente || "",
    prazoDias: Number.isFinite(j.prazoDias) ? j.prazoDias : 2,
    resposta_sugerida: j.resposta_sugerida || "",
  };
}

type Demanda = {
  isDemand: boolean;
  intent: string;        // ex: "alteracao_video", "agendar_reuniao", "comercial", "arte", "mensagem"
  titulo: string;        // título da tarefa
  funcao: string;        // função/área responsável
  resp: string;          // pessoa sugerida
  prazoDias: number;     // prazo em dias a partir de hoje
};

const norm = (s: string) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function analyzeMessage(text: string, senderName?: string): Demanda {
  const t = norm(text);
  const has = (...ks: string[]) => ks.some((k) => t.includes(k));
  const quem = senderName ? ` (${senderName})` : "";

  // Alteração / edição de vídeo
  if (has("alter", "refaz", "refazer", "mudar", "ajust", "corrig", "trocar", "regrava") &&
      has("video", "vídeo", "reels", "corte", "edicao", "edição", "edit")) {
    return { isDemand: true, intent: "alteracao_video", titulo: `Alteração de vídeo${quem}`, funcao: "Editor", resp: "Luckas Gomes", prazoDias: 2 };
  }
  // Agendar reunião / agenda
  if (has("reuniao", "reunião", "agendar", "marcar reun", "marcar uma", "horario", "horário", "disponibilidade", "call")) {
    return { isDemand: true, intent: "agendar_reuniao", titulo: `Agendar reunião${quem}`, funcao: "Account Manager", resp: "Gabriel Andrade", prazoDias: 1 };
  }
  // Tráfego / anúncio / campanha
  if (has("anuncio", "anúncio", "campanha", "trafego", "tráfego", "impulsion", "ads", "verba", "google ads", "meta ads")) {
    return { isDemand: true, intent: "trafego", titulo: `Demanda de tráfego${quem}`, funcao: "Gestor de Tráfego", resp: "Danilo de Lima", prazoDias: 2 };
  }
  // Arte / design / post / story
  if (has("arte", "post", "story", "stories", "card", "banner", "design", "criativo", "panfleto", "cardapio", "cardápio")) {
    return { isDemand: true, intent: "arte", titulo: `Demanda de arte/design${quem}`, funcao: "Designer", resp: "M. Portela", prazoDias: 2 };
  }
  // Site / landing
  if (has("site", "landing", "página", "pagina", "link na bio", "linktree")) {
    return { isDemand: true, intent: "site", titulo: `Demanda de site${quem}`, funcao: "Marketing", resp: "Bruno", prazoDias: 3 };
  }
  // Comercial / proposta / contratar
  if (has("orcamento", "orçamento", "proposta", "contratar", "quanto custa", "valores", "plano", "fechar")) {
    return { isDemand: true, intent: "comercial", titulo: `Oportunidade comercial${quem}`, funcao: "Account Manager", resp: "Gabriel Andrade", prazoDias: 1 };
  }
  return { isDemand: false, intent: "mensagem", titulo: "", funcao: "", resp: "", prazoDias: 0 };
}

function todayPlus(days: number) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().split("T")[0];
}

async function readBlock(db: any, key: string, fallback: any) {
  const { data: row } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
  return row?.data ?? fallback;
}

// Guarda a sugestão de resposta da IA na conversa (pro botão "Aprovar e enviar").
async function setSugestao(db: any, phone: string, sugestao: string) {
  const key = "wfa-whatsapp";
  const p = String(phone || "").replace(/\D/g, "");
  if (!p) return;
  const { data: row } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
  const st = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
  if (!st.conversas) st.conversas = {};
  if (st.conversas[p]) {
    st.conversas[p].sugestao = sugestao;
    await db.from("workflowark_state").upsert({ key, data: st });
  }
}

export async function addNotificacao(db: any, n: { tipo: string; texto: string; phone?: string; nome?: string; tarefaId?: string }) {
  const key = "wfa-notificacoes";
  const arr = Array.isArray(await readBlock(db, key, [])) ? await readBlock(db, key, []) : [];
  arr.unshift({ id: "n" + Date.now() + Math.floor(Math.random() * 999), ts: Date.now(), lido: false, ...n });
  await db.from("workflowark_state").upsert({ key, data: arr.slice(0, 200) });
}

export async function addTaskFromDemand(db: any, d: Demanda, ctx: { phone?: string; nome?: string; text: string }) {
  const key = "wfa-tarefas";
  const raw = await readBlock(db, key, []);
  const arr = Array.isArray(raw) ? raw : [];
  const id = "wa" + Date.now() + Math.floor(Math.random() * 999);
  arr.push({
    id,
    title: d.titulo,
    desc: `Via WhatsApp${ctx.nome ? " de " + ctx.nome : ""}${ctx.phone ? " (" + ctx.phone + ")" : ""}:\n"${ctx.text}"`,
    funcao: d.funcao,
    clienteId: "",
    resp: d.resp,
    data: todayPlus(d.prazoDias),
    prio: "media",
    status: "backlog",
    tags: ["whatsapp"],
    checklist: [],
    sprintN: null,
    origem: "whatsapp",
    criadaEm: new Date().toISOString(),
  });
  await db.from("workflowark_state").upsert({ key, data: arr });
  return id;
}

// Filtro de economia: só vale chamar a IA (custo) se a mensagem tem cara de pedido/demanda.
// Conversa fiada (oi, ok, obrigado, emoji, áudio/imagem sem texto) é ignorada -> não gasta token.
export function worthAnalyzing(text: string): boolean {
  const t = norm(text).trim();
  if (t.length < 6) return false;
  // placeholders de mídia sem conteúdo textual relevante
  if (/^(🎤|🖼️|🎬|📎|📍|👤|🩷)?\s*\[(áudio|audio|imagem|vídeo|video|documento|localização|localizacao|contato|figurinha)\]?/i.test(text.trim())) return false;
  // saudações / agradecimentos / confirmações curtas
  if (t.length < 32 && /\b(ok|okay|blz|beleza|valeu|vlw|obg|obrigad[oa]|bom dia|boa tarde|boa noite|oi|ola|opa|eai|e ai|kk+|haha|rs+|perfeito|show|otimo|isso|sim|nao|certo|combinado|de nada|ta bom|tmj|fechou|👍|✅|🙏|👌|🔝|❤|😂)\b/.test(t)) return false;
  // sinais de demanda/pedido -> vale analisar
  const r = analyzeMessage(text);
  if (r.isDemand) return true;
  if (/\?|\bpode\b|\bpoderia\b|\bconsegue\b|\bprecis|\bqueria\b|\bquero\b|\bgostaria\b|\bmanda|\benvia|\bfaz |\bfazer\b|\bmuda|\balter|\bajust|\bcorrig|\brefaz|\bmarca|\bagend|\borcament|\borçament|\bproposta\b|\bquanto\b|\bvalor|\bprazo\b|\burgent|\bproblema\b|\bnao funciona|\bnão funciona/.test(t)) return true;
  return false;
}

// Roda quando chega uma mensagem (entrada). Usa IA; cai para regras se falhar.
export async function runAgentOnIncoming(db: any, msg: { phone: string; name?: string; text: string }) {
  try {
    if (!worthAnalyzing(msg.text)) return; // economia: ignora conversa fiada (não chama o Claude)
    let d: AIResult | null = null;
    try { d = await aiAnalyze(msg.text, msg.name); } catch { d = null; }
    if (!d) {
      const r = analyzeMessage(msg.text, msg.name);
      d = { ...r, cliente: "", resposta_sugerida: "" };
    }
    if (d.resposta_sugerida) { try { await setSugestao(db, msg.phone, d.resposta_sugerida); } catch { /* ignore */ } }
    const sug = d.resposta_sugerida ? `\n💬 Sugestão: "${d.resposta_sugerida}"` : "";
    // Sino só notifica quando vira TAREFA (evita encher de notificação a cada mensagem).
    // Mensagens normais: a sugestão da IA já fica na conversa (setSugestao), sem notificação.
    if (d.isDemand) {
      // APROVAÇÃO (pedido do Gabriel): o WhatsApp NÃO cria mais tarefa sozinho. Ele propõe
      // a tarefa numa notificação; o Gabriel aprova (ou descarta) no sino e SÓ AÍ vira cartão.
      await addNotificacao(db, {
        tipo: d.intent,
        texto: `🆕 Sugestão de tarefa: ${d.titulo} — p/ ${d.resp || "definir"} (de ${msg.name || msg.phone})${sug}`,
        phone: msg.phone,
        nome: msg.name,
        tarefaProposta: {
          title: d.titulo,
          funcao: d.funcao,
          resp: d.resp,
          data: todayPlus(d.prazoDias),
          prio: "media",
          desc: `Via WhatsApp${msg.name ? " de " + msg.name : ""}${msg.phone ? " (" + msg.phone + ")" : ""}:\n"${msg.text}"`,
          tags: ["whatsapp"],
          origem: "whatsapp",
        },
      });
    }
  } catch {
    /* nunca derruba o webhook */
  }
}
