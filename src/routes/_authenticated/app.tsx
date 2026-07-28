import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "WorkFlowArk · ARK Content" }] }),
  component: AppPage,
});

function AppPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === "wfa-sair") {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
        return;
      }

      if (e.data?.type === "wfa-cloud") {
        const frame = e.source as Window | null;
        const id = e.data.id;
        try {
          let { data } = await supabase.auth.getSession();
          let token = data.session?.access_token;
          // Operação o dia todo: se o token sumiu/expirou, tenta renovar antes de falhar
          // (evita "Erro ao sincronizar" por sessão velha em quem deixa a aba aberta horas).
          if (!token) {
            const refreshed = await supabase.auth.refreshSession();
            token = refreshed.data.session?.access_token;
          }
          if (!token) throw new Error("Sessão expirada. Entre novamente.");

          const isGet = e.data.action === "load";
          // GET condicional: repassa o ?since= do iframe (sync leve). No POST, inclui a
          // action no corpo — sem ela, um fallback de "load-key" era lido como save-state.
          const qs = isGet && e.data.payload?.since ? `?since=${encodeURIComponent(e.data.payload.since)}` : "";
          const payload = isGet ? undefined : JSON.stringify({ action: e.data.action, ...(e.data.payload ?? {}) });
          const response = await fetch("/api/workflowark/state" + qs, {
            method: isGet ? "GET" : "POST",
            headers: {
              ...(payload ? { "Content-Type": "application/json" } : {}),
              Authorization: `Bearer ${token}`,
            },
            body: payload,
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "Erro ao sincronizar dados.");
          frame?.postMessage({ type: "wfa-cloud-response", id, ok: true, data: result }, "*");
        } catch (error) {
          frame?.postMessage({
            type: "wfa-cloud-response",
            id,
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }, "*");
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate]);
  return (
    <iframe
      src="/workflowark.html"
      title="WorkFlowArk"
      allow="clipboard-write; clipboard-read; microphone; autoplay; encrypted-media"
      style={{ border: 0, width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
