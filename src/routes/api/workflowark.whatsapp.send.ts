import { createFileRoute } from "@tanstack/react-router";

// Envia uma mensagem de WhatsApp pelo Z-API. Exige login (Bearer token do usuário).
export const Route = createFileRoute("/api/workflowark/whatsapp/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!token) return Response.json({ error: "Não autenticado" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
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

        const body: any = await request.json().catch(() => ({}));
        const phone = String(body.phone || "").replace(/\D/g, "");
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
