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

const FERCON = `FERCON (Brasília) — gastronomia. ~R$4.200/mês, 2 captações/mês.
PERFIL: mais reativo que ativo — papel da ARK é PROVOCAR pauta, não esperar o cliente trazer.
TOM: apetite primeiro — close no prato, textura, som ambiente, pouco texto, muito desejo.
FORMATOS: Reels 15-30s (motor) > carrossel de cardápio/novidades > stories de bastidor de cozinha. Usar as 2 captações pra estocar o conteúdo do mês. Ganchos de datas comemorativas pra dar motivo de ir.`;

const SASSE = `SASSE GIFTS (Brasília) — presentes / gifts personalizados. ~R$4.500/mês, 2 captações/mês.
FOCO: conteúdo movido a OCASIÃO (aniversário, Dia dos Namorados, corporativo, datas) e ao "presente que emociona".
TOM: afetivo, encantamento. Vender a EMOÇÃO de presentear, não o objeto.
FORMATOS: Reels de unboxing/montagem do kit > carrossel "ideias de presente pra [ocasião]" > prova social (reação de quem recebe). CTA de encomenda/WhatsApp, sempre com antecedência das datas.`;

const CACHU = `CACHU RESTAURANTE (Brasília) — restaurante, pegada FOOD PORN. ~R$8k/ano.
PRIORIDADE: consistência DIÁRIA + acompanhar ROAS de perto (tráfego ativo). Pico de movimento qui-dom.
TOM: desejo puro — vapor, queijo puxando, montagem, som ambiente. Faz querer reservar AGORA.
FORMATOS: Reels diários de prato (motor) > combos/ofertas de fim de semana > stories do salão cheio. Medir o que converte e dobrar nos criativos campeões.`;

const ATTRA = `ATTRAVERSIAMO CAFÉ (Brasília) — cafeteria. CASO DE SUCESSO da ARK: +1.000 seguidores em 3 dias e impacto real no CAIXA/balcão (não só no Instagram).
PRIORIDADE: SURFAR a onda enquanto está quente e MONETIZAR (virar seguidor em gente entrando na loja).
TOM: aconchego + estética de cafeteria (luz, latte art, ambiente instagramável) com a energia que viralizou.
FORMATOS: Reels de ambiente/bebida (motor) > novidade de menu sazonal > UGC de clientes na loja. CTA "vem tomar um café" com endereço e horário.`;

const BRISA = `BRISA DOCE CAFÉ (Brasília) — cafeteria / doces. Fase de ONBOARDING + INAUGURAÇÃO.
PRIORIDADE: construir presença do zero e fazer barulho na inauguração (expectativa, contagem regressiva, "conheça").
TOM: afeto e gula leve. Marca nova: explicar quem é, onde fica e por que ir.
FORMATOS: Reels de produto/ambiente > teaser e cobertura da inauguração > stories de bastidor. CTA forte de localização e horário desde o dia 1.`;

const FONSECA = `FONSECA & CAVALCANTI (Brasília) — ADVOCACIA. ~R$2.500/mês, 1 captação/mês.
REGRA CRÍTICA (OAB, Provimento 205/2021): NADA de promessa de resultado, captação mercantil, "ganhe sua causa", valores ou sensacionalismo. Conteúdo é INFORMATIVO e de AUTORIDADE, não propaganda.
FOCO: autoridade e confiança — esclarecer direitos, explicar a lei em linguagem simples, humanizar os advogados.
TOM: sóbrio, confiável, didático. Educar > vender.
FORMATOS: Reels/carrossel "você sabia que tem direito a..." (dentro da OAB) > bastidor do escritório > FAQ jurídico. Sem CTA agressivo; convite a "consulte um advogado".`;

const VACA = `VACA VELHA (Brasília) — restaurante / churrascaria. 1 captação/mês (às vezes 2). Fase de RAMP-UP de receita.
FOCO: carne é o herói — corte, brasa, suculência, fartura. Puxar almoço e fim de semana, ticket de grupos/famílias.
TOM: fome e fartura — fogo, gordura derretendo, fatia caindo. Forte apelo de fim de semana.
FORMATOS: Reels de corte/brasa (motor) > combos e porções pra grupo > stories de salão cheio. CTA de reserva pra grupos.`;

const DOM = `DOM BARUKA (Squad Alpha) — restaurante. URGENTE no operacional: cardápio + iFood + bebidas; auditoria de iFood em curso.
FOCO: food porn + empurrar DELIVERY (iFood otimizado, fotos de cardápio que vendem, combos de bebida). Conteúdo serve salão E delivery.
TOM: apetite + praticidade (peça agora / venha agora). Destacar pratos campeões e bebidas.
FORMATOS: Reels de prato > destaque de itens do iFood/combos > stories de novidade. Coordenar com a auditoria de iFood (foto/descrição que convertem).`;

const STRAY = `STRAY HOUSE (Squad Alpha) — restaurante/bar. Fase de RECUPERAÇÃO. ROAS ~5 (saudável) — dá pra escalar.
PRIORIDADE: subir CRIATIVOS NOVOS com frequência (o ROAS aguenta investir mais; não deixar saturar). Testar ganchos e renovar o banco.
TOM: vibe de bar/noite — energia, drinks, ambiente, música, galera. Vender a EXPERIÊNCIA.
FORMATOS: Reels de drink/ambiente noturno (motor) > eventos/agenda da semana > UGC da galera.`;

const BABBO = `BABBO GIOVANNI (Squad Alpha) — restaurante italiano. Em ajuste.
PRIORIDADE: roteirização de Reels INTERESSANTE, viável de gravar no restaurante e exportável pro Drive (workflow Alpha).
TOM: tradição italiana + apetite — massa fresca, queijo, molho, cantina aconchegante. Experiência italiana autêntica.
FORMATOS: Reels de prato/massa (motor) > processo artesanal (massa sendo feita) > ambiente família. Roteiros prontos e fáceis de executar na captação.`;

// Briefs de 1ª geração ancorados no catálogo real (segmento + nota estratégica do Gabriel).
// Enriquecer com decisores/protocolos quando o Gabriel passar (igual à profundidade da Vivenda).
const BRIEFS: Record<string, string> = {
  vivenda: VIVENDA,
  fercon: FERCON,
  sasse: SASSE,
  cachu: CACHU,
  attra: ATTRA,
  brisa: BRISA,
  fonseca: FONSECA,
  vaca: VACA,
  dom: DOM,
  stray: STRAY,
  babbo: BABBO,
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
