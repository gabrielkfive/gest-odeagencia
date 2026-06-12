import { createFileRoute } from "@tanstack/react-router";

// Página simples que mostra o QR do WhatsApp (capturado do webhook qrcode.updated).
// Gabriel abre essa URL e escaneia. Atualiza sozinha.
export const Route = createFileRoute("/api/workflowark/whatsapp/qr")({
  server: {
    handlers: {
      GET: async () => {
        let d: any = {};
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: row } = await (supabaseAdmin as any)
            .from("workflowark_state")
            .select("data")
            .eq("key", "wfa-wa-qr")
            .maybeSingle();
          d = row?.data || {};
        } catch {
          /* ignore */
        }
        const fresh = d.ts && Date.now() - d.ts < 80000;
        let body: string;
        if (d.connected) {
          body = `<div class="ok">✅ WhatsApp conectado!</div><p class="sub">Pode fechar esta página. As conversas já aparecem no sistema.</p>`;
        } else if (fresh && d.base64) {
          body = `<div class="qr"><img src="${d.base64}" alt="QR" width="300" height="300"></div>
            <p class="sub">No celular: <b>WhatsApp → Aparelhos conectados → Conectar um aparelho</b> → aponte para o código.</p>
            ${d.code ? `<p class="code">ou código: <b>${String(d.code).replace(/[<>]/g, "")}</b></p>` : ""}`;
        } else {
          body = `<div class="wait">⏳ Gerando o QR Code...</div><p class="sub">Se demorar, peça pro Claude recriar a instância. Esta página atualiza sozinha.</p>`;
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
