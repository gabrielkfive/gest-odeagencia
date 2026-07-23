import { createFileRoute } from "@tanstack/react-router";

// Inicia o OAuth do Google Calendar: redireciona o Gabriel pra tela de consentimento.
// /api/google/auth
export const Route = createFileRoute("/api/google/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { googleConfig, googleAuthUrl } = await import("@/integrations/google.server");
        const { clientId } = googleConfig();
        if (!clientId) {
          return new Response(
            "<html><body style='font-family:sans-serif;padding:40px;max-width:560px;margin:auto'>" +
              "<h2>Google Calendar ainda não configurado</h2>" +
              "<p>Falta o <b>GOOGLE_CLIENT_ID</b> / <b>GOOGLE_CLIENT_SECRET</b> no servidor. " +
              "Veja o passo-a-passo em <code>docs/O-QUE-O-GABRIEL-PRECISA.md</code>.</p></body></html>",
            { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
        const origin = new URL(request.url).origin;
        const csrfState = crypto.randomUUID();
        return new Response(null, {
          status: 302,
          headers: {
            Location: googleAuthUrl(origin, csrfState),
            "Set-Cookie": `oauth_state=${csrfState}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
          },
        });
      },
    },
  },
});
