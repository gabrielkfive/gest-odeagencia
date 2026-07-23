import { createFileRoute } from "@tanstack/react-router";
import { processWaWebhook, webhookAuthorized } from "@/integrations/wa-webhook.server";

// Webhook chamado pela Evolution (ou Z-API) quando chega/sai uma mensagem ou muda a conexão.
// Se WEBHOOK_SECRET estiver configurado, exige o header X-Webhook-Token ou ?token= correto.
// Sempre responde 200 pra não ficar reenviando. A lógica fica em wa-webhook.server.

export const Route = createFileRoute("/api/workflowark/whatsapp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!webhookAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
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
