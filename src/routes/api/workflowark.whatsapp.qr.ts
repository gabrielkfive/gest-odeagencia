import { createFileRoute } from "@tanstack/react-router";

// Página simples que mostra o QR do WhatsApp (capturado do webhook qrcode.updated).
// Gabriel abre essa URL e escaneia. Atualiza sozinha.
export const Route = createFileRoute("/api/workflowark/whatsapp/qr")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;
        const { evoConnectionState, evoConnect } = await import("@/integrations/zapi.server");

        // 1) Estado real da instância na Evolution (fonte da verdade).
        const state = await evoConnectionState();

        let problema = ""; // mensagem de diagnóstico quando algo está fora do ar
        let connected = false;
        if (state === "open") {
          connected = true;
          try { await db.from("workflowark_state").upsert({ key: "wfa-wa-qr", data: { connected: true, ts: Date.now() } }); } catch { /* ignore */ }
        } else if (state === "offline") {
          problema = "O servidor do WhatsApp (Evolution) não respondeu. A máquina pode estar desligada — avise o Claude.";
        } else if (state === "unconfigured") {
          problema = "WhatsApp ainda não configurado (faltam as credenciais da Evolution).";
        } else if (state === "notfound") {
          problema = "A instância 'ark' não existe na Evolution — peça pro Claude recriar a instância.";
        } else if (state === "error") {
          problema = "Não consegui autenticar na Evolution (a chave pode estar errada) — avise o Claude.";
        } else {
          // close / connecting / unknown → dispara o connect só pra a Evolution emitir o QR.
          // O QR em si NÃO vem nessa resposta (count:0); chega pelo webhook qrcode.updated,
          // que o nosso /webhook salva em wfa-wa-qr. Por isso aqui só disparamos e seguimos lendo.
          try { await evoConnect(); } catch { /* ignore — pode já estar conectando */ }
        }

        // 2) Lê o QR mais recente que o WEBHOOK salvou (não sobrescreve).
        let d: any = {};
        if (!connected) {
          try {
            const { data: row } = await db.from("workflowark_state").select("data").eq("key", "wfa-wa-qr").maybeSingle();
            d = row?.data || {};
          } catch { /* ignore */ }
        }
        const fresh = d.ts && Date.now() - d.ts < 80000;

        let body: string;
        if (connected || d.connected) {
          body = `<div class="ok">✅ WhatsApp conectado!</div><p class="sub">Pode fechar esta página. As conversas já aparecem no sistema.</p>`;
        } else if (fresh && d.base64) {
          body = `<div class="qr"><img src="${d.base64}" alt="QR" width="300" height="300"></div>
            <p class="sub">No celular: <b>WhatsApp → Aparelhos conectados → Conectar um aparelho</b> → aponte para o código.</p>
            ${d.code ? `<p class="code">ou código: <b>${String(d.code).replace(/[<>]/g, "")}</b></p>` : ""}`;
        } else {
          body = `<div class="wait">⏳ ${problema || "Gerando o QR Code..."}</div><p class="sub">Esta página atualiza sozinha.</p>`;
        }
        const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conectar WhatsApp · ARK</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0a0a0a;color:#fff;text-align:center;padding:24px}
  h1{font-size:22px;margin:0 0 6px}.tag{color:#ffd400;font-weight:700;letter-spacing:.04em;text-transform:uppercase;font-size:12px;margin-bottom:18px}
  .qr{background:#fff;display:inline-block;padding:16px;border-radius:18px}
  .qr img{display:block}
  .sub{color:#bdbdbd;font-size:14px;max-width:340px;line-height:1.5;margin-top:18px}
  .code{color:#ffd400;font-size:14px}
  .ok{font-size:24px;font-weight:800;color:#19d36b}.wait{font-size:18px;font-weight:700;color:#ffd400}
</style></head><body>
  <div class="tag">ARK · WhatsApp</div>
  <h1>Conectar o WhatsApp</h1>
  ${body}
  <script>setTimeout(function(){location.reload()}, 6000)</script>
</body></html>`;
        return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
      },
    },
  },
});
