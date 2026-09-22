# Maratona 22/09/2026 · doc 11 do WorkFlowArk

Pedido do Gabriel: "bota pra finalizar e melhorar muito tudo, me pergunta no celular".
Worktree `C:\Users\USER\wfa-sidebar`, branch `feat/sidebar-ordem-final`, empurrando direto pra `main`.

## Entregue e medido na URL de produção

| # | Item | Marcador | Prova |
|---|------|----------|-------|
| 0 | Sidebar na ordem final (tarefa 08) | 20260922a-sidebar-final | deploy/prova-sidebar.py |
| 0 | Aprovação sem estresse no /app (tarefa 07) | 20260922c-aprovacao-app | deploy/prova-aprovacao.py |
| 1 | Termos e privacidade ligados no login (tarefa 05) | termos-20260922a | captura do login |
| 2 | Landing oficial com prints da V1 e teste de 30 dias (tarefa 02) | conheca | deploy/prova-landing.py |
| 3 | White label: logo na sidebar e no login (tarefa 04) | 20260922d-white-label | deploy/prova-white-label.py |
| 4 | Cartão de post com a arte (tela 5) | 20260922e-midia-cartao | deploy/prova-aprovacao.py |
| 5 | Prévia do feed do cliente (tela 5) | 20260922f-feed-cliente | deploy/prova-aprovacao.py |

## Bloqueado, esperando o Gabriel

1. **Tarefa 06, tokens do /app nas 6 telas.** Depende do "é isso" na prévia `workflowark-v2.arkcontent.workers.dev/app-preview/`. O CSS de tokens segue só na branch `codex/workflowark-react-foundation` (commit 93d6aca). Não foi mesclado de propósito: ele rejeitou rodada de pele antes.
2. **Preço dos planos.** Sem número, a landing fica com "preço na demonstração" e a seção de planos não existe. Perguntado por e-mail em 22/09.
3. **WhatsApp não é canal.** A Evolution está fora desde 06/09 e o número comercial foi banido em 10/09; `send_whatsapp` responde "Falha ao enviar pela Evolution". Push pro celular também não sai (Remote Control desligado). O canal que funcionou foi e-mail.
4. **Tarefa 03, cadastro self-service multi-agência.** É trabalho de estrutura, fora do escopo de um lote de maratona. A landing foi escrita pra não prometer isso: a conta sai no mesmo dia com onboarding assistido.

## Onde continuar

1. Aval da prévia libera a tarefa 06 (tokens em 6 telas, prova antes x depois em cada uma).
2. Preço libera a seção de planos da landing e a régua comercial do doc 11.
3. Depois disso, tela 4 do plano: modal da tarefa em uma coluna, rótulos sem caixa alta, comentários com foto, tudo cabendo em 100% sem rolagem interna.
