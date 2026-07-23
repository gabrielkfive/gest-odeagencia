import { supabase } from "@/integrations/supabase/client";

export async function authedFetch(action: string, payload?: Record<string, unknown>) {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) { const r = await supabase.auth.refreshSession(); token = r.data.session?.access_token; }
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const isLoad = action === "load";
  const res = await fetch("/api/workflowark/state", {
    method: isLoad ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, ...(isLoad ? {} : { "Content-Type": "application/json" }) },
    body: isLoad ? undefined : JSON.stringify(payload ?? {}),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Falha ao falar com o servidor.");
  return out;
}
