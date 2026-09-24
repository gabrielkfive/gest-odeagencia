# PRD · WorkFlowArk®

## Visão geral

**Produto:** WorkFlowArk®, sistema operacional de agência de marketing.
**Em uma linha:** cliente, tarefa, produção, aprovação, CRM e cobrança num lugar só.
**Origem:** construído e usado todo dia pela ARK Content, em Brasília.

## Problema

A agência pequena roda em Trello, planilha e grupo de WhatsApp. Prazo se perde, aprovação
fica no áudio, o dono vira o roteador de tudo e ninguém sabe o que está atrasado.

## Objetivo

A equipe inteira trabalhar no mesmo fluxo: contrato, onboarding, projeto, tarefa, aprovação
do cliente, relatório e renovação, com o dono decidindo só a exceção.

## Usuários

1. **Dono da agência (admin):** decide, vê placar, libera acesso.
2. **Equipe (operação, social, edição, tráfego, comercial):** executa tarefas e sprints.
3. **Cliente da agência:** aprova conteúdo e acompanha pelo portal, sem criar conta.

## Funcionalidades do produto hoje

- Meu Dia, Atividades (kanban com homologação interna e do cliente), Projetos e sprints.
- Área do Cliente com aprovação, prévia do feed e portal por link.
- CRM · Pipeline, Comercial, propostas e contratos.
- Financeiro, cobrança e acerto (restritos por papel no servidor).
- CEO Inbox (branch `feat/ceo-inbox`, aguardando deploy): 3 decisões, 3 problemas,
  3 oportunidades.
- White label de logo; agentes de IA que preparam e deixam na fila.

## Fluxos principais

1. Lead chega pela landing, cai no CRM com dono (Saulo) e vira proposta.
2. Contrato assinado vira projeto, que vira tarefas do sprint.
3. Tarefa pronta vai para homologação interna, depois para o cliente pelo portal.
4. Pessoa nova cria conta, fica pendente, admin libera com o papel certo.

## Requisitos

- **Segurança:** autorização no servidor por papel; conta nova pendente; segredo só em
  variável do Worker; rota pública com token criptográfico. Detalhe em `AGENTS.md`.
- **Disponibilidade:** o sistema não sai do ar; build verde antes de deploy.
- **Celular:** metade da equipe usa pelo celular; toda tela funciona em 390 px.
- **Dados:** mescla por item com carimbo `up`; exclusão por lápide.

## Métricas de sucesso

- Tarefas atrasadas e sem dono (placar do CEO Inbox) caindo semana a semana.
- Lead da landing com resposta no mesmo dia.
- Zero acesso a dado da operação por conta não liberada.

## Fora de escopo agora (e por quê)

- **Teste grátis de 30 dias para agência de fora dentro desta instância.** O sistema ainda
  não isola dados por agência (uma tabela `workflowark_state` para tudo). Até existir
  `tenant_id` com RLS, teste externo só em instância separada. Ver `docs/WHITE-LABEL.md`.
- Cobrança recorrente automática (Stripe).
- E-mail transacional para lead e para conta nova (hoje nenhum e-mail é enviado).
