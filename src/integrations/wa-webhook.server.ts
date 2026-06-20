// Lógica compartilhada do webhook do WhatsApp (Evolution API).
// Usada tanto pela rota base (/webhook) quanto pela curinga (/webhook/*),
// porque o Evolution v2.2.x posta os eventos em sub-caminhos por evento
// (ex.: /webhook/qrcode-updated, /webhook/connection-update, /webhook/messages-upsert).
// O nome do evento também vem no corpo (body.event), então a lógica é a mesma.

// Detecta se o payload vem do Bridge (whatsmeow) ou da Evolution API.
// Bridge: tem "sender" e "chatJID" mas NÃO tem "event" nem "data.key".
function isBridgeWebhook(body: any): boolean {
  return !!(body?.chatJID !== undefined && !body?.event && !body?.data?.key);
}

export async function processWaWebhook(body: any): Promise<void> {
  // ===== Formato Bridge (whatsmeow / whatsapp-mcp) =====
  if (isBridgeWebhook(body)) {
    // Reações: ignorar por enquanto
    if (body?.eventType === "reaction") return;

    const jid = String(body.chatJID || "");
    if (!jid) return;
    const isGroup = jid.includes("@g.us");
    const phone = jid.replace(/@.*/, "").replace(/\D/g, "");
    const fromMe = !!body.isFromMe;
    const pushName = String(body.senderName || "").trim();
    const name = pushName || "";
    let text = String(body.content || "");
    const messageId = String(body.messageId || "");
    const ts = Date.now();

    let media: any = null;
    let mkey: any = null;

    const mt = String(body.mediaType || "");
    if (mt) {
      const fname = String(body.mediaFilename || "");
      const mime = String(body.mimeType || "");
      if (mt === "image" || mt === "sticker") {
        if (!text) text = mt === "sticker" ? "🩷 [Figurinha]" : "🖼️ [Imagem]";
        media = { type: mt === "sticker" ? "sticker" : "image", mimetype: mime || "image/jpeg", caption: text };
        if (messageId) mkey = { id: messageId, remoteJid: jid, fromMe, filename: fname };
        // Imagem vem com base64 no webhook — descreve pra alimentar o agente
        if (!fromMe && !isGroup && body.mediaBase64 && body.mediaBase64.length > 0) {
          try {
            const { describeImageBase64 } = await import("@/integrations/zapi.server");
            const desc = await describeImageBase64(body.mediaBase64, mime || "image/jpeg");
            if (desc) text = (body.content ? body.content + " — " : "") + "🖼️ [Imagem: " + desc + "]";
          } catch { /* segue com placeholder */ }
        }
      } else if (mt === "audio") {
        if (!text) text = "🎤 [Áudio]";
        media = { type: "audio", mimetype: mime || "audio/ogg", ptt: true };
        if (messageId) mkey = { id: messageId, remoteJid: jid, fromMe, filename: fname };
        // Áudio: tenta transcrever usando o arquivo já baixado pelo bridge
        if (!fromMe && !isGroup && messageId) {
          try {
            const { bridgeDownload, bridgeMediaBase64, transcribeAudioBase64 } = await import("@/integrations/zapi.server");
            const dl = await bridgeDownload(messageId, jid);
            const storeBase = "/home/ubuntu/whatsapp-mcp/whatsapp-bridge/store/";
            const relPath = dl.path.startsWith(storeBase) ? dl.path.slice(storeBase.length) : dl.filename;
            if (relPath) mkey.filename = dl.filename; // atualiza com filename real do disco
            const md = await bridgeMediaBase64(relPath);
            const tr = await transcribeAudioBase64(md.base64);
            if (tr) text = "🎤 " + tr;
          } catch { /* segue com placeholder */ }
        }
      } else if (mt === "video") {
        if (!text) text = "🎬 [Vídeo]";
        media = { type: "video", mimetype: mime || "video/mp4", caption: text, fileName: fname };
        if (messageId) mkey = { id: messageId, remoteJid: jid, fromMe, filename: fname };
      } else if (mt === "document") {
        if (!text) text = "📎 [Documento" + (fname ? ": " + fname : "") + "]";
        media = { type: "document", fileName: fname || "documento", mimetype: mime || "" };
        if (messageId) mkey = { id: messageId, remoteJid: jid, fromMe, filename: fname };
      }
    }

    if (phone && text) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { appendWhatsapp } = await import("@/integrations/zapi.server");
      await appendWhatsapp(supabaseAdmin as any, { phone, name, dir: fromMe ? "out" : "in", text, ts, isGroup, jid, senderName: name, media, mkey });
      if (!fromMe && !isGroup) {
        const { runAgentOnIncoming } = await import("@/integrations/agent.server");
        await runAgentOnIncoming(supabaseAdmin as any, { phone, name, text });
      }
    }
    return;
  }

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

  // Enriquece mídia de DMs recebidas: transcreve áudio e descreve imagem (p/ exibir + alimentar o agente).
  if (!fromMe && !isGroup && media && mkey) {
    try {
      const { evoMediaBase64, transcribeAudioBase64, describeImageBase64 } = await import("@/integrations/zapi.server");
      if (media.type === "audio") {
        const md = await evoMediaBase64(mkey.id, mkey.remoteJid, mkey.fromMe);
        const tr = await transcribeAudioBase64(md.base64);
        if (tr) text = "🎤 " + tr;
      } else if (media.type === "image" || media.type === "sticker") {
        const md = await evoMediaBase64(mkey.id, mkey.remoteJid, mkey.fromMe);
        const desc = await describeImageBase64(md.base64, md.mimetype);
        if (desc) text = (media.caption ? media.caption + " — " : "") + "🖼️ [Imagem: " + desc + "]";
      } else if (media.type === "document") {
        text = "📎 [Documento: " + (media.fileName || "arquivo") + "]" + (media.caption ? " " + media.caption : "");
      }
    } catch { /* segue com o placeholder */ }
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
