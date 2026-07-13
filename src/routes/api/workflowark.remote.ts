import { createFileRoute } from "@tanstack/react-router";

// CONTROLE REMOTO — API da fila de demandas (ver remote-queue.server.ts).
// Quem chama é o daemon do PC do Gabriel (poll/complete) e o webhook (enqueue).
//   GET  /api/workflowark/remote?key=<REMOTE_KEY>&action=poll     -> pega 1 job pendente
//   GET  /api/workflowark/remote?key=<REMOTE_KEY>&action=status   -> resumo da fila
//   POST /api/workflowark/remote?key=<REMOTE_KEY>  {action:"complete", id, ok, result}
//   POST /api/workflowark/remote?key=<REMOTE_KEY>  {action:"enqueue", text, phone}
// Segurança: exige o segredo REMOTE_KEY (wrangler secret put REMOTE_KEY); aceita
// também RUN_KEY como fallback. Sem chave válida = 401.

async function remoteSecretOk(url: URL): Promise<boolean> {
  const key = url.searchParams.get("key") || "";
  if (!key) return false;
  let remote = "";
  let run = "";
  try {
    const { env } = await import("cloudflare:workers");
    const e = env as Record<string, string | undefined>;
    remote = e?.REMOTE_KEY || "";
    run = e?.RUN_KEY || "";
  } catch {
    remote = (typeof process !== "undefined" ? process.env?.REMOTE_KEY : "") || "";
    run = (typeof process !== "undefined" ? process.env?.RUN_KEY : "") || "";
  }
  return (!!remote && key === remote) || (!!run && key === run);
}

export const Route = createFileRoute("/api/workflowark/remote")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await remoteSecretOk(u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const action = u.searchParams.get("action") || "poll";
        if (action === "status") {
          const { remoteStatus } = await import("@/integrations/remote-queue.server");
          return Response.json({ status: await remoteStatus(db) });
        }
        const { remotePoll } = await import("@/integrations/remote-queue.server");
        const job = await remotePoll(db);
        return Response.json({ job });
      },
      POST: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await remoteSecretOk(u))) return Response.json({ error: "unauthorized" }, { status: 401 });
        const body: any = await request.json().catch(() => ({}));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        if (body?.action === "enqueue") {
          const text = String(body.text || "").trim();
          const phone = String(body.phone || "").replace(/\D/g, "");
          if (!text || !phone) return Response.json({ error: "text e phone obrigatórios" }, { status: 400 });
          const { remoteEnqueue } = await import("@/integrations/remote-queue.server");
          const job = await remoteEnqueue(db, text, phone);
          return Response.json({ ok: true, job });
        }

        if (body?.action === "complete") {
          const { remoteComplete } = await import("@/integrations/remote-queue.server");
          const job = await remoteComplete(db, String(body.id || ""), body.ok !== false, String(body.result || ""));
          if (!job) return Response.json({ error: "job não encontrado" }, { status: 404 });
          // Responde no WhatsApp de origem com o resultado (best-effort).
          let waSent = false;
          if (job.phone) {
            try {
              const { waSendText } = await import("@/integrations/zapi.server");
              const cab = job.status === "done" ? "🤖 ✅ Concluído, senhor:" : "🤖 ❌ Falhou, senhor:";
              const corpo = (job.result || "(sem detalhes)").slice(0, 3500);
              await waSendText(job.phone, `${cab}\n\n${corpo}`);
              waSent = true;
            } catch { /* WhatsApp fora: o resultado fica salvo na fila */ }
          }
          return Response.json({ ok: true, job, waSent });
        }

        return Response.json({ error: "action inválida" }, { status: 400 });
      },
    },
  },
});
