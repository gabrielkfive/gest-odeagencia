import { createFileRoute } from "@tanstack/react-router";
import { processWaWebhook } from "@/integrations/wa-webhook.server";

// Rota curinga: a Evolution v2.2.x posta cada evento num sub-caminho
// (/webhook/qrcode-updated, /webhook/connection-update, /webhook/messages-upsert).
// Esta rota captura qualquer sub-caminho e usa a MESMA lógica da rota base.
export const Route = createFileRoute("/api/workflowark/whatsapp/webhook/$")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: any = await request.json().catch(() => ({}));
          await processWaWebhook(body);
        } catch {
          /* ignore — sempre 200 */
        }
        return Response.json({ ok: true });
      },
    },
  },
});
