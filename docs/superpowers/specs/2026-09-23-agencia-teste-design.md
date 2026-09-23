# Agência em teste: isolamento, acesso por e-mail e primeiro dia

Data: 23/09/2026. Pedido do Gabriel no áudio de 23/09: o dono de outra agência contrata o
WorkFlowArk, recebe o acesso no e-mail, coloca nome e logo, cadastra os clientes e a equipe
sozinho, e os dados dele nunca se misturam com os da ARK.

## Como o sistema separa dados hoje

Não separa. Levantamento feito no código em 23/09:

1. **Uma base só.** `workflowark_state` é uma tabela chave e valor (`key` é a chave primária,
   por exemplo `wfa-tarefas`). Não existe coluna de agência. Todo membro ativo lê e grava as
   mesmas chaves.
2. **Uma lista de membros só.** `workflowark_members` tem e-mail, papel e permissões, sem
   agência. Quem está na tabela enxerga tudo.
3. **O servidor tem coisas da ARK escritas no código:**
   1. `workflowark.sheet.ts` lê a planilha financeira da ARK por endereço fixo.
   2. `workflowark.social-run.ts` tem o catálogo de clientes da ARK (Vivenda e outros).
   3. `lead-site` grava lead no CRM da ARK.
   4. WhatsApp (Evolution), chave da IA e rotinas usam as credenciais da ARK.
4. **O navegador semeia dados da ARK no primeiro carregamento** (`bootCloudSync`):
   `wfaSeedClientesV1` (clientes da ARK), `wfaSeedRotinasV1` (rotinas com nomes da equipe),
   `seedValhalla`, `seedSamuel`, `seedProcessos`, `wfaSeedHistoricoCob` e outros. Numa base
   nova, isso colocaria clientes e pessoas da ARK na conta do Zezinho.
5. **A marca (`wfa-brand`) fica só no aparelho.** Não está em `WFA_CLOUD_KEYS`.

Conclusão: separar agências dentro da mesma base é mudança estrutural. Não entra em produção
hoje.

## Opções

### Opção 1. Uma instância por agência (recomendada para o teste)

Cada agência ganha o próprio Worker (mesmo código) e o próprio projeto Supabase.

1. Isolamento total por construção: base, membros e segredos separados. Não existe consulta
   que vaze de uma agência para outra, porque não há outra agência na base.
2. Nenhuma mudança no `workflowark.state.ts` nem nas regras de sincronização, que são a parte
   mais sensível do sistema.
3. O que muda no código: um modo "agência" que desliga as sementes da ARK, esconde as abas
   que dependem da ARK e mostra o primeiro dia guiado. Isso já foi feito neste lote
   (`workflowark-agencia-20260923a.js`), sem efeito no domínio da ARK.
4. Custo de infraestrutura: o Worker cabe no plano pago que a ARK já usa na Cloudflare. O
   Supabase cobra por projeto ativo; conferir a tabela em supabase.com/pricing no dia da
   contratação, porque é o custo que define o preço mínimo do plano de teste.
5. Contra: cada atualização do sistema precisa ser publicada em N Workers. Resolve com um
   script que percorre a lista de agências e roda `wrangler deploy` em cada uma.

### Opção 2. Uma base com coluna de agência (multi tenant)

`tenant_id` em `workflowark_members`, chave `t/<tenant>/wfa-...` em `workflowark_state`, e
todo acesso do servidor filtrado pela agência do membro.

1. Custo de infraestrutura quase zero por agência.
2. Contra: são 86 acessos à tabela só no `workflowark.state.ts`, mais agents-run, social-run,
   financeiro-run, portal, approve, bridge, mcp e lead-site. Esquecer um filtro vaza dado de
   uma agência para outra. Exige teste de isolamento automatizado antes de ligar.
3. Faz sentido quando houver volume de agências que torne a Opção 1 cara de manter.

### Opção 3. Um Worker, uma base por agência escolhida pelo endereço

O mesmo Worker escolhe as credenciais do Supabase pelo domínio de entrada.

1. Um deploy só para todas as agências.
2. Contra: o código precisa trocar a origem das credenciais em todos os pontos que hoje leem
   `SUPABASE_URL` fixo. Mudança média, com o mesmo risco de mistura se uma rota esquecer.

## Recomendação

Opção 1 agora, para as primeiras agências em teste. Opção 2 quando o número de agências
justificar, com teste de isolamento automatizado como condição de entrada.

## Acesso chegando no e-mail (fluxo da Opção 1)

1. O formulário da landing grava o pedido (já existe, via `lead-site`).
2. Um Worker de provisionamento, com dois segredos (token da API de gestão do Supabase e
   token da Cloudflare com permissão de Workers), cria o projeto Supabase, roda as migrações
   de `supabase/migrations`, publica o Worker `agencia-<slug>` com as variáveis da nova base e
   cadastra o e-mail do dono como `admin` em `workflowark_members`.
3. O Supabase manda o convite de acesso para o e-mail do dono (convite nativo do Auth).
4. O Worker da agência sobe com `WFA_MODO=agencia` e `WFA_TESTE_ATE=<data de 30 dias>`.
   Depois da data, o `/app` mostra a tela de fim de teste com o botão de contratar.
5. O modo agência também desliga no servidor o que é da ARK: planilha fixa, catálogo do
   social-run, envio de lead para o CRM da ARK, WhatsApp e rotinas automáticas.

Precisa do Gabriel para seguir: criar os dois tokens (Supabase e Cloudflare) e decidir se o
teste roda no plano Pro do Supabase da ARK ou numa organização separada.

## O que a agência consegue fazer sozinha hoje (depois deste lote)

| Precisa | Onde fica | Estado |
|---|---|---|
| Nome e logo da agência | Configurações, aba Conta, Marca | Nome e cor já existiam. Logo agora aceita arquivo do computador, não só endereço |
| Cadastrar cliente | Clientes, Lista de Clientes, botão Novo cliente | Já existia. No modo agência os tipos viram "Mensal" e "Pré pago", sem Squad Alpha |
| Convidar equipe | Configurações, aba Equipe (só admin) | Já existia |
| Primeira tarefa | Botão Nova tarefa no topo | Já existia |
| Saber onde fica cada coisa | Primeiros passos, com destaque na tela | Novo neste lote |
| Estúdio de IA | Primeiros passos, item opcional com o passo a passo da chave | Novo neste lote, a chave é cadastrada na instância no onboarding |

Ainda sem botão (fica para o próximo lote):

1. Marca sincronizada entre aparelhos (`wfa-brand` fora da nuvem).
2. Planilha financeira própria (hoje a rota lê a da ARK por endereço fixo).
3. Chave da IA por agência pela tela (hoje é segredo do Worker).
