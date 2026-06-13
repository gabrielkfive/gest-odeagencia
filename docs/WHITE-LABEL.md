# Vender o WorkFlowArk como White Label

## A oportunidade
Toda agência de marketing sofre do mesmo problema que a ARK sofreu: conhecimento na cabeça
dos sócios, ferramentas espalhadas (Trello + planilha + WhatsApp), nada conversa. O
WorkFlowArk resolve isso **e** já vem com agentes de IA trabalhando 24/7. Isso é vendável
pra centenas de agências.

## O que é "White Label" aqui
Cada agência cliente recebe a **mesma plataforma**, mas com a **cara dela** (logo, cores,
domínio próprio) e os **dados isolados** dos outros. Elas pagam uma mensalidade pra ARK.

## O que precisa existir pra vender (checklist técnico)
1. **Multi-tenant (isolamento por agência).** Hoje o estado é uma tabela única
   (`workflowark_state`). Pra White Label, cada agência precisa do seu "espaço" isolado.
   Caminho: adicionar uma coluna `tenant_id` em tudo + RLS por tenant. (Trabalho de backend,
   dá pra fazer por fases.)
2. **Marca configurável.** Logo, cor primária e nome do produto vindo de um config por tenant
   (o app já é todo baseado em variáveis CSS — `--yel`, `--ink` — então trocar a cor é fácil).
3. **Onboarding self-service.** A agência se cadastra, escolhe logo/cor e já entra.
   (Reusar o tutorial/POPs que já existe.)
4. **Cobrança recorrente.** Stripe assinatura por agência.
5. **Painel do dono (você).** Ver todas as agências, quem pagou, uso.

## Modelo de preço (sugestão pra debater)
- **Starter** (até 5 clientes da agência): R$ 297/mês.
- **Pro** (até 20 clientes + agentes de IA): R$ 697/mês.
- **Scale** (ilimitado + editor de vídeo + integrações): R$ 1.497/mês.
- Setup/implantação: R$ 997 (opcional, com migração dos dados do Trello/planilha).

O diferencial que ninguém tem: **os agentes de IA que trabalham sozinhos pensando nos clientes**.
Isso justifica preço premium.

## Roteiro de lançamento (incremental)
1. **Fase 0 — Prova viva:** a própria ARK rodando 100% no sistema (é o melhor case).
2. **Fase 1 — 3 agências beta** (amigas), de graça/desconto, em troca de feedback e depoimento.
3. **Fase 2 — Multi-tenant + marca configurável + Stripe.**
4. **Fase 3 — Página de vendas + outreach** pras agências (tem skill de marketing pra isso).
5. **Fase 4 — Escala** com programa de parceiros/indicação.

## Próximo passo concreto
Quando a ARK estiver 100% estável no sistema (estamos quase), eu monto a **Fase 1**: separo o
isolamento por agência e um seletor de marca. É a base de tudo. Me dá o sinal que eu começo.
