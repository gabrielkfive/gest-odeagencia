/* ============ INÍCIO NO MOLDE DA V3 (26/09/2026) ============
   Em cima da fila do Meu Dia: "Primeiros passos" (só admin, some quando tudo estiver
   feito ou quando dispensar) e, ao lado da fila "Esperando sua aprovação", o cartão
   "Este mês" com faturamento, a receber e inadimplência (só para quem vê o Financeiro).
   Tudo lido do que já existe; nada é criado sozinho. */
function iniEsc(s){return (typeof mdEsc==='function')?mdEsc(s):String(s==null?'':s);}
function iniLS(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function iniJSON(k){try{return JSON.parse(iniLS(k)||'null');}catch(e){return null;}}
function iniChaveDispensa(){return 'wfa-ini-passos-ok-'+((typeof WFA_MEMBER!=='undefined'&&WFA_MEMBER&&WFA_MEMBER.id)||'eu');}
function iniMesPlanilha(){
  try{if(typeof planEnsure==='function')planEnsure();}catch(e){return null;}
  const mk=cobMesKey();return ((state.planilha&&state.planilha.meses)||[]).find(m=>m.mk===mk)||null;
}
function iniPassos(){
  const brand=(typeof loadBrand==='function')?loadBrand():{};
  const nCli=(typeof CLIENTES!=='undefined'&&Array.isArray(CLIENTES))?CLIENTES.length:0;
  const nEq=(typeof WFA_MEMBERS!=='undefined'&&Array.isArray(WFA_MEMBERS))?WFA_MEMBERS.length:0;
  const mes=iniMesPlanilha();const temPlan=!!(mes&&(mes.receitas||[]).some(x=>(window.WFA_FIN?WFA_FIN.num(x.valor):Number(x.valor)||0)>0));
  const prop=iniJSON('wfa-propostas');const nProp=Array.isArray(prop)?prop.length:(prop&&typeof prop==='object'?Object.keys(prop).length:0);
  return [
    {k:'marca',ic:'M12 2a10 10 0 100 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0022 9.8C22 5.5 17.5 2 12 2z',t:'Configure a sua marca',d:'Nome, cor e logo do sistema.',ok:!!(brand&&(brand.name||brand.logo)),ir:()=>{openSettings();setTab('conta');}},
    {k:'clientes',ic:'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M9 13h1M14 9h1M14 13h1',t:'Cadastre os clientes',d:'A carteira que a agência atende.',ok:nCli>0,ir:()=>document.querySelector('[data-nav="lista-clientes"]')?.click()},
    {k:'equipe',ic:'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',t:'Convide a equipe',d:'Cada pessoa com o seu papel e permissões.',ok:nEq>1,ir:()=>{openSettings();setTab('equipe');}},
    {k:'planilha',ic:'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',t:'Lance a planilha do mês',d:'Quem paga e quem recebe neste mês.',ok:temPlan,ir:()=>{document.querySelector('[data-nav="financeiro"]')?.click();if(typeof FX_ABA!=='undefined'){FX_ABA='planilha';fxRender();}}},
    {k:'contrato',ic:'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M9 15l2 2 4-4',t:'Envie a primeira proposta',d:'Proposta ou contrato para um cliente.',ok:nProp>0,ir:()=>document.querySelector('[data-nav="propostas"]')?.click()},
  ];
}
function iniSvg(d){return `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;}
function iniRenderPassos(){
  const el=document.getElementById('ini-passos');if(!el)return;
  const admin=typeof WFA_MEMBER!=='undefined'&&WFA_MEMBER&&WFA_MEMBER.role==='admin';
  const ps=iniPassos();const feitos=ps.filter(p=>p.ok).length;
  if(!admin||feitos===ps.length||iniLS(iniChaveDispensa())==='1'){el.innerHTML='';el.style.display='none';return;}
  el.style.display='';
  el.innerHTML=`<div class="ini-cartao"><div class="ini-cab"><div><h3>Primeiros passos</h3><p>${feitos} de ${ps.length} concluídos. Some daqui quando tudo estiver pronto.</p></div><button type="button" class="ini-link" data-ini-dispensar>Dispensar</button></div>
    <div class="ini-prog"><i style="width:${(feitos/ps.length*100).toFixed(0)}%"></i></div>
    <div class="ini-passos">${ps.map(p=>`<button type="button" class="ini-passo${p.ok?' ok':''}" data-ini-passo="${p.k}"><span class="ini-ic">${p.ok?iniSvg('M5 12l5 5L20 7'):iniSvg(p.ic)}</span>${p.ok?'<span class="ini-feito">Feito</span>':'<span class="ini-seta">›</span>'}<b>${p.t}</b><span class="ini-d">${p.d}</span></button>`).join('')}</div></div>`;
}
function iniRenderMes(){
  const el=document.getElementById('ini-mes');const grade=document.getElementById('ini-grade');if(!el)return;
  // Sem membro carregado, fecha (memberAccess(null) abriria tudo por um instante).
  const acc=(typeof memberAccess==='function'&&typeof WFA_MEMBER!=='undefined'&&WFA_MEMBER)?memberAccess(WFA_MEMBER):{};
  if(!acc.financeiro||!window.WFA_FIN){el.innerHTML='';el.style.display='none';if(grade)grade.classList.remove('com-mes');return;}
  el.style.display='';if(grade)grade.classList.add('com-mes');
  const F=WFA_FIN,mes=iniMesPlanilha();
  const R=v=>v==null?'sem dado':'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const r=mes?F.resumoMes(mes,n=>finRecCobrado(n,mes.mk),n=>finPagPago(n,mes.mk)):null;
  let inad=[];try{inad=F.inadimplencia(state.planilha.meses,(n,mk)=>finRecCobrado(n,mk),cobMesKey());}catch(e){}
  const tInad=inad.reduce((s,x)=>s+x.valor,0),nInad=new Set(inad.map(x=>x.nome)).size;
  el.innerHTML=`<div class="ini-cartao ini-mes"><div class="ini-cab"><h3>Este mês</h3><button type="button" class="ini-link" data-ini-fin>Abrir financeiro ›</button></div>
    <div class="ini-linha"><span>Faturamento</span><b>${r?R(r.receita):'sem dado'}</b></div>
    <div class="ini-linha"><span>A receber</span><b>${r?R(r.aReceber):'sem dado'}</b></div>
    <div class="ini-linha"><span>Inadimplência</span><b class="${tInad?'ini-neg':''}">${R(tInad)}</b></div>
    <p class="ini-nota">${!mes?'A planilha deste mês ainda não foi lançada.':tInad?nInad+(nInad>1?' clientes':' cliente')+' de meses anteriores sem baixa.':'Nada em aberto de meses anteriores.'}</p></div>`;
}
let INI_LIGADO=false;
function iniRender(){
  iniRenderPassos();iniRenderMes();
  if(INI_LIGADO)return;const pg=document.getElementById('page-dashboard');if(!pg)return;INI_LIGADO=true;
  pg.addEventListener('click',e=>{
    const t=e.target;
    if(t.closest('[data-ini-dispensar]')){try{localStorage.setItem(iniChaveDispensa(),'1');}catch(_){}iniRenderPassos();return;}
    const p=t.closest('[data-ini-passo]');if(p){const it=iniPassos().find(x=>x.k===p.dataset.iniPasso);if(it)it.ir();return;}
    if(t.closest('[data-ini-fin]')){document.querySelector('[data-nav="financeiro"]')?.click();if(typeof FX_ABA!=='undefined'){FX_ABA='visao';fxRender();}}
  });
}
