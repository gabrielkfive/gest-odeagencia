/* ============ LISTA DE CLIENTES NO MOLDE DA V3 (26/09/2026) ============
   Busca, abas por objetivo (Todos, Onboarding, Em jornada, Precisa de atenção, Churn) e
   alternância Cartões | Lista. O cartão junta a jornada (sprint) com plano, valor e a
   cobrança do mês. Cálculo em window.WFA_CLI (workflowark-clientes-lista-<data>.js). */
let CL_ABA='todos',CL_BUSCA='',CL_VISTA=(function(){try{return localStorage.getItem('wfa-cli-vista')||'cartoes';}catch(e){return 'cartoes';}})(),CL_LIGADO=false;
const CL_ABAS=[['todos','Todos'],['onboarding','Onboarding'],['jornada','Em jornada'],['atencao','Precisa de atenção'],['churn','Churn']];
const CL_ST={r:'Urgente',y:'Em ajuste',gr:'Saudável',churn:'Churn'};
function clEsc(s){return (typeof mdEsc==='function')?mdEsc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function clIni(nm){return (typeof cliInitials==='function')?cliInitials(String(nm||'?')).toUpperCase():String(nm||'?').slice(0,2).toUpperCase();}
function clR(v){return v?'R$ '+Number(v).toLocaleString('pt-BR'):'';}
function clJornada(x){
  if(x.etapa==='onboarding')return `<div class="cl-jor"><div class="cl-jor-t"><span>Jornada</span><b>Onboarding</b></div><div class="cl-jor-barra"><i style="width:3%"></i></div></div>`;
  if(x.etapa==='jornada')return `<div class="cl-jor"><div class="cl-jor-t"><span>Jornada</span><b>Sprint ${x.sprint} de 20</b></div><div class="cl-jor-barra"><i style="width:${x.progresso}%"></i></div></div>`;
  return `<div class="cl-jor sem"><div class="cl-jor-t"><span>Jornada</span><b>Fora da jornada</b></div><div class="cl-jor-barra"></div></div>`;
}
function clCob(x){
  if(!x.cobravel)return `<span class="cl-chip">${x.tipo==='Alpha'?'Squad Alpha':'Sem valor'}</span>`;
  return x.cobrado?'<span class="cl-chip ok"><i></i>Cobrado no mês</span>':'<span class="cl-chip ab"><i></i>A cobrar</span>';
}
function clStatus(x){return `<span class="cl-chip st-${clEsc(x.status)}"><i></i>${CL_ST[x.status]||'Ativo'}</span>`;}
function clCartao(x){
  return `<div class="cl-card st-${clEsc(x.status)}" data-cl-ficha="${clEsc(x.id)}" tabindex="0" role="button" aria-label="Abrir ficha de ${clEsc(x.nm)}">
    <div class="cl-card-cab"><span class="cl-av">${clEsc(clIni(x.nm))}</span><div class="cl-nm"><b>${clEsc(x.nm)}</b><span>${clEsc(x.plano||'Sem plano')}${x.tipo==='Alpha'?' · Squad Alpha':''}</span></div>${clStatus(x)}</div>
    <div class="cl-valor">${x.valor?`<b>${clR(x.valor)}</b><span>/mês</span>`:'<span class="cl-mute">Sem valor mensal</span>'}${x.cap?`<em>${x.cap} ${x.cap===1?'captação':'captações'}/mês</em>`:''}</div>
    ${clJornada(x)}
    ${x.meta?`<p class="cl-meta">${clEsc(x.meta)}</p>`:''}
    <div class="cl-card-pe">${clCob(x)}</div>
    <div class="cl-acoes">
      <button type="button" class="cl-btn pri" data-cl-ficha="${clEsc(x.id)}">Abrir ficha</button>
      <button type="button" class="cl-btn" data-cl-criador="${clEsc(x.id)}">Modo Criador</button>
      <button type="button" class="cl-btn" data-cl-acao="relatorioCliente" data-id="${clEsc(x.id)}">Relatório</button>
      <button type="button" class="cl-btn" data-cl-acao="abrirCriativos" data-id="${clEsc(x.id)}">Criativos</button>
      <button type="button" class="cl-btn" data-cl-acao="abrirOnboarding" data-id="${clEsc(x.id)}">Onboarding</button>
      <button type="button" class="cl-btn" data-cl-acao="cliEditOpen" data-id="${clEsc(x.id)}">Editar</button>
    </div>
  </div>`;
}
function clTabela(ls){
  return `<div class="cl-tab-caixa"><table class="cl-tab"><thead><tr><th>Cliente</th><th>Plano</th><th class="n">Valor mensal</th><th>Jornada</th><th>Cobrança do mês</th><th>Status</th></tr></thead><tbody>${ls.map(x=>`<tr data-cl-ficha="${clEsc(x.id)}" tabindex="0">
    <td><div class="cl-cel-nm"><span class="cl-av">${clEsc(clIni(x.nm))}</span><div><b>${clEsc(x.nm)}</b><span>${x.tipo==='Alpha'?'Squad Alpha':'ARK Direto'}</span></div></div></td>
    <td>${clEsc(x.plano||'Sem plano')}</td><td class="n">${x.valor?clR(x.valor):'<span class="cl-mute">sem valor</span>'}</td>
    <td>${x.etapa==='sem'?'<span class="cl-mute">Fora da jornada</span>':x.etapa==='onboarding'?'Onboarding':'Sprint '+x.sprint+' de 20'}</td>
    <td>${clCob(x)}</td><td>${clStatus(x)}</td></tr>`).join('')}</tbody></table></div>`;
}
function cliListaRender(){
  const el=document.getElementById('cl-corpo');if(!el)return;
  clLigar();
  if(!window.WFA_CLI){el.innerHTML='<p class="cl-mute">Carregando a carteira…</p>';return;}
  const mk=(typeof cobMesKey==='function')?cobMesKey():new Date().toISOString().slice(0,7);
  const linhas=WFA_CLI.montarLinhas((typeof CLIENTES!=='undefined'?CLIENTES:[]),(typeof SPRINTS!=='undefined'?SPRINTS:[]),state.cobranca||{},mk);
  const n=WFA_CLI.contarAbas(linhas);
  const sub=document.getElementById('cl-sub');if(sub)sub.textContent=`${n.todos} ${n.todos===1?'cliente ativo':'clientes ativos'}${n.churn?`, ${n.churn} em churn`:''}`;
  const abas=document.getElementById('cl-abas');
  if(abas)abas.innerHTML=CL_ABAS.map(([k,t])=>`<button type="button" role="tab" data-cl-aba="${k}" class="${k===CL_ABA?'ativo':''}" aria-selected="${k===CL_ABA}">${t}<em>${n[k]}</em></button>`).join('');
  document.querySelectorAll('[data-cl-vista]').forEach(b=>b.classList.toggle('ativo',b.dataset.clVista===CL_VISTA));
  const ls=WFA_CLI.filtrar(linhas,CL_ABA,CL_BUSCA);
  if(!ls.length){el.innerHTML=`<p class="cl-vazio">${CL_BUSCA?'Nenhum cliente com esse nome ou plano.':'Nenhum cliente nesta aba.'}</p>`;return;}
  el.innerHTML=CL_VISTA==='lista'?clTabela(ls):`<div class="cl-grade">${ls.map(clCartao).join('')}</div>`;
}
function clLigar(){
  if(CL_LIGADO)return;const pg=document.getElementById('page-lista-clientes');if(!pg)return;CL_LIGADO=true;
  pg.addEventListener('click',e=>{
    const t=e.target;
    const aba=t.closest('[data-cl-aba]');if(aba){CL_ABA=aba.dataset.clAba;cliListaRender();return;}
    const v=t.closest('[data-cl-vista]');if(v){CL_VISTA=v.dataset.clVista;try{localStorage.setItem('wfa-cli-vista',CL_VISTA);}catch(_){}cliListaRender();return;}
    const cr=t.closest('[data-cl-criador]');if(cr){e.stopPropagation();if(typeof criadorAbrir==='function')criadorAbrir(cr.dataset.clCriador);return;}
    const ac=t.closest('[data-cl-acao]');if(ac){e.stopPropagation();const fn=window[ac.dataset.clAcao];if(typeof fn==='function')fn(ac.dataset.id);return;}
    const f=t.closest('[data-cl-ficha]');if(f&&typeof cliDetalhe==='function'){cliDetalhe(f.dataset.clFicha);}
  });
  pg.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const f=e.target.closest&&e.target.closest('[data-cl-ficha]');if(f&&typeof cliDetalhe==='function')cliDetalhe(f.dataset.clFicha);});
  const b=document.getElementById('cl-busca');if(b)b.addEventListener('input',()=>{CL_BUSCA=b.value;cliListaRender();});
}
