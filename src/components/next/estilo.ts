// ARK Glass (escuro) e ARK Soft (claro) da rota /next. Tokens proprios, escopados em .nx,
// pra nao brigar com o tema do shadcn nem com o CSS do app legado. Vidro so em navegacao,
// topo e paineis; listas e tabelas ficam opacas e legiveis. Fallback sem backdrop-filter e
// sem movimento respeitando prefers-reduced-transparency / prefers-reduced-motion.
export const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&display=swap");
.nx h1,.nx h2,.nx h3,.nx .nx-title{font-family:Sora,Inter,system-ui,sans-serif;letter-spacing:-.02em}
.nx{--yel:#FFC700;--ink:#F5F5F7;--ink2:rgba(245,245,247,.68);--ink3:rgba(245,245,247,.42);
  --bg:#0F0E0C;--glow:rgba(255,199,0,.12);--glass:rgba(255,255,255,.05);--glass2:rgba(255,255,255,.085);
  --line:rgba(255,255,255,.08);--line2:rgba(255,255,255,.16);--card:rgba(25,24,21,.78);--solid:#191815;
  --red:#ff6b6b;--green:#4ade80;--blue:#60a5fa;--pink:#f472b6;--vio:#a78bfa;
  --sh:0 18px 50px rgba(0,0,0,.45);--r:20px;--rs:12px;
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  color:var(--ink);background:var(--bg);min-height:100vh;-webkit-font-smoothing:antialiased;
  font-size:14px;line-height:1.45}
.nx.claro{--ink:#111114;--ink2:rgba(17,17,20,.66);--ink3:rgba(17,17,20,.42);--bg:#ECECEF;
  --glow:rgba(255,199,0,.28);--glass:rgba(255,255,255,.55);--glass2:rgba(255,255,255,.8);
  --line:rgba(17,17,20,.08);--line2:rgba(17,17,20,.16);--card:rgba(255,255,255,.78);--solid:#fff;
  --red:#d9403e;--green:#1f9d55;--blue:#2f6fdb;--pink:#d34a8e;--vio:#6d4fd0;--sh:0 14px 40px rgba(0,0,0,.10)}
.nx *{box-sizing:border-box}
.nx a{color:inherit;text-decoration:none}
.nx button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}
.nx ::selection{background:var(--yel);color:#111}

/* fundo: brilho amarelo difuso, fixo, atras de tudo */
.nx-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.nx-bg i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.9}
.nx-bg i:nth-child(1){width:52vw;height:52vw;left:-14vw;top:-20vw;background:var(--glow)}
.nx-bg i:nth-child(2){width:38vw;height:38vw;right:-10vw;bottom:-14vw;background:rgba(255,255,255,.05)}
.nx.claro .nx-bg i:nth-child(2){background:rgba(255,199,0,.14)}
.nx-bg:after{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:26px 26px;opacity:.5}
.nx.claro .nx-bg:after{background-image:radial-gradient(rgba(0,0,0,.05) 1px,transparent 1px)}

/* vidro */
.nx .glass{background:var(--glass);border:1px solid var(--line);backdrop-filter:blur(22px) saturate(1.4);
  -webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),var(--sh)}
.nx.claro .glass{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),var(--sh)}
@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){.nx .glass{background:var(--card)}}
@media (prefers-reduced-transparency:reduce){.nx .glass{backdrop-filter:none;-webkit-backdrop-filter:none;background:var(--solid)}}

/* shell */
.nx-shell{position:relative;z-index:1;display:grid;grid-template-columns:248px 1fr;min-height:100vh}
.nx-side{position:sticky;top:0;height:100vh;padding:14px 12px;display:flex;flex-direction:column;gap:4px;
  border-right:1px solid var(--line);border-radius:0;overflow:auto}
.nx-brand{display:flex;align-items:center;gap:10px;padding:8px 8px 14px}
.nx-brand img{width:34px;height:34px;border-radius:10px;object-fit:cover}
.nx-brand b{font-weight:700;letter-spacing:-.01em;font-size:15px}
.nx-brand small{display:block;color:var(--ink3);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase}
.nx-sec{padding:12px 10px 4px;color:var(--ink3);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase}
.nx-it{position:relative;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;color:var(--ink2);
  min-height:40px;transition:background .18s,color .18s;width:100%;text-align:left}
.nx-it:hover{background:var(--glass2);color:var(--ink)}
.nx-it.on{background:var(--glass2);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line2)}
.nx-it.on:before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:3px;background:var(--yel)}
.nx-it svg{flex:none;opacity:.85}
.nx-it .n{margin-left:auto;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;padding:2px 7px;border-radius:999px;background:var(--glass2);color:var(--ink2)}
.nx-it .n.hot{background:var(--yel);color:#111;font-weight:700}
.nx-foot{margin-top:auto;padding:10px 8px 0;color:var(--ink3);font-size:11px}

.nx-main{min-width:0;padding:16px 22px 80px}
.nx-top{position:sticky;top:12px;z-index:5;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:16px;margin-bottom:18px}
.nx .burger{display:none}
.nx-search{flex:1;display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--glass);border:1px solid var(--line);min-width:0}
.nx-search input{flex:1;background:none;border:0;outline:0;color:var(--ink);font:inherit;min-width:0}
.nx-search input::placeholder{color:var(--ink3)}
.nx-search kbd{font:600 10px ui-monospace,monospace;color:var(--ink3);border:1px solid var(--line2);border-radius:6px;padding:2px 5px}
.nx-ico{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--glass);border:1px solid var(--line);color:var(--ink2);position:relative}
.nx-ico:hover{color:var(--ink);background:var(--glass2)}
.nx-ico .dot{position:absolute;top:8px;right:8px;width:7px;height:7px;border-radius:50%;background:var(--yel)}
.nx-av{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--yel);color:#111;font-weight:800;font-size:13px}
.nx-sync{font-size:11.5px;color:var(--ink3);white-space:nowrap}
.nx-sync.err{color:var(--yel)}

/* tipografia de pagina */
.nx-h1{font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1;margin:6px 0 2px}
.nx-h1 em{font-style:normal;color:var(--ink3);font-weight:300}
.nx-sub{color:var(--ink2);font-size:13.5px;margin:0 0 18px}
.nx-h2{font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);margin:0}
.nx-h3{font-size:15px;font-weight:600;letter-spacing:-.01em;margin:0}
.nx-mute{color:var(--ink3)}
.nx-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}

/* grade e cartoes */
.nx-grid{display:grid;gap:14px;grid-template-columns:repeat(12,1fr)}
.nx-card{border-radius:var(--r);padding:18px;min-width:0;display:flex;flex-direction:column;gap:12px}
.nx-card.solid{background:var(--card);border:1px solid var(--line);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.nx-card-h{display:flex;align-items:center;gap:8px}
.nx-card-h .sp{flex:1}
.nx-link{font-size:12px;color:var(--ink2);display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px}
.nx-link:hover{background:var(--glass2);color:var(--ink)}
.c12{grid-column:span 12}.c8{grid-column:span 8}.c6{grid-column:span 6}.c4{grid-column:span 4}.c3{grid-column:span 3}

/* KPI */
.nx-kpi{display:flex;flex-direction:column;gap:6px;padding:16px 18px;border-radius:var(--r);min-height:112px;position:relative;overflow:hidden}
.nx-kpi .l{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
.nx-kpi .v{font-size:38px;font-weight:300;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.nx-kpi .v small{font-size:14px;color:var(--ink3);margin-left:6px;font-weight:400}
.nx-kpi .d{font-size:12px;color:var(--ink3)}
.nx-kpi.hot{background:linear-gradient(135deg,rgba(255,199,0,.28),rgba(255,199,0,.06)),var(--glass)}
.nx-kpi.warn .v{color:var(--red)}
.nx-kpi.ok .v{color:var(--green)}
.nx-kpi button.go{position:absolute;right:12px;top:12px;width:28px;height:28px;border-radius:50%;background:var(--glass2);display:grid;place-items:center;color:var(--ink2)}
.nx-kpi button.go:hover{background:var(--yel);color:#111}

/* listas */
.nx-row{display:flex;align-items:center;gap:10px;padding:9px 6px;border-top:1px solid var(--line);min-height:44px}
.nx-row:first-child{border-top:0}
.nx-row .dot{width:8px;height:8px;border-radius:50%;flex:none}
.nx-row .t{flex:1;min-width:0}
.nx-row .t b{display:block;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-row .t span{display:block;font-size:11.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nx-row .m{font-size:11px;color:var(--ink3);white-space:nowrap;font-variant-numeric:tabular-nums}
.nx-row .m.late{color:var(--red);font-weight:600}
.nx-row.clk{cursor:pointer;border-radius:10px}
.nx-row.clk:hover{background:var(--glass2)}
.nx-chk{width:22px;height:22px;border-radius:50%;border:1.5px solid var(--line2);display:grid;place-items:center;flex:none;color:transparent;transition:all .15s}
.nx-chk:hover{border-color:var(--yel);color:var(--yel)}
.nx-chk.busy{opacity:.5;pointer-events:none}
.nx-pill{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600;background:var(--glass2);border:1px solid var(--line);color:var(--ink2);white-space:nowrap}
.nx-pill.yel{background:var(--yel);color:#111;border-color:transparent}
.nx-pill i{width:6px;height:6px;border-radius:50%;background:currentColor}
.nx-empty{padding:22px 10px;text-align:center;color:var(--ink3);font-size:13px}
.nx-empty b{display:block;color:var(--ink2);font-weight:600;margin-bottom:2px}
.nx-btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:12px;background:var(--yel);color:#111;font-weight:700;font-size:13px;min-height:40px}
.nx-btn:hover{filter:brightness(1.05)}
.nx-btn.ghost{background:var(--glass);border:1px solid var(--line);color:var(--ink)}
.nx-btn.ghost:hover{background:var(--glass2)}
.nx-btn:disabled{opacity:.5;cursor:default}

/* tabela */
.nx-table{width:100%;border-collapse:collapse;font-size:13px}
.nx-table th{text-align:left;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);padding:8px 8px;border-bottom:1px solid var(--line);font-weight:600}
.nx-table td{padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
.nx-table tr:last-child td{border-bottom:0}
.nx-table td.num{text-align:right;font-variant-numeric:tabular-nums}
.nx-table-wrap{overflow:auto;margin:0 -6px}

/* barras simples */
.nx-bar{height:6px;border-radius:999px;background:var(--glass2);overflow:hidden}
.nx-bar i{display:block;height:100%;border-radius:999px;background:var(--yel)}
.nx-cols{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.nx-col{padding:12px;border-radius:14px;background:var(--glass);border:1px solid var(--line);min-height:90px}
.nx-col .h{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--ink2);margin-bottom:8px}
.nx-col .h i{width:8px;height:8px;border-radius:50%}
.nx-col .h b{margin-left:auto;font-family:ui-monospace,monospace;font-size:11px}
.nx-col .it{font-size:12.5px;padding:6px 8px;border-radius:8px;background:var(--card);border:1px solid var(--line);margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* estados */
.nx-skel{border-radius:var(--r);background:linear-gradient(90deg,var(--glass),var(--glass2),var(--glass));background-size:200% 100%;animation:nxsk 1.2s linear infinite;min-height:112px}
@keyframes nxsk{to{background-position:-200% 0}}
.nx-alert{padding:12px 14px;border-radius:14px;border:1px solid var(--line2);background:var(--glass);display:flex;gap:10px;align-items:center;font-size:13px}
.nx-alert.err{border-color:rgba(255,107,107,.5)}
.nx-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:50;padding:10px 16px;border-radius:12px;background:var(--solid);border:1px solid var(--line2);box-shadow:var(--sh);font-size:13px;max-width:90vw}

/* movimento */
.nx-in{animation:nxin .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes nxin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.nx-in,.nx-skel{animation:none}.nx *{transition:none!important}}

/* celular: menu lateral comeca escondido (regra 6 do CLAUDE.md), abre pelo hamburger */
.nx-backdrop{display:none}
@media (max-width:900px){
  .nx-shell{grid-template-columns:1fr}
  .nx-side{position:fixed;left:0;top:0;bottom:0;width:min(84vw,300px);z-index:40;transform:translateX(-105%);transition:transform .26s cubic-bezier(.2,.8,.2,1);border-right:1px solid var(--line2);background:var(--solid)}
  .nx-side.open{transform:none}
  .nx-backdrop{display:block;position:fixed;inset:0;z-index:39;background:rgba(0,0,0,.45);opacity:0;pointer-events:none;transition:opacity .2s}
  .nx-backdrop.show{opacity:1;pointer-events:auto}
  .nx-main{padding:10px 12px 90px}
  .nx-top{top:8px;margin-bottom:12px}
  .nx .burger{display:grid}
  .nx-search kbd,.nx-sync{display:none}
  .nx-h1{font-size:24px}
  .nx-kpi .v{font-size:30px}
  .c8,.c6,.c4,.c3{grid-column:span 12}
  .c3.half,.c6.half{grid-column:span 6}
  .nx-grid{gap:10px}
  .nx-card{padding:14px}
}
`;
