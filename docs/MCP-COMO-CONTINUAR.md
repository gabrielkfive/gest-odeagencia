# MCP — o que é e como continuar (em português de gente)

## O que é MCP, sem tecniquês
MCP (Model Context Protocol) é o "padrão de tomada" que deixa a IA (eu) **usar ferramentas
do mundo real**: abrir o navegador, ler/escrever no Google Drive, buscar na web, mexer no
calendário, etc. Cada "ferramenta" é um **servidor MCP**. Você liga o servidor uma vez e a
IA passa a poder usar aquilo pra sempre.

Pensa assim: a IA é o cérebro; os MCPs são as **mãos**. Quanto mais mãos a gente pluga, mais
coisa ela faz sozinha.

## O que já está plugado hoje
- **Playwright** — controla um navegador de verdade (abrir sites, clicar, baixar arquivos).
  É a mão que vai baixar vídeos do Drive e operar mLabs/painéis sem API.
- **Google Drive** — ler/buscar/baixar e criar arquivos no Drive.
- **Context7** — documentação técnica sempre atualizada.
- **Voice/voz** — falar (JARVIS).
- Há um servidor de **Google Tasks** começado em `mcp-servers/gtasks-mcp`.

## Como ADICIONAR um MCP novo (o jeito simples)
Os MCPs ficam num arquivo de configuração do Claude (`~/.claude.json` ou no `.claude/`
do projeto). Cada servidor é uma linha tipo:

```jsonc
{
  "mcpServers": {
    "drive":   { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-gdrive"] },
    "novo-mcp": { "command": "npx", "args": ["-y", "pacote-do-mcp"], "env": { "API_KEY": "..." } }
  }
}
```

Passos, na prática:
1. Você me diz "quero plugar X" (ex.: Notion, Slack, YouTube, Higgsfield).
2. Eu acho o pacote do servidor MCP e adiciono essa linha na config.
3. Se precisar de chave, você me passa (vai pro campo `env`, que fica só na sua máquina/servidor).
4. Reinicia o Claude Code e pronto — a ferramenta nova aparece.

> Você **não precisa** decorar isso. É só pedir "pluga tal coisa" que eu faço o passo 2 e 3.
> Este guia é só pra você entender o que está acontecendo.

## A regra de ouro de segurança
- Chave/senha **nunca** entra no código nem sobe pro GitHub.
- Vai pro `env` do MCP (local) ou pros segredos do servidor (`wrangler secret put`).
- Se você desconfiar que uma chave vazou, a gente revoga e gera outra — sempre dá.

## Próximos MCPs que valem a pena (na ordem)
1. **Higgsfield** (editor de vídeo) — ver `MCP-EDITOR-VIDEO-HIGGSFIELD.md`.
2. **Google Calendar** (escrita) — JARVIS marca seus dias. Precisa do OAuth (ver
   `O-QUE-O-GABRIEL-PRECISA.md`).
3. **Meta/Instagram** — postar e ler métricas direto.
4. **YouTube/TikTok** — publicar cortes automaticamente.

A ideia é: cada MCP novo = uma tarefa a menos no seu operacional.
