// Autorização das rotas de agente (agents-run, social-run) e manutenção (seed-evaluators).
// Antes: chave fixa "ark-2026" no código (repo público + HTML servido = qualquer
// pessoa podia disparar os agentes e gastar crédito de IA). Agora:
//   1) cron/servidor usa ?key= igual ao segredo RUN_KEY (wrangler secret put RUN_KEY);
//   2) a UI usa o Bearer token da sessão, validado como membro ATIVO.
// IMPORTANTE: importar este módulo só DINAMICAMENTE dentro do handler (padrão do
// projeto, igual client.server.ts) — cloudflare:workers não existe no dev local.

export async function runSecret(): Promise<string> {
  return (await runSecrets())[0] ?? "";
}

// RUN_KEY (conector do claude.ai, cron) e RUN_KEY_LOCAL (agentes locais no PC do Gabriel,
// set/26). Duas chaves pra não rotacionar a primeira quando a segunda precisar trocar.
export async function runSecrets(): Promise<string[]> {
  const nomes = ["RUN_KEY", "RUN_KEY_LOCAL"];
  const out: string[] = [];
  let env: Record<string, string | undefined> = {};
  try {
    const mod = await import("cloudflare:workers");
    env = (mod.env as Record<string, string | undefined>) ?? {};
  } catch { /* dev local (Node): módulo cloudflare:workers não existe */ }
  for (const n of nomes) {
    const v = env?.[n] ?? (typeof process !== "undefined" ? process.env?.[n] : "");
    if (v) out.push(String(v));
  }
  return out;
}

export async function isRunKey(k: string): Promise<boolean> {
  if (!k) return false;
  return (await runSecrets()).includes(k);
}

export async function isRunAuthorized(request: Request, url: URL): Promise<boolean> {
  const key = url.searchParams.get("key");
  if (key && (await isRunKey(key))) return true;

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
