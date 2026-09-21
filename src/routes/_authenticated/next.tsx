// WorkFlowArk Next (21/09/2026): a COPIA do sistema inteiro (public/workflowark-next.html,
// mesmo JS e CSS do /app + skin de vidro workflowark-next-<data>.css) na rota /next.
// Mesma ponte wfa-cloud do /app: o iframe pede, o React fala com a API com o token.
// Os paineis React de leitura ficaram em /painel.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/next")({
  head: () => ({ meta: [{ title: "WorkFlowArk Next · ARK Content" }] }),
  component: NextPage,
});

function NextPage() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      if (e.data?.type === "wfa-sair") {
        await supabase.auth.signOut();
        navigate({ to: "/auth" });
        return;
      }
      if (e.data?.type !== "wfa-cloud") return;
      const frame = e.source as Window | null;
      const id = e.data.id;
      try {
        let { data } = await supabase.auth.getSession();
        let token = data.session?.access_token;
        if (!token) token = (await supabase.auth.refreshSession()).data.session?.access_token;
        if (!token) throw new Error("Sessão expirada. Entre novamente.");
        const isGet = e.data.action === "load";
        const qs = isGet && e.data.payload?.since ? `?since=${encodeURIComponent(e.data.payload.since)}` : "";
        const payload = isGet ? undefined : JSON.stringify({ action: e.data.action, ...(e.data.payload ?? {}) });
        const response = await fetch("/api/workflowark/state" + qs, {
          method: isGet ? "GET" : "POST",
          headers: { ...(payload ? { "Content-Type": "application/json" } : {}), Authorization: `Bearer ${token}` },
          body: payload,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Erro ao sincronizar dados.");
        frame?.postMessage({ type: "wfa-cloud-response", id, ok: true, data: result }, "*");
      } catch (error) {
        frame?.postMessage({ type: "wfa-cloud-response", id, ok: false, error: error instanceof Error ? error.message : String(error) }, "*");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [navigate]);
  return (
    <iframe
      src="/workflowark-next.html"
      title="WorkFlowArk Next"
      allow="clipboard-write; clipboard-read; microphone; autoplay; encrypted-media"
      style={{ border: 0, width: "100vw", height: "100vh", display: "block" }}
    />
  );
}
