import { createFileRoute } from "@tanstack/react-router";

// Busca (melhor esforço) os números públicos de um perfil do Instagram pelo @.
// O Instagram bloqueia bastante robô de datacenter, então isto pode falhar: o
// gerador de propostas já cai pro preenchimento manual quando não vem nada.
// Uso: GET /api/ig/perfil?handle=fabulaodonto
//   -> { posts, seguidores, seguindo, nome, avatar }  (campos podem vir nulos)
function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

// "1.234", "12,3 mil", "1.2M" -> número inteiro aproximado
function parseCount(s: string | number | null | undefined): number | null {
  if (s == null) return null;
  if (typeof s === "number") return Math.round(s);
  let t = s.trim().toLowerCase().replace(/\./g, "").replace(",", ".");
  const mult = /mi|m\b|milh/.test(t) ? 1e6 : /mil|k/.test(t) ? 1e3 : 1;
  const n = parseFloat(t.replace(/[^\d.]/g, ""));
  if (isNaN(n)) return null;
  return Math.round(n * mult);
}

export const Route = createFileRoute("/api/ig/perfil")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const handle = (url.searchParams.get("handle") || "").replace(/[^a-zA-Z0-9._]/g, "");
        if (!handle) return json({ error: "handle vazio" }, { status: 400 });

        const headers = {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        };

        // Estratégia 1: endpoint web_profile_info (precisa do header x-ig-app-id)
        try {
          const r = await fetch(
            `https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`,
            { headers: { ...headers, "x-ig-app-id": "936619743392459" } },
          );
          if (r.ok) {
            const d: any = await r.json();
            const u = d?.data?.user;
            if (u) {
              return json({
                posts: u.edge_owner_to_timeline_media?.count ?? null,
                seguidores: u.edge_followed_by?.count ?? null,
                seguindo: u.edge_follow?.count ?? null,
                nome: u.full_name || null,
                avatar: u.profile_pic_url_hd || u.profile_pic_url || null,
                fonte: "web_profile_info",
              });
            }
          }
        } catch { /* tenta a próxima */ }

        // Estratégia 2: raspar a meta description do HTML público
        // Ex.: "228 Followers, 390 Following, 20 Posts - See Instagram photos..."
        try {
          const r = await fetch(`https://www.instagram.com/${handle}/`, { headers });
          if (r.ok) {
            const html = await r.text();
            const meta =
              html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ||
              html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ||
              "";
            const m = meta.match(/([\d.,]+[KMkm]?)\s*Followers?,\s*([\d.,]+[KMkm]?)\s*Following,\s*([\d.,]+[KMkm]?)\s*Posts?/i)
              || meta.match(/([\d.,]+[KMkm]?)\s*seguidores?,\s*([\d.,]+[KMkm]?)\s*seguindo,\s*([\d.,]+[KMkm]?)\s*publica/i);
            const avatar = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] || null;
            if (m) {
              return json({
                seguidores: parseCount(m[1]),
                seguindo: parseCount(m[2]),
                posts: parseCount(m[3]),
                nome: null,
                avatar,
                fonte: "og:description",
              });
            }
            if (avatar) return json({ posts: null, seguidores: null, seguindo: null, nome: null, avatar, fonte: "og:image" });
          }
        } catch { /* cai no erro abaixo */ }

        return json(
          { error: "Instagram não devolveu os dados (bloqueio de robô). Preencha na mão." },
          { status: 502 },
        );
      },
    },
  },
});
