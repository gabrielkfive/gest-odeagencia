// WhatsApp Business Cloud API (a API OFICIAL da Meta): parte pura, sem import de
// runtime, pra ser importada tanto pelo Worker quanto pelo teste em Node
// (deploy/teste-meta-wa.mjs), no mesmo espírito de merge-estado.js.
//
// Por que existe: em 10/09/2026 o número comercial do Gabriel foi banido depois de
// meses pareado em clientes não oficiais (Z-API, Evolution/Baileys, bridge whatsmeow).
// Robô de WhatsApp daqui pra frente só pela Cloud API, num número dedicado.
//
// Formato do webhook (POST) que a Meta manda:
//   { object: "whatsapp_business_account",
//     entry: [{ changes: [{ field: "messages", value: {
//        metadata: { phone_number_id, display_phone_number },
//        contacts: [{ wa_id, profile: { name } }],
//        messages: [{ from, id, timestamp, type, text: { body }, image: { id, mime_type, caption }, ... }],
//        statuses: [...]   // entregue/lido: ignoramos
//     } }] }] }

// Resposta ao GET de verificação que a Meta faz ao cadastrar o webhook.
// Devolve o hub.challenge (texto puro) se o token bater; senão null.
export function metaVerificationChallenge(searchParams, verifyToken) {
  if (!verifyToken) return null;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  if (mode !== "subscribe" || token !== verifyToken || !challenge) return null;
  return challenge;
}

// Confere a assinatura X-Hub-Signature-256 ("sha256=<hex>") do corpo cru com o
// App Secret. WebCrypto existe no Worker e no Node 20+.
export async function metaSignatureValid(rawBody, signatureHeader, appSecret) {
  if (!appSecret || !signatureHeader) return false;
  const m = /^sha256=([0-9a-f]{64})$/i.exec(String(signatureHeader).trim());
  if (!m) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
  const hex = Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
  // comparação em tempo constante
  const a = hex, b = m[1].toLowerCase();
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function placeholder(type, m) {
  if (type === "audio") return "🎤 [Áudio]";
  if (type === "image") return "🖼️ [Imagem]";
  if (type === "video") return "🎬 [Vídeo]";
  if (type === "sticker") return "🩷 [Figurinha]";
  if (type === "document") return "📎 [Documento]" + (m.document?.filename ? ": " + m.document.filename : "");
  if (type === "location") return "📍 [Localização]";
  if (type === "contacts") return "👤 [Contato]";
  return "";
}

// Extrai as mensagens recebidas de um payload. Nunca lança: payload estranho vira lista vazia.
// Cada item: { phone, name, text, ts (ms), messageId, media, mediaId, phoneNumberId }
export function parseMetaWebhook(body) {
  const out = { messages: [], statuses: 0 };
  if (!body || body.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) return out;
  for (const entry of body.entry) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const v = change?.value || {};
      if (change?.field !== "messages" || v.messaging_product !== "whatsapp") continue;
      out.statuses += Array.isArray(v.statuses) ? v.statuses.length : 0;
      const nomes = {};
      for (const c of Array.isArray(v.contacts) ? v.contacts : []) {
        if (c?.wa_id) nomes[String(c.wa_id)] = String(c?.profile?.name || "").trim();
      }
      for (const m of Array.isArray(v.messages) ? v.messages : []) {
        const phone = String(m?.from || "").replace(/\D/g, "");
        if (!phone) continue;
        const type = String(m?.type || "");
        let text = "";
        let media = null;
        let mediaId = "";
        if (type === "text") text = String(m.text?.body || "");
        else if (type === "button") text = String(m.button?.text || "");
        else if (type === "interactive") {
          text = String(m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || "");
        } else if (type === "reaction") {
          continue; // reação não é conversa
        } else {
          const obj = m[type] || {};
          const caption = String(obj.caption || "");
          text = caption || placeholder(type, m);
          if (["image", "audio", "video", "document", "sticker"].includes(type)) {
            mediaId = String(obj.id || "");
            media = {
              type,
              mimetype: String(obj.mime_type || ""),
              caption,
              fileName: String(obj.filename || ""),
              ptt: type === "audio" ? !!obj.voice : undefined,
            };
          }
        }
        if (!text) continue;
        out.messages.push({
          phone,
          name: nomes[phone] || "",
          text,
          ts: m?.timestamp ? Number(m.timestamp) * 1000 : Date.now(),
          messageId: String(m?.id || ""),
          media,
          mediaId,
          phoneNumberId: String(v.metadata?.phone_number_id || ""),
        });
      }
    }
  }
  return out;
}
