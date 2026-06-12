import { createFileRoute } from "@tanstack/react-router";

// Webhook chamado pela Z-API quando chega (ou sai) uma mensagem. SEM autenticação
// (é a Z-API quem chama, servidor-a-servidor). Sempre responde 200 para a Z-API não
// ficar reenviando.
export const Route = createFileRoute("/api/workflowark/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}));

          // Evolution manda o QR aqui (evento qrcode.updated). Guardamos pra exibir numa página.
          if (body?.event === "qrcode.updated") {
            const b64 = body?.data?.qrcode?.base64 || body?.data?.base64 || "";
            const code = body?.data?.qrcode?.code || body?.data?.code || "";
            if (b64) {
              const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
              await (supabaseAdmin as any).from("workflowark_state").upsert({ key: "wfa-wa-qr", data: { base64: b64, code, ts: Date.now() } });
            }
            return Response.json({ ok: true });
          }
          // Quando conecta, limpa o QR.
          if (body?.event === "connection.update" && /open/i.test(String(body?.data?.state || ""))) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await (supabaseAdmin as any).from("workflowark_state").upsert({ key: "wfa-wa-qr", data: { base64: "", connected: true, ts: Date.now() } });
            return Response.json({ ok: true });
          }

          let phone = "";
          let fromMe = false;
          let name = "";
          let text = "";
          let ts = Date.now();
          let isGroup = false;
          let jid = "";

          // ===== Formato Evolution API (messages.upsert) =====
          if (body?.event || body?.data?.key) {
            const event = String(body.event || "");
            if (event && event !== "messages.upsert") return Response.json({ ok: true }); // ignora qrcode/connection/etc
            const d = Array.isArray(body.data) ? (body.data[0] || {}) : (body.data || {});
            const k = d.key || {};
            jid = String(k.remoteJid || "");
            isGroup = jid.includes("@g.us");
            phone = jid.replace(/@.*/, "").replace(/\D/g, "");
            fromMe = !!k.fromMe;
            name = d.pushName || "";
            const m = d.message || {};
            text =
              m.conversation ||
              m.extendedTextMessage?.text ||
              m.imageMessage?.caption ||
              m.videoMessage?.caption ||
              "";
            if (!text) {
              if (m.audioMessage) text = "🎤 [Áudio]";
              else if (m.imageMessage) text = "🖼️ [Imagem]";
              else if (m.videoMessage) text = "🎬 [Vídeo]";
              else if (m.documentMessage) text = "📎 [Documento]" + (m.documentMessage.fileName ? ": " + m.documentMessage.fileName : "");
              else if (m.locationMessage) text = "📍 [Localização]";
              else if (m.contactMessage || m.contactsArrayMessage) text = "👤 [Contato]";
              else if (m.stickerMessage) text = "🩷 [Figurinha]";
            }
            ts = d.messageTimestamp ? Number(d.messageTimestamp) * 1000 : Date.now();
          }
          // ===== Formato Z-API (fallback) =====
          else {
            phone = String(body.phone || body.participantPhone || "").replace(/\D/g, "");
            fromMe = !!body.fromMe;
            isGroup = !!body.isGroup;
            name = body.senderName || body.chatName || body.pushname || "";
            text =
              body?.text?.message ??
              (typeof body?.message === "string" ? body.message : undefined) ??
              body?.body ??
              "";
            if (!text) {
              if (body?.audio) {
                const { transcribeAudio } = await import("@/integrations/zapi.server");
                const t = await transcribeAudio(body.audio?.audioUrl || body.audio?.url);
                text = t ? "🎤 " + t : "🎤 [Áudio recebido — não consegui transcrever]";
              }
              else if (body?.image) text = "🖼️ [Imagem]" + (body.image?.caption ? ": " + body.image.caption : "");
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
            await appendWhatsapp(supabaseAdmin as any, { phone, name, dir: fromMe ? "out" : "in", text, ts, isGroup, jid });
            // Assistente: só em mensagens recebidas e fora de grupo (evita enxurrada de tarefas).
            if (!fromMe && !isGroup) {
              const { runAgentOnIncoming } = await import("@/integrations/agent.server");
              await runAgentOnIncoming(supabaseAdmin as any, { phone, name, text });
            }
          }
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: true });
        }
      },
    },
  },
});
