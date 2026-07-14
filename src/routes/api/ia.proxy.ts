import { createFileRoute } from "@tanstack/react-router";
import { zapiEnv } from "@/integrations/zapi.server";

// Proxy interno de IA para outros Workers da ARK (hoje: Vivenda Hub via service
// binding). Motivo: o segredo ANTHROPIC_API_KEY é write-only no Cloudflare e não
// pode ser copiado entre projetos; em vez de duplicar chave, os outros Workers
// chamam este endpoint com o segredo compartilhado IA_PROXY_KEY.
// Segurança: exige o header x-proxy-key (mesmo padrão do INGEST_TOKEN do Vivenda Hub:
// constante no código, sobreponível pelo segredo IA_PROXY_KEY se um dia for setado),
// restringe o modelo a uma lista e limita max_tokens.

const MODELOS_PERMITIDOS = new Set(["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]);
const PROXY_KEY_PADRAO = "ia-proxy-2026-ark-vivenda-8f3d1c7a2b";

export const Route = createFileRoute("/api/ia/proxy")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const proxyKey = zapiEnv("IA_PROXY_KEY") || PROXY_KEY_PADRAO;
        if (request.headers.get("x-proxy-key") !== proxyKey)
          return Response.json({ error: "unauthorized" }, { status: 401 });

        const aiKey = zapiEnv("ANTHROPIC_API_KEY");
        if (!aiKey) return Response.json({ error: "sem ANTHROPIC_API_KEY" }, { status: 500 });

        const body = await request.json().catch(() => null) as {
          model?: string; max_tokens?: number; system?: string;
          messages?: Array<{ role: string; content: string }>;
        } | null;
        if (!body || !Array.isArray(body.messages) || !body.messages.length)
          return Response.json({ error: "messages obrigatório" }, { status: 400 });

        const model = MODELOS_PERMITIDOS.has(String(body.model)) ? String(body.model) : "claude-sonnet-4-6";
        const maxTokens = Math.min(Math.max(Number(body.max_tokens) || 700, 1), 1024);

        const r = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            system: String(body.system || "").slice(0, 20000),
            messages: body.messages.slice(-16).map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: String(m.content || "").slice(0, 8000),
            })),
          }),
        });
        const j = await r.json().catch(() => ({}));
        return Response.json(j, { status: r.status });
      },
    },
  },
});
