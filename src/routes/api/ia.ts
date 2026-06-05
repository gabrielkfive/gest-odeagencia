import { createFileRoute } from "@tanstack/react-router";

type Body = { messages?: Array<{ role: "user" | "assistant" | "system"; content: string }> };

export const Route = createFileRoute("/api/ia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        const body = (await request.json()) as Body;
        const messages = body.messages ?? [];

        const sys = {
          role: "system" as const,
          content:
            "Você é a IA do WorkFlowArk, assistente operacional da ARK Content (agência de marketing gastronômico). Fale em PT-BR, direto, prático, em tom de coach operacional. Conheça o sistema: abas Meu Dia, Reuniões, Clientes (Lista/Jornada/Régua dos 15), Tarefas (Kanban Backlog→Andamento→Aprovação→Concluído), Demandas, Rotinas, OKRs, Campanhas, Financeiro, Comercial, Organograma, POPs, Processos. Áreas: Comercial (Gabriel, Saulo), Marketing (Bruno, M.Portela, Maria Luiza), Operação (Danilo COO, Giuseppe), CS (Lucas Rosi), Captação (Márcio, Henrique, Nicolas, Anderson), Edição (Márcio, Luckas Gomes, Kaique, Lush). Cliente percorre 20 sprints até renovação. Meta Alpha Abril: R$100k. Quando perguntarem onde algo fica, responda qual aba abrir e o que clicar. Respostas curtas.",
        };

        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "raw",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [sys, ...messages],
          }),
        });
        const data = await r.json();
        const text = data?.choices?.[0]?.message?.content ?? "(sem resposta)";
        return Response.json({ text });
      },
    },
  },
});