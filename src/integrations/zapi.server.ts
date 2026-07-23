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
  const doSend = async () => {
    const resp = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ number: phone, text: message }),
    });
    const data: any = await resp.json().catch(() => ({}));
    return { ok: resp.ok, data };
  };
  const errInfo = (data: any) => {
    const m = data?.response?.message ?? data?.message;
    if (Array.isArray(m)) {
      if (m.some((x: any) => x && typeof x === "object" && x.exists === false)) return "NOTFOUND";
      return m.map((x: any) => (typeof x === "string" ? x : x?.message || JSON.stringify(x))).join("; ");
    }
    return typeof m === "string" ? m : (data?.error || "Falha ao enviar pela Evolution");
  };
  let { ok, data } = await doSend();
  let e = errInfo(data);
  // "No sessions": a 1ª tentativa faz o WhatsApp buscar a chave do contato; reenviar costuma funcionar.
  if (!ok && /no sessions|session|prekey|encrypt/i.test(e)) {
    await new Promise((r) => setTimeout(r, 2000));
    ({ ok, data } = await doSend()); e = errInfo(data);
    if (!ok && /no sessions|session|prekey|encrypt/i.test(e)) {
      await new Promise((r) => setTimeout(r, 2500));
      ({ ok, data } = await doSend()); e = errInfo(data);
    }
  }
  if (!ok) {
    if (e === "NOTFOUND") throw new Error("WhatsApp não reconheceu este contato (formato de privacidade @lid). Precisa atualizar o servidor de WhatsApp pra enviar pra ele.");
    if (/no sessions|session|prekey|encrypt/i.test(e)) throw new Error("O WhatsApp ainda está sincronizando este contato. Tente de novo em alguns segundos.");
    throw new Error(typeof e === "string" ? e : "Falha ao enviar pela Evolution");
  }
  return data;
}

// Envia mídia (imagem/vídeo/documento) por base64.
export async function evoSendMedia(target: string, opts: { base64: string; mimetype: string; fileName?: string; mediatype?: string; caption?: string }) {
  const { url, key, instance } = evoConfig();
  if (!url || !key || !instance) throw new Error("Evolution não configurada.");
  const resp = await fetch(`${url}/message/sendMedia/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ number: target, mediatype: opts.mediatype || "document", mimetype: opts.mimetype || "application/octet-stream", media: opts.base64, fileName: opts.fileName || "arquivo", caption: opts.caption || "" }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const m = data?.response?.message ?? data?.message;
    const e = Array.isArray(m) ? (m.some((x: any) => x?.exists === false) ? "WhatsApp não reconheceu este contato." : m.map((x: any) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ")) : (typeof m === "string" ? m : data?.error || "Falha ao enviar mídia");
    throw new Error(typeof e === "string" ? e : "Falha ao enviar mídia");
  }
  return data;
}

// Envia áudio (mensagem de voz) por base64.
export async function evoSendAudio(target: string, base64: string) {
  const { url, key, instance } = evoConfig();
  if (!url || !key || !instance) throw new Error("Evolution não configurada.");
  const resp = await fetch(`${url}/message/sendWhatsAppAudio/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ number: target, audio: base64 }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.message || data?.error || "Falha ao enviar áudio");
  return data;
}

// ===== Bridge (whatsmeow via whatsapp-mcp) =====
export function bridgeConfig() {
  return {
    url: (zapiEnv("WHATSAPP_BRIDGE_URL") || "").replace(/\/+$/, ""),
    token: zapiEnv("WHATSAPP_BRIDGE_TOKEN"),
  };
}
export function bridgeConfigured() {
  const c = bridgeConfig();
  return !!(c.url && c.token);
}

export async function bridgeSendText(recipient: string, message: string) {
  const { url, token } = bridgeConfig();
  if (!url || !token) throw new Error("Bridge não configurada.");
  const resp = await fetch(`${url}/api/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient, message }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || data?.message || "Falha ao enviar pelo bridge.");
  return data;
}

// Dispara o download de uma mídia e retorna o caminho do arquivo no disco.
export async function bridgeDownload(messageId: string, chatJID: string): Promise<{ filename: string; path: string }> {
  const { url, token } = bridgeConfig();
  if (!url || !token) throw new Error("Bridge não configurada.");
  const resp = await fetch(`${url}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message_id: messageId, chat_jid: chatJID }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.success) throw new Error(data?.message || "Falha ao baixar mídia pelo bridge.");
  return { filename: String(data.filename || ""), path: String(data.path || "") };
}

// Busca o conteúdo de um arquivo de mídia via nginx e retorna como base64.
export async function bridgeMediaBase64(relPath: string): Promise<{ base64: string; mimetype: string; fileName: string }> {
  const { url } = bridgeConfig();
  if (!url) throw new Error("Bridge não configurada.");
  // relPath é o caminho relativo a partir do store (ex: "556199...@s.whatsapp.net/audio_...ogg")
  const mediaUrl = `${url}/media/${relPath}`;
  const resp = await fetch(mediaUrl);
  if (!resp.ok) throw new Error(`Mídia não encontrada no servidor (${resp.status}).`);
  const bytes = await resp.arrayBuffer();
  const mimetype = resp.headers.get("content-type") || "application/octet-stream";
  const fileName = relPath.split("/").pop() || "arquivo";
  // Converte ArrayBuffer para base64
  let b64 = "";
  const chunk = 8192;
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += chunk) {
    b64 += String.fromCharCode(...arr.subarray(i, i + chunk));
  }
  return { base64: btoa(b64), mimetype, fileName };
}

// Envio unificado: usa Bridge se configurada, senão Evolution, senão Z-API.
export async function waSendText(phone: string, message: string) {
  if (bridgeConfigured()) return bridgeSendText(phone, message);
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

// Marca mensagens como LIDAS no WhatsApp real (Evolution). Best-effort: nunca lança,
// só devolve quantas marcou. `keys` = chaves de mensagens recebidas (id/remoteJid/fromMe).
export async function evoMarkRead(
  keys: Array<{ id: string; remoteJid: string; fromMe?: boolean }>,
): Promise<number> {
  try {
    const { url, key, instance } = evoConfig();
    if (!url || !key || !instance || !keys.length) return 0;
    const readMessages = keys
      .filter((k) => k && k.id && k.remoteJid)
      .map((k) => ({ id: k.id, remoteJid: k.remoteJid, fromMe: !!k.fromMe }));
    if (!readMessages.length) return 0;
    const resp = await fetch(`${url}/chat/markMessageAsRead/${instance}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: JSON.stringify({ readMessages }),
    });
    return resp.ok ? readMessages.length : 0;
  } catch {
    return 0;
  }
}

// Nome (subject) de um grupo pela Evolution. "" se falhar.
export async function evoGroupSubject(jid: string): Promise<string> {
  try {
    const { url, key, instance } = evoConfig();
    if (!url || !key || !instance || !jid) return "";
    const resp = await fetch(`${url}/group/findGroupInfos/${instance}?groupJid=${encodeURIComponent(jid)}`, { headers: { apikey: key } });
    if (!resp.ok) return "";
    const data: any = await resp.json().catch(() => ({}));
    return String(data?.subject || "");
  } catch { return ""; }
}

// Lista todos os grupos (jid, subject, foto) — usado pra preencher nomes de uma vez.
export async function evoAllGroups(): Promise<Array<{ jid: string; subject: string; pic: string }>> {
  try {
    const { url, key, instance } = evoConfig();
    if (!url || !key || !instance) return [];
    const resp = await fetch(`${url}/group/fetchAllGroups/${instance}?getParticipants=false`, { headers: { apikey: key } });
    if (!resp.ok) return [];
    const data: any = await resp.json().catch(() => []);
    if (!Array.isArray(data)) return [];
    return data.map((g: any) => ({ jid: String(g.id || ""), subject: String(g.subject || ""), pic: String(g.pictureUrl || "") }));
  } catch { return []; }
}

// Baixa o conteúdo (base64) de uma mídia do WhatsApp pela chave da mensagem.
export async function evoMediaBase64(id: string, remoteJid?: string, fromMe?: boolean) {
  const { url, key, instance } = evoConfig();
  if (!url || !key || !instance || !id) throw new Error("Mídia indisponível.");
  const resp = await fetch(`${url}/chat/getBase64FromMediaMessage/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key },
    body: JSON.stringify({ message: { key: { id, ...(remoteJid ? { remoteJid } : {}), ...(typeof fromMe === "boolean" ? { fromMe } : {}) } }, convertToMp4: false }),
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.base64) throw new Error(data?.message || data?.error || "Não consegui baixar a mídia.");
  return { base64: String(data.base64), mimetype: String(data.mimetype || "application/octet-stream"), fileName: String(data.fileName || "arquivo") };
}

// Transcreve áudio (base64) com o Whisper do Cloudflare Workers AI (grátis).
export async function transcribeAudioBase64(base64: string): Promise<string> {
  try {
    const ai = (cfEnv as Record<string, any>)?.AI;
    if (!ai || !base64) return "";
    // Trava de tamanho: áudio grande vira um array de bytes gigante e estoura o
    // limite de CPU/memória do Worker (Error 1102). ~1,3M de base64 ≈ 1MB de áudio
    // (uns 2-3 min de nota de voz). Acima disso, pula a transcrição (fica o placeholder).
    if (base64.length > 1_300_000) return "[Áudio longo demais para transcrição automática]";
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const out: any = await ai.run("@cf/openai/whisper", { audio: [...bytes] });
    return String(out?.text || "").trim();
  } catch { return ""; }
}

// Descreve uma imagem (base64) em 1 frase usando Claude (visão) — p/ o agente saber a relevância.
export async function describeImageBase64(base64: string, mimetype: string): Promise<string> {
  try {
    const key = zapiEnv("ANTHROPIC_API_KEY");
    if (!key || !base64) return "";
    const mt = /png|gif|webp/i.test(mimetype || "") ? (mimetype as string).toLowerCase() : "image/jpeg";
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 180,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mt, data: base64 } },
          { type: "text", text: "Descreva em 1 frase curta e objetiva o que há nesta imagem, em português, pensando numa agência de marketing (ex.: print de conversa, foto de prato/produto, arte/criativo, documento, comprovante de pagamento, briefing)." },
        ] }],
      }),
    });
    if (!resp.ok) return "";
    const data: any = await resp.json().catch(() => ({}));
    return String(data?.content?.[0]?.text || "").trim();
  } catch { return ""; }
}

// Acrescenta uma mensagem à conversa, guardando no bloco wfa-whatsapp da tabela workflowark_state.
export async function appendWhatsapp(
  db: { from: (t: string) => any },
  msg: { phone: string; name?: string; dir: "in" | "out"; text: string; ts?: number; isGroup?: boolean; jid?: string; senderName?: string; media?: any; mkey?: any },
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
  const c = state.conversas[phone] || { phone, nome: phone, msgs: [] };
  if (msg.isGroup) {
    c.isGroup = true;
    // Nome do grupo = subject (busca uma vez; pushName aqui é o REMETENTE, não o grupo).
    if (!c.subjFetched || !c.nome || c.nome === phone) {
      const s = await evoGroupSubject(msg.jid || "");
      if (s) { c.nome = s; c.subjFetched = true; }
    }
    if (!c.nome) c.nome = "Grupo";
  } else {
    if (msg.name && msg.name !== phone) c.nome = msg.name;
    if (!c.nome) c.nome = phone;
  }
  if (msg.jid) c.jid = msg.jid;
  if (!c.avatar) { try { const a = await evoFetchAvatar(msg.jid || phone); if (a) c.avatar = a; } catch { /* ignore */ } }
  const m: any = { dir: msg.dir, text: String(msg.text), ts: msg.ts || Date.now() };
  if (msg.isGroup && msg.dir === "in" && msg.senderName) m.sender = msg.senderName; // quem mandou no grupo
  if (msg.media) { m.media = msg.media; if (msg.mkey) m.mkey = msg.mkey; } // foto/video/audio/doc p/ ver depois
  c.msgs.push(m);
  c.msgs = c.msgs.slice(-300);
  c.updatedAt = Date.now();
  c.unread = msg.dir === "in" ? (c.unread || 0) + 1 : 0;
  if (msg.dir === "out") c.sugestao = ""; // respondeu: limpa a sugestão da IA
  state.conversas[phone] = c;
  // Trava de tamanho: o bloco wfa-whatsapp é lido, parseado e regravado INTEIRO a cada
  // mensagem. Sem limite no nº de conversas ele cresce pra sempre e um dia um pico de
  // mensagens estoura os 128MB/CPU do Worker (Error 1102 "exceeded resource limits").
  // Mantém só as MAX_CONVERSAS conversas mais recentes (uma agência ativa fala com bem
  // menos que isso; só somem conversas antigas e paradas).
  const MAX_CONVERSAS = 250;
  const convKeys = Object.keys(state.conversas);
  if (convKeys.length > MAX_CONVERSAS) {
    const manter = new Set(
      convKeys
        .sort((a, b) => ((state.conversas as any)[b]?.updatedAt || 0) - ((state.conversas as any)[a]?.updatedAt || 0))
        .slice(0, MAX_CONVERSAS),
    );
    for (const k of convKeys) if (!manter.has(k)) delete (state.conversas as any)[k];
  }
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
    const buf = await resp.arrayBuffer();
    // Trava de tamanho (mesma razão do transcribeAudioBase64): áudio > ~1MB pula.
    if (buf.byteLength > 1_000_000) return "[Áudio longo demais para transcrição automática]";
    const bytes = [...new Uint8Array(buf)];
    const out: any = await ai.run("@cf/openai/whisper", { audio: bytes });
    return String(out?.text || "").trim();
  } catch {
    return "";
  }
}
