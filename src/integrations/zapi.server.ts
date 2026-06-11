// Integração Z-API (WhatsApp não-oficial via QR). Credenciais ficam em segredos do Cloudflare:
//   ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN, ZAPI_CLIENT_TOKEN
// Configure com: npx wrangler secret put ZAPI_INSTANCE_ID  (idem para os outros)
import { env as cfEnv } from "cloudflare:workers";

export function zapiEnv(name: string): string | undefined {
  const fromCf = (cfEnv as Record<string, string | undefined>)?.[name];
  if (fromCf) return fromCf;
  return typeof process !== "undefined" ? process.env?.[name] : undefined;
}

export function zapiConfig() {
  return {
    instance: zapiEnv("ZAPI_INSTANCE_ID"),
    token: zapiEnv("ZAPI_INSTANCE_TOKEN"),
    clientToken: zapiEnv("ZAPI_CLIENT_TOKEN"),
  };
}

// Envia texto simples pelo Z-API.
export async function zapiSendText(phone: string, message: string) {
  const { instance, token, clientToken } = zapiConfig();
  if (!instance || !token) throw new Error("Z-API ainda não configurada (faltam os segredos).");
  const url = `https://api.z-api.io/instances/${instance}/token/${token}/send-text`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({ phone, message }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error((data as { error?: string })?.error || "Falha ao enviar pelo Z-API");
  }
  return data;
}

// Acrescenta uma mensagem à conversa, guardando no bloco wfa-whatsapp da tabela workflowark_state.
export async function appendWhatsapp(
  db: { from: (t: string) => any },
  msg: { phone: string; name?: string; dir: "in" | "out"; text: string; ts?: number },
) {
  const key = "wfa-whatsapp";
  const phone = String(msg.phone || "").replace(/\D/g, "");
  if (!phone || !msg.text) return null;
  const { data: row } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
  const state =
    row?.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as { conversas?: Record<string, any> })
      : { conversas: {} };
  if (!state.conversas) state.conversas = {};
  const c = state.conversas[phone] || { phone, nome: msg.name || phone, msgs: [] };
  if (msg.name) c.nome = msg.name;
  c.msgs.push({ dir: msg.dir, text: String(msg.text), ts: msg.ts || Date.now() });
  c.msgs = c.msgs.slice(-300);
  c.updatedAt = Date.now();
  c.unread = msg.dir === "in" ? (c.unread || 0) + 1 : 0;
  if (msg.dir === "out") c.sugestao = ""; // respondeu: limpa a sugestão da IA
  state.conversas[phone] = c;
  await db.from("workflowark_state").upsert({ key, data: state });
  return state;
}

// Transcreve áudio do WhatsApp usando Cloudflare Workers AI (Whisper). Sem chave externa.
export async function transcribeAudio(audioUrl?: string): Promise<string> {
  try {
    const ai = (cfEnv as Record<string, any>)?.AI;
    if (!ai || !audioUrl) return "";
    const resp = await fetch(audioUrl);
    if (!resp.ok) return "";
    const bytes = [...new Uint8Array(await resp.arrayBuffer())];
    const out: any = await ai.run("@cf/openai/whisper", { audio: bytes });
    return String(out?.text || "").trim();
  } catch {
    return "";
  }
}
