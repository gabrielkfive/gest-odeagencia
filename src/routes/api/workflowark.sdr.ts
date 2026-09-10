import { createFileRoute } from "@tanstack/react-router";

// Painel/controle do robô comercial (SDR) do WhatsApp.
//
//   GET  ?health=1                     -> saúde pública (sem dado sensível): canal,
//                                         webhook fechado?, robô ligado?, última entrada.
//   GET  ?key=<RUN_KEY> | Bearer       -> config completa + fila de leads.
//   POST ?key=<RUN_KEY> | Bearer       -> { action: "on"|"off"|"pause"|"resume"|"persona",
//                                           phone?, persona? }
//
// O liga/desliga do dia a dia é pelo próprio WhatsApp do Gabriel: "robo on/off/status".

export const Route = createFileRoute("/api/workflowark/sdr")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { sdrConfig } = await import("@/integrations/sdr.server");

        if (u.searchParams.get("health") === "1") {
          const { evoConnectionState, metaConfigured, zapiEnv } = await import("@/integrations/zapi.server");
          const cfg = await sdrConfig(db);
          const age = cfg.lastInboundTs ? Math.round((Date.now() - cfg.lastInboundTs) / 60000) : null;
          return Response.json({
            ok: true,
            build: "20260910-sdr-2-meta",
            // Canal oficial (Cloud API da Meta): quando configurado, é ele que envia.
            canalOficial: metaConfigured() ? "configurado" : "nao-configurado",
            canal: await evoConnectionState(), // legado Evolution (VM Oracle)
            webhookFechado: true, // sempre exige token desde 20/08
            webhookSecretConfigurado: !!zapiEnv("WEBHOOK_SECRET"),
            sdrLigado: cfg.enabled,
            ultimaEntradaMin: age, // minutos desde a última mensagem recebida (null = nunca)
            respostasEnviadas: cfg.stats.respostas || 0,
            leads: cfg.stats.leads || 0,
          });
        }

        // Auto-configuração: o Worker manda a PRÓPRIA Evolution passar a postar o webhook
        // com o token (header + ?token=). Sem auth de propósito: é idempotente, não recebe
        // input e só re-sincroniza a config correta entre dois sistemas nossos.
        if (u.searchParams.get("fixwebhook") === "1") {
          const { evoConfig, zapiEnv } = await import("@/integrations/zapi.server");
          const { url, key, instance } = evoConfig();
          const secret = zapiEnv("WEBHOOK_SECRET");
          if (!url || !key || !instance) return Response.json({ ok: false, erro: "Evolution não configurada." });
          if (!secret) return Response.json({ ok: false, erro: "WEBHOOK_SECRET ainda não existe no Worker (o CI cria no próximo deploy)." });
          const hookUrl = "https://workflowark.arkcontent.workers.dev/api/workflowark/whatsapp/webhook?token=" + encodeURIComponent(secret);
          const events = ["MESSAGES_UPSERT", "QRCODE_UPDATED", "CONNECTION_UPDATE"];
          const tenta = async (body: any) => {
            const r = await fetch(`${url}/webhook/set/${instance}`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: key },
              body: JSON.stringify(body),
            });
            return { status: r.status, data: await r.json().catch(() => ({})) };
          };
          // Evolution v2 usa corpo aninhado { webhook: {...} }; versões antigas, corpo plano.
          let r = await tenta({ webhook: { enabled: true, url: hookUrl, byEvents: false, base64: true, headers: { "x-webhook-token": secret }, events } });
          if (r.status >= 400) r = await tenta({ enabled: true, url: hookUrl, webhook_by_events: false, events });
          return Response.json({ ok: r.status < 400, evolutionStatus: r.status, resposta: r.data });
        }

        const { isRunAuthorized } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const cfg = await sdrConfig(db);
        const { data: row } = await db.from("workflowark_state").select("data").eq("key", "wfa-leads").maybeSingle();
        return Response.json({ ok: true, config: cfg, leads: row?.data || {} });
      },

      POST: async ({ request }) => {
        const u = new URL(request.url);
        const { isRunAuthorized } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { sdrConfig, sdrSaveConfig } = await import("@/integrations/sdr.server");
        const body: any = await request.json().catch(() => ({}));
        const cfg = await sdrConfig(db);
        const phone = String(body.phone || "").replace(/\D/g, "");
        switch (String(body.action || "")) {
          case "on": cfg.enabled = true; break;
          case "off": cfg.enabled = false; break;
          case "pause":
            if (!phone) return Response.json({ error: "phone obrigatório" }, { status: 400 });
            cfg.pausados[phone] = { ts: Date.now(), motivo: "pausado pelo painel" };
            break;
          case "resume":
            if (!phone) return Response.json({ error: "phone obrigatório" }, { status: 400 });
            delete cfg.pausados[phone];
            break;
          case "persona":
            cfg.persona = String(body.persona || "").slice(0, 4000);
            break;
          default:
            return Response.json({ error: "action inválida" }, { status: 400 });
        }
        await sdrSaveConfig(db, cfg);
        return Response.json({ ok: true, config: cfg });
      },
    },
  },
});
