// CONTROLE REMOTO (pedido do Gabriel, 03/07): mandar demanda pelo WhatsApp de
// qualquer lugar ("jarvis <demanda>") e o PC de casa executar com o Claude Code.
// Fluxo: webhook detecta o comando -> enfileira aqui (workflowark_state) -> o
// daemon do PC faz poll em /api/workflowark/remote -> executa -> posta o
// resultado -> o Worker responde no WhatsApp.
// Volume baixo (1 pessoa), então read-modify-write no state é suficiente
// (mesmo padrão do appendWhatsapp).

const KEY = "wfa-remote-queue";
const MAX_JOBS = 40;
// Job "running" há mais de 30 min = daemon caiu no meio; volta pra pending.
const STALE_MS = 30 * 60 * 1000;

export type RemoteJob = {
  id: string;
  text: string;
  phone: string; // pra onde responder (chat de origem, fora de grupo)
  status: "pending" | "running" | "done" | "error";
  result?: string;
  createdAt: number;
  startedAt?: number;
  doneAt?: number;
};

async function loadJobs(db: any): Promise<RemoteJob[]> {
  const { data: row } = await db.from("workflowark_state").select("data").eq("key", KEY).maybeSingle();
  const jobs = row?.data?.jobs;
  return Array.isArray(jobs) ? jobs : [];
}

async function saveJobs(db: any, jobs: RemoteJob[]) {
  await db.from("workflowark_state").upsert({ key: KEY, data: { jobs: jobs.slice(-MAX_JOBS) } });
}

export async function remoteEnqueue(db: any, text: string, phone: string): Promise<RemoteJob> {
  const jobs = await loadJobs(db);
  const job: RemoteJob = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: String(text).slice(0, 4000),
    phone: String(phone).replace(/\D/g, ""),
    status: "pending",
    createdAt: Date.now(),
  };
  jobs.push(job);
  await saveJobs(db, jobs);
  return job;
}

// Entrega o job pendente mais antigo pro daemon e marca como running.
export async function remotePoll(db: any): Promise<RemoteJob | null> {
  const jobs = await loadJobs(db);
  const now = Date.now();
  let changed = false;
  for (const j of jobs) {
    if (j.status === "running" && j.startedAt && now - j.startedAt > STALE_MS) {
      j.status = "pending"; // daemon morreu no meio: tenta de novo
      changed = true;
    }
  }
  const job = jobs.find((j) => j.status === "pending") || null;
  if (job) {
    job.status = "running";
    job.startedAt = now;
    changed = true;
  }
  if (changed) await saveJobs(db, jobs);
  return job;
}

export async function remoteComplete(
  db: any,
  id: string,
  ok: boolean,
  result: string,
): Promise<RemoteJob | null> {
  const jobs = await loadJobs(db);
  const job = jobs.find((j) => j.id === id) || null;
  if (!job) return null;
  job.status = ok ? "done" : "error";
  job.result = String(result || "").slice(0, 6000);
  job.doneAt = Date.now();
  await saveJobs(db, jobs);
  return job;
}

// Detecta e trata um comando remoto vindo do webhook do WhatsApp.
// Aceita: mensagem ENVIADA pelo próprio Gabriel (fromMe, ele mandando pra si
// mesmo ou pra qualquer DM) OU recebida de um número da whitelist
// REMOTE_ALLOWED_PHONES (segredo, separado por vírgula). Nunca em grupo
// (pra resposta do robô jamais cair em grupo de cliente).
// Retorna true se a mensagem era um comando (o webhook então NÃO segue o
// fluxo normal de conversa/agente).
const CMD_RE = /^\s*j[áa]?rvis\b[\s,:.!—-]*/i;

export async function handleRemoteCommand(
  db: any,
  msg: { phone: string; fromMe: boolean; isGroup: boolean; text: string },
): Promise<boolean> {
  const text = String(msg.text || "");
  if (!CMD_RE.test(text)) return false;
  if (msg.isGroup) return false; // comando em grupo: ignora (segue fluxo normal)

  let whitelisted = false;
  try {
    const { env } = await import("cloudflare:workers");
    const raw = (env as Record<string, string | undefined>)?.REMOTE_ALLOWED_PHONES || "";
    whitelisted = raw.split(",").map((s) => s.replace(/\D/g, "")).includes(String(msg.phone).replace(/\D/g, ""));
  } catch { /* sem CF env (dev local): só fromMe é autorizado */ }
  if (!msg.fromMe && !whitelisted) return false; // não autorizado: trata como mensagem comum

  const demanda = text.replace(CMD_RE, "").trim();
  const { waSendText } = await import("@/integrations/zapi.server");
  const responder = async (m: string) => {
    try { await waSendText(msg.phone, m); } catch { /* best-effort */ }
  };

  if (!demanda) {
    await responder("🤖 Às ordens, senhor. Mande: jarvis <demanda>. Ex.: \"jarvis confere os e-mails de hoje e me resume\". Também: \"jarvis status\" pra ver a fila.");
    return true;
  }
  if (/^(status|fila)$/i.test(demanda)) {
    await responder("🤖 " + (await remoteStatus(db)));
    return true;
  }

  const job = await remoteEnqueue(db, demanda, msg.phone);
  await responder(`🤖 Recebido, senhor. Demanda na fila (#${job.id.slice(-4)}). Aviso quando concluir.`);
  return true;
}

// Resumo curto da fila (pro comando "jarvis status" no WhatsApp).
export async function remoteStatus(db: any): Promise<string> {
  const jobs = await loadJobs(db);
  if (!jobs.length) return "Fila vazia, senhor. Nenhuma demanda registrada.";
  const recentes = jobs.slice(-6).reverse();
  const linha = (j: RemoteJob) => {
    const icone = j.status === "pending" ? "⏳" : j.status === "running" ? "⚙️" : j.status === "done" ? "✅" : "❌";
    return `${icone} ${j.text.slice(0, 60)}${j.text.length > 60 ? "…" : ""}`;
  };
  const pend = jobs.filter((j) => j.status === "pending").length;
  const run = jobs.filter((j) => j.status === "running").length;
  return `Fila: ${pend} aguardando, ${run} executando.\n\n${recentes.map(linha).join("\n")}`;
}
