import { createFileRoute } from "@tanstack/react-router";

// Diagnóstico: o servidor (que tem egress p/ a Anthropic) testa a ANTHROPIC_API_KEY.
// Não expõe a chave; só diz se funciona. GET /api/workflowark/ai-check
export const Route = createFileRoute("/api/workflowark/ai-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // AUTENTICADO desde 20/08/2026. Antes era aberto: qualquer GET disparava uma chamada
        // real a API da Anthropic com a chave da ARK. Barato por chamada, mas e um endpoint
        // publico que gasta dinheiro e da pra martelar. Diagnostico nao precisa ser publico.
        const { isRunAuthorized } = await import("@/integrations/run-auth.server");
        if (!(await isRunAuthorized(request, new URL(request.url))))
          return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
        const { zapiEnv } = await import("@/integrations/zapi.server");
        const key = zapiEnv("ANTHROPIC_API_KEY");
        if (!key) return Response.json({ ok: false, reason: "sem ANTHROPIC_API_KEY" });
        try {
          const r = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 10, messages: [{ role: "user", content: "diga: ok" }] }),
          });
          const data: any = await r.json().catch(() => ({}));
          if (!r.ok) return Response.json({ ok: false, status: r.status, error: data?.error?.message || data?.error?.type || "erro" });
          return Response.json({ ok: true, model: data?.model, resposta: data?.content?.[0]?.text });
        } catch (e) {
          return Response.json({ ok: false, reason: (e as Error)?.message || "falha de rede" });
        }
      },
    },
  },
});
