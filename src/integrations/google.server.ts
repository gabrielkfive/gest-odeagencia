// Integração Google Calendar (OAuth + escrita real) p/ o JARVIS marcar a agenda.
// Segredos no Cloudflare: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
// Tokens do Gabriel ficam em workflowark_state na chave wfa-google-oauth (NÃO exposta ao
// cliente: o GET load filtra chaves "-oauth"/"-secret").
import { zapiEnv } from "@/integrations/zapi.server";

const OAUTH_KEY = "wfa-google-oauth";
export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

export function googleConfig() {
  return {
    clientId: zapiEnv("GOOGLE_CLIENT_ID") || "",
    clientSecret: zapiEnv("GOOGLE_CLIENT_SECRET") || "",
  };
}

export function googleRedirectUri(origin: string) {
  return `${origin}/api/google/callback`;
}

export function googleAuthUrl(origin: string, state = "") {
  const { clientId } = googleConfig();
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(origin),
    response_type: "code",
    scope: GOOGLE_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  if (state) p.set("state", state);
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export async function exchangeCode(db: any, origin: string, code: string) {
  const { clientId, clientSecret } = googleConfig();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: googleRedirectUri(origin), grant_type: "authorization_code",
    }),
  });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d?.error_description || d?.error || "Falha ao trocar código");
  // descobre o e-mail conectado (opcional, p/ exibir)
  let email = "";
  try {
    const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${d.access_token}` } });
    const uj: any = await ui.json().catch(() => ({}));
    email = uj?.email || "";
  } catch { /* ignore */ }
  const rec = {
    refresh_token: d.refresh_token || "",
    access_token: d.access_token || "",
    expiry: Date.now() + (Number(d.expires_in || 3600) - 60) * 1000,
    email,
    connectedAt: Date.now(),
  };
  // mantém refresh_token antigo se o Google não reenviar
  if (!rec.refresh_token) {
    const prev = await getStoredOAuth(db);
    if (prev?.refresh_token) rec.refresh_token = prev.refresh_token;
  }
  await db.from("workflowark_state").upsert({ key: OAUTH_KEY, data: rec });
  return rec;
}

export async function getStoredOAuth(db: any) {
  const { data } = await db.from("workflowark_state").select("data").eq("key", OAUTH_KEY).maybeSingle();
  return (data?.data as any) || null;
}

export async function getAccessToken(db: any): Promise<string> {
  const rec = await getStoredOAuth(db);
  if (!rec || !rec.refresh_token) throw new Error("Google Calendar não conectado");
  if (rec.access_token && rec.expiry && Date.now() < rec.expiry) return rec.access_token;
  const { clientId, clientSecret } = googleConfig();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: rec.refresh_token, grant_type: "refresh_token",
    }),
  });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d?.error_description || d?.error || "Falha ao renovar token Google");
  rec.access_token = d.access_token;
  rec.expiry = Date.now() + (Number(d.expires_in || 3600) - 60) * 1000;
  await db.from("workflowark_state").upsert({ key: OAUTH_KEY, data: rec });
  return rec.access_token;
}

// Cria 1 evento. ev: { title, date 'YYYY-MM-DD', time 'HH:MM' (opcional), durationMin (default 60), notes }
export async function createCalendarEvent(db: any, ev: any) {
  const token = await getAccessToken(db);
  const tz = "America/Sao_Paulo";
  let body: any;
  if (ev.time) {
    const start = new Date(`${ev.date}T${ev.time}:00`);
    const end = new Date(start.getTime() + (Number(ev.durationMin) || 60) * 60000);
    const iso = (d: Date) => d.toISOString().slice(0, 19); // sem Z; usamos timeZone
    body = { summary: String(ev.title || "Tarefa"), description: ev.notes || "Criado pelo JARVIS · WorkFlowArk",
      start: { dateTime: iso(start), timeZone: tz }, end: { dateTime: iso(end), timeZone: tz } };
  } else {
    body = { summary: String(ev.title || "Tarefa"), description: ev.notes || "Criado pelo JARVIS · WorkFlowArk",
      start: { date: ev.date }, end: { date: ev.date } };
  }
  const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d?.error?.message || "Falha ao criar evento no Google");
  return { id: d.id, htmlLink: d.htmlLink };
}
