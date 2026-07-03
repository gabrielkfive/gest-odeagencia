// ArkOS: tokens de design e física de animação (base Figma v2 + fluidez da ref Apple AirPods Max)

/* Design tokens (ver docs/ARKOS-V2-TOKENS.md) */
export const CSS = `
html:has(.arkos),body:has(.arkos){background:#E9EBF3; margin:0}
.arkos{
  --bg:#E9EBF3; --card:#FFFFFF; --ink:#16181D; --mute:#565B69; --dim:#8B90A0;
  --black:#131316; --black2:#1C1C21;
  --yel:#FFC700; --yel-soft:rgba(255,199,0,.14);
  --ok:#3DD9A4; --ok-ink:#0F8A61; --bad:#F4645C; --hold:#FFC145;
  --hair:rgba(22,24,29,.07); --hair2:rgba(22,24,29,.13);
  --w06:rgba(255,255,255,.06); --w12:rgba(255,255,255,.12); --w-hair:rgba(255,255,255,.10);
  --sans:'Inter',system-ui,sans-serif; --disp:'Sora',var(--sans); --mono:'JetBrains Mono',monospace;
  background:var(--bg); color:var(--ink); font-family:var(--sans);
  min-height:100vh; overflow:hidden; position:relative;
  -webkit-font-smoothing:antialiased;
}
.arkos *{box-sizing:border-box; margin:0}
.arkos ::selection{background:var(--yel-soft)}
.arkos .mono{font-family:var(--mono)}
.arkos button{cursor:pointer; font-family:var(--sans)}
.arkos :focus-visible{outline:2px solid var(--yel); outline-offset:2px; border-radius:10px}
.arkos ::-webkit-scrollbar{width:6px}
.arkos ::-webkit-scrollbar-thumb{background:var(--hair2); border-radius:8px}
.arkos ::-webkit-scrollbar-track{background:transparent}

/* shell: sidebar branca + palco, tudo dentro do fundo lavanda (ref Vision) */
.arkos .shell{display:grid; grid-template-columns:236px minmax(0,1fr); gap:16px;
  height:100vh; padding:16px; position:relative; z-index:1}
@media (max-width:1100px){.arkos .shell{grid-template-columns:76px minmax(0,1fr)}
  .arkos .side-label,.arkos .side-sec,.arkos .side-foot{display:none}
  .arkos .side-it{justify-content:center; padding:11px 0}}

/* sidebar: grafite escuro com luz âmbar no ativo (formato do print do ARK OS), em contraste
   com o palco claro. A profundidade vem da sombra longa e do arredondado forte. */
.arkos .side{background:linear-gradient(180deg,#1C1C1E,#131316); border-radius:26px; padding:22px 14px;
  display:flex; flex-direction:column; gap:2px;
  box-shadow:0 1px 0 rgba(255,255,255,.07) inset, 0 34px 64px -28px rgba(10,10,14,.55)}
.arkos .side-logo{display:flex; align-items:center; gap:10px; padding:2px 10px 22px}
.arkos .side-logo .orb{width:30px; height:30px; border-radius:10px; display:grid; place-items:center;
  color:#131316; background:linear-gradient(135deg,#FFD84D,#E9AE00)}
.arkos .side-logo b{font-family:var(--disp); font-weight:800; font-size:15px; letter-spacing:.04em; color:#F5F4F0}
.arkos .side-sec{font-size:10px; letter-spacing:.18em; color:#777782; padding:14px 12px 10px;
  text-transform:uppercase; font-family:var(--mono)}
.arkos .side-it{position:relative; display:flex; align-items:center; gap:11px; padding:11px 14px;
  border-radius:12px; font-size:13px; font-weight:500; color:#9C9CA6; border:0; background:none;
  width:100%; text-align:left; font-family:var(--sans); transition:color .18s; text-decoration:none}
.arkos .side-it:hover{color:#F5F4F0}
.arkos .side-it.on{color:#F5F4F0}
.arkos .side-pill{position:absolute; inset:0; border-radius:12px; background:rgba(255,255,255,.08);
  box-shadow:0 1px 0 rgba(255,255,255,.08) inset}
.arkos .side-glow{position:absolute; left:0; top:50%; width:2px; height:16px; transform:translateY(-50%);
  border-radius:2px; background:var(--yel); box-shadow:0 0 12px var(--yel)}
.arkos .side-ic{position:relative; z-index:1; display:grid; place-items:center}
.arkos .side-label{position:relative; z-index:1; white-space:nowrap}
.arkos .side-badge{position:relative; z-index:1; margin-left:auto; min-width:20px; height:20px;
  border-radius:99px; background:var(--bad); color:#fff; font-size:10.5px; font-weight:600;
  display:grid; place-items:center; padding:0 6px}
.arkos .side-foot{padding:12px 12px 4px; font-size:10.5px; color:#6E6E76}

/* palco */
.arkos .main{min-width:0; overflow-y:auto; padding:6px 8px 8px 2px}
.arkos .stage{max-width:1180px; margin:0 auto; display:flex; flex-direction:column; gap:16px}

/* barra superior: busca larga + pílula de data + sino + avatar (ref Vision) */
.arkos .top{display:flex; align-items:center; gap:12px}
.arkos .cmd{flex:1; display:flex; align-items:center; gap:12px; background:var(--card);
  border-radius:16px; padding:0 8px 0 18px; height:52px;
  box-shadow:0 1px 2px rgba(22,24,29,.04); transition:box-shadow .25s}
.arkos .cmd:focus-within{box-shadow:0 0 0 2px var(--yel-soft), 0 10px 30px -16px rgba(255,199,0,.5)}
.arkos .cmd input{flex:1; background:none; border:0; outline:0; color:var(--ink);
  font-size:13.5px; font-family:var(--sans); min-width:0}
.arkos .cmd input::placeholder{color:var(--dim)}
.arkos .cmd .go{border:0; border-radius:12px; padding:9px 16px; font-size:12px; font-weight:600;
  color:#131316; white-space:nowrap; background:linear-gradient(180deg,#FFD84D,#E9AE00);
  box-shadow:0 8px 20px -8px rgba(255,199,0,.55); transition:transform .18s}
.arkos .cmd .go:hover{transform:translateY(-1px)}
.arkos .cmd .go:active{transform:scale(.97)}
.arkos .date-pill{display:flex; align-items:center; height:52px; padding:0 20px;
  background:var(--card); border-radius:16px; font-size:12.5px; color:var(--mute); white-space:nowrap;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .icon-btn{width:52px; height:52px; border-radius:16px; border:0; background:var(--card);
  display:grid; place-items:center; color:var(--ink); position:relative;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .icon-btn .ping{position:absolute; top:15px; right:15px; width:7px; height:7px;
  border-radius:50%; background:var(--bad); border:1.5px solid #fff}
.arkos .avatar-top{width:52px; height:52px; border-radius:16px; display:grid; place-items:center;
  font-family:var(--disp); font-weight:700; font-size:14px; color:#131316;
  background:linear-gradient(135deg,#FFD84D,#E9AE00); box-shadow:0 1px 2px rgba(22,24,29,.04)}
@media (max-width:900px){.arkos .date-pill{display:none}}

/* fileira herói: card preto + meta (ref Vision) */
.arkos .hero-row{display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:16px}
@media (max-width:1180px){.arkos .hero-row{grid-template-columns:1fr}}
.arkos .hero{position:relative; overflow:hidden; border-radius:24px; padding:34px 36px 30px;
  background:radial-gradient(120% 160% at 85% -20%, #33333B 0%, #131316 55%);
  color:#fff; box-shadow:0 30px 60px -30px rgba(19,19,22,.55)}
.arkos .hero .sphere{position:absolute; top:-70px; right:40px; width:260px; height:260px;
  border-radius:50%; pointer-events:none;
  background:radial-gradient(circle at 32% 28%, #4A4A54 0%, #202024 42%, #0C0C0E 78%);
  box-shadow:inset -20px -28px 60px rgba(0,0,0,.6), inset 14px 18px 40px rgba(255,255,255,.08),
  0 40px 80px -30px rgba(0,0,0,.8)}
.arkos .hero .eyebrow{font-size:12.5px; color:rgba(255,255,255,.68); position:relative}
.arkos .hero h1{font-family:var(--disp); font-size:clamp(28px,3.2vw,40px); font-weight:700;
  letter-spacing:-.03em; line-height:1.1; margin-top:8px; position:relative}
.arkos .hero-cards{display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:26px; position:relative}
@media (max-width:640px){.arkos .hero-cards{grid-template-columns:1fr}}
.arkos .hcard{border-radius:16px; padding:18px 20px 16px; background:var(--w06);
  border:1px solid var(--w-hair); backdrop-filter:blur(6px)}
.arkos .hcard .hc-top{display:flex; align-items:center; gap:10px}
.arkos .hcard .hc-ic{width:30px; height:30px; border-radius:50%; display:grid; place-items:center;
  background:var(--w12); color:#fff}
.arkos .hcard .hc-l{margin-left:auto; font-size:10.5px; letter-spacing:.16em; text-transform:uppercase;
  color:rgba(255,255,255,.72)}
.arkos .hcard .hc-n{font-family:var(--disp); font-size:34px; font-weight:700; letter-spacing:-.02em;
  margin-top:12px; font-variant-numeric:tabular-nums}
.arkos .hcard .hc-s{font-size:11.5px; color:rgba(255,255,255,.62); margin-top:6px; text-align:right}

/* meta: donut amarelo sobre preto (ref Vision, accent ARK) */
.arkos .goal{position:relative; overflow:hidden; border-radius:24px; padding:26px 26px 24px;
  background:radial-gradient(130% 150% at 15% 110%, #2A2A31 0%, #131316 60%);
  color:#fff; display:flex; flex-direction:column; align-items:center;
  box-shadow:0 30px 60px -30px rgba(19,19,22,.55)}
.arkos .goal .gt{font-family:var(--disp); font-size:15px; font-weight:600; align-self:flex-start}
.arkos .goal .donut-wrap{position:relative; margin-top:18px}
.arkos .goal .donut-pct{position:absolute; inset:0; display:grid; place-items:center;
  font-family:var(--disp); font-size:30px; font-weight:700; letter-spacing:-.02em}
.arkos .goal .gv{font-family:var(--disp); font-size:22px; font-weight:700; margin-top:16px;
  font-variant-numeric:tabular-nums}
.arkos .goal .gs{font-size:11.5px; color:rgba(255,255,255,.68); margin-top:6px; text-align:center}
.arkos .goal .gbtn{margin-top:16px; border:0; border-radius:12px; background:#fff; color:#131316;
  font-size:12.5px; font-weight:600; padding:11px 22px; text-decoration:none; transition:transform .18s}
.arkos .goal .gbtn:hover{transform:translateY(-1px)}

/* fileira de conteúdo: tabela + coluna direita */
.arkos .body-row{display:grid; grid-template-columns:minmax(0,1fr) 340px; gap:16px; align-items:start}
@media (max-width:1180px){.arkos .body-row{grid-template-columns:1fr}}
.arkos .panel{background:var(--card); border-radius:24px; padding:22px 24px;
  box-shadow:0 1px 2px rgba(22,24,29,.04), 0 16px 40px -30px rgba(22,24,29,.16)}
.arkos .panel .pt{font-family:var(--disp); font-size:15px; font-weight:600;
  display:flex; align-items:center; justify-content:space-between}
.arkos .panel .pt a{font-size:11.5px; color:var(--dim); text-decoration:none; font-family:var(--sans); font-weight:500}
.arkos .panel .pt a:hover{color:var(--ink)}

/* tabela de tarefas (ref Vision "Latest Transaction") */
.arkos table.tt{width:100%; border-collapse:collapse; margin-top:14px}
.arkos .tt th{font-size:11px; font-weight:500; color:var(--dim); text-align:left;
  padding:8px 10px; border-bottom:1px solid var(--hair)}
.arkos .tt td{font-size:13px; padding:13px 10px; border-bottom:1px solid var(--hair); vertical-align:middle}
.arkos .tt tr:last-child td{border-bottom:0}
.arkos .tt .t-name{font-weight:600; color:var(--ink); max-width:340px; white-space:nowrap;
  overflow:hidden; text-overflow:ellipsis}
.arkos .tt .t-cli{color:var(--mute)}
.arkos .chip{display:inline-block; font-size:10.5px; font-weight:600;
  border-radius:6px; padding:4px 10px; white-space:nowrap}
.arkos .chip.ok{background:rgba(61,217,164,.16); color:#0B7A55}
.arkos .chip.hold{background:rgba(255,193,69,.22); color:#8A6200}
.arkos .chip.bad{background:rgba(244,100,92,.15); color:#C2372F}
.arkos .tbtn{border:0; border-radius:8px; background:var(--black); color:#fff; font-size:11px;
  font-weight:500; padding:7px 14px; text-decoration:none; display:inline-block}
.arkos .tbtn:hover{background:var(--black2)}
@media (max-width:760px){.arkos .tt .hide-sm{display:none}}

/* aprovações (ref Vision Pro "Waiting For Approval" + "Sales History") */
.arkos .ap-it{display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--hair)}
.arkos .ap-it:last-child{border-bottom:0}
.arkos .ap-ic{width:40px; height:40px; border-radius:14px; display:grid; place-items:center;
  color:#131316; flex-shrink:0}
.arkos .ap-tx{flex:1; min-width:0}
.arkos .ap-t{font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
.arkos .ap-s{font-size:11px; color:var(--mute); margin-top:2px; white-space:nowrap; overflow:hidden;
  text-overflow:ellipsis}
.arkos .ap-chip{border-radius:8px; background:var(--black); color:#fff; font-size:11px; font-weight:600;
  padding:6px 12px; white-space:nowrap; border:0; text-decoration:none}
.arkos .ap-chip:hover{background:var(--black2)}

/* feed de operações */
.arkos .feed{display:flex; flex-direction:column}
.arkos .feed-h{display:flex; align-items:center; gap:9px}
.arkos .live{width:7px; height:7px; border-radius:50%; background:var(--ok); box-shadow:0 0 10px var(--ok)}
.arkos .op{display:flex; gap:11px; padding:11px 0; border-bottom:1px solid var(--hair); align-items:flex-start}
.arkos .op:last-child{border-bottom:0}
.arkos .op-dot{width:7px; height:7px; border-radius:50%; background:var(--yel); margin-top:5px; flex-shrink:0;
  box-shadow:0 0 8px rgba(255,199,0,.5)}
.arkos .op .who{font-size:10px; letter-spacing:.12em; color:var(--dim); font-weight:600}
.arkos .op .what{font-size:12px; color:var(--ink); margin-top:3px; line-height:1.5}
.arkos .op .when{font-size:10.5px; color:var(--dim); margin-top:3px; font-family:var(--mono)}

/* KPIs claros com gráfico menta (ref SaaS UI Kit) */
.arkos .kpis{display:grid; grid-template-columns:repeat(4,1fr); gap:16px}
@media (max-width:1180px){.arkos .kpis{grid-template-columns:repeat(2,1fr)}}
.arkos .kpi{background:var(--card); border-radius:20px; padding:18px 20px 14px;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .kpi .l{font-size:11.5px; color:var(--mute)}
.arkos .kpi .row{display:flex; align-items:flex-end; justify-content:space-between; gap:10px; margin-top:8px}
.arkos .kpi .n{font-family:var(--disp); font-size:30px; font-weight:700; letter-spacing:-.03em;
  line-height:1; font-variant-numeric:tabular-nums}
.arkos .kpi .delta{margin-top:8px; font-size:10.5px; color:var(--mute)}
.arkos .kpi .delta b{color:var(--ok-ink); font-weight:600}

/* sociedade de agentes: cards brancos, expansão em vidro (ref Vision Pro) */
.arkos .sec-t{display:flex; align-items:baseline; gap:12px; margin-top:6px}
.arkos .sec-t h2{font-family:var(--disp); font-size:15px; font-weight:600}
.arkos .sec-t span{font-size:11px; color:var(--dim)}
.arkos .agents{display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px}
.arkos .ag{background:var(--card); border-radius:20px; padding:18px 18px 16px; cursor:pointer;
  box-shadow:0 1px 2px rgba(22,24,29,.04); transition:box-shadow .25s}
.arkos .ag:hover{box-shadow:0 18px 40px -24px rgba(22,24,29,.3)}
.arkos .ag-top{display:flex; align-items:center; gap:12px}
.arkos .orb{width:40px; height:40px; border-radius:14px; display:grid; place-items:center;
  background:var(--bg); color:var(--mute)}
.arkos .ag.online .orb{color:#131316; background:linear-gradient(135deg,#FFD84D,#E9AE00)}
.arkos .ag-name{font-family:var(--disp); font-size:13.5px; font-weight:600; letter-spacing:-.01em}
.arkos .ag-role{font-size:11px; color:var(--dim); margin-top:1px}
.arkos .ag-st{margin-top:14px; font-size:11px; color:var(--mute);
  display:flex; align-items:center; gap:8px; min-height:15px}
.arkos .ag-st .dot{width:5px; height:5px; border-radius:50%; box-shadow:0 0 9px currentColor}

/* expandido: painel de vidro escuro (ref Vision Pro HR) */
.arkos .veil{position:fixed; inset:0; z-index:30; background:rgba(10,10,14,.5);
  backdrop-filter:blur(16px) saturate(1.2)}
.arkos .ag-x-wrap{position:fixed; inset:0; z-index:31; display:grid; place-items:center; pointer-events:none}
.arkos .ag-x{position:relative; pointer-events:auto; width:min(560px,92vw);
  padding:30px; border-radius:24px;
  background:rgba(28,28,33,.78); backdrop-filter:blur(28px) saturate(1.4);
  border:1px solid var(--w-hair); color:#fff;
  box-shadow:0 50px 100px -40px rgba(0,0,0,.7)}
.arkos .ag-x .ag-name{color:#fff}
.arkos .ag-x .ag-role{color:rgba(255,255,255,.55)}
.arkos .ag-x .orb{background:var(--w12); color:#fff}
.arkos .ag-x .close{position:absolute; top:18px; right:18px; background:var(--w12); border:0;
  color:#fff; width:30px; height:30px; border-radius:9px; display:grid; place-items:center}
.arkos .ag-x .desc{margin-top:18px; font-size:13.5px; color:rgba(255,255,255,.7); line-height:1.65}
.arkos .ag-x .hist{margin-top:22px; display:flex; flex-direction:column; gap:10px}
.arkos .ag-x .hist .h-it{display:flex; gap:11px; font-size:12.5px; color:rgba(255,255,255,.65); align-items:baseline}
.arkos .ag-x .hist .h-t{font-family:var(--mono); font-size:10px; color:rgba(255,255,255,.4); min-width:44px}

/* boot: tela acordando */
.arkos .boot{position:fixed; inset:0; background:#0B0B0D; z-index:50; display:grid; place-items:center}
.arkos .boot-mark{font-family:var(--disp); font-weight:800; font-size:clamp(44px,8vw,84px);
  letter-spacing:.08em; display:flex;
  background:linear-gradient(180deg,#FFF 30%, rgba(255,255,255,.4));
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .boot-mark .os{background:linear-gradient(180deg,var(--yel),#D9A800);
  -webkit-background-clip:text; background-clip:text; color:transparent}
.arkos .boot-lines{position:absolute; bottom:14vh; left:50%; transform:translateX(-50%);
  font-family:var(--mono); font-size:11.5px; color:#8B8B95; display:flex;
  flex-direction:column; gap:7px; align-items:center}
.arkos .boot-lines .ok{color:var(--ok)}
.arkos .demo-tag{font-size:9.5px; letter-spacing:.18em; color:#8A6200;
  background:var(--yel-soft); border-radius:99px; padding:5px 12px; white-space:nowrap}

/* vistas internas: linguagem Apple (tipo display, um assunto por bloco, reveal suave de 0.6s) */
.arkos .view-hero{padding:54px 6px 14px}
.arkos .view-eyebrow{font-size:12px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); font-weight:600}
.arkos .view-h1{font-family:var(--disp); font-weight:800; letter-spacing:-.035em; line-height:1.04;
  font-size:clamp(38px,4.6vw,62px); margin-top:12px}
.arkos .view-h1 .soft{color:var(--dim)}
.arkos .view-lead{font-size:16px; line-height:1.55; color:var(--mute); max-width:600px; margin-top:16px}
.arkos .stat-strip{display:grid; grid-template-columns:repeat(3,1fr); gap:16px}
@media (max-width:900px){.arkos .stat-strip{grid-template-columns:1fr}}
.arkos .stat-big{background:var(--card); border-radius:24px; padding:24px 26px;
  box-shadow:0 1px 2px rgba(22,24,29,.04)}
.arkos .stat-big .n{font-family:var(--disp); font-size:46px; font-weight:800; letter-spacing:-.03em;
  line-height:1; font-variant-numeric:tabular-nums}
.arkos .stat-big .l{font-size:12.5px; color:var(--mute); margin-top:10px}
.arkos .stat-big.dark{background:radial-gradient(120% 150% at 80% -20%, #2A2A31 0%, #131316 60%); color:#fff}
.arkos .stat-big.dark .l{color:rgba(255,255,255,.62)}
.arkos .group-h{font-family:var(--disp); font-size:23px; font-weight:700; letter-spacing:-.02em}
.arkos .group-h .count{color:var(--dim); font-weight:600; font-size:15px; margin-left:10px}
.arkos .empty-view{padding:110px 6px 140px; text-align:center}
.arkos .empty-view .view-lead{margin:16px auto 0}

/* compositor de nova tarefa (Operações) */
.arkos .composer{display:flex; gap:10px; align-items:center; background:var(--card);
  border-radius:18px; padding:10px 10px 10px 18px;
  box-shadow:0 1px 2px rgba(22,24,29,.04); transition:box-shadow .25s}
.arkos .composer:focus-within{box-shadow:0 0 0 2px var(--yel-soft), 0 10px 30px -16px rgba(255,199,0,.5)}
.arkos .composer .c-title{flex:1; min-width:0; border:0; outline:0; background:none;
  font-size:13.5px; font-family:var(--sans); color:var(--ink)}
.arkos .composer .c-title::placeholder{color:var(--dim)}
.arkos .composer .c-sel,.arkos .composer .c-date{border:0; outline:0; background:var(--bg);
  border-radius:10px; padding:9px 12px; font-size:12px; font-family:var(--sans); color:var(--mute)}
.arkos .composer .c-add{border:0; border-radius:12px; padding:10px 16px; font-size:12px; font-weight:600;
  color:#131316; background:linear-gradient(180deg,#FFD84D,#E9AE00);
  box-shadow:0 8px 20px -8px rgba(255,199,0,.55); transition:transform .18s, opacity .18s}
.arkos .composer .c-add:hover{transform:translateY(-1px)}
.arkos .composer .c-add:disabled{opacity:.45; transform:none; cursor:default}
@media (max-width:760px){.arkos .composer{flex-wrap:wrap}
  .arkos .composer .c-title{flex-basis:100%}}

/* cards de proposta (Aprovações) */
.arkos .prop .prop-head{display:flex; align-items:center; gap:8px}
.arkos .prop .prop-cli{font-size:11px; font-weight:700; color:#131316; border-radius:8px; padding:4px 10px}
.arkos .prop .prop-fmt{font-size:11px; color:var(--dim); border:1px solid var(--hair2); border-radius:8px; padding:3px 10px}
.arkos .prop .prop-tema{font-family:var(--disp); font-size:21px; font-weight:700; letter-spacing:-.02em; margin-top:14px}
.arkos .prop .prop-gancho{font-size:14px; color:var(--mute); font-style:italic; margin-top:8px}
.arkos .prop .prop-legenda{font-size:13px; color:var(--mute); line-height:1.6; margin-top:10px; cursor:pointer;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.arkos .prop .prop-legenda.aberta{-webkit-line-clamp:unset}
.arkos .prop .prop-roteiro{font-size:13px; color:var(--mute); line-height:1.6; margin-top:10px}
.arkos .prop .prop-roteiro b{color:var(--ink)}
.arkos .prop .prop-acts{display:flex; gap:10px; margin-top:18px}
.arkos .btn-aprovar{border:0; border-radius:12px; background:var(--black); color:#fff; font-size:12.5px;
  font-weight:600; padding:11px 22px; transition:transform .18s}
.arkos .btn-aprovar:hover{transform:translateY(-1px); background:var(--black2)}
.arkos .btn-recusar{border:1px solid var(--hair2); border-radius:12px; background:none; color:var(--mute);
  font-size:12.5px; font-weight:600; padding:11px 20px; transition:all .2s}
.arkos .btn-recusar:hover{color:#C2372F; border-color:rgba(244,100,92,.4); background:rgba(244,100,92,.06)}
.arkos .btn-ver{border:0; background:none; color:var(--dim); font-size:12px; font-weight:500; margin-left:auto}
.arkos .btn-ver:hover{color:var(--ink)}

/* cards de cliente (Clientes) */
.arkos .cli .cli-orb{font-family:var(--disp); font-weight:700; font-size:15px}
.arkos .cli .cli-dot{width:8px; height:8px; border-radius:50%; margin-left:auto; flex-shrink:0}
.arkos .cli .cli-meta{font-size:11.5px; color:var(--mute); margin-top:12px; line-height:1.5;
  min-height:34px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden}
.arkos .cli .cli-chips{display:flex; gap:6px; margin-top:10px}

/* check de concluir tarefa */
.arkos .tt .t-check{width:34px; padding-right:2px}
.arkos .chk{width:22px; height:22px; border-radius:50%; border:1.5px solid var(--hair2);
  background:none; display:grid; place-items:center; color:transparent;
  transition:all .2s cubic-bezier(.25,.1,.25,1)}
.arkos .chk:hover{border-color:var(--ok-ink); color:var(--ok-ink); background:rgba(61,217,164,.12);
  transform:scale(1.08)}
.arkos .chk:active{transform:scale(.92)}
`;
/* Física */
export const spring = { type: "spring" as const, stiffness: 400, damping: 34, mass: 0.8 };
export const springSoft = { type: "spring" as const, stiffness: 200, damping: 26, mass: 1.1 };
export const morph = { type: "spring" as const, stiffness: 300, damping: 30, mass: 0.9 };

/* Fluidez da ref Apple (AirPods Max): conteúdo chega ao entrar na tela, 0.6s ease-out, uma ideia por bloco */export const easeApple = [0.25, 0.1, 0.25, 1] as const;
