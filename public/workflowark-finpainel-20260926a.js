/* ============ FINANCEIRO NO MOLDE DA V3 (26/09/2026) ============
   Abas: Visão geral, Recebimentos, Contas a pagar, Inadimplência, DRE e Planilha.
   Tudo calculado da Minha Planilha (meses) + baixas de Cobranças e Acerto, pelo módulo
   window.WFA_FIN (workflowark-financeiro-<data>.js, o mesmo testado no Node). A planilha
   editável continua igual, só mudou de lugar: aba Planilha. */
let FX_ABA='visao',FX_MES_ID=null,FX_LIGADO=false;
const FX_ABAS=[['visao','Visão geral'],['receber','Recebimentos'],['pagar','Contas a pagar'],['inad','Inadimplência'],['dre','DRE'],['planilha','Planilha']];
const FX_SUB={visao:'Quanto entrou, quanto saiu e quanto sobrou.',receber:'Cobranças dos clientes no mês.',pagar:'Time, fornecedores e despesas do mês.',inad:'Tudo de meses anteriores que ainda não teve baixa.',dre:'Demonstrativo do resultado pelo que está lançado no mês.',planilha:'A planilha do mês. Edite clicando nas células, salva sozinho.'};
function fxEsc(s){return (typeof mdEsc==='function')?mdEsc(s):String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fxR(v){return v==null?'sem dado':'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fxRc(v){if(v==null)return 'sem dado';const a=Math.abs(v);if(a>=1e6)return 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi';if(a>=1e4)return 'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil';return 'R$ '+Math.round(v).toLocaleString('pt-BR');}
function fxPct(v,casas){return v==null?'sem dado':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:casas==null?1:casas})+'%';}
function fxMesCurto(mk){const n=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];const m=Number(String(mk||'').slice(5,7));return n[m-1]||'';}
function fxMesLongo(mk){if(!mk)return '';const d=new Date(Number(mk.slice(0,4)),Number(mk.slice(5,7))-1,1);return d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});}
function fxCap(t){t=String(t||'');return t.charAt(0).toUpperCase()+t.slice(1);}
function fxMeses(){if(typeof planEnsure==='function')planEnsure();return window.WFA_FIN?WFA_FIN.mesesOrdenados(state.planilha.meses):state.planilha.meses;}
function fxMes(){
  const ms=fxMeses();let m=ms.find(x=>x.id===FX_MES_ID);
  if(!m){const atual=cobMesKey();m=ms.find(x=>x.mk===atual)||(typeof planActive==='function'?planActive():ms[0]);FX_MES_ID=m&&m.id;}
  return m;
}
function fxAnterior(m){if(!m||!m.mk)return null;const ms=fxMeses().filter(x=>x.mk&&x.mk<m.mk);return ms.length?ms.filter(x=>x.mk===ms[ms.length-1].mk)[0]:null;}
function fxMk(m){return (m&&m.mk)||cobMesKey();}
function fxCob(m){const mk=fxMk(m);return nome=>finRecCobrado(nome,mk);}
function fxPag(m){const mk=fxMk(m);return nome=>finPagPago(nome,mk);}
function fxTeto(v){if(!(v>0))return 1;const p=Math.pow(10,Math.floor(Math.log10(v)));const n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p;}
function fxVar(v,bomSubir){if(v==null)return '';if(Math.abs(v)<0.05)return '<span class="fx-var">estável</span>';const sobe=v>=0;const bom=bomSubir?sobe:!sobe;return `<span class="fx-var ${bom?'bom':'ruim'}">${sobe?'↑':'↓'} ${fxPct(Math.abs(v))}</span>`;}
function fxChip(on,okTxt,abertoTxt){return `<span class="fx-chip ${on?'ok':'aberto'}"><i></i>${on?okTxt:abertoTxt}</span>`;}
function fxKpi(rot,val,pe,cls,extra){return `<div class="fx-kpi"><div class="fx-kpi-t">${rot}${extra||''}</div><div class="fx-kpi-v ${cls||''}">${val}</div><div class="fx-kpi-p">${pe||'&nbsp;'}</div></div>`;}

/* ---------- gráficos SVG (escala com viewBox, cabe no celular) ---------- */
function fxGraficoBarras(serie,mkSel){
  if(!serie.length)return '<p class="fx-vazio">Sem meses com data na planilha ainda.</p>';
  const W=720,H=250,L=58,R=14,T=16,B=30,iw=W-L-R,ih=H-T-B;
  const max=fxTeto(Math.max(1,...serie.map(s=>Math.max(s.receita,s.despesas))));
  const passo=iw/serie.length,bw=Math.min(26,passo*.45);
  const y=v=>T+ih-(v/max)*ih;const x=i=>L+passo*i+passo/2;
  const grades=[0,.25,.5,.75,1].map(f=>{const v=max*f;return `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="fx-g-grade"/><text x="${L-8}" y="${y(v)+4}" class="fx-g-eixo" text-anchor="end">${fxRc(v)}</text>`;}).join('');
  const barras=serie.map((s,i)=>`<rect x="${x(i)-bw/2}" y="${y(s.despesas)}" width="${bw}" height="${Math.max(0,T+ih-y(s.despesas))}" rx="4" class="fx-g-barra${s.mk===mkSel?' sel':''}"><title>Despesas ${fxMesCurto(s.mk)}: ${fxR(s.despesas)}</title></rect>`).join('');
  const pts=serie.map((s,i)=>[x(i),y(s.receita)]);
  const linha=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const area=linha+` L${pts[pts.length-1][0].toFixed(1)} ${T+ih} L${pts[0][0].toFixed(1)} ${T+ih} Z`;
  const pontos=serie.map((s,i)=>`<circle cx="${x(i)}" cy="${y(s.receita)}" r="${s.mk===mkSel?5:3}" class="fx-g-ponto${s.mk===mkSel?' sel':''}"><title>Receita ${fxMesCurto(s.mk)}: ${fxR(s.receita)}</title></circle>`).join('');
  const rot=serie.map((s,i)=>`<text x="${x(i)}" y="${H-8}" class="fx-g-eixo${s.mk===mkSel?' sel':''}" text-anchor="middle">${fxMesCurto(s.mk)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="fx-g" role="img" aria-label="Receita e despesas por mês">${grades}<path d="${area}" class="fx-g-area"/>${barras}<path d="${linha}" class="fx-g-linha"/>${pontos}${rot}</svg>`;
}
function fxGraficoLinha(serie,mkSel){
  const s2=serie.filter(s=>s.ticket!=null);
  if(!s2.length)return '<p class="fx-vazio">Sem ticket para mostrar.</p>';
  const W=720,H=190,L=58,R=14,T=16,B=30,iw=W-L-R,ih=H-T-B;
  const max=fxTeto(Math.max(1,...s2.map(s=>s.ticket)));const passo=iw/serie.length;
  const y=v=>T+ih-(v/max)*ih;const x=i=>L+passo*i+passo/2;
  const pts=serie.map((s,i)=>s.ticket==null?null:[x(i),y(s.ticket),s]).filter(Boolean);
  const linha=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  const grades=[0,.5,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${y(max*f)}" y2="${y(max*f)}" class="fx-g-grade"/><text x="${L-8}" y="${y(max*f)+4}" class="fx-g-eixo" text-anchor="end">${fxRc(max*f)}</text>`).join('');
  const pontos=pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="${p[2].mk===mkSel?5:3}" class="fx-g-ponto${p[2].mk===mkSel?' sel':''}"><title>${fxMesCurto(p[2].mk)}: ${fxR(p[2].ticket)}</title></circle>`).join('');
  const rot=serie.map((s,i)=>`<text x="${x(i)}" y="${H-8}" class="fx-g-eixo${s.mk===mkSel?' sel':''}" text-anchor="middle">${fxMesCurto(s.mk)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="fx-g" role="img" aria-label="Ticket médio por mês">${grades}<path d="${linha}" class="fx-g-linha"/>${pontos}${rot}</svg>`;
}
function fxRosca(recebido,total){
  const r=52,c=2*Math.PI*r,f=total>0?Math.min(1,recebido/total):0;
  return `<svg viewBox="0 0 140 140" class="fx-rosca" role="img" aria-label="Recebido do mês"><circle cx="70" cy="70" r="${r}" class="fx-rosca-fundo"/><circle cx="70" cy="70" r="${r}" class="fx-rosca-val" stroke-dasharray="${(c*f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 70 70)"/><text x="70" y="68" text-anchor="middle" class="fx-rosca-n">${total>0?Math.round(f*100)+'%':'sem dado'}</text><text x="70" y="86" text-anchor="middle" class="fx-rosca-s">recebido</text></svg>`;
}

/* ---------- abas ---------- */
function fxVisao(m){
  const F=WFA_FIN,r=F.resumoMes(m,fxCob(m),fxPag(m)),ant=fxAnterior(m);
  const ra=ant?F.resumoMes(ant,fxCob(ant),fxPag(ant)):null;
  const inad=F.inadimplencia(fxMeses(),(n,mk)=>finRecCobrado(n,mk),cobMesKey());
  const tInad=inad.reduce((s,x)=>s+x.valor,0);const nInad=new Set(inad.map(x=>x.nome)).size;
  const serie=F.serieMeses(fxMeses(),12);const mkSel=fxMk(m);
  const vs=ant?' vs '+fxMesCurto(ant.mk):'';
  const kpis=[
    fxKpi('Faturamento do mês',fxRc(r.receita),ra?fxVar(F.variacao(r.receita,ra.receita),true)+vs:r.clientes+' clientes'),
    fxKpi('Recebido',fxRc(r.recebido),r.receita>0?fxPct(r.recebido/r.receita*100,0)+' do mês':'',r.recebido>0?'fx-pos':''),
    fxKpi('Ticket médio',fxRc(r.ticket),ra&&ra.ticket!=null&&r.ticket!=null?fxVar(F.variacao(r.ticket,ra.ticket),true)+vs:r.clientes+' clientes com valor'),
    fxKpi('Margem',fxPct(r.margem),'resultado '+fxRc(r.resultado),r.margem!=null&&r.margem<0?'fx-neg':'',r.margem!=null&&r.margem<20?'<span class="fx-alerta">Atenção</span>':''),
    fxKpi('Inadimplência',fxRc(tInad),tInad?`<a href="#" class="fx-link" data-fx-ir="inad">${nInad} ${nInad>1?'clientes':'cliente'} sem baixa</a>`:'nada em aberto de meses anteriores',tInad?'fx-neg':'')
  ].join('');
  const saldo=r.aReceber-r.aPagar;const totAb=r.aReceber+r.aPagar;
  return `<div class="fx-kpis">${kpis}</div>
  <div class="fx-grade2">
    <div class="fx-cartao"><div class="fx-cartao-cab"><div><h3>Faturamento x despesas</h3><p>${serie.length?fxMesLongo(serie[0].mk)+' a '+fxMesLongo(serie[serie.length-1].mk):'sem meses com data'}</p></div><div class="fx-leg"><span><i class="rec"></i>Receita</span><span><i class="desp"></i>Despesas</span></div></div>
      <div class="fx-trio"><div><span>Receita em ${fxMesCurto(mkSel)}</span><b>${fxR(r.receita)}</b></div><div><span>Despesas</span><b class="fx-mute">${fxR(r.despesas)}</b></div><div><span>Resultado</span><b class="${r.resultado<0?'fx-neg':''}">${fxR(r.resultado)}</b></div></div>
      ${fxGraficoBarras(serie,mkSel)}</div>
    <div class="fx-cartao"><div class="fx-cartao-cab"><div><h3>Recebido x em aberto</h3><p>Receita de ${fxMesLongo(mkSel)||fxEsc(m.nome)}</p></div></div>
      <div class="fx-rosca-caixa">${fxRosca(r.recebido,r.receita)}</div>
      <div class="fx-leg-lista"><div><span><i class="rec"></i>Recebido</span><b>${fxR(r.recebido)}</b></div><div><span><i class="ab"></i>Em aberto</span><b>${fxR(r.aReceber)}</b></div></div>
      <p class="fx-nota">Recebido é o que foi marcado como cobrado em Cobranças ou nos Recebimentos.</p></div>
  </div>
  <div class="fx-grade2">
    <div class="fx-cartao"><div class="fx-cartao-cab"><div><h3>Ticket médio</h3><p>Quanto cada cliente com valor rendeu por mês</p></div><div class="fx-dir"><b>${fxR(r.ticket)}</b></div></div>${fxGraficoLinha(serie,mkSel)}</div>
    <div class="fx-cartao"><div class="fx-cartao-cab"><div><h3>A receber e a pagar</h3><p>Em aberto em ${fxMesLongo(mkSel)||fxEsc(m.nome)}</p></div></div>
      <div class="fx-par"><div><span><i class="rec"></i>A receber</span><b>${fxR(r.aReceber)}</b></div><div><span><i class="neg"></i>A pagar</span><b>${fxR(r.aPagar)}</b></div></div>
      <div class="fx-barra"><i style="width:${totAb>0?(r.aReceber/totAb*100).toFixed(1):0}%"></i></div>
      <div class="fx-saldo"><span>Saldo previsto</span><b class="${saldo<0?'fx-neg':'fx-pos'}">${fxR(saldo)}</b></div></div>
  </div>`;
}
function fxResumo3(a,b,c,frac){return `<div class="fx-res3"><div>${a}</div><div>${b}</div><div>${c}</div><div class="fx-res3-barra"><i style="width:${Math.max(0,Math.min(100,frac*100)).toFixed(1)}%"></i></div></div>`;}
function fxReceber(m){
  const r=WFA_FIN.resumoMes(m,fxCob(m),fxPag(m)),cob=fxCob(m),mesTxt=fxMesLongo(m.mk)||fxEsc(m.nome);
  const linhas=(m.receitas||[]).map((x,i)=>{const nm=String(x.nome||'').trim();const v=WFA_FIN.num(x.valor);if(!nm&&!v)return '';const on=nm&&cob(nm);const c=WFA_FIN.num(x.custo);const mg=v?Math.round((1-c/v)*100):null;
    return `<tr><td><strong>${fxEsc(nm||'Sem nome')}</strong></td><td class="n">${fxR(v)}</td><td class="n fx-mute">${c?fxR(c):'sem custo'}</td><td class="n">${mg==null?'':mg+'%'}</td><td>${fxChip(on,'Recebido','Em aberto')}</td><td class="n">${nm?`<button class="fx-btn${on?' fantasma':''}" data-fx-cob="${i}">${on?'Desfazer':'Marcar como recebido'}</button>`:''}</td></tr>`;}).join('');
  return fxResumo3(`<span>Total em ${mesTxt}</span><b>${fxR(r.receita)}</b><em>${r.clientes} ${r.clientes===1?'cliente':'clientes'}</em>`,`<span>Recebido</span><b class="fx-pos">${fxR(r.recebido)}</b><em>${r.receita>0?fxPct(r.recebido/r.receita*100)+' do total':''}</em>`,`<span>Em aberto</span><b>${fxR(r.aReceber)}</b><em>&nbsp;</em>`,r.receita>0?r.recebido/r.receita:0)+
  `<div class="fx-sec-cab"><h3>Cobranças de ${mesTxt}</h3><button class="fx-btn fantasma" data-fx-ir="planilha">Editar na planilha</button></div>
  <div class="fx-tabela-caixa"><table class="fx-tabela"><thead><tr><th>Cliente</th><th class="n">Valor</th><th class="n">Custo</th><th class="n">Margem</th><th>Situação</th><th></th></tr></thead><tbody>${linhas||'<tr><td colspan="6" class="fx-vazio">Nenhum cliente lançado neste mês.</td></tr>'}</tbody></table></div>`;
}
function fxPagar(m){
  const r=WFA_FIN.resumoMes(m,fxCob(m),fxPag(m)),pag=fxPag(m),mesTxt=fxMesLongo(m.mk)||fxEsc(m.nome);
  const cat=k=>(WFA_FIN.CATEGORIAS.find(c=>c.k===k)||{nome:'Equipe'}).nome;
  const linhas=(m.pagar||[]).map((x,i)=>{const nm=String(x.nome||'').trim();const v=WFA_FIN.num(x.valor);if(!nm&&!v)return '';const on=nm&&pag(nm);
    return `<tr><td><strong>${fxEsc(nm||'Sem nome')}</strong></td><td class="fx-mute">${fxEsc(cat(acertoClassify(nm)))}</td><td class="n">${fxR(v)}</td><td>${fxChip(on,'Pago','Em aberto')}</td><td class="n">${nm?`<button class="fx-btn${on?' fantasma':''}" data-fx-pag="${i}">${on?'Desfazer':'Marcar como pago'}</button>`:''}</td></tr>`;}).join('');
  const n=(m.pagar||[]).filter(x=>WFA_FIN.num(x.valor)>0).length;
  return fxResumo3(`<span>Total em ${mesTxt}</span><b>${fxR(r.despesas)}</b><em>${n} ${n===1?'conta':'contas'}</em>`,`<span>Pago</span><b class="fx-pos">${fxR(r.pago)}</b><em>${r.despesas>0?fxPct(r.pago/r.despesas*100)+' do total':''}</em>`,`<span>Em aberto</span><b>${fxR(r.aPagar)}</b><em>&nbsp;</em>`,r.despesas>0?r.pago/r.despesas:0)+
  `<div class="fx-sec-cab"><h3>Contas de ${mesTxt}</h3><button class="fx-btn fantasma" data-fx-ir="planilha">Editar na planilha</button></div>
  <div class="fx-tabela-caixa"><table class="fx-tabela"><thead><tr><th>Quem ou o quê</th><th>Categoria</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${linhas||'<tr><td colspan="5" class="fx-vazio">Nenhuma conta lançada neste mês.</td></tr>'}</tbody></table></div>`;
}
function fxInad(){
  const lista=WFA_FIN.inadimplencia(fxMeses(),(n,mk)=>finRecCobrado(n,mk),cobMesKey());
  const tot=lista.reduce((s,x)=>s+x.valor,0);const nCli=new Set(lista.map(x=>x.nome)).size;
  const linhas=lista.map(x=>`<tr><td><strong>${fxEsc(x.nome)}</strong></td><td>${fxEsc(fxMesLongo(x.mk)||x.mes)}</td><td class="n">${fxR(x.valor)}</td><td>${fxChip(false,'','Sem baixa')}</td><td class="n"><button class="fx-btn" data-fx-baixa="${fxEsc(x.mesId)}" data-i="${x.i}">Marcar como recebido</button></td></tr>`).join('');
  return `<div class="fx-res3 fx-res2"><div><span>Total sem baixa</span><b class="${tot?'fx-neg':''}">${fxR(tot)}</b><em>${lista.length} ${lista.length===1?'cobrança':'cobranças'}</em></div><div><span>Clientes</span><b>${nCli}</b><em>de meses anteriores</em></div></div>
  <p class="fx-nota">Conta tudo que foi lançado em meses anteriores e não foi marcado como cobrado. Se já recebeu e só faltou marcar, clique em Marcar como recebido.</p>
  <div class="fx-tabela-caixa"><table class="fx-tabela"><thead><tr><th>Cliente</th><th>Mês</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${linhas||'<tr><td colspan="5" class="fx-vazio">Nada em aberto. Todas as cobranças anteriores tiveram baixa.</td></tr>'}</tbody></table></div>`;
}
function fxDre(m){
  const ant=fxAnterior(m),d=WFA_FIN.dre(m,ant,acertoClassify);
  const nA=fxMesLongo(m.mk)||fxEsc(m.nome),nB=ant?(fxMesLongo(ant.mk)||fxEsc(ant.nome)):'Mês anterior';
  const cel=(l,bomSubir)=>`<td class="n"><b>${fxR(l.atual)}</b></td><td class="n fx-mute">${l.anterior==null?'sem dado':fxR(l.anterior)}</td><td class="n">${fxVar(l.variacao,bomSubir)}</td>`;
  const custos=d.custos.map(c=>`<tr><td>${c.nome}</td><td class="fx-dre-bar"><span><i style="width:${Math.min(100,c.pctReceita||0).toFixed(1)}%"></i></span><em>${c.pctReceita==null?'':fxPct(c.pctReceita)+' da receita'}</em></td>${cel(c,false)}</tr>`).join('');
  const mg=d.margem;const dp=mg.atual!=null&&mg.anterior!=null?mg.atual-mg.anterior:null;
  return `<div class="fx-cartao fx-dre"><div class="fx-cartao-cab"><div><h3>Demonstrativo de ${nA}</h3><p>Pelo que está lançado na planilha do mês (receitas e contas a pagar).</p></div><div class="fx-dir"><span class="fx-mute">Resultado</span><b class="${d.resultado.atual<0?'fx-neg':'fx-pos'} fx-grande">${fxR(d.resultado.atual)}</b></div></div>
  <div class="fx-tabela-caixa"><table class="fx-tabela fx-tabela-dre"><thead><tr><th colspan="2"></th><th class="n">${fxEsc(nA)}</th><th class="n">${fxEsc(nB)}</th><th class="n">Variação</th></tr></thead><tbody>
    <tr class="fx-dre-sec"><td colspan="5">Receita</td></tr>
    <tr class="fx-dre-tot"><td colspan="2">Receita total</td>${cel(d.receita,true)}</tr>
    <tr class="fx-dre-sec"><td colspan="5">Custos por categoria</td></tr>${custos}
    <tr class="fx-dre-tot"><td colspan="2">Custo total</td>${cel(d.custoTotal,false)}</tr>
    <tr class="fx-dre-res"><td colspan="2">Resultado</td>${cel(d.resultado,true)}</tr>
    <tr><td colspan="2">Margem</td><td class="n"><b>${fxPct(mg.atual)}</b></td><td class="n fx-mute">${fxPct(mg.anterior)}</td><td class="n">${dp==null?'':`<span class="fx-var ${dp>=0?'bom':'ruim'}">${dp>=0?'↑':'↓'} ${Math.abs(dp).toLocaleString('pt-BR',{maximumFractionDigits:1})} p.p.</span>`}</td></tr>
  </tbody></table></div></div>`;
}

/* ---------- montagem ---------- */
function fxRender(){
  const pg=document.getElementById('page-financeiro');const corpo=document.getElementById('fx-corpo');
  if(!pg||!corpo)return;
  fxLigar();
  const plan=document.getElementById('fx-planilha');
  document.querySelectorAll('#fx-abas [data-fx-aba]').forEach(b=>{const on=b.dataset.fxAba===FX_ABA;b.classList.toggle('ativo',on);b.setAttribute('aria-selected',on?'true':'false');});
  const sub=document.getElementById('fx-sub');if(sub)sub.textContent=FX_SUB[FX_ABA]||'';
  const nav=document.getElementById('fx-mesnav');if(nav)nav.style.display=(FX_ABA==='inad'||FX_ABA==='planilha')?'none':'';
  if(FX_ABA==='planilha'){corpo.style.display='none';if(plan)plan.style.display='';return;}
  if(plan)plan.style.display='none';corpo.style.display='';
  if(!window.WFA_FIN){corpo.innerHTML='<p class="fx-vazio">Carregando o financeiro…</p>';return;}
  const m=fxMes();
  const lbl=document.getElementById('fx-meslbl');if(lbl)lbl.textContent=m?fxCap(fxMesLongo(m.mk)||m.nome):'';
  if(!m){corpo.innerHTML='<p class="fx-vazio">Nenhum mês na planilha ainda.</p>';return;}
  try{
    corpo.innerHTML=FX_ABA==='receber'?fxReceber(m):FX_ABA==='pagar'?fxPagar(m):FX_ABA==='inad'?fxInad():FX_ABA==='dre'?fxDre(m):fxVisao(m);
  }catch(e){console.error('[financeiro]',e);corpo.innerHTML='<p class="fx-vazio">Não consegui montar esta aba. A planilha continua disponível na aba Planilha.</p>';}
}
function fxAndarMes(passo){const ms=fxMeses();const i=ms.findIndex(x=>x.id===(fxMes()||{}).id);const n=ms[i+passo];if(n){FX_MES_ID=n.id;fxRender();}}
function fxLigar(){
  if(FX_LIGADO)return;const pg=document.getElementById('page-financeiro');if(!pg)return;FX_LIGADO=true;
  pg.addEventListener('click',e=>{
    const t=e.target;
    const aba=t.closest('[data-fx-aba]');if(aba){FX_ABA=aba.dataset.fxAba;fxRender();return;}
    const ir=t.closest('[data-fx-ir]');if(ir){e.preventDefault();FX_ABA=ir.dataset.fxIr;fxRender();window.scrollTo({top:0});return;}
    if(t.closest('[data-fx-mes="-1"]')){fxAndarMes(-1);return;}
    if(t.closest('[data-fx-mes="1"]')){fxAndarMes(1);return;}
    const c=t.closest('[data-fx-cob]');if(c){planToggleCob(Number(c.dataset.fxCob),FX_MES_ID);return;}
    const p=t.closest('[data-fx-pag]');if(p){planTogglePag(Number(p.dataset.fxPag),FX_MES_ID);return;}
    const b=t.closest('[data-fx-baixa]');if(b){planToggleCob(Number(b.dataset.i),b.dataset.fxBaixa);return;}
  });
}
