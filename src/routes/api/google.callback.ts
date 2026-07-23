import { createFileRoute } from "@tanstack/react-router";

// Callback do OAuth do Google: troca o código por tokens e guarda no servidor.
// /api/google/callback?code=...
export const Route = createFileRoute("/api/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const err = url.searchParams.get("error");
        const returnedState = url.searchParams.get("state") || "";

        const cookieHeader = request.headers.get("cookie") || "";
        const storedState =
          cookieHeader.split(";")
            .map((c) => c.trim().split("="))
            .find((p) => p[0] === "oauth_state")?.[1]?.trim() || "";
        const clearState = "oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";

        const page = (title: string, msg: string, ok = false, clearCookie = false) =>
          new Response(
            `<html><body style="font-family:sans-serif;padding:40px;max-width:560px;margin:auto;text-align:center">` +
              `<div style="font-size:42px">${ok ? "✓" : "⚠"}</div><h2>${title}</h2><p style="color:#555">${msg}</p>` +
              `<p style="color:#999;font-size:13px">Pode fechar esta aba e voltar pro WorkFlowArk.</p></body></html>`,
            {
              status: ok ? 200 : 400,
              headers: {
                "content-type": "text/html; charset=utf-8",
                ...(clearCookie ? { "Set-Cookie": clearState } : {}),
              },
            },
          );

        if (err) return page("Conexão cancelada", "Você cancelou ou o Google recusou. Tente de novo pela aba Integrações.", false, true);
        if (!storedState || storedState !== returnedState) {
          return page("Sessão inválida", "Solicitação de autorização inválida ou expirada. Inicie a conexão novamente pela aba Integrações.");
        }
        if (!code) return page("Faltou o código", "O Google não devolveu o código de autorização.");
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { exchangeCode } = await import("@/integrations/google.server");
          const rec = await exchangeCode(supabaseAdmin as any, url.origin, code);
          return page("Google Calendar conectado!", `Conta: <b>${rec.email || "ok"}</b>. O JARVIS já pode marcar sua agenda.`, true, true);
        } catch (e) {
          return page("Falha ao conectar", (e as Error)?.message || "Erro desconhecido", false, true);
        }
      },
    },
  },
});
