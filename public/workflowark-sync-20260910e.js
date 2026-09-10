/* ============ CLOUD SYNC ============ */
const WFA_CLOUD_KEYS = ['wfa-tarefas','wfa-regua','wfa-jornada','wfa-demandas','wfa-rotinas','wfa-okrs','wfa-okrs-edits','wfa-inline-edits','wfa-processos','wfa-gcal','wfa-fin','wfa-crm','wfa-agenda-events','wfa-comercial','wfa-cobranca','wfa-acerto','wfa-planilha','wfa-whatsapp','wfa-notificacoes','wfa-planejamento','wfa-criativos','wfa-clientes-custom','wfa-colab-custom','wfa-cliente-detalhes','wfa-conselho-briefings','wfa-drive','wfa-brand','wfa-widgets','wfa-alpha','wfa-alpha-am','wfa-alpha-gt','wfa-alpha-cr','wfa-alpha-bs','wfa-warroom','wfa-cli-geo','wfa-deleted-ids','wfa-producao','wfa-briefings','wfa-acertosrec','wfa-propostas','wfa-notif-read','wfa-planejamentos','wfa-projetos','wfa-papeis'];
const WFA_SUPABASE_URL='https://fxfnonozzekxnxddxsnh.supabase.co';
const WFA_SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4Zm5vbm96emVreG54ZGR4c25oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjQwODAsImV4cCI6MjA5NjIwMDA4MH0.ZQmGbuwIq_HM81QH-ch_kJPMrV8AgeX_WCF9iTaglK0';
const _wfaSb=supabase.createClient(WFA_SUPABASE_URL,WFA_SUPABASE_KEY);
/* ===== GUARDA DE SESSAO, CAMADA 2 (assincrona) =====
   A camada sincrona do <head> so ve SE existe token. Aqui confirmamos se ele ainda
   VALE. Token expirado renderizava o painel inteiro do cache ate o primeiro erro de
   sync, que era silencioso. Agora limpa o cache e manda pro /auth.
   Watchdog proposital: se a checagem nao responder, NAO travamos a tela (regra n1). */
async function wfaConfirmaSessao(){
  try{
    const {data:{session}}=await _wfaSb.auth.getSession();
    if(session&&session.access_token)return true;
    const nova=await _wfaSb.auth.refreshSession();      // token velho ainda pode renovar
    if(nova&&nova.data&&nova.data.session&&nova.data.session.access_token)return true;
  }catch(e){ return true; }                             // falha de rede nao expulsa ninguem
  try{
    wfaLimpaCacheLocal();
    document.documentElement.style.visibility='hidden';
    location.replace('/auth');
  }catch(e){}
  return false;
}
/* Limpa TODO o cache de estado local (as 59 chaves wfa-*). Usado no logout e quando a
   sessao cai. Nao mexe na sessao do Supabase nem em chave de outro app. */
function wfaLimpaCacheLocal(){
  try{
    // Mesmo criterio da guarda do <head>: so sai o que volta da nuvem no proximo login.
    // wfa-rotina-checks, wfa-allhands e wfa-cons-chat-* NAO sincronizam; apagar seria
    // perda definitiva. Elas continuam no aparelho, e quem impede de aparecer sem login
    // e a guarda, que redireciona antes de qualquer paint.
    for(var i=localStorage.length-1;i>=0;i--){
      var k=localStorage.key(i);
      if(k&&(isWfaCloudKey(k)))localStorage.removeItem(k);
    }
  }catch(e){}
}
/* SAIR: descarrega o que ainda nao subiu ANTES de limpar o cache. Se sobrar escrita
   pendente, o cache FICA no aparelho de proposito (nunca perder dado, regra n1) e quem
   protege a exibicao e a guarda de sessao, que barra sem login. */
async function wfaSair(){
  try{
    if(typeof sincronizarAgora==='function'){
      await Promise.race([sincronizarAgora(true),new Promise(function(r){setTimeout(r,4000)})]);
    }
  }catch(e){}
  try{
    // Bloco recusado em definitivo sai do WFA_DIRTY mas NAO chegou na nuvem. Sem contar o
    // WFA_VENENO aqui, o logout limparia o cache e esse dado sumiria de vez.
    var sujo=(typeof WFA_DIRTY!=='undefined'&&WFA_DIRTY&&WFA_DIRTY.size>0)
      ||(typeof WFA_VENENO!=='undefined'&&WFA_VENENO&&WFA_VENENO.size>0);
    if(!sujo)wfaLimpaCacheLocal();
  }catch(e){}
  try{window.parent.postMessage({type:'wfa-sair'},'*');}catch(e){}
}
const WFA_FIN_DEFAULT = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWOvW6PZJHWlv6jfIYt2bJ1aA0Tw6jzvJu-Uzjk6axIHtebnEDadNUojfdXOoLzjVUmzfexaPwionf/pubhtml?widget=true&headers=false';
var WFA_WPP_OFF=true; // WhatsApp DESLIGADO a pedido do Gabriel (03/07): some da sidebar,
// do painel e de todo caminho de execução. Reversível: false religa. Dados intactos na nuvem.
let WFA_CLOUD_READY = false;
let WFA_CLOUD_MUTED = false;
let WFA_MEMBER = null;
let WFA_MEMBERS = [];
// Declarados cedo para evitar erro de inicialização (usados no init e no sync):
let WPP_ACTIVE=null;let WPP_TAB='tudo';let WPP_AUTOSYNC=false;let WPP_AVATAR_SYNC=false;let WPP_SEL=new Set();let WPP_FWD_ITEMS=[];let WPP_FWD_TARGETS=new Set();const WPP_LABELS=['ARK','ALPHA','Lead','Fornecedor'];
const DEFAULT_CALENDARS = {
  'gabriel andrade':'gabrielkomercial@gmail.com',
  'danilo de lima':'danilodelima.distribuidoracopa@gmail.com',
  'lucas rosi':'luccascalta@gmail.com',
};
/* var (não const): WFA_FILTROS é lido por tarefaPassaFiltro, que pode ser chamado por um
   render disparado cedo na carga. Com const/let, o TDZ estoura e o board fica BRANCO (parte
   do bug de "tela branca" em carga lenta). Com var hoista como undefined e nunca quebra;
   o objeto só é mutado, nunca reatribuído, então var é equivalente. */
var WFA_FILTROS = {busca:'',prio:'',resp:'',cli:'',tag:'',data:''};
/* "Esconder projetos": tira do board da daily os cards puxados dos Projetos (t.pj), que
   são as ações operacionais por cliente. Não apaga nada, é só um filtro de visão. */
var WFA_HIDE_PJ=false;   // var (não let): hoisted sem TDZ, senão um render cedo estoura e deixa a tela branca
function filtSemProjetos(){
  WFA_HIDE_PJ=!WFA_HIDE_PJ;
  const b=document.getElementById('filt-sempj');
  if(b){b.style.color=WFA_HIDE_PJ?'var(--yel,#b38600)':'';b.textContent=WFA_HIDE_PJ?'Mostrar projetos':'Esconder projetos';}
  const lim=document.getElementById('filt-limpar');if(lim)lim.style.display=(WFA_HIDE_PJ||Object.values(WFA_FILTROS).some(v=>v!==''))?'':'none';
  renderTarefas();
}
function aplicarFiltros(){
  WFA_FILTROS.busca=(document.getElementById('filt-busca').value||'').toLowerCase();
  WFA_FILTROS.prio=document.getElementById('filt-prio').value||'';
  WFA_FILTROS.resp=document.getElementById('filt-resp').value||'';
  WFA_FILTROS.cli=document.getElementById('filt-cli').value||'';
  WFA_FILTROS.tag=(document.getElementById('filt-tag')||{}).value||'';
  WFA_FILTROS.data=document.getElementById('filt-data').value||'';
  const ativo=Object.values(WFA_FILTROS).some(v=>v!=='')||WFA_HIDE_PJ;
  document.getElementById('filt-limpar').style.display=ativo?'':'none';
  const bm=document.getElementById('filt-minhas');
  if(bm){const eu=(typeof WFA_MEMBER!=='undefined'&&WFA_MEMBER&&WFA_MEMBER.full_name)||'';bm.style.color=(WFA_FILTROS.resp&&eu&&WFA_FILTROS.resp.toLowerCase()===eu.toLowerCase())?'var(--yel,#b38600)':'';}
  renderTarefas();
}
/* "Só minhas": aplica o responsável = membro logado no filtro existente (toggle). */
function filtSoMinhas(){
  const sel=document.getElementById('filt-resp');if(!sel)return;
  const eu=(typeof WFA_MEMBER!=='undefined'&&WFA_MEMBER&&(WFA_MEMBER.full_name||''))||'';
  const btn=document.getElementById('filt-minhas');
  if(sel.value&&eu&&sel.value===eu){sel.value='';if(btn)btn.style.color='';}
  else{
    const op=[...sel.options].find(o=>o.value&&eu&&normName(o.value)===normName(eu));
    if(!op){toast('Seu usuário ('+(eu||'sem nome')+') não está na lista de responsáveis');return;}
    sel.value=op.value;if(btn)btn.style.color='var(--yel,#b38600)';
  }
  aplicarFiltros();
}
function limparFiltros(){
  ['filt-busca','filt-prio','filt-resp','filt-cli','filt-tag','filt-data'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  Object.keys(WFA_FILTROS).forEach(k=>WFA_FILTROS[k]='');
  WFA_HIDE_PJ=false;
  const bp=document.getElementById('filt-sempj');if(bp){bp.style.color='';bp.textContent='Esconder projetos';}
  const bm=document.getElementById('filt-minhas');if(bm)bm.style.color='';
  document.getElementById('filt-limpar').style.display='none';
  renderTarefas();
}
// Data no fuso da ARK (America/Sao_Paulo). No navegador da equipe já é local, mas
// .toISOString() converte pra UTC e das 21h em diante vira o dia seguinte, quebrando
// prazos e a virada de mês. dataSP/hojeSP resolvem em qualquer fuso. en-CA = YYYY-MM-DD.
function dataSP(d){return (d||new Date()).toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});}
function hojeSP(){return dataSP(new Date());}
/* Busca sem acento e sem caixa (10/09/2026): "Darma" acha "Darmã", "Acai" acha "Açaí".
   Antes era só toLowerCase: acento no dado e sem acento na digitação (ou o contrário) dava
   zero resultado. A busca também olha responsável, cliente e tags, que é o que a equipe
   digita quando procura "as tarefas do Caio". wfaNorm é local de propósito: este script
   carrega antes do app, então não depende de normName existir. */
function wfaNorm(s){return String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function wfaBuscaCasa(t,q){
  const alvo=wfaNorm(q);if(!alvo)return true;
  const partes=[t.title,t.desc,t.resp,t.clienteNome].concat(Array.isArray(t.resps)?t.resps:[]).concat(Array.isArray(t.tags)?t.tags:[]);
  try{if(t.clienteId&&typeof CLIENTES!=='undefined'){const c=CLIENTES.find(x=>x.id===t.clienteId);if(c)partes.push(c.nm);}}catch(e){}
  return partes.some(p=>p&&wfaNorm(p).includes(alvo));
}
function tarefaPassaFiltro(t){
  /* Blindagem: se um render disparar antes de WFA_FILTROS ser preenchido (carga lenta), NÃO
     estoura nem deixa o board branco — deixa a tarefa passar e a próxima repintada filtra. */
  if(!WFA_FILTROS)return true;
  if(WFA_HIDE_PJ&&t.pj)return false;   // "Esconder projetos": só tarefas diretas da equipe
  const today=hojeSP();
  const em7=dataSP(new Date(Date.now()+7*86400000));
  if(WFA_FILTROS.busca&&!wfaBuscaCasa(t,WFA_FILTROS.busca))return false;
  if(WFA_FILTROS.prio&&t.prio!==WFA_FILTROS.prio)return false;
  /* Responsável: casa contra TODOS os responsáveis (t.resps), não só o 1º (t.resp).
     Antes o filtro/"Só minhas" perdia toda tarefa em que a pessoa era co-responsável
     e não o primeiro da lista (print do Gabriel: filtrar Darman/Caio dava 0). normName
     ignora acento e caixa. */
  if(WFA_FILTROS.resp){
    // Dado antigo ainda pode dizer "Caio" ou "Darmã" enquanto o seletor diz "Caio Neves" e
    // "Darman": casa pelo nome canônico também (mesma tabela da migração migraNomesEquipe).
    const _canon=(typeof migCanonNome==='function')?migCanonNome:(x=>x);
    const _alvo=wfaNorm(_canon(WFA_FILTROS.resp));
    const _quem=(Array.isArray(t.resps)&&t.resps.length)?t.resps:[t.resp];
    if(!_quem.some(r=>wfaNorm(r)===_alvo||wfaNorm(_canon(r))===_alvo))return false;
  }
  if(WFA_FILTROS.cli&&t.clienteId!==WFA_FILTROS.cli)return false;
  if(WFA_FILTROS.tag){
    const _tags=(t.tags||[]).concat((t.papeis||[]).map(k=>(typeof pjPapelNome==='function'?pjPapelNome(k):k)));
    if(!_tags.some(tg=>normName(tg)===normName(WFA_FILTROS.tag)))return false;
  }
  if(WFA_FILTROS.data==='atrasadas'&&!(t.data&&t.data<today&&t.status!=='concluido'))return false;
  if(WFA_FILTROS.data==='hoje'&&t.data!==today)return false;
  if(WFA_FILTROS.data==='7dias'&&!(t.data&&t.data>=today&&t.data<=em7))return false;
  return true;
}
const WFA_LS_SET = localStorage.setItem.bind(localStorage);
const WFA_LS_REMOVE = localStorage.removeItem.bind(localStorage);
function isWfaCloudKey(key){return WFA_CLOUD_KEYS.includes(key)||String(key).startsWith('wfa-ckl-');}
// Publica a lista de chaves que sincronizam para a guarda de sessao do <head>, que roda
// antes deste script existir. Fonte unica: WFA_CLOUD_KEYS. Gravado com o setter CRU, senao
// o setItem sobrescrito tentaria empurrar essa chave de controle pra nuvem.
try{WFA_LS_SET('wfa-sync-keys',JSON.stringify(WFA_CLOUD_KEYS));}catch(e){}
function parseCloudValue(value){try{return JSON.parse(value);}catch{return value;}}
async function directCloudCall(action,payload){
  const {data:{session}}=await _wfaSb.auth.getSession();
  const token=session?.access_token;
  if(!token)throw new Error('Faça login para usar o sistema.');
  const isLoad=action==='load'||action==='load-key';
  // TIMEOUT: sem isso, uma rede travada deixa o fetch pendurado pra sempre — a mensagem
  // fica "enviando…" eterna e o sync nunca avisa. Com AbortController, vira erro limpo
  // (a mensagem vira "⚠ falhou · reenviar" e o badge de sync acende).
  const ctrl=new AbortController();
  const to=setTimeout(()=>ctrl.abort(),25000);
  let resp;
  try{
    resp=await fetch('/api/workflowark/state'+(action==='load-key'&&payload&&payload.key?('?key='+encodeURIComponent(payload.key)):(action==='load'&&payload&&payload.since?('?since='+encodeURIComponent(payload.since)):'')),{
      method:isLoad?'GET':'POST',
      headers:{...(!isLoad?{'Content-Type':'application/json'}:{}),Authorization:'Bearer '+token},
      body:isLoad?undefined:JSON.stringify(payload??{}),
      signal:ctrl.signal,
    });
  }catch(e){ clearTimeout(to); throw new Error(e&&e.name==='AbortError'?'Tempo esgotado (rede lenta) — tente de novo':(e&&e.message)||'Falha de rede'); }
  clearTimeout(to);
  const result=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(result.error||'Erro ao sincronizar');
  return result;
}
/* BOOT LEVE: o WhatsApp (todas as conversas) ficou FORA do load inicial (maior payload do
   estado). Busca sob demanda ao abrir a aba, e em segundo plano ~8s após o boot pra
   badges/resumo. O merge reusa o applyCloudState (mute + mescla). */
let _wppCloudLoaded=false;
async function wfaCarregarWhatsapp(){
  if(WFA_WPP_OFF)return;
  if(_wppCloudLoaded)return;_wppCloudLoaded=true;
  try{
    const r=await cloudCall('load-key',{key:'wfa-whatsapp'});
    const v=r&&r.state?r.state['wfa-whatsapp']:null;
    if(v!=null)applyCloudState({'wfa-whatsapp':v});
    if(typeof renderWhatsapp==='function')try{renderWhatsapp();}catch(e){}
    if(typeof updateBadges==='function')try{updateBadges();}catch(e){}
  }catch(e){_wppCloudLoaded=false;}
}
setTimeout(()=>{try{wfaCarregarWhatsapp();}catch(e){}},8000);
// Pede ao app pai (React, que tem a sessão) via postMessage. Usado como FALLBACK.
function cloudCallViaParent(action,payload,timeoutMs){
  return new Promise((resolve,reject)=>{
    if(window.parent===window){reject(new Error('sem-pai'));return;}
    const id='wfa_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const t=setTimeout(()=>{window.removeEventListener('message',h);reject(new Error('timeout'));},timeoutMs||12000);
    function h(e){
      if(e.data?.type==='wfa-cloud-response'&&e.data.id===id){
        clearTimeout(t);window.removeEventListener('message',h);
        if(e.data.ok)resolve(e.data.data);
        else reject(new Error(e.data.error||'Erro'));
      }
    }
    window.addEventListener('message',h);
    window.parent.postMessage({type:'wfa-cloud',id,action,payload},'*');
  });
}
async function cloudCall(action,payload){
  // CAMINHO PRINCIPAL: DIRETO. O iframe é MESMA ORIGEM e MESMO projeto Supabase do app pai,
  // então compartilha a sessão no localStorage. Falar direto com a API é muito mais confiável
  // do que depender do postMessage (que no MOBILE estourava timeout e o sync parava de vez).
  let directErr=null;
  try{
    const {data:{session}}=await _wfaSb.auth.getSession();
    if(session&&session.access_token) return await directCloudCall(action,payload);
  }catch(e){ directErr=e; }
  // FALLBACK: pede ao app pai (caso o iframe não tenha a sessão por algum motivo)
  try{ return await cloudCallViaParent(action,payload); }
  catch(e){
    // último recurso: tenta direto de novo (pode ter renovado o token nesse meio tempo)
    try{ return await directCloudCall(action,payload); }
    catch(e2){ throw directErr||e2||e; }
  }
}
/* ===== SYNC ROBUSTO (anti-perda de dados) =====
   Mudanças locais entram numa fila com reenvio. Enquanto uma chave não foi confirmada
   na nuvem, ela fica "suja" e a puxada periódica NÃO sobrescreve o valor local.
   Assim uma falha de rede/payload grande nunca apaga tarefa/WhatsApp já editados. */
const WFA_DIRTY=new Set();        // chaves com escrita ainda não confirmada
const WFA_VENENO=new Set();       // chaves que o servidor recusou EM DEFINITIVO (nunca subiram)
let _wfaVenenoAvisado=false;      // o aviso sai uma vez por sessao, nao a cada tentativa
const WFA_PENDING=new Map();      // chave -> último valor a enviar
// JANELA DE AUTORIDADE LOCAL: por ~15s após cada escrita local, a chave continua
// "autoritária" mesmo depois do push confirmar e limpar o dirty. Sem isso, um load
// dos 6s que saiu ANTES da edição volta DEPOIS com a foto antiga e reverte a tarefa
// pra coluna anterior (corrida clássica). Cobre o load em voo e a propagação no servidor.
const WFA_RECENT=new Map();       // chave -> timestamp (ms) até quando o local manda
const WFA_RECENT_MS=15000;
function wfaLocalAuth(key){return WFA_DIRTY.has(key)||(WFA_RECENT.get(key)||0)>Date.now();}
let _wfaFlushing=false;
// wfa-whatsapp é SERVER-OWNED: o servidor (webhook) escreve as mensagens e o cliente só LÊ.
// Empurrar do cliente daria 400 ("Bloco inválido") -> "Erro ao sincronizar" eterno, e ainda
// poderia sobrescrever mensagens que chegaram no servidor. Então nunca enfileira essa chave.
const WFA_NO_PUSH=new Set(['wfa-whatsapp']);
/* TODA lista multiusuário (objetos com id) entra aqui: a puxada MESCLA por id em vez de
   sobrescrever a lista inteira. Fora desta lista, "última escrita ganha" apaga a adição
   do colega (era por isso que demanda/rotina/cliente/linha do Alpha "sumia"). */
const WFA_MERGE_KEYS=['wfa-tarefas','wfa-agenda-events','wfa-conselho-briefings','wfa-notificacoes','wfa-crm','wfa-producao','wfa-briefings','wfa-planejamentos','wfa-demandas','wfa-rotinas','wfa-clientes-custom','wfa-alpha','wfa-alpha-am','wfa-alpha-gt','wfa-alpha-cr','wfa-projetos'];
const WFA_TOMBSTONE_KEYS=['wfa-tarefas','wfa-agenda-events','wfa-crm','wfa-producao','wfa-briefings','wfa-planejamentos','wfa-demandas','wfa-rotinas','wfa-clientes-custom','wfa-alpha','wfa-alpha-am','wfa-alpha-gt','wfa-alpha-cr','wfa-projetos']; // itens apagados nunca voltam
/* CARIMBO POR ITEM (up): na hora de salvar uma lista mesclável, compara cada item com a
   última foto conhecida e carimba `up` só no que realmente mudou. É o que permite à mescla
   resolver conflito POR ITEM (quem editou por último vence) em vez de reverter edição.
   As tarefas já têm o próprio mecanismo (wfaTarefaSnapshot) e ficam de fora. */
const WFA_UP_SNAP={};
/* wfa-projetos: foto TAMBÉM por tarefa (projId -> Map(taskId -> json)). O projeto inteiro era o
   item da mescla, então duas pessoas mexendo em tarefas diferentes do MESMO projeto brigavam
   pelo projeto todo e a mudança de uma delas sumia ("mandei a LP pra homologação do cliente
   e voltou"). Com t.up a mescla resolve tarefa por tarefa (wfaMergeProjetos). */
const WFA_UP_SNAP_T={};
function wfaSnapTarefasProjeto(arr){(Array.isArray(arr)?arr:[]).forEach(p=>{if(!p||!p.id)return;const m=new Map();(Array.isArray(p.tarefas)?p.tarefas:[]).forEach(t=>{if(t&&t.id){const c=Object.assign({},t);delete c.up;m.set(t.id,JSON.stringify(c));}});WFA_UP_SNAP_T[p.id]=m;});}
function wfaSnapKey(key,arr){const m=new Map();(Array.isArray(arr)?arr:[]).forEach(o=>{if(o&&o.id){const c=Object.assign({},o);delete c.up;m.set(o.id,JSON.stringify(c));}});WFA_UP_SNAP[key]=m;if(key==='wfa-projetos')wfaSnapTarefasProjeto(arr);}
function wfaStampUp(key,value){
  try{
    if(key==='wfa-tarefas')return value;
    const arr=JSON.parse(value);
    if(!Array.isArray(arr))return value;
    if(!WFA_UP_SNAP[key]){let prev=[];try{prev=JSON.parse(localStorage.getItem(key)||'[]');}catch(e){}wfaSnapKey(key,prev);}
    const snap=WFA_UP_SNAP[key];
    let stamped=false;
    if(key==='wfa-projetos'){
      const agora=new Date().toISOString();
      arr.forEach(p=>{if(!p||!p.id||!Array.isArray(p.tarefas))return;const tsnap=WFA_UP_SNAP_T[p.id]||new Map();const novo=new Map();
        p.tarefas.forEach(t=>{if(!t||!t.id)return;const c=Object.assign({},t);delete c.up;const j=JSON.stringify(c);if(tsnap.get(t.id)!==j){t.up=agora;stamped=true;}novo.set(t.id,j);});
        WFA_UP_SNAP_T[p.id]=novo;});
    }
    arr.forEach(o=>{if(o&&o.id){const c=Object.assign({},o);delete c.up;const j=JSON.stringify(c);if(snap.get(o.id)!==j){o.up=new Date().toISOString();stamped=true;}}});
    wfaSnapKey(key,arr);
    return stamped?JSON.stringify(arr):value;
  }catch(e){return value;}
}
function cloudSave(key,value){
  if(!isWfaCloudKey(key)||WFA_CLOUD_MUTED||WFA_NO_PUSH.has(key))return; // MUTED = aplicando remoto
  WFA_DIRTY.add(key);
  WFA_RECENT.set(key,Date.now()+WFA_RECENT_MS); // mantém o local autoritário por ~15s
  WFA_PENDING.set(key,parseCloudValue(value));
  atualizarBadgeSync('salvando');
  wfaFlush();
}
async function wfaFlush(){
  if(_wfaFlushing||!WFA_CLOUD_READY||!WFA_PENDING.size)return;
  _wfaFlushing=true;
  try{
    while(WFA_PENDING.size){
      const it=WFA_PENDING.entries().next().value;const key=it[0],data=it[1];
      WFA_PENDING.delete(key);
      try{
        await cloudCall('save',{action:'save-state',key,data});
        if(!WFA_PENDING.has(key))WFA_DIRTY.delete(key); // confirmou (e não houve edição nova no meio)
        atualizarBadgeSync(true);
      }catch(e){
        // CHAVE VENENO: se o servidor recusa essa chave em definitivo (ex: "Bloco inválido"),
        // NÃO reenfileira — senão ela trava a fila e mantém o badge vermelho pra sempre.
        const permanente=/inv[áa]lido|bloco inv/i.test((e&&e.message)||'');
        if(permanente){
          // DESCARTE BARULHENTO (20/08/2026). Antes isto sumia sem deixar rastro: a chave
          // saia do WFA_DIRTY, o badge voltava a verde no proximo sucesso e ninguem sabia
          // que aquele bloco NUNCA chegou na nuvem. Foi assim que wfa-notif-read passou
          // semanas sem sincronizar. Agora fica registrado e avisa uma vez.
          WFA_DIRTY.delete(key);
          WFA_VENENO.add(key);
          console.error('[sync] servidor recusou o bloco "'+key+'" em definitivo. Ele NAO subiu.',e);
          if(!_wfaVenenoAvisado){
            _wfaVenenoAvisado=true;
            try{ if(typeof toast==='function')toast('Um bloco de dados nao esta sincronizando. Avise o Gabriel.'); }catch(_){}
          }
          continue;
        }
        // erro transitório: recoloca na fila SÓ se não chegou um valor mais novo enquanto
        // esta gravação estava em voo — senão o retry sobrescreve a edição nova com a antiga.
        if(!WFA_PENDING.has(key))WFA_PENDING.set(key,data);
        atualizarBadgeSync('retry');
        break;                                 // para; tenta de novo no próximo tick
      }
    }
  }finally{_wfaFlushing=false;if(!WFA_PENDING.size&&!WFA_DIRTY.size)atualizarBadgeSync(true);}
}
localStorage.setItem=function(key,value){
  // listas mescláveis ganham carimbo `up` por item mudado (conflito entre aparelhos vira por item)
  if(!WFA_CLOUD_MUTED&&typeof value==='string'&&WFA_MERGE_KEYS.includes(key))value=wfaStampUp(key,value);
  WFA_LS_SET(key,value);cloudSave(key,value);};
localStorage.removeItem=function(key){WFA_LS_REMOVE(key);cloudSave(key,null);};
function collectLocalCloudState(){
  const entries={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(key&&isWfaCloudKey(key))entries[key]=parseCloudValue(localStorage.getItem(key));
  }
  return entries;
}
// Liga os agentes 24/7: na 1ª abertura do dia, dispara o Conselho autônomo (idempotente
// no servidor via wfa-agents-lastrun). Some o conselho debate todos os clientes (auto-encadeia)
// e os briefings caem no Meu Dia. Funciona junto com o cron diário do servidor.
async function arkDailyAgentsKick(){
  try{
    const hoje=hojeSP();
    if(localStorage.getItem('wfa-agents-kick-date')===hoje)return;
    localStorage.setItem('wfa-agents-kick-date',hoje);
    // Autentica pela sessão (a antiga key fixa "ark-2026" virou segredo de servidor, só cron)
    const {data:{session}}=await _wfaSb.auth.getSession();
    if(!session||!session.access_token)return;
    const r=await fetch('/api/workflowark/agents-run',{headers:{Authorization:'Bearer '+session.access_token}});
    if(!r.ok)return;
    // dá um tempinho pro auto-encadeamento e puxa os briefings novos
    setTimeout(async()=>{try{await sincronizarAgora();if(typeof renderMeuDia==='function')renderMeuDia();if(typeof consAutoRender==='function')consAutoRender();}catch(e){}},9000);
  }catch(e){/* silencioso */}
}
// Mescla duas listas de objetos por id (união). Base = remoto; se localPrevalece, o local
// vence em conflito de id. Garante que adições do servidor (conselho) E edições locais
// coexistam — nada "some".
function wfaMergeById(remoteArr,localArr,localPrevalece){
  const byId={}; const order=[];
  (Array.isArray(remoteArr)?remoteArr:[]).forEach(o=>{if(o&&o.id){if(!(o.id in byId))order.push(o.id);byId[o.id]=o;}});
  (Array.isArray(localArr)?localArr:[]).forEach(o=>{if(o&&o.id){if(!(o.id in byId)){order.push(o.id);byId[o.id]=o;}
    else{
      // Conflito no mesmo id: quem tem carimbo `up` mais novo vence, POR ITEM.
      // Antes o aparelho "autoritário" (dirty) vencia a lista INTEIRA e desfazia
      // mudança dos outros (tarefa concluída no celular "voltava" pro kanban).
      const r=byId[o.id];
      if(o.up&&r.up)byId[o.id]=(o.up>r.up)?o:r;
      else if(o.up)byId[o.id]=o;
      else if(r.up)byId[o.id]=r;
      else if(localPrevalece)byId[o.id]=o;
    }}});
  return order.map(id=>byId[id]);
}
/* Mescla das TAREFAS de um projeto: união por id; em conflito vence o t.up mais novo; sem
   carimbo dos dois lados fica a versão de quem venceu o projeto (base). Lápide vale pra
   tarefa também (onDelete do modal carimba o id). Mesma regra vive no servidor em
   src/lib/merge-estado.js; deploy/teste-merge-estado.mjs prova que as duas concordam. */
function wfaMergeTarefasProjeto(base,outro,deletedSet){
  const byId=new Map();const order=[];
  (Array.isArray(base)?base:[]).forEach(t=>{if(t&&t.id&&!byId.has(t.id)){order.push(t.id);byId.set(t.id,t);}});
  (Array.isArray(outro)?outro:[]).forEach(t=>{if(!t||!t.id)return;
    if(!byId.has(t.id)){order.push(t.id);byId.set(t.id,t);return;}
    const b=byId.get(t.id);
    if(t.up&&b.up){if(t.up>b.up)byId.set(t.id,t);}
    else if(t.up&&!b.up)byId.set(t.id,t);});
  return order.map(id=>byId.get(id)).filter(t=>!(deletedSet&&deletedSet.has(t.id)));
}
function wfaMergeProjetos(remoteArr,localArr,localPrevalece,deletedSet){
  const byId={};const order=[];
  (Array.isArray(remoteArr)?remoteArr:[]).forEach(o=>{if(o&&o.id){if(!(o.id in byId))order.push(o.id);byId[o.id]=o;}});
  (Array.isArray(localArr)?localArr:[]).forEach(o=>{if(!o||!o.id)return;
    if(!(o.id in byId)){order.push(o.id);byId[o.id]=o;return;}
    const r=byId[o.id];let venc=r,perd=o;
    if(o.up&&r.up){if(o.up>r.up){venc=o;perd=r;}}
    else if(o.up){venc=o;perd=r;}
    else if(r.up){venc=r;perd=o;}
    else if(localPrevalece){venc=o;perd=r;}
    const m=Object.assign({},venc);
    m.tarefas=wfaMergeTarefasProjeto(venc.tarefas,perd.tarefas,deletedSet);
    byId[o.id]=m;});
  return order.map(id=>byId[id]);
}
/* JSON com chaves em ordem fixa, pra comparar conteúdo sem depender da ordem que o Postgres
   (jsonb) ou o navegador devolvem as chaves. */
function wfaJsonCanon(v){
  if(Array.isArray(v))return '['+v.map(wfaJsonCanon).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+wfaJsonCanon(v[k])).join(',')+'}';
  return JSON.stringify(v===undefined?null:v);
}
/* LÁPIDE DE EXCLUSÃO: ids apagados ficam em wfa-deleted-ids (sincronizado). A mescla
   nunca ressuscita um id que está na lápide. Resolve "excluo e a tarefa volta". */
function loadDeleted(){try{return new Set(JSON.parse(localStorage.getItem('wfa-deleted-ids')||'[]'));}catch(e){return new Set();}}
function addDeleted(ids){const s=loadDeleted();(Array.isArray(ids)?ids:[ids]).forEach(i=>{if(i)s.add(i);});localStorage.setItem('wfa-deleted-ids',JSON.stringify([...s].slice(-3000)));}
function applyCloudState(remote){
  /* ARRASTO EM ANDAMENTO ou JANELA PÓS-DROP: não aplica a puxada da nuvem agora. O merge por
     item regravava por cima do cartão recém-solto (dado remoto/velho vencia por timestamp),
     o que causava o "solta e volta pro mesmo lugar". O tick de 6s reaplica assim que o
     arrasto acabar e a gravação do drop confirmar. typeof guard: applyCloudState mora em
     outro bloco de script, a flag pode ainda não existir na 1ª carga. */
  if(typeof WFA_DRAGGING!=='undefined' && (WFA_DRAGGING || (typeof WFA_DROP_ATE!=='undefined' && Date.now() < WFA_DROP_ATE))) return false;
  WFA_CLOUD_MUTED=true;
  // mudou=false ao fim => o remoto era idêntico ao local => NÃO re-renderiza nada.
  // (Era o re-render incondicional a cada 6s que fazia o app inteiro piscar em branco.)
  let mudou=false;const pushKeys=[];const mudouK=new Set();
  const setIfDiff=(key,str)=>{if(localStorage.getItem(key)!==str){WFA_LS_SET(key,str);mudou=true;mudouK.add(key);}};
  // 1) une a lápide (remoto + local) antes de mesclar as listas
  let deletedSet=loadDeleted();
  let lapideIncompleta=false; // servidor sem algum id que temos: reempurra a união
  try{ let rd=remote['wfa-deleted-ids']; if(typeof rd==='string')rd=JSON.parse(rd);
    if(Array.isArray(rd)){ const rs=new Set(rd); rd.forEach(i=>deletedSet.add(i));
      if('wfa-deleted-ids' in remote)deletedSet.forEach(i=>{if(!rs.has(i))lapideIncompleta=true;}); } }catch(e){}
  setIfDiff('wfa-deleted-ids',JSON.stringify([...deletedSet].slice(-3000)));
  if(lapideIncompleta)pushKeys.push('wfa-deleted-ids');
  // Notificações lidas: UNIÃO remoto+local (como a lápide). Antes o "lido" vivia só no
  // aparelho e todo navegador novo voltava com 99+ no sino.
  try{ let rr=remote['wfa-notif-read']; if(typeof rr==='string')rr=JSON.parse(rr);
    if(Array.isArray(rr)&&rr.length){const s=new Set();try{JSON.parse(localStorage.getItem('wfa-notif-read')||'[]').forEach(i=>s.add(i));}catch(e){}
      rr.forEach(i=>s.add(i));setIfDiff('wfa-notif-read',JSON.stringify([...s].slice(-2000)));} }catch(e){}
  Object.entries(remote||{}).forEach(([key,value])=>{
    if(!isWfaCloudKey(key)||key==='wfa-deleted-ids'||key==='wfa-notif-read')return;
    // DELEÇÃO propaga entre dispositivos: removeItem grava null no servidor. Ao ver null aqui
    // (reset de brand, checklist etc.), apaga o valor local. Sem isto, a deleção ressuscitava.
    // Protege se o usuário acabou de recriar a chave (dirty/janela recente).
    if(value==null){ if(!wfaLocalAuth(key)&&localStorage.getItem(key)!=null){WFA_LS_REMOVE(key);mudou=true;mudouK.add(key);} return; }
    // Objeto keyed por clienteId (não-array): merge por cliente para dois membros não se sobrescreverem
    if(key==='wfa-cliente-detalhes'){
      let rObj=value;if(typeof rObj==='string'){try{rObj=JSON.parse(rObj);}catch(e){rObj={};}}
      if(rObj&&typeof rObj==='object'&&!Array.isArray(rObj)){
        let lObj={};try{lObj=JSON.parse(localStorage.getItem(key)||'{}');}catch(e){}
        const merged=wfaLocalAuth(key)?Object.assign({},rObj,lObj):Object.assign({},lObj,rObj);
        setIfDiff(key,JSON.stringify(merged));return;
      }
    }
    // Listas append-heavy (server + cliente escrevem): MESCLA por id (nunca sobrescreve cego)
    if(WFA_MERGE_KEYS.includes(key)){
      let rArr=value; if(typeof rArr==='string'){try{rArr=JSON.parse(rArr);}catch(e){rArr=[];}}
      if(Array.isArray(rArr)){
        let lArr=[];try{lArr=JSON.parse(localStorage.getItem(key)||'[]');}catch(e){}
        // local vence conflitos enquanto autoritário (dirty ou janela recente); projetos mesclam tarefa por tarefa
        let merged=(key==='wfa-projetos')?wfaMergeProjetos(rArr,lArr,wfaLocalAuth(key),deletedSet):wfaMergeById(rArr,lArr,wfaLocalAuth(key));
        if(WFA_TOMBSTONE_KEYS.includes(key))merged=merged.filter(o=>!deletedSet.has(o.id)); // remove apagados
        setIfDiff(key,JSON.stringify(merged));
        wfaSnapKey(key,merged); // baseline do carimbo `up` acompanha o estado recém-aplicado
        // A UNIÃO VOLTA PRO SERVIDOR: se a mescla tem item que o remoto não tem, OU um item
        // mais novo que o do remoto (carimbo `up` local venceu), reempurra a lista mesclada.
        // Antes só reempurrava por id faltando: a versão velha ficava no servidor e os outros
        // aparelhos viam o cartão na coluna antiga. O servidor agora mescla por item também
        // (src/lib/merge-estado.js), então reempurrar é idempotente e converge.
        try{
          const rMap=new Map(rArr.filter(o=>o&&o.id).map(o=>[o.id,wfaJsonCanon(o)]));
          if(merged.length!==rMap.size||merged.some(o=>rMap.get(o.id)!==wfaJsonCanon(o)))pushKeys.push(key);
        }catch(e){}
        return;
      }
    }
    if(wfaLocalAuth(key))return; // demais chaves: protege mudança local não confirmada (dirty ou janela recente)
    setIfDiff(key,typeof value==='string'?value:JSON.stringify(value));
  });
  WFA_CLOUD_MUTED=false;
  pushKeys.forEach(k=>{try{cloudSave(k,localStorage.getItem(k));}catch(e){}});
  try{const mj=JSON.stringify([WFA_MEMBER,WFA_MEMBERS]);if(mj!==window._wfaMemberJson){window._wfaMemberJson=mj;mudou=true;}}catch(e){}
  const _primeira=!window._wfaAppliedOnce;
  if(_primeira){window._wfaAppliedOnce=true;mudou=true;} // 1ª aplicação sempre pinta a tela
  if(!mudou)return true; // nada mudou: mantém o DOM em paz (sem piscada, sem perder foco/scroll)
  // RENDER SELETIVO: os boards pesados (tarefas/CRM/demandas/rotinas) só reconstroem o DOM
  // quando a chave DELES mudou (lápide conta: pode remover item). O resto é leve e roda sempre.
  const _rr=(...ks)=>_primeira||ks.some(k=>mudouK.has(k));
  state.tarefas=JSON.parse(localStorage.getItem('wfa-tarefas')||'[]');
  if(typeof wfaTarefaSnapshot==='function')wfaTarefaSnapshot();
  if(_primeira&&typeof taskSaneiaOrdem==='function')setTimeout(taskSaneiaOrdem,1200);   // ordem legada, uma vez so
  state.regua=JSON.parse(localStorage.getItem('wfa-regua')||'{}');
  // ANTI-PERDA: chaves de objeto único (não-mescladas) NÃO podem reidratar de uma
  // versão antiga enquanto há edição local não confirmada (dirty). Senão o que o
  // Gabriel acabou de digitar "some sozinho" na próxima puxada de 6s.
  if(!wfaLocalAuth('wfa-cobranca'))state.cobranca=JSON.parse(localStorage.getItem('wfa-cobranca')||'{}');
  if(!wfaLocalAuth('wfa-acerto'))state.acerto=JSON.parse(localStorage.getItem('wfa-acerto')||'{}');
  if(!wfaLocalAuth('wfa-planilha'))state.planilha=JSON.parse(localStorage.getItem('wfa-planilha')||'null');
  // WhatsApp: so re-hidrata se o remoto realmente trouxe a chave (o load leve nao traz)
  // e derruba o cache preguicoso em vez de parsear MBs a cada tique de sync
  if(remote&&remote['wfa-whatsapp']!=null&&!wfaLocalAuth('wfa-whatsapp'))state._wpp=null;
  state.notificacoes=JSON.parse(localStorage.getItem('wfa-notificacoes')||'[]');
  state.planejamento=JSON.parse(localStorage.getItem('wfa-planejamento')||'{}');
  state.criativos=JSON.parse(localStorage.getItem('wfa-criativos')||'{}');
  state.gcal=JSON.parse(localStorage.getItem('wfa-gcal')||'{}');
  const jornada=JSON.parse(localStorage.getItem('wfa-jornada')||'null');
  if(jornada&&typeof jornada==='object')SPRINTS.forEach(sp=>{sp.clis=jornada[sp.n]||[];});
  if(typeof rebuildPeople==='function')rebuildPeople();if(typeof fillRespSelects==='function')fillRespSelects();
  renderClientes();renderSprints();if(_rr('wfa-tarefas','wfa-clientes-custom','wfa-deleted-ids','wfa-projetos'))renderTarefas();if(_rr('wfa-projetos')&&typeof renderProjetos==='function'&&document.getElementById('page-projetos')&&document.getElementById('page-projetos').classList.contains('active')){try{renderProjetos();}catch(e){}}renderRegua();updateBadges();renderGcal();renderFin();if(_rr('wfa-demandas','wfa-deleted-ids'))renderDemandas();if(_rr('wfa-rotinas','wfa-deleted-ids'))renderRotinas();renderOkrs();renderProcessos();renderMeuDia();renderIdentity();applyAccess();if(typeof renderCobranca==='function')renderCobranca();if(typeof renderAcerto==='function')renderAcerto();if(typeof renderPlanilha==='function'&&!(typeof planIsEditing==='function'&&planIsEditing()))renderPlanilha();if(typeof planAutoSeed==='function')planAutoSeed();if(typeof renderWhatsapp==='function'&&_rr('wfa-whatsapp'))renderWhatsapp();if(typeof renderNotificacoes==='function')renderNotificacoes();
  if(typeof renderCrm==='function'&&_rr('wfa-crm','wfa-deleted-ids'))renderCrm();
  if(typeof renderWidgets==='function')renderWidgets(); // Meu Painel é a home: widgets refletem os dados sincronizados
  if(typeof renderAlpha==='function'&&document.getElementById('page-alpha')&&document.getElementById('page-alpha').classList.contains('active'))renderAlpha();
  if(typeof renderAgenda==='function')renderAgenda();
  if(typeof renderComercialMes==='function')renderComercialMes();
  if(typeof restoreLastPage==='function')restoreLastPage(); // volta p/ a aba que estava (1x, após RBAC)
  if(typeof applyBrand==='function')applyBrand(); // aplica marca White Label sincronizada
  return true;
}
/* ===== LIMPEZA ÚNICA DO CONSELHO (pedido do Gabriel, 16/06) =====
   O conselho vinha empilhando tarefa sem fim (130-140 cartões). Esta rotina, UMA vez por
   aparelho, joga toda tarefa criada pelo Conselho de IA — e qualquer tarefa que tinha sido
   excluída e voltou (lápide) — pra CONCLUÍDO. Não apaga nada: só tira do caminho pra o time
   ver só o que ele consegue executar. Idempotente: tarefa já concluída não é tocada. */
function wfaLimpezaConselhoV1(){
  try{
    if(localStorage.getItem('wfa-limpeza-conselho-v1')==='1')return;
    let ts=[];try{ts=JSON.parse(localStorage.getItem('wfa-tarefas')||'[]');}catch(e){localStorage.setItem('wfa-limpeza-conselho-v1','1');return;}
    if(!Array.isArray(ts)){localStorage.setItem('wfa-limpeza-conselho-v1','1');return;}
    const del=(typeof loadDeleted==='function')?loadDeleted():new Set();
    let n=0;
    ts.forEach(t=>{
      if(!t||t.status==='concluido')return;
      const ehConselho=t.origem==='conselho'||t.origem==='conselho-auto'||t.origem==='conselho-ideia'||(Array.isArray(t.tags)&&t.tags.includes('conselho'));
      const voltouDaLapide=t.id&&del.has(t.id);
      if(ehConselho||voltouDaLapide){t.status='concluido';t.concluidaEm=new Date().toISOString();n++;}
    });
    localStorage.setItem('wfa-limpeza-conselho-v1','1');
    if(n){
      state.tarefas=ts;
      localStorage.setItem('wfa-tarefas',JSON.stringify(ts)); // intercept -> marca dirty + sobe pra nuvem
      if(typeof renderTarefas==='function')renderTarefas();
      if(typeof renderSprints==='function')renderSprints();
      if(typeof updateBadges==='function')updateBadges();
      if(typeof renderMeuDia==='function')renderMeuDia();
      if(typeof toast==='function')toast('🧹 '+n+' tarefa(s) do conselho movidas para Concluído');
    }
  }catch(e){/* nunca derruba o boot */}
}
/* ===== SEED de clientes pedidos pelo Gabriel (16/06 + 03/07): 4B, Sabor e Lenha, The Guste e Café Lumiere =====
   Entram como clientes PERSONALIZADOS (editáveis pela interface e sincronizados). Roda PÓS-sync
   (dados já mesclados da nuvem) pra nunca sobrescrever a lista existente. Idempotente: não
   duplica se o cliente já existir (por nome) na base ou nos personalizados. valor=0 mantém
   fora da Cobrança até o Gabriel definir plano/valor no botão Editar. */
function wfaSeedClientesV1(){
  try{
    if(localStorage.getItem('wfa-seed-clientes-v6')==='1')return;
    const novos=[
      {id:'pizzaria-sabor-e-lenha',nm:'Pizzaria Sabor e Lenha',tipo:'ARK',plano:'A definir',valor:0,cap:0,status:'gr',meta:'Novo cliente · ajuste plano e valor no botão Editar',extra:'Pizzaria'},
      {id:'dgust',nm:'Pizzaria Dgust',tipo:'ARK',plano:'A definir',valor:0,cap:0,status:'gr',meta:'Novo cliente · ajuste plano e valor no botão Editar',extra:'Pizzaria'},
      {id:'cafe-lumiere',nm:'Café Lumière',tipo:'ARK',plano:'A definir',valor:0,cap:0,status:'gr',meta:'Novo cliente · ajuste plano e valor no botão Editar',extra:'Cafeteria'},
      {id:'kopi-coffee',nm:'Kopi Coffee',tipo:'ARK',plano:'A definir',valor:0,cap:0,status:'gr',meta:'Novo cliente · ajuste plano e valor no botão Editar',extra:'Cafeteria'},
    ];
    const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'').trim();
    const todos=(typeof CLIENTES!=='undefined'?CLIENTES:CLIENTES_BASE);
    const existentes=new Set(todos.map(c=>norm(c.nm)));
    const arr=loadClientesCustom().filter(c=>c.id!=='the-guste'&&norm(c.nm)!=='pizzariatheguste');
    // dedup do 4B: grafias Burger/Burguer/Burguers duplicavam; fica UMA, com o nome oficial
    let limpou=false;
    for(let i=arr.length-1;i>=0;i--){const n4=norm(arr[i].nm);
      if(n4==='4bburguer'||n4==='4bburger'||n4==='4bburguers'){arr.splice(i,1);limpou=true;}}
    arr.forEach(c=>{if(c.id==='cafe-lumiere')c.nm='Café Lumière';}); // corrige grafia do seed v2
    let add=0;
    novos.forEach(n=>{ if(!existentes.has(norm(n.nm))&&!arr.some(c=>c.id===n.id||norm(c.nm)===norm(n.nm))){ arr.push(n); add++; } });
    localStorage.setItem('wfa-seed-clientes-v6','1');
    if(add||limpou){
      saveClientesCustom(arr); // persiste, reconstrói CLIENTES, re-renderiza e sincroniza
      if(typeof fillClienteSelects==='function')fillClienteSelects();
      if(typeof toast==='function')toast('✓ '+add+' cliente(s) adicionado(s): '+novos.map(n=>n.nm).join(' · '));
    }
  }catch(e){/* nunca derruba o boot */}
}
/* ===== SEED de ROTINAS por area (pedido do Gabriel, 03/07): as rotinas semanais dos
   meninos, correlatas aos processos de cada funcao (relatorio semanal, otimizacao
   semanal, criativo semanal...). Idempotente por titulo; roda pos-sync junto do seed
   de clientes. Elas viram tarefa no board automaticamente nos dias certos. */
function wfaSeedRotinasV1(){
  try{
    if(localStorage.getItem('wfa-seed-rotinas-v1')==='1')return;
    const novas=[
      {titulo:'Otimização semanal das campanhas (todos os clientes)',freq:'Semanal',dia:'Segunda',hora:'09:00',resp:'Danilo de Lima'},
      {titulo:'Relatório semanal de tráfego por cliente',freq:'Semanal',dia:'Sexta',hora:'16:00',resp:'Danilo de Lima'},
      {titulo:'Criativo semanal: pauta e produção da semana',freq:'Semanal',dia:'Segunda',hora:'10:00',resp:'Maria Luiza'},
      {titulo:'Relatório semanal pro cliente (entregas e resultados)',freq:'Semanal',dia:'Sexta',hora:'15:00',resp:'Lucas Rosi'},
      {titulo:'Ativação diária dos grupos dos clientes',freq:'Diária',dia:'',hora:'09:30',resp:'Lucas Rosi'},
      {titulo:'Fechamento semanal de edições (fila zerada)',freq:'Semanal',dia:'Quinta',hora:'14:00',resp:'Samuel Magalhães'},
      {titulo:'Agenda de captações da semana confirmada',freq:'Semanal',dia:'Segunda',hora:'11:00',resp:'Samuel Magalhães'},
      {titulo:'Artes e criativos da semana (demandas de design)',freq:'Semanal',dia:'Terça',hora:'10:00',resp:'M. Portela'},
      {titulo:'Revisão semanal do pipeline comercial',freq:'Semanal',dia:'Segunda',hora:'14:00',resp:'Saulo'},
    ];
    const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
    const arr=loadRot();
    const jaTem=new Set(arr.map(r=>norm(r.titulo)));
    let add=0;
    novas.forEach((n,i)=>{ if(!jaTem.has(norm(n.titulo))){ arr.push({id:'rseed'+Date.now()+i,ativo:true,...n}); add++; } });
    localStorage.setItem('wfa-seed-rotinas-v1','1');
    if(add){ saveRot(arr); if(typeof toast==='function')toast('✓ '+add+' rotinas da equipe adicionadas'); }
  }catch(e){/* nunca derruba o boot */}
}
function isEmptyCloudValue(v){return v==null||(Array.isArray(v)&&v.length===0)||(typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===0)||v==='';}
async function bootCloudSync(){
  try{
    if(!(await wfaConfirmaSessao()))return;   // sessao invalida: ja redirecionou pro /auth
    const local=collectLocalCloudState();
    const res=await cloudCall('load');
    const remote=res.state||{};
    WFA_MEMBER=res.member||null;WFA_MEMBERS=res.members||[];
    const upload={};
    // Semeia o servidor com dados locais quando a chave NUNCA existiu lá (ou está vazia mas
    // não nula). null no servidor = deleção explícita: NÃO ressuscita (senão a exclusão volta).
    Object.entries(local).forEach(([key,value])=>{if(remote[key]!==null&&isEmptyCloudValue(remote[key])&&!isEmptyCloudValue(value))upload[key]=value;});
    if(Object.keys(upload).length){
      await cloudCall('save',{action:'save-many',entries:upload});
      Object.assign(remote,upload);
    }
    applyCloudState(remote);
    if(res.t)WFA_STATE_T=res.t; // carimbo pro sync condicional dos próximos ticks
    WFA_CLOUD_READY=true;
    localStorage.setItem('wfa-cloud-last-sync',new Date().toISOString());
    toast('✓ Sincronizado');
    atualizarBadgeSync(true);
    iniciarAutoSync();
    // CONSELHO PARADO (pedido do Gabriel, 16/06): NÃO dispara mais debate automático todo
    // dia — isso enchia o sistema de notificação e tarefa. O conselho só roda quando ele
    // aperta "Rodar conselho agora". // arkDailyAgentsKick();
    wfaLimpezaConselhoV1(); // limpeza única: tarefas do conselho/ressuscitadas -> Concluído
    wfaSeedClientesV1();     // adiciona 4B Burguer e Pizzaria Sabor e Lenha (1x, idempotente)
    wfaSeedRotinasV1();      // rotinas semanais da equipe (1x, idempotente)
    // Seeds que ANTES rodavam no parse (e apagavam dados em navegador novo): agora aqui,
    // com a lista real do servidor já aplicada, então só ACRESCENTAM.
    seedValhalla();seedSamuel();seedProcessos();saneamentoCarteira();saneamentoBriefingV2();migraNomesEquipe();
    wfaSeedHistoricoCob(['2026-06','2026-07']);   // preenche jun/jul como cobrado
    if(WFA_WPP_OFF){try{document.querySelectorAll('[data-nav="whatsapp"]').forEach(el=>el.style.display='none');}catch(e){}}
    try{onboardMaybeAuto();}catch(e){} // tour de boas-vindas no 1º acesso
  }catch(err){
    WFA_CLOUD_READY=false;
    atualizarBadgeSync(false);
    // Só avisa UMA vez (não a cada retry de 10s) — e de forma calma. Os dados ficam locais.
    if(!window._wfaBootWarned){window._wfaBootWarned=true;toast('Conectando ao servidor…');}
    // Tenta novamente em 10 segundos
    setTimeout(bootCloudSync,10000);
  }
}
// silent=true (auto-sync de 6s): NUNCA mostra toast de erro — blips de rede são normais e
// os dados não se perdem (fila de reenvio). Só o clique manual no botão avisa em caso de erro.
// SYNC CONDICIONAL: guarda o carimbo (updated_at máximo) do último estado aplicado e manda
// como ?since= — se nada mudou no servidor, a resposta é minúscula ({unchanged:true}) e o
// Worker quase não gasta CPU (menos Error 1102). A cada 10 ticks força um load completo de
// segurança, cobrindo qualquer escritor que não bumpe o updated_at.
let WFA_STATE_T=null;let _wfaSyncN=0;
async function sincronizarAgora(silent){
  const btn=document.getElementById('btn-sync');
  if(btn&&!silent){btn.disabled=true;btn.textContent='↻ Sincronizando...';}
  try{
    _wfaSyncN++;
    const since=(WFA_STATE_T&&_wfaSyncN%10!==0)?WFA_STATE_T:null;
    const res=await cloudCall('load',since?{since}:undefined);
    let aplicou=true;
    if(!(res&&res.unchanged)){
      const remote=res.state||{};
      WFA_MEMBER=res.member||WFA_MEMBER;WFA_MEMBERS=res.members||WFA_MEMBERS;
      aplicou=applyCloudState(remote)!==false;
    }
    /* O carimbo só avança quando a resposta foi APLICADA (10/09/2026). Antes avançava antes
       do applyCloudState, que durante o arrasto (e por 8s depois do drop) descarta a resposta:
       as mudanças dos colegas naquele intervalo sumiam deste aparelho até o load completo de
       60s, e qualquer gravação local nesse meio tempo subia a lista SEM elas (perda real). */
    if(aplicou&&res&&res.t)WFA_STATE_T=res.t;
    WFA_CLOUD_READY=true;
    localStorage.setItem('wfa-cloud-last-sync',new Date().toISOString());
    atualizarBadgeSync(true);
  }catch(err){
    atualizarBadgeSync(false);
    if(!silent)toast('Erro ao sincronizar: '+(err?.message||'verifique a conexão'));
  }finally{
    if(btn&&!silent){btn.disabled=false;btn.textContent='↻ Sincronizar';}
  }
}
// Badge tolerante: 1-2 falhas seguidas (blip) NÃO assustam; só depois de 3 mostra "reconectando"
// (calmo, não vermelho de pânico). Qualquer sucesso zera e volta ao ✓ na hora.
let WFA_SYNC_FAILS=0;
/* Rede de seguranca do badge (11/09/2026): o Gabriel viu "Salvando..." preso com a fila vazia (aba em
   segundo plano nao roda o tick de 6s, e o texto so mudava no proximo sucesso). Toda vez que o badge
   diz "Salvando...", um timer reconfere 2,5s depois: fila e pendencias vazias e nada em voo = "Salvo". */
let _wfaBadgeTimer=null;
function wfaBadgeRecheck(){
  if(_wfaBadgeTimer)clearTimeout(_wfaBadgeTimer);
  _wfaBadgeTimer=setTimeout(()=>{_wfaBadgeTimer=null;
    if(!WFA_PENDING.size&&!WFA_DIRTY.size&&!_wfaFlushing)atualizarBadgeSync(true);else{if(WFA_PENDING.size&&WFA_CLOUD_READY&&!_wfaFlushing)wfaFlush();wfaBadgeRecheck();}},2500);
}
function atualizarBadgeSync(ok){
  const el=document.getElementById('sync-status');
  if(!el)return;
  /* Estados de gravação (10/09/2026): a pessoa precisa saber se o que fez já está na nuvem.
     'salvando' = há escrita na fila; 'retry' = a gravação falhou e vai tentar de novo (o dado
     está guardado no aparelho, nada se perde); true = tudo confirmado. */
  if(ok==='salvando'){el.textContent='Salvando…';el.style.color='var(--mute)';el.title='Gravando na nuvem';wfaBadgeRecheck();return;}
  if(ok==='retry'){WFA_SYNC_FAILS++;el.textContent='⚠ Não salvou ainda · tentando de novo';el.style.color='var(--yel,#b38600)';el.title='Sem conexão com o servidor. O dado está guardado neste aparelho e sobe sozinho quando a rede voltar.';return;}
  if(ok){
    WFA_SYNC_FAILS=0;
    if((typeof WFA_PENDING!=='undefined'&&WFA_PENDING.size)||(typeof WFA_DIRTY!=='undefined'&&WFA_DIRTY.size)){el.textContent='Salvando…';el.style.color='var(--mute)';wfaBadgeRecheck();return;}
    const agora=new Date();
    const h=String(agora.getHours()).padStart(2,'0');
    const m=String(agora.getMinutes()).padStart(2,'0');
    el.textContent=`✓ Salvo ${h}:${m}`;el.style.color='var(--mute)';el.title='Tudo gravado na nuvem';
  }else{
    WFA_SYNC_FAILS++;
    if(WFA_SYNC_FAILS>=3){el.textContent='↻ reconectando…';el.style.color='var(--mute)';}
    // 1-2 falhas: não mexe no badge (provavelmente só um blip — os dados estão a salvo)
  }
}
let _autoSyncStarted=false;
function iniciarAutoSync(){
  // bootCloudSync roda a cada sucesso E é chamado por ações do WhatsApp (avatares, marcar
  // lido) que se auto-encadeiam a cada 1,2s. Sem esta trava, cada chamada empilhava mais um
  // par de intervalos 6s/3,5s, disparando dezenas de GETs concorrentes e piorando as corridas.
  if(_autoSyncStarted)return;
  _autoSyncStarted=true;
  /* Gravacao pendente sobe mesmo com a aba em segundo plano (seguranca do dado); so a puxada espera a aba voltar. */
  setInterval(()=>{if(!WFA_CLOUD_READY)return;wfaFlush();if(document.visibilityState!=='hidden')sincronizarAgora(true);},6000);
  // WhatsApp aberto = mensagens chegam mais rápido: puxa a cada 3,5s enquanto a aba está ativa.
  setInterval(()=>{const wp=document.getElementById('page-whatsapp');if(WFA_CLOUD_READY&&document.visibilityState!=='hidden'&&wp&&wp.classList.contains('active')){sincronizarAgora(true);}},3500);
  document.addEventListener('visibilitychange',()=>{
    if(!WFA_CLOUD_READY)return;
    if(document.visibilityState==='visible'){wfaFlush();sincronizarAgora(true);}
    // MOBILE: ao trocar de app/minimizar a página fica "hidden" (e o celular NÃO dispara
    // beforeunload de forma confiável) -> dá o flush AGORA pra não perder o que foi digitado.
    else{try{wfaFlush();}catch(e){}}
  });
  // pagehide é o evento confiável no mobile (Safari/Chrome) ao fechar/navegar
  window.addEventListener('pagehide',()=>{try{wfaFlush();}catch(e){}});
  // tenta reenviar pendências antes de fechar/atualizar a aba (desktop)
  window.addEventListener('beforeunload',()=>{try{wfaFlush();}catch(e){}});
  // Iframes (propostas.html) escrevem no localStorage do mesmo origin; o evento storage
  // chega nesta janela pai — captura e enfileira pra nuvem os keys wfa-* que eles gravam.
  window.addEventListener('storage',function(e){if(e.key&&isWfaCloudKey(e.key)&&WFA_CLOUD_READY)cloudSave(e.key,e.newValue);});
}
          (function(){
            const KEY='wfa-okrs-edits';
            const cells=document.querySelectorAll('#page-okrs td[contenteditable="true"]');
            const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
            cells.forEach((c,i)=>{
              const id='okr-'+(c.closest('table')?.dataset.okrKey||'x')+'-'+i;
              c.dataset.id=id;
              if(saved[id]!=null) c.textContent=saved[id];
              c.addEventListener('blur',()=>{
                const data=JSON.parse(localStorage.getItem(KEY)||'{}');
                data[id]=c.textContent;
                localStorage.setItem(KEY,JSON.stringify(data));
              });
            });
          })();
        