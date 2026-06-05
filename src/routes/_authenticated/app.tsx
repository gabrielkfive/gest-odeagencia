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
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token) throw new Error("Sessão expirada. Entre novamente.");

          const payload = e.data.action === "load" ? undefined : JSON.stringify(e.data.payload ?? {});
          const response = await fetch("/api/workflowark/state", {
            method: e.data.action === "load" ? "GET" : "POST",
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
      style={{ border: 0, width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
