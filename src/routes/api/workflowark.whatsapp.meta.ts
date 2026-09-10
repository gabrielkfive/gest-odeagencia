import { createFileRoute } from "@tanstack/react-router";

// Webhook da WhatsApp Business Cloud API (a API OFICIAL da Meta).
//
//   GET  ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
//        -> handshake de cadastro do webhook no painel da Meta. Responde o challenge
//           em texto puro se o token bater com META_WA_VERIFY_TOKEN.
//   POST -> mensagens recebidas. Aceita só com assinatura X-Hub-Signature-256 válida
//           (META_WA_APP_SECRET) ou, na falta dela, com ?token=<WEBHOOK_SECRET> na URL
//           cadastrada. Fecha por padrão: sem nenhum dos dois, 401.
//
// Sempre responde 200 no POST autorizado, mesmo com erro interno, pra Meta não reenviar.
// Cadastro no painel: URL https://workflowark.arkcontent.workers.dev/api/workflowark/whatsapp/meta
// (campo "messages" assinado). Segredos: META_WA_TOKEN, META_WA_PHONE_ID,
// META_WA_VERIFY_TOKEN, META_WA_APP_SECRET.

export const Route = createFileRoute("/api/workflowark/whatsapp/meta")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { zapiEnv } = await import("@/integrations/zapi.server");
        const { metaVerificationChallenge } = await import("@/lib/meta-wa.js");
        const u = new URL(request.url);
        const ch = metaVerificationChallenge(u.searchParams, zapiEnv("META_WA_VERIFY_TOKEN"));
        if (ch) return new Response(ch, { status: 200, headers: { "Content-Type": "text/plain" } });
        return Response.json({ error: "Forbidden" }, { status: 403 });
      },
      POST: async ({ request }) => {
        const { zapiEnv } = await import("@/integrations/zapi.server");
        const { metaSignatureValid } = await import("@/lib/meta-wa.js");
        const raw = await request.text().catch(() => "");
        const appSecret = zapiEnv("META_WA_APP_SECRET");
        let ok = false;
        if (appSecret) ok = await metaSignatureValid(raw, request.headers.get("x-hub-signature-256") || "", appSecret);
        if (!ok) {
          const secret = zapiEnv("WEBHOOK_SECRET");
          const u = new URL(request.url);
          ok = !!secret && u.searchParams.get("token") === secret;
        }
        if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const body = raw ? JSON.parse(raw) : {};
          const { processMetaWebhook } = await import("@/integrations/wa-webhook.server");
          const r = await processMetaWebhook(body);
          return Response.json({ ok: true, ...r });
        } catch (e) {
          console.error("[meta-webhook]", e);
          return Response.json({ ok: true });
        }
      },
    },
  },
});
