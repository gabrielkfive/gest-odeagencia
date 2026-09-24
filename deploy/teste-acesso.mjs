/*
 Teste da regra de entrada de conta nova (src/lib/acesso.js), 24/09/2026.
 Conta nova de fora NÃO entra na operação da ARK: fica pendente até o admin liberar.
 Uso: node deploy/teste-acesso.mjs
*/
import { papelNovoMembro } from '../src/lib/acesso.js';

let falhas = 0;
const ok = (c, m) => { console.log((c ? '  ok  ' : '  X   ') + m); if (!c) falhas++; };

const primeiro = papelNovoMembro({ isFirst: true, existente: null });
ok(primeiro.role === 'admin' && primeiro.active === true, 'primeiro usuário do sistema vira admin ativo');

const estranho = papelNovoMembro({ isFirst: false, existente: null });
ok(estranho.active === false, 'conta nova sem convite fica pendente');
ok(estranho.role === 'viewer', 'e com o menor papel');

const convidado = papelNovoMembro({ isFirst: false, existente: { role: 'operacao', active: true } });
ok(convidado.role === 'operacao' && convidado.active === true, 'convidado pelo gestor entra com o papel escolhido');

const desligado = papelNovoMembro({ isFirst: false, existente: { role: 'gestor', active: false } });
ok(desligado.active === false, 'membro desativado continua desativado ao recriar conta');

const semPapel = papelNovoMembro({ isFirst: false, existente: { role: 'inventado', active: true } });
ok(semPapel.role === 'viewer', 'papel desconhecido vira viewer');

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exit(falhas ? 1 : 0);
