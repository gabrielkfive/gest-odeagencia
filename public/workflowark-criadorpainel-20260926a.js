/* ============ MODO CRIADOR NO APP ORIGINAL (26/09/2026) ============
   Atividades > Modo Criador. Painel no molde do Modo Criador da V3: três contadores e um
   cartão por cliente, quem pede atenção primeiro. O cálculo é window.WFA_CRIADOR
   (workflowark-criador-<data>.js, testado no Node). Clicar no cartão abre a página do cliente
   por abas que já existia (Posts, Reels, Stories, Aprovação, Editorial, Ficha, Faturas, Saúde). */
let CRI_LIGADO=false;
function criEsc(s){return (typeof mdEsc==='function')?mdEsc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function criIni(nm){return (typeof cliInitials==='function')?cliInitials(String(nm||'?')).toUpperCase():String(nm||'?').slice(0,2).toUpperCase();}
function criPlural(n,um,varios){return n+' '+(n===1?um:varios);}
function criIcone(d){return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;}
function criadorRender(){
  const el=document.getElementById('cri-corpo');if(!el)return;
  criLigar();
  if(!window.WFA_CRIADOR){el.innerHTML='<p class="cri-vazio">Carregando o Modo Criador…</p>';return;}
  const hoje=(typeof hojeSP==='function')?hojeSP():new Date().toISOString().slice(0,10);
  const mk=hoje.slice(0,7);
  const r=WFA_CRIADOR.resumoCriador((typeof CLIENTES!=='undefined'?CLIENTES:[]),state.tarefas||[],hoje,mk);
  const mesNome=new Date(Number(mk.slice(0,4)),Number(mk.slice(5,7))-1,1).toLocaleDateString('pt-BR',{month:'long'});
  const kpi=(ic,t,v,cls)=>`<div class="cri-kpi"><div class="cri-kpi-t">${criIcone(ic)}${t}</div><div class="cri-kpi-v ${cls||''}">${v}</div></div>`;
  const cards=r.clientes.map(c=>{
    const chips=[];
    if(c.esperando)chips.push(`<span class="cri-chip am"><i></i>${c.esperando} com o cliente</span>`);
    if(c.revisao)chips.push(`<span class="cri-chip az"><i></i>${c.revisao} em revisão</span>`);
    if(c.atrasados)chips.push(`<span class="cri-chip vm"><i></i>${criPlural(c.atrasados,'atrasado','atrasados')}</span>`);
    if(!chips.length)chips.push('<span class="cri-chip"><i></i>Nada pendente</span>');
    const fmt=[c.posts?criPlural(c.posts,'post','posts'):'',c.reels?criPlural(c.reels,'reel','reels'):'',c.stories?criPlural(c.stories,'story','stories'):''].filter(Boolean).join(' · ');
    return `<button type="button" class="cri-card" data-cri-abrir="${criEsc(c.id)}">
      <div class="cri-card-cab"><span class="cri-av cri-av-${criEsc(c.status||'gr')}">${criEsc(criIni(c.nm))}</span><div class="cri-nm"><b>${criEsc(c.nm)}</b><span>${criEsc(c.plano||'Sem plano')}</span></div></div>
      <div class="cri-chips">${chips.join('')}</div>
      <div class="cri-card-pe"><span>${fmt||'Sem conteúdo com formato em '+mesNome}</span><b>${criPlural(c.noMes,'conteúdo','conteúdos')}</b></div>
    </button>`;}).join('');
  el.innerHTML=`<div class="cri-kpis">
      ${kpi('M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z','Esperando o cliente',r.totais.esperando)}
      ${kpi('M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z','Em revisão interna',r.totais.revisao)}
      ${kpi('M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01','Prazos estourados',r.totais.atrasados,r.totais.atrasados?'cri-neg':'')}
    </div>
    <div class="cri-grade">${cards||'<p class="cri-vazio">Nenhum cliente ativo na carteira.</p>'}</div>
    <p class="cri-nota">Com o cliente é o que está em homologação do cliente. Revisão interna é o que está em aprovação. Atrasado é tarefa aberta da equipe com a data vencida. Os conteúdos do mês contam posts, reels e stories com data em ${mesNome}.</p>`;
}
function criadorAbrir(id){
  const pg=document.getElementById('page-cliente');if(!pg)return;
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  pg.classList.add('active');
  try{if(typeof cliAreaPopular==='function')cliAreaPopular();}catch(e){}
  const sel=document.getElementById('cli-area-sel');if(sel)sel.value=id;
  const v=document.getElementById('cri-voltar');if(v)v.style.display='';
  try{(window.cliAreaSelect||cliAreaSelect)(id);}catch(e){console.warn('criador',e);}
  window.scrollTo({top:0});
}
function criLigar(){
  if(CRI_LIGADO)return;CRI_LIGADO=true;
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-cri-abrir]');if(b){criadorAbrir(b.dataset.criAbrir);return;}
    if(e.target.closest('[data-cri-voltar]')){const n=document.querySelector('[data-nav="criador"]');if(n)n.click();}
  });
}
