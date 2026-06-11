import { createFileRoute } from "@tanstack/react-router";

// Planilha financeira publicada na web (somente leitura). O servidor busca o conteúdo
// e repassa para o front — o navegador não consegue ler o Google direto (CORS).
const SHEET_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWOvW6PZJHWlv6jfIYt2bJ1aA0Tw6jzvJu-Uzjk6axIHtebnEDadNUojfdXOoLzjVUmzfexaPwionf";

// Lê a lista de abas (meses) direto do HTML publicado: items.push({name:"..",...gid="..."}).
async function listSheets() {
  const resp = await fetch(`${SHEET_BASE}/pubhtml?widget=true&headers=false`, {
    headers: { "User-Agent": "WorkFlowArk/1.0" },
  });
  if (!resp.ok) return [];
  const html = await resp.text();
  const out: { gid: string; name: string }[] = [];
  for (const part of html.split("items.push(")) {
    const nm = part.match(/name:\s*"([^"]+)"/);
    const gd = part.match(/gid:\s*"(\d+)"/);
    if (nm && gd) out.push({ gid: gd[1], name: nm[1].trim() });
  }
  return out;
}

export const Route = createFileRoute("/api/workflowark/sheet")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);

          // ?list=1 → devolve as abas (meses) disponíveis
          if (url.searchParams.get("list")) {
            const sheets = await listSheets();
            return Response.json(
              { sheets },
              { headers: { "Cache-Control": "public, max-age=300" } },
            );
          }

          // ?gid=NNN → CSV daquela aba (só dígitos, sem SSRF: host/planilha fixos)
          const gidRaw = url.searchParams.get("gid") || "";
          const gid = /^\d+$/.test(gidRaw) ? gidRaw : "";
          const csvUrl = gid
            ? `${SHEET_BASE}/pub?gid=${gid}&single=true&output=csv`
            : `${SHEET_BASE}/pub?output=csv`;

          const resp = await fetch(csvUrl, {
            headers: { "User-Agent": "WorkFlowArk/1.0" },
          });
          if (!resp.ok) {
            return Response.json(
              { error: "Não foi possível ler a planilha agora." },
              { status: 502 },
            );
          }
          const csv = await resp.text();
          return new Response(csv, {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Cache-Control": "public, max-age=60",
            },
          });
        } catch {
          return Response.json(
            { error: "Falha ao buscar a planilha." },
            { status: 500 },
          );
        }
      },
    },
  },
});
