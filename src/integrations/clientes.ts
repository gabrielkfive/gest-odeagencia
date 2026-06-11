// Briefs de contexto por cliente — injetados nos agentes de IA (roteirista, estrategista).
// É o "cérebro" que faz o agente parar de ser genérico e falar como quem conhece o cliente.
// Fonte legível/humana: docs/clientes/<cliente>.md (mantida em sincronia com este arquivo).
// Para adicionar um cliente novo: escreva o brief e registre em BRIEFS.

const VIVENDA = `FARMÁCIA VIVENDA (Brasília) — cliente prioritário, empresa da família do dono (Plano X).
Farmácia de MANIPULAÇÃO de alto nível (laboratório próprio, skincare e linha de performance) — não é farmácia comum.

POSICIONAMENTO: "Vivenda, sua aliada do bem-estar". A virada: deixar de ser vista como farmácia de manipulação e virar REFERÊNCIA em cuidado integrado (acompanha do protocolo até o resultado).
TOM (regra de ouro): "Menos promessa, mais acompanhamento." Guia rotinas, personaliza o caminho. Ciência sem jargão, humano, realista. NUNCA prometa milagre.
PILARES: (1) Autoridade acessível — traduzir ciência simples; (2) Prova social — influenciadores do DF, farmacêuticos e pacientes reais; (3) Estilo de vida — realidade de Brasília (clima seco, treino, corrida, público 60+).
PROTOCOLOS ÂNCORA: Pós-Mounjaro · Pele em Equilíbrio · 60+ Ativa.
FORMATOS (prioridade): Reels 30-60s (motor) > Carrosséis ("manuais de bolso") > Lives com farmacêutico > WhatsApp CRM. Séries fixas: "Vivenda Responde", "Mito ou Verdade".

PRODUTOS EM FOCO AGORA (Jun/2026):
- Creme de Ureia 10%: ultra hidratante, produto TOP. SUPER PROMOÇÃO (estoque alto ~900, 200 venceram → urgência real de girar). Precisa de criativo forte.
- NAC (N-acetilcisteína): ação antioxidante, apoio renal/fígado ("dá uma limpada"). Gancho de Copa: todo mundo tomando uma → ajuda. Tratar leve, por influenciadora.
- Cafeína: linha performance/novos produtos.

PESSOAS (decisores — sem isso o roteiro é genérico):
- Remerson: gestor principal e DECISOR (aprova os planejamentos mensais). É o PAI do dono. Sério, dedicado, organizado.
- Graziella: gestora de compras/operacional/contratação. NÃO aprova planejamento nem está no dia a dia.
- Yuri: marketing (parte) do lado do cliente — é quem executa.
- 8 gerentes no grupo "Líderes da Vivenda". Lojas com 3-7 vendedores; uma com laboratório de ~15 pessoas.

PLANO DE CONTEÚDO — COPA (a partir de 11/06/2026): vídeo 1 da série cinematográfica de Copa (11/06) → vídeo de influenciador (12/06) → vídeo 2 com reforços (influenciadores Leila, Renan, Esté, 13/06) → foto no sábado (jogo do Brasil) → semana seguinte: mais posts + captação na farmácia (focar creme de ureia, NAC, cafeína).`;

const BRIEFS: Record<string, string> = {
  vivenda: VIVENDA,
};

// Retorna o brief do cliente (ou "" se não houver). Casa por inclusão do nome normalizado.
export function clienteBrief(nome: string | undefined | null): string {
  const k = String(nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (!k) return "";
  for (const key of Object.keys(BRIEFS)) {
    if (k.includes(key)) return BRIEFS[key];
  }
  return "";
}
