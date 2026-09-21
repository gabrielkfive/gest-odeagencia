// CSS da landing pública /conheca. Vai inline num <style> pra não depender de
// pipeline de CSS nem de biblioteca nova. Prefixo "lc-" (landing conheça).
// Regras: fundo #0a0a0a, amarelo #FEEF02 nos destaques, Inter no corpo e Sora nos
// títulos, botões com 44px de altura mínima, sem rolagem horizontal em 390px,
// movimento só quando o aparelho não pede "reduzir movimento".
// Nenhuma classe começa com "ad" (adblock esconde).

export const AMARELO = "#FEEF02";
export const FUNDO = "#0a0a0a";

export const ESTILO_CONHECA = `
:root{
  --lc-bg:${FUNDO};
  --lc-bg2:#111111;
  --lc-bg3:#171717;
  --lc-linha:rgba(255,255,255,.10);
  --lc-texto:#efefef;
  --lc-texto2:#b5b5b5;
  --lc-texto3:#8a8a8a;
  --lc-amarelo:${AMARELO};
  --lc-amarelo-escuro:#c9bd00;
  --lc-erro:#ff8a8a;
  --lc-erro-bg:#2a0f0f;
  --lc-ok:#7CE0A6;
  --lc-ok-bg:#0f2a1a;
  --lc-sans:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --lc-display:'Sora','Inter',system-ui,sans-serif;
  --lc-larg:1120px;
  --lc-gutter:20px;
}
@media (prefers-reduced-motion:no-preference){
  html:has(.lc-pagina){scroll-behavior:smooth}
}
.lc-pagina{
  min-height:100vh;
  background:var(--lc-bg);
  color:var(--lc-texto);
  font-family:var(--lc-sans);
  font-size:16px;
  line-height:1.6;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}
.lc-pagina *{box-sizing:border-box;min-width:0}
.lc-pagina img{max-width:100%;height:auto;display:block}
.lc-pagina a{color:inherit}
.lc-pagina :focus-visible{outline:3px solid var(--lc-amarelo);outline-offset:3px;border-radius:6px}
.lc-wrap{width:100%;max-width:var(--lc-larg);margin:0 auto;padding:0 var(--lc-gutter)}
.lc-sec{padding:64px 0}
@media (min-width:768px){.lc-sec{padding:96px 0}}
.lc-sec + .lc-sec{border-top:1px solid var(--lc-linha)}
.lc-sec-escura{background:var(--lc-bg2)}

/* Cabeçalho */
.lc-topo{
  position:sticky;top:0;z-index:20;
  background:rgba(10,10,10,.86);
  backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
  border-bottom:1px solid var(--lc-linha);
}
.lc-topo-in{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:64px}
.lc-marca{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800;font-family:var(--lc-display);letter-spacing:-.02em;font-size:17px}
.lc-marca img{width:36px;height:36px;border-radius:10px;object-fit:contain}
.lc-marca sup{font-size:9px;color:var(--lc-amarelo);margin-left:1px}
.lc-nav{display:none;gap:22px;font-size:14px;color:var(--lc-texto2)}
.lc-nav a{text-decoration:none;padding:6px 0}
.lc-nav a:hover{color:var(--lc-texto)}
@media (min-width:900px){.lc-nav{display:flex}}

/* Botões */
.lc-btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:44px;padding:10px 20px;border-radius:12px;border:0;
  font:600 15px/1.2 var(--lc-sans);text-decoration:none;cursor:pointer;
  transition:transform .15s ease,background .15s ease,opacity .15s ease;
}
.lc-btn:disabled{opacity:.6;cursor:default}
.lc-btn-amarelo{background:var(--lc-amarelo);color:#0a0a0a}
.lc-btn-amarelo:hover:not(:disabled){background:#fff44d}
.lc-btn-vazado{background:transparent;color:var(--lc-texto);border:1px solid rgba(255,255,255,.22)}
.lc-btn-vazado:hover{border-color:rgba(255,255,255,.5)}
.lc-btn-peq{min-height:44px;padding:8px 14px;font-size:14px}
@media (prefers-reduced-motion:no-preference){
  .lc-btn:active:not(:disabled){transform:scale(.98)}
}

/* Tipografia */
.lc-rotulo{
  display:inline-block;font:600 12px/1 var(--lc-sans);letter-spacing:.12em;text-transform:uppercase;
  color:var(--lc-amarelo);margin-bottom:14px;
}
.lc-h1{
  font-family:var(--lc-display);font-weight:800;letter-spacing:-.035em;
  font-size:clamp(34px,7vw,64px);line-height:1.04;margin:0 0 20px;
}
.lc-h2{
  font-family:var(--lc-display);font-weight:800;letter-spacing:-.03em;
  font-size:clamp(26px,4.4vw,40px);line-height:1.12;margin:0 0 14px;max-width:22ch;
}
.lc-h3{font-family:var(--lc-display);font-weight:700;letter-spacing:-.02em;font-size:18px;line-height:1.25;margin:0 0 8px}
.lc-lead{font-size:clamp(17px,2.2vw,20px);color:var(--lc-texto2);max-width:60ch;margin:0 0 28px}
.lc-p{color:var(--lc-texto2);margin:0;font-size:15px}
.lc-p-max{max-width:64ch}
.lc-destaque{color:var(--lc-amarelo)}
.lc-cabeca{margin-bottom:36px}

/* Hero */
.lc-hero{padding:56px 0 48px;position:relative}
@media (min-width:900px){.lc-hero{padding:96px 0 80px}}
.lc-hero-grid{display:grid;gap:40px;align-items:center}
@media (min-width:900px){.lc-hero-grid{grid-template-columns:1.05fr .95fr;gap:56px}}
.lc-hero-ctas{display:flex;flex-wrap:wrap;gap:12px}
.lc-hero-nota{margin-top:18px;font-size:13px;color:var(--lc-texto3)}
@media (prefers-reduced-motion:no-preference){
  .lc-hero-texto{animation:lc-sobe .6s ease both}
  .lc-hero-visual{animation:lc-sobe .6s ease .12s both}
  @keyframes lc-sobe{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
}

/* Ilustração do Kanban: HTML e CSS puro, marcada como ilustração */
.lc-quadro{
  background:var(--lc-bg2);border:1px solid var(--lc-linha);border-radius:18px;padding:14px;
  box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(254,239,2,.06);
}
.lc-quadro-topo{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;font-size:12px;color:var(--lc-texto3)}
.lc-quadro-topo b{color:var(--lc-texto);font-weight:600}
.lc-quadro-sync{display:inline-flex;align-items:center;gap:6px;color:var(--lc-ok)}
.lc-quadro-sync i{width:7px;height:7px;border-radius:50%;background:var(--lc-ok);display:inline-block}
.lc-colunas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lc-col{background:var(--lc-bg);border-radius:12px;padding:8px;min-height:120px}
.lc-col-t{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--lc-texto3);margin:2px 4px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lc-card{background:var(--lc-bg3);border:1px solid var(--lc-linha);border-radius:9px;padding:8px;margin-bottom:6px}
.lc-card-t{font-size:12px;font-weight:600;line-height:1.3;color:var(--lc-texto)}
.lc-card-m{display:flex;gap:6px;align-items:center;margin-top:6px;font-size:10.5px;color:var(--lc-texto3)}
.lc-card-m i{width:16px;height:16px;border-radius:50%;background:var(--lc-amarelo);color:#0a0a0a;font:700 9px/16px var(--lc-sans);text-align:center;font-style:normal}
.lc-card-m em{font-style:normal;color:var(--lc-amarelo)}
.lc-quadro-legenda{margin-top:10px;font-size:11.5px;color:var(--lc-texto3);text-align:center}
@media (min-width:480px){.lc-colunas{grid-template-columns:repeat(3,1fr)}}

/* Grades de cartões */
.lc-grade{display:grid;gap:14px;grid-template-columns:1fr}
@media (min-width:640px){.lc-grade{grid-template-columns:repeat(2,1fr)}}
@media (min-width:1000px){.lc-grade{grid-template-columns:repeat(3,1fr)}}
.lc-grade-2{display:grid;gap:14px;grid-template-columns:1fr}
@media (min-width:760px){.lc-grade-2{grid-template-columns:repeat(2,1fr)}}
.lc-bloco{
  background:var(--lc-bg2);border:1px solid var(--lc-linha);border-radius:16px;padding:22px 20px;
  display:flex;flex-direction:column;gap:6px;
}
.lc-sec-escura .lc-bloco{background:var(--lc-bg3)}
.lc-bloco-num{
  width:34px;height:34px;border-radius:10px;background:rgba(254,239,2,.12);color:var(--lc-amarelo);
  font:800 14px/34px var(--lc-display);text-align:center;margin-bottom:8px;
}
.lc-bloco-ico{
  width:34px;height:34px;border-radius:10px;background:rgba(254,239,2,.12);color:var(--lc-amarelo);
  display:flex;align-items:center;justify-content:center;margin-bottom:8px;
}
.lc-bloco-ico svg{width:18px;height:18px}
.lc-tag{
  display:inline-block;font:600 11px/1 var(--lc-sans);letter-spacing:.06em;text-transform:uppercase;
  padding:6px 9px;border-radius:999px;border:1px solid var(--lc-linha);color:var(--lc-texto3);margin-top:8px;align-self:flex-start;
}
.lc-tag-amarelo{border-color:rgba(254,239,2,.4);color:var(--lc-amarelo)}

/* Jornada: lista numerada em linha no desktop */
.lc-jornada{display:grid;gap:14px;grid-template-columns:1fr;counter-reset:passo}
@media (min-width:900px){.lc-jornada{grid-template-columns:repeat(5,1fr)}}
.lc-passo{position:relative;background:var(--lc-bg2);border:1px solid var(--lc-linha);border-radius:16px;padding:20px 18px}
.lc-passo-seta{display:none}
@media (min-width:900px){
  .lc-passo:not(:last-child)::after{
    content:"";position:absolute;right:-9px;top:50%;width:14px;height:1px;background:rgba(254,239,2,.5);
  }
}

/* IA */
.lc-ia{display:grid;gap:24px;align-items:start}
@media (min-width:900px){.lc-ia{grid-template-columns:1fr 1fr;gap:48px}}
.lc-fluxo{display:flex;flex-direction:column;gap:10px}
.lc-fluxo-item{display:flex;gap:12px;align-items:flex-start;background:var(--lc-bg3);border:1px solid var(--lc-linha);border-radius:12px;padding:12px 14px}
.lc-fluxo-item b{font-family:var(--lc-display);font-size:14px;display:block;margin-bottom:2px}
.lc-fluxo-item span{font-size:13.5px;color:var(--lc-texto2)}
.lc-fluxo-item i{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:var(--lc-amarelo);color:#0a0a0a;font:800 12px/26px var(--lc-display);text-align:center;font-style:normal}
.lc-fluxo-item.lc-humano i{background:#fff}

/* Prova e oferta */
.lc-prova{
  border:1px solid rgba(254,239,2,.35);border-radius:20px;padding:28px 22px;background:rgba(254,239,2,.05);
  max-width:820px;
}
.lc-prova p{font-family:var(--lc-display);font-weight:700;font-size:clamp(20px,3vw,28px);line-height:1.25;letter-spacing:-.02em;margin:0 0 12px}
.lc-prova small{display:block;font-size:14px;color:var(--lc-texto2)}
.lc-oferta{display:grid;gap:18px}
@media (min-width:900px){.lc-oferta{grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}}
.lc-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.lc-lista li{display:flex;gap:10px;align-items:flex-start;color:var(--lc-texto2);font-size:15px}
.lc-lista li::before{content:"";flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:var(--lc-amarelo);margin-top:9px}

/* FAQ */
.lc-faq{display:flex;flex-direction:column;gap:8px;max-width:820px}
.lc-faq details{background:var(--lc-bg2);border:1px solid var(--lc-linha);border-radius:14px;padding:0 18px}
.lc-faq summary{
  cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;
  min-height:52px;padding:14px 0;font-family:var(--lc-display);font-weight:700;font-size:16px;letter-spacing:-.01em;
}
.lc-faq summary::-webkit-details-marker{display:none}
.lc-faq summary::after{content:"+";color:var(--lc-amarelo);font-size:22px;font-weight:400;flex:0 0 auto;line-height:1}
.lc-faq details[open] summary::after{content:"\\2212"}
.lc-faq details p{margin:0 0 16px;color:var(--lc-texto2);font-size:15px}

/* Formulário */
.lc-contato{display:grid;gap:28px}
@media (min-width:900px){.lc-contato{grid-template-columns:.9fr 1.1fr;gap:56px;align-items:start}}
.lc-form{
  background:var(--lc-bg2);border:1px solid var(--lc-linha);border-radius:20px;padding:22px 18px;
  display:flex;flex-direction:column;gap:14px;
}
@media (min-width:640px){.lc-form{padding:28px 26px}}
.lc-form-linha{display:grid;gap:14px;grid-template-columns:1fr}
@media (min-width:640px){.lc-form-linha{grid-template-columns:1fr 1fr}}
.lc-campo{display:flex;flex-direction:column;gap:6px}
.lc-campo label{font-size:13px;font-weight:600;color:var(--lc-texto2)}
.lc-campo label em{font-style:normal;color:var(--lc-amarelo)}
.lc-campo input,.lc-campo textarea{
  width:100%;min-height:46px;background:var(--lc-bg);color:var(--lc-texto);
  border:1px solid rgba(255,255,255,.16);border-radius:12px;padding:11px 14px;
  font:400 15px/1.4 var(--lc-sans);
}
.lc-campo textarea{min-height:110px;resize:vertical}
.lc-campo input::placeholder,.lc-campo textarea::placeholder{color:#6f6f6f}
.lc-campo input:focus,.lc-campo textarea:focus{border-color:var(--lc-amarelo);outline:none;box-shadow:0 0 0 3px rgba(254,239,2,.18)}
.lc-campo input[aria-invalid="true"],.lc-campo textarea[aria-invalid="true"]{border-color:var(--lc-erro)}
.lc-campo small{font-size:12px;color:var(--lc-erro)}
/* Honeypot: fora da tela, sem display:none pra não atrapalhar autofill dos campos reais */
.lc-hp{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.lc-aviso{border-radius:12px;padding:12px 14px;font-size:14px;line-height:1.45}
.lc-aviso-erro{background:var(--lc-erro-bg);color:var(--lc-erro);border:1px solid rgba(255,138,138,.3)}
.lc-aviso-ok{background:var(--lc-ok-bg);color:var(--lc-ok);border:1px solid rgba(124,224,166,.3)}
.lc-form-nota{font-size:12.5px;color:var(--lc-texto3);margin:0}
.lc-sucesso{
  background:var(--lc-bg2);border:1px solid rgba(124,224,166,.35);border-radius:20px;padding:28px 22px;
  display:flex;flex-direction:column;gap:10px;
}
.lc-sucesso h3{font-family:var(--lc-display);font-size:22px;margin:0;letter-spacing:-.02em}
.lc-sucesso p{margin:0;color:var(--lc-texto2)}

/* Rodapé */
.lc-rodape{border-top:1px solid var(--lc-linha);padding:28px 0 40px;font-size:13.5px;color:var(--lc-texto3)}
.lc-rodape-in{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;justify-content:space-between}
.lc-rodape a{text-decoration:none;color:var(--lc-texto2);padding:8px 0;display:inline-block}
.lc-rodape a:hover{color:var(--lc-texto)}
.lc-rodape-links{display:flex;gap:18px;flex-wrap:wrap}
`;
