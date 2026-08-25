# Maratona 20/08/2026 - Hermes + Automacao Financeira

## Regra da sessao
Construir TUDO pronto. NAO disparar nenhuma cobranca, mensagem ou pagamento hoje.
Gabriel aprova antes de qualquer execucao.

## Itens
| # | Entrega | Status |
|---|---------|--------|
| 1 | Hermes Agent instalado + configurado (SOUL.md/AGENTS.md ARK) | em andamento |
| 2 | Extrair chaves Pix do WhatsApp | pendente |
| 3 | Limpar wfa-acerto (registros duplicados/truncados) | pendente |
| 4 | Agente de Recebimentos (regua de cobranca, Gabriel central) | pendente |
| 5 | Agente de Acerto (pagamentos dia 10 com Pix) | pendente |
| 6 | Bot de WhatsApp de comando | pendente |
| 7 | Varredura: o que falta automatizar | pendente |

## Bloqueios encontrados
- Evolution API (136.248.75.53:8080) FORA DO AR em 20/08. Sem ela nao ha envio nem
  leitura de WhatsApp pelo Worker. Precisa religar a VM Oracle.
