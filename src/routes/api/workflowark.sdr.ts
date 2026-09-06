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
          const { evoConnectionState, zapiEnv } = await import("@/integrations/zapi.server");
          const cfg = await sdrConfig(db);
          const age = cfg.lastInboundTs ? Math.round((Date.now() - cfg.lastInboundTs) / 60000) : null;
          return Response.json({
            ok: true,
            build: "20260906-sdr-1",
            canal: await evoConnectionState(),
            webhookFechado: true, // sempre exige token desde 20/08
            webhookSecretConfigurado: !!zapiEnv("WEBHOOK_SECRET"),
            sdrLigado: cfg.enabled,
            ultimaEntradaMin: age, // minutos desde a última mensagem recebida (null = nunca)
            respostasEnviadas: cfg.stats.respostas || 0,
            leads: cfg.stats.leads || 0,
          });
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
