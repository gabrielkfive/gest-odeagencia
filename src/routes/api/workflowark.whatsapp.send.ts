import { createFileRoute } from "@tanstack/react-router";

// Envia uma mensagem de WhatsApp pelo Z-API. Exige login (Bearer token do usuário).
export const Route = createFileRoute("/api/workflowark/whatsapp/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        // ACESSO DE SERVIÇO (automações do Claude na nuvem / cron): header "x-run-key"
        // com o segredo RUN_KEY autoriza o envio sem sessão de navegador.
        const svcKey = request.headers.get("x-run-key") || "";
        let svcOk = false;
        if (svcKey) {
          const { runSecret } = await import("@/integrations/run-auth.server");
          const secret = await runSecret();
          if (!secret || svcKey !== secret) return Response.json({ error: "Não autenticado" }, { status: 401 });
          svcOk = true;
        }

        if (!svcOk) {
          const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
          if (!token) return Response.json({ error: "Não autenticado" }, { status: 401 });

          const { data: u } = await db.auth.getUser(token);
          if (!u?.user) return Response.json({ error: "Sessão inválida" }, { status: 401 });

          // Fase 1, item 3: usuário SUSPENSO (active=false) não pode disparar WhatsApp.
          // Bloqueia só quem está explicitamente suspenso; se não houver registro, mantém o
          // comportamento atual (fail-open) pra não travar usuário legítimo por engano.
          const { data: member } = await db
            .from("workflowark_members")
            .select("active")
            .eq("user_id", u.user.id)
            .maybeSingle();
          if (member && member.active === false) {
            return Response.json({ error: "Usuário suspenso não pode enviar mensagens." }, { status: 403 });
          }
        }

        const body: any = await request.json().catch(() => ({}));
        // jid: destino bruto (ex.: grupo "1203...@g.us") — a bridge aceita JID direto.
        // phone: número (só dígitos), fluxo original. jid tem prioridade quando presente.
        const jid = String(body.jid || "").trim();
        const phone = jid || String(body.phone || "").replace(/\D/g, "");
        const message = String(body.message || "").trim();
        if (!phone || !message) return Response.json({ error: "Telefone e mensagem são obrigatórios." }, { status: 400 });

        try {
          const { waSendText, appendWhatsapp } = await import("@/integrations/zapi.server");
          await waSendText(phone, message);
          await appendWhatsapp(db, { phone, dir: "out", text: message });
          return Response.json({ ok: true });
        } catch (e) {
          return Response.json({ error: (e as Error)?.message || "Falha ao enviar" }, { status: 502 });
        }
      },
    },
  },
});
