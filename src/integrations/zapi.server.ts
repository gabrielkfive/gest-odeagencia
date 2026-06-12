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

// ===== Evolution API (self-host) =====
export function evoConfig() {
  return {
    url: (zapiEnv("EVOLUTION_API_URL") || "").replace(/\/+$/, ""),
    key: zapiEnv("EVOLUTION_API_KEY"),
    instance: zapiEnv("EVOLUTION_INSTANCE"),
  };
}
export function evoConfigured() {
  const c = evoConfig();
  return !!(c.url && c.key && c.instance);
}
export async function evoSendText(phone: string, message: string) {
  const { url, key, instance } = evoConfig();
  if (!url || !key || !instance) throw new Error("Evolution não configurada.");
  const resp = await fetch(`${url}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ number: phone, text: message }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error((data as { message?: string; error?: string })?.message || (data as any)?.error || "Falha ao enviar pela Evolution");
  }
  return data;
}

// Envio unificado: usa Evolution se configurada; senão cai no Z-API.
export async function waSendText(phone: string, message: string) {
  if (evoConfigured()) return evoSendText(phone, message);
  return zapiSendText(phone, message);
}

// Estado da conexão da instância: "open" (conectado) | "connecting" | "close" |
// "unconfigured" | "offline" (servidor fora do ar) | "error" | "notfound".
export async function evoConnectionState(): Promise<string> {
  const { url, key, instance } = evoConfig();
  if (!url || !key || !instance) return "unconfigured";
  try {
    const resp = await fetch(`${url}/instance/connectionState/${instance}`, { headers: { apikey: key } });
    if (resp.status === 404) return "notfound";
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) return "error";
    return String(data?.instance?.state || data?.state || "unknown");
  } catch {
    return "offline"; // não alcançou o servidor Evolution (VM caída / porta fechada)
  }
}

// Dispara a conexão e devolve o QR Code (base64 data-URI) pra escanear.
// Em instância já conectada, a Evolution responde sem base64 (state=open).
export async function evoConnect(): Promise<{ base64: string; code: string; state?: string }> {
  const { url, key, instance } = evoConfig();
  if (!url || !key || !instance) throw new Error("Evolution não configurada.");
  const resp = await fetch(`${url}/instance/connect/${instance}`, { headers: { apikey: key } });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.message || data?.error || `Evolution respondeu ${resp.status}`);
  return {
    base64: data?.base64 || data?.qrcode?.base64 || "",
    code: data?.code || data?.qrcode?.code || data?.pairingCode || "",
    state: data?.instance?.state,
  };
}

// Busca a foto de perfil (pessoa ou grupo) pela Evolution. "" se não houver/falhar.
export async function evoFetchAvatar(numberOrJid: string): Promise<string> {
  try {
    const { url, key, instance } = evoConfig();
    if (!url || !key || !instance || !numberOrJid) return "";
    const resp = await fetch(`${url}/chat/fetchProfilePictureUrl/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ number: numberOrJid }),
    });
    if (!resp.ok) return "";
    const data: any = await resp.json().catch(() => ({}));
    return String(data?.profilePictureUrl || data?.url || "");
  } catch {
    return "";
  }
}

// Acrescenta uma mensagem à conversa, guardando no bloco wfa-whatsapp da tabela workflowark_state.
export async function appendWhatsapp(
  db: { from: (t: string) => any },
  msg: { phone: string; name?: string; dir: "in" | "out"; text: string; ts?: number; isGroup?: boolean; jid?: string },
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
  if (typeof msg.isGroup === "boolean") c.isGroup = msg.isGroup;
  if (msg.jid) c.jid = msg.jid;
  if (!c.avatar) { try { const a = await evoFetchAvatar(msg.jid || phone); if (a) c.avatar = a; } catch { /* ignore */ } }
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
