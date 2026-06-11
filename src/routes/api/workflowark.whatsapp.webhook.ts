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
          const phone = String(body.phone || body.participantPhone || "").replace(/\D/g, "");
          const fromMe = !!body.fromMe;
          const name = body.senderName || body.chatName || body.pushname || "";
          let text: string =
            body?.text?.message ??
            (typeof body?.message === "string" ? body.message : undefined) ??
            body?.body ??
            "";
          // Mídia (áudio, imagem, vídeo, doc): registra um marcador para não se perder.
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
          // só guarda mensagens de texto reais (ignora status, recibos, etc.)
          if (phone && text && typeof text === "string") {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { appendWhatsapp } = await import("@/integrations/zapi.server");
            await appendWhatsapp(supabaseAdmin as any, {
              phone,
              name,
              dir: fromMe ? "out" : "in",
              text,
            });
            // Assistente: só analisa mensagens recebidas (não as minhas).
            if (!fromMe) {
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
