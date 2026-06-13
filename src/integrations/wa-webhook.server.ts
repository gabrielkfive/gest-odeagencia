// Lógica compartilhada do webhook do WhatsApp (Evolution API).
// Usada tanto pela rota base (/webhook) quanto pela curinga (/webhook/*),
// porque o Evolution v2.2.x posta os eventos em sub-caminhos por evento
// (ex.: /webhook/qrcode-updated, /webhook/connection-update, /webhook/messages-upsert).
// O nome do evento também vem no corpo (body.event), então a lógica é a mesma.

export async function processWaWebhook(body: any): Promise<void> {
  // Evolution manda o QR aqui (evento qrcode.updated). Guardamos pra exibir numa página.
  if (body?.event === "qrcode.updated" || body?.event === "QRCODE_UPDATED") {
    const b64 = body?.data?.qrcode?.base64 || body?.data?.base64 || "";
    const code = body?.data?.qrcode?.code || body?.data?.code || "";
    if (b64) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).from("workflowark_state").upsert({ key: "wfa-wa-qr", data: { base64: b64, code, ts: Date.now() } });
    }
    return;
  }
  // Quando conecta, marca conectado e limpa o QR.
  if (
    (body?.event === "connection.update" || body?.event === "CONNECTION_UPDATE") &&
    /open/i.test(String(body?.data?.state || ""))
  ) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any).from("workflowark_state").upsert({ key: "wfa-wa-qr", data: { base64: "", connected: true, ts: Date.now() } });
    return;
  }

  let phone = "";
  let fromMe = false;
  let name = "";
  let text = "";
  let ts = Date.now();
  let isGroup = false;
  let jid = "";
  let media: any = null; // {type,caption?,fileName?,mimetype,ptt?}
  let mkey: any = null;  // {id,remoteJid,fromMe} p/ baixar a midia depois

  // ===== Formato Evolution API (messages.upsert) =====
  if (body?.event || body?.data?.key) {
    const event = String(body.event || "").toLowerCase();
    if (event && event !== "messages.upsert") return; // ignora qrcode/connection/etc
    const d = Array.isArray(body.data) ? body.data[0] || {} : body.data || {};
    const k = d.key || {};
    jid = String(k.remoteJid || "");
    isGroup = jid.includes("@g.us");
    phone = jid.replace(/@.*/, "").replace(/\D/g, "");
    fromMe = !!k.fromMe;
    name = d.pushName || "";
    const m = d.message || {};
    text = m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption || "";
    if (!text) {
      if (m.audioMessage) text = "🎤 [Áudio]";
      else if (m.imageMessage) text = "🖼️ [Imagem]";
      else if (m.videoMessage) text = "🎬 [Vídeo]";
      else if (m.documentMessage) text = "📎 [Documento]" + (m.documentMessage.fileName ? ": " + m.documentMessage.fileName : "");
      else if (m.locationMessage) text = "📍 [Localização]";
      else if (m.contactMessage || m.contactsArrayMessage) text = "👤 [Contato]";
      else if (m.stickerMessage) text = "🩷 [Figurinha]";
    }
    // captura metadados da mídia (pra ver/baixar/ouvir depois, sob demanda)
    if (m.imageMessage) media = { type: "image", caption: m.imageMessage.caption || "", mimetype: m.imageMessage.mimetype || "image/jpeg" };
    else if (m.videoMessage) media = { type: "video", caption: m.videoMessage.caption || "", mimetype: m.videoMessage.mimetype || "video/mp4" };
    else if (m.audioMessage) media = { type: "audio", mimetype: m.audioMessage.mimetype || "audio/ogg", ptt: !!m.audioMessage.ptt };
    else if (m.documentMessage) media = { type: "document", fileName: m.documentMessage.fileName || "documento", mimetype: m.documentMessage.mimetype || "" };
    else if (m.stickerMessage) media = { type: "sticker", mimetype: "image/webp" };
    if (media) mkey = { id: k.id, remoteJid: k.remoteJid, fromMe: !!k.fromMe };
    ts = d.messageTimestamp ? Number(d.messageTimestamp) * 1000 : Date.now();
  }
  // ===== Formato Z-API (fallback) =====
  else {
    phone = String(body.phone || body.participantPhone || "").replace(/\D/g, "");
    fromMe = !!body.fromMe;
    isGroup = !!body.isGroup;
    name = body.senderName || body.chatName || body.pushname || "";
    text = body?.text?.message ?? (typeof body?.message === "string" ? body.message : undefined) ?? body?.body ?? "";
    if (!text) {
      if (body?.audio) {
        const { transcribeAudio } = await import("@/integrations/zapi.server");
        const t = await transcribeAudio(body.audio?.audioUrl || body.audio?.url);
        text = t ? "🎤 " + t : "🎤 [Áudio recebido — não consegui transcrever]";
      } else if (body?.image) text = "🖼️ [Imagem]" + (body.image?.caption ? ": " + body.image.caption : "");
      else if (body?.video) text = "🎬 [Vídeo]" + (body.video?.caption ? ": " + body.video.caption : "");
      else if (body?.document) text = "📎 [Documento]" + (body.document?.fileName ? ": " + body.document.fileName : "");
      else if (body?.location) text = "📍 [Localização]";
      else if (body?.contact || body?.contacts) text = "👤 [Contato]";
    }
  }

  // só guarda mensagens de texto reais (ignora status, recibos, etc.)
  if (phone && text && typeof text === "string") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { appendWhatsapp } = await import("@/integrations/zapi.server");
    await appendWhatsapp(supabaseAdmin as any, { phone, name, dir: fromMe ? "out" : "in", text, ts, isGroup, jid, senderName: name, media, mkey });
    // Assistente: só em mensagens recebidas e fora de grupo (evita enxurrada de tarefas).
    if (!fromMe && !isGroup) {
      const { runAgentOnIncoming } = await import("@/integrations/agent.server");
      await runAgentOnIncoming(supabaseAdmin as any, { phone, name, text });
    }
  }
}
