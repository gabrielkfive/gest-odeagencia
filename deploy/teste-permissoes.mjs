/*
 Teste da matriz de papéis e permissões (src/lib/permissoes.js), 24/09/2026.
 Garante: padrão igual ao acesso de antes, matriz do papel sobrepõe o padrão, ajuste da pessoa
 sobrepõe a matriz, admin vê tudo, blocos financeiros e Editar respeitados no servidor.
 Uso: node deploy/teste-permissoes.mjs
*/
import { readFileSync } from 'node:fs';
import {
  AREAS, PAPEIS, NAV_CHAVES, navPadrao, navEfetivo, limparMatriz, celulaPadrao,
  podeVerBloco, podeEditarBloco, areaDoBloco, ajustesDaPessoa,
} from '../src/lib/permissoes.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

// Acesso de antes (ROLE_ACCESS do app até 22/09), copiado aqui para travar a regressão.
const BASE = ['dashboard', 'reunioes', 'agenda', 'organograma', 'pops', 'processos', 'meumes'];
const ANTES = {
  comercial: BASE.concat(['comercial', 'crm', 'lista-clientes', 'jornada', 'regua', 'tarefas']),
  operacao: BASE.concat(['tarefas', 'rotinas', 'demandas', 'lista-clientes', 'jornada', 'regua', 'campanhas', 'okrs']),
  marketing: BASE.concat(['tarefas', 'demandas', 'lista-clientes', 'campanhas']),
  financeiro: BASE.concat(['financeiro', 'cobranca', 'campanhas']),
  viewer: BASE,
};

// 1. Toda aba do menu (menos notificações, que é por pessoa) cai em exatamente uma área.
const naArea = NAV_CHAVES.filter((k) => k !== 'notificacoes');
const contagem = naArea.map((k) => AREAS.filter((a) => a.nav.includes(k)).length);
ok(contagem.every((n) => n === 1), 'cada aba do menu pertence a uma área só');

// 2. Sem matriz, o acesso é o de antes.
for (const [papel, lista] of Object.entries(ANTES)) {
  const nav = navEfetivo({ role: papel }, null);
  const igual = NAV_CHAVES.every((k) => nav[k] === lista.includes(k));
  ok(igual, `sem matriz, ${papel} vê as mesmas abas de antes`);
}
const gestor = navEfetivo({ role: 'gestor' }, null);
ok(gestor.cobranca && gestor.financeiro && !gestor.acerto && !gestor.notificacoes, 'gestor vê financeiro e cobrança, não vê acerto nem notificações');
const admin = navEfetivo({ role: 'admin' }, { admin: { financeiro: { ver: false } } });
ok(NAV_CHAVES.every((k) => admin[k]), 'admin vê tudo, mesmo com matriz tentando fechar');

// 3. Matriz do papel sobrepõe o padrão na área inteira.
const m1 = limparMatriz({ operacao: { financeiro: { ver: true, editar: false } }, comercial: { atividades: { ver: false } } });
const op = navEfetivo({ role: 'operacao' }, m1);
ok(op.financeiro && op.cobranca, 'matriz libera Financeiro inteiro para operação');
const com = navEfetivo({ role: 'comercial' }, m1);
ok(!com.tarefas, 'matriz fecha Atividades para comercial');

// 4. Ajuste da pessoa: só o que difere do padrão do papel conta.
const legado = { role: 'comercial', permissions: { nav: Object.fromEntries(NAV_CHAVES.map((k) => [k, ANTES.comercial.includes(k)])) } };
ok(!navEfetivo(legado, m1).tarefas, 'mapa completo antigo igual ao padrão não trava a matriz');
const pessoal = { role: 'comercial', permissions: { ajustes: { tarefas: true, acerto: true } } };
const np = navEfetivo(pessoal, m1);
ok(np.tarefas && np.acerto, 'ajuste da pessoa que difere do padrão vence a matriz');
ok(JSON.stringify(ajustesDaPessoa('comercial', { tarefas: true, crm: true, acerto: false }, null)) === JSON.stringify({}), 'ajustesDaPessoa descarta o que é igual ao papel');
ok(ajustesDaPessoa('comercial', { tarefas: true }, m1).tarefas === true, 'com a matriz fechando Atividades, manter Tarefas vira ajuste');
const legadoAcerto = { role: 'gestor', permissions: { nav: { acerto: true, cobranca: true } } };
ok(navEfetivo(legadoAcerto, limparMatriz({ gestor: { financeiro: { ver: false } } })).acerto && !navEfetivo(legadoAcerto, limparMatriz({ gestor: { financeiro: { ver: false } } })).cobranca, 'mapa antigo: liberação de acerto vale, cobrança igual ao padrão segue a matriz');
ok(ajustesDaPessoa('comercial', { crm: false }, null).crm === false, 'ajustesDaPessoa guarda o que difere');

// 5. limparMatriz: só papel e área conhecidos, admin fora, Editar exige Ver.
const suja = limparMatriz({ admin: { financeiro: { ver: false } }, hacker: { x: 1 }, gestor: { financeiro: { ver: false, editar: true }, inexistente: { ver: true } }, viewer: 'lixo' });
ok(!suja.admin && !suja.hacker && !suja.viewer, 'limparMatriz descarta admin, papel desconhecido e valor inválido');
ok(suja.gestor.financeiro.ver === false && suja.gestor.financeiro.editar === false && !suja.gestor.inexistente, 'Editar sem Ver vira falso e área desconhecida sai');
ok(JSON.stringify(limparMatriz(null)) === '{}', 'matriz nula vira objeto vazio');

// 6. Célula padrão: todo, nada ou parte.
ok(celulaPadrao('gestor', 'financeiro').ver === true, 'gestor tem Financeiro por padrão');
ok(celulaPadrao('viewer', 'financeiro').ver === false, 'viewer não tem Financeiro por padrão');
ok(celulaPadrao('comercial', 'atividades').parcial === true && celulaPadrao('comercial', 'atividades').editar === true, 'comercial tem Atividades em parte (só Tarefas) e edita o que vê');
ok(celulaPadrao('viewer', 'financeiro').editar === false, 'sem ver nada da área, não edita');

// 7. Servidor: blocos financeiros por Ver.
ok(podeVerBloco({ role: 'gestor' }, false, 'wfa-cobranca', null), 'gestor lê cobrança por padrão');
ok(!podeVerBloco({ role: 'operacao' }, false, 'wfa-cobranca', null), 'operação não lê cobrança por padrão');
ok(!podeVerBloco({ role: 'gestor' }, false, 'wfa-acerto', null), 'gestor não lê acerto por padrão');
ok(podeVerBloco({ role: 'gestor', permissions: { nav: { acerto: true } } }, false, 'wfa-acerto', null), 'liberação manual antiga de acerto continua valendo');
ok(podeVerBloco({ role: 'gestor', permissions: { ajustes: { acerto: true } } }, false, 'wfa-acerto', null), 'liberação nova de acerto vale');
ok(!podeVerBloco({ role: 'gestor' }, false, 'wfa-cobranca', limparMatriz({ gestor: { financeiro: { ver: false } } })), 'matriz fecha cobrança do gestor no servidor');
ok(podeVerBloco({ role: 'operacao' }, false, 'wfa-cobranca', m1), 'matriz abre cobrança para operação no servidor');
ok(podeVerBloco({ role: 'viewer' }, true, 'wfa-acerto', null), 'isAdmin do contexto lê tudo');
ok(podeVerBloco({ role: 'viewer' }, false, 'wfa-tarefas', null), 'bloco comum continua aberto para leitura');

// 8. Servidor: Editar.
ok(areaDoBloco('wfa-tarefas') === 'atividades' && areaDoBloco('wfa-crm') === 'comercial' && areaDoBloco('wfa-ckl-123') === 'atividades', 'blocos mapeados para a área certa');
ok(areaDoBloco('wfa-notif-read') === null, 'bloco pessoal fica fora da matriz');
ok(podeEditarBloco({ role: 'viewer' }, false, 'wfa-tarefas', null), 'sem matriz, gravação segue como antes');
ok(!podeEditarBloco({ role: 'operacao' }, false, 'wfa-fin', m1), 'Editar desmarcado recusa gravação do bloco');
ok(!podeEditarBloco({ role: 'comercial' }, false, 'wfa-tarefas', m1), 'Ver desmarcado também recusa gravação');
ok(podeEditarBloco({ role: 'operacao' }, true, 'wfa-fin', m1), 'admin grava sempre');
ok(!podeEditarBloco({ role: 'operacao' }, false, 'wfa-acerto', null), 'quem não vê acerto não grava acerto');
ok(podeEditarBloco({ role: 'operacao' }, false, 'wfa-notif-read', m1), 'bloco pessoal grava sempre');

// 9. Papéis conhecidos e cópia do navegador idêntica.
ok(PAPEIS.map((p) => p.v).join() === 'admin,gestor,financeiro,operacao,comercial,marketing,viewer', 'sete papéis do original');
const a = readFileSync(new URL('../src/lib/permissoes.js', import.meta.url), 'utf8');
const b = readFileSync(new URL('../public/workflowark-permissoes-20260924a.js', import.meta.url), 'utf8');
ok(a === b, 'cópia do navegador idêntica à do servidor');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
