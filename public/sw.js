// Service worker do WorkFlowArk (PWA).
// Estratégia segura: só faz cache-first de ASSETS estáticos (imagens, fontes, css).
// Navegações e API vão sempre pela rede -> nunca serve build/dados velhos.
const CACHE = "wfa-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  if (!/\.(png|jpg|jpeg|svg|webp|ico|gif|woff2?|ttf|otf)$/i.test(url.pathname)) return;
  e.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && res.status === 200) c.put(req, res.clone());
      return res;
    }).catch(() => fetch(req))
  );
});
