// Autorização das rotas de agente (agents-run, social-run) e manutenção (seed-evaluators).
// Antes: chave fixa "ark-2026" no código (repo público + HTML servido = qualquer
// pessoa podia disparar os agentes e gastar crédito de IA). Agora:
//   1) cron/servidor usa ?key= igual ao segredo RUN_KEY (wrangler secret put RUN_KEY);
//   2) a UI usa o Bearer token da sessão, validado como membro ATIVO.
// IMPORTANTE: importar este módulo só DINAMICAMENTE dentro do handler (padrão do
// projeto, igual client.server.ts) — cloudflare:workers não existe no dev local.

export async function runSecret(): Promise<string> {
  try {
    const { env } = await import("cloudflare:workers");
    const v = (env as Record<string, string | undefined>)?.RUN_KEY;
    if (v) return String(v);
  } catch { /* dev local (Node): módulo cloudflare:workers não existe */ }
  return (typeof process !== "undefined" ? process.env?.RUN_KEY : "") ?? "";
}

export async function isRunAuthorized(request: Request, url: URL): Promise<boolean> {
  const secret = await runSecret();
  const key = url.searchParams.get("key");
  if (secret && key && key === secret) return true;

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return false;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data, error } = await db.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return false;

  const { data: member } = await db
    .from("workflowark_members")
    .select("id,active")
    .eq("user_id", user.id)
    .maybeSingle();
  return Boolean(member?.active);
}
