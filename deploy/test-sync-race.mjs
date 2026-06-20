// Teste isolado da corrida de sync que faz a tarefa "voltar pra coluna anterior"
// ao ser concluída. Reproduz wfaMergeById + a política de conflito (dirty-only vs
// janela de autoridade local). Roda com: node deploy/test-sync-race.mjs
// Não depende do browser — replica só a lógica de merge relevante.

// --- cópia fiel de wfaMergeById (public/workflowark.html) ---
function wfaMergeById(remoteArr, localArr, localPrevalece) {
  const byId = {}; const order = [];
  (Array.isArray(remoteArr) ? remoteArr : []).forEach(o => { if (o && o.id) { if (!(o.id in byId)) order.push(o.id); byId[o.id] = o; } });
  (Array.isArray(localArr) ? localArr : []).forEach(o => { if (o && o.id) { if (!(o.id in byId)) { order.push(o.id); byId[o.id] = o; } else if (localPrevalece) byId[o.id] = o; } });
  return order.map(id => byId[id]);
}

let failures = 0;
function assert(cond, msg) { if (!cond) { console.error('  ✗ FALHOU: ' + msg); failures++; } else { console.log('  ✓ ' + msg); } }

// Cenário comum: load dos 6s saiu com a foto ANTIGA (andamento). No meio do caminho
// o usuário concluiu a tarefa (concluido), empurrou e o dirty JÁ foi limpo. O load
// antigo volta agora e o applyCloudState mescla.
const remoteStale = [{ id: 't1', status: 'andamento' }];   // foto velha do servidor
const localFresh  = [{ id: 't1', status: 'concluido' }];   // o que o usuário acabou de fazer

console.log('\n[1] Comportamento ANTIGO (conflito resolvido só por dirty, já limpo):');
{
  const dirty = false; // push confirmou e limpou o dirty
  const merged = wfaMergeById(remoteStale, localFresh, dirty);
  // bug: remoto vence -> tarefa volta pra "andamento"
  assert(merged[0].status === 'andamento', 'BUG reproduzido: tarefa reverteu para "andamento"');
}

console.log('\n[2] Comportamento NOVO (janela de autoridade local cobre o load em voo):');
{
  // wfaLocalAuth = dirty || (recentemente escrita há < 15s)
  const dirty = false;
  const recentExpira = Date.now() + 15000; // escrita há instantes
  const localAuth = dirty || recentExpira > Date.now();
  const merged = wfaMergeById(remoteStale, localFresh, localAuth);
  assert(merged[0].status === 'concluido', 'CORRIGIDO: tarefa permanece "concluido"');
}

console.log('\n[3] Após a janela expirar, remoto legítimo volta a valer (sem travar edição de terceiros):');
{
  const dirty = false;
  const recentExpira = Date.now() - 1; // janela já expirou
  const localAuth = dirty || recentExpira > Date.now();
  const remoteNew = [{ id: 't1', status: 'aprovacao' }]; // outra pessoa moveu de verdade
  const merged = wfaMergeById(remoteNew, [{ id: 't1', status: 'concluido' }], localAuth);
  assert(merged[0].status === 'aprovacao', 'Mudança remota legítima aplicada após a janela');
}

console.log('\n[4] Append do servidor (conselho) nunca some, mesmo com autoridade local:');
{
  const remote = [{ id: 'srv1', status: 'backlog' }, { id: 't1', status: 'andamento' }];
  const local  = [{ id: 't1', status: 'concluido' }];
  const merged = wfaMergeById(remote, local, true);
  assert(merged.some(o => o.id === 'srv1'), 'Tarefa nova do servidor preservada');
  assert(merged.find(o => o.id === 't1').status === 'concluido', 'Edição local preservada no merge');
}

console.log('\n' + (failures ? `RESULTADO: ${failures} falha(s)` : 'RESULTADO: todos os testes passaram ✓'));
process.exit(failures ? 1 : 0);
