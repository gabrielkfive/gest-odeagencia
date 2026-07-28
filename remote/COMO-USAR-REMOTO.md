# Controle Remoto via WhatsApp (JARVIS)

Você fora de casa, mandando demanda pelo WhatsApp. O PC de casa executa com o
Claude Code (Chrome logado, e-mails, Meta, sistema) e responde no seu WhatsApp.

## Como usar (no dia a dia)

Mande mensagem no WhatsApp começando com **jarvis**. Funciona no chat
"mensagem para mim mesmo" ou em qualquer conversa individual (nunca em grupo).

Exemplos:

- `jarvis confere os e-mails de hoje e me resume os importantes`
- `jarvis verifica como estão as campanhas da Vivenda no Meta e me dá os números`
- `jarvis cria uma tarefa pro Danilo: revisar o calendário da Cachu até sexta`
- `jarvis status` (mostra a fila de demandas)

O robô confirma na hora ("Recebido, senhor") e avisa quando concluir, com o resumo.

## Como funciona por dentro

1. Sua mensagem chega no webhook do WhatsApp (Bridge/Evolution/Z-API).
2. Só mensagem SUA (enviada pelo seu próprio WhatsApp) com o prefixo "jarvis"
   vira demanda. Mensagem de outras pessoas é ignorada (a não ser que o número
   esteja na whitelist REMOTE_ALLOWED_PHONES). Em grupo, nunca.
3. A demanda entra na fila (`wfa-remote-queue` no Supabase) via
   `/api/workflowark/remote`, protegida pela chave secreta REMOTE_KEY.
4. O daemon (`jarvis-daemon.mjs`) neste PC puxa a fila a cada 20s e executa a
   demanda com o Claude Code headless (usa a assinatura logada, sem custo de API).
5. O resultado volta pela mesma rota e o Worker responde no seu WhatsApp.

## Instalação (uma vez só)

1. Criar o segredo na Cloudflare (a chave está em `remote/.env`, que NÃO vai
   pro GitHub):
   `npx wrangler secret put REMOTE_KEY` (colar o valor de remote/.env)
2. Iniciar o daemon: dois cliques em `remote/jarvis-daemon.cmd`,
   ou instalar o auto-start com `remote/instalar-autostart.cmd`.

## Segurança (importante)

- O daemon roda o Claude Code SEM travas de permissão
  (`--dangerously-skip-permissions`): ele pode mexer em arquivos, rodar
  comandos e fazer deploy sozinho. Só ligue o daemon sabendo disso.
- Quem manda na fila é só você: o comando exige mensagem enviada do SEU
  WhatsApp, e a API exige a chave secreta.
- Cada demanda tem limite de 25 minutos. Demanda travada volta pra fila em 30.
- Log de tudo em `remote/jarvis-daemon.log`.

## Se não responder

1. O PC de casa está ligado e com internet?
2. O daemon está rodando? (janela "JARVIS Daemon" aberta, ou `schtasks /run /tn "JARVIS Daemon"`)
3. Veja o final do log: `remote/jarvis-daemon.log`.
4. `jarvis status` mostra se a demanda pelo menos entrou na fila (se nem a
   confirmação chegar, o problema é o WhatsApp/webhook, não o PC).
