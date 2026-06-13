# Agente Editor de Vídeo (Higgsfield) — o robô que edita enquanto você dorme

## A visão (do jeito que você descreveu)
Uma demanda chega pro editor (ex.: Samuel) com: link do Drive com os **roteiros** e link do
Drive com os **vídeos brutos**. Hoje o humano baixa tudo, assiste, corta seguindo o roteiro,
põe trilha e entrega. A ideia é o agente fazer **o trabalho pesado sozinho** e deixar pro
humano só o "ok final" (ou nem isso).

## Como vai funcionar (arquitetura)
```
Demanda (tem link Drive: roteiros + vídeos)
        │
        ▼
[1] Playwright/Drive MCP  → abre o Drive, lista e BAIXA os vídeos brutos + lê os roteiros
        │
        ▼
[2] Entendimento          → transcreve/lê cada vídeo (fala, cenas) e casa com o roteiro
        │
        ▼
[3] Higgsfield (API)      → monta o corte seguindo o roteiro: ordem das cenas, cortes,
        │                    legendas, trilha, ritmo
        ▼
[4] Entrega               → exporta e sobe o vídeo final numa pasta do Drive do cliente
        │
        ▼
[5] Notifica              → avisa no app/WhatsApp "vídeo X pronto pra revisão" (ou já entrega)
```

## O que cada parte usa
- **[1] Baixar do Drive:** já temos Playwright + Google Drive MCP. Funciona.
- **[2] Entender o vídeo:** transcrição (Whisper, que já usamos no WhatsApp) + leitura do roteiro.
- **[3] Editar:** **Higgsfield API** — é a peça que falta. Precisa da API Key + crédito
  (ver `O-QUE-O-GABRIEL-PRECISA.md`, item 4).
- **[4] Subir:** Google Drive MCP cria a pasta `Entregas` e sobe o final.
- **[5] Avisar:** reusa as notificações + WhatsApp que já existem.

## Plano incremental (pra não tentar tudo de uma vez)
1. **Fase 1 — Coleta:** agente baixa os vídeos e roteiros de uma demanda e organiza numa pasta.
   (Já dá pra fazer hoje, sem Higgsfield.)
2. **Fase 2 — Decupagem:** agente transcreve e gera um "mapa de cortes" sugerido a partir do
   roteiro (texto: qual trecho de qual vídeo entra em cada cena). Você revisa.
3. **Fase 3 — Edição:** liga a Higgsfield e gera o primeiro corte real de 1 vídeo da Vivenda.
4. **Fase 4 — Escala:** roda pra todas as demandas de edição automaticamente, todo dia.

## O que eu preciso de você pra começar a Fase 3
- Higgsfield **API Key** + crédito na conta.
- 1 demanda real de exemplo (link dos roteiros + link dos vídeos) pra eu calibrar.

> Enquanto isso, dá pra eu já deixar a **Fase 1 e 2** prontas com o que temos. Me diz se
> quer que eu comece por aí.
