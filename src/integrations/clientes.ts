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

PRODUTOS EM FOCO AGORA (Jul/2026):
- NAC (N-acetilcisteína): saiu do gancho de jogo, entrou no gancho de ROTINA (recuperação, fígado pós festa). Provou interesse real (53 curtidas, 14 comentários).
- Cafeína: linha performance; ângulo "por que a minha cafeína é manipulada".
- Creme de Ureia 10%: herói de RETENÇÃO ("o produto que mais faz cliente voltar"); julho é pico da seca em Brasília.

PESSOAS (decisores — sem isso o roteiro é genérico):
- Remerson: gestor principal e DECISOR (aprova os planejamentos mensais). É o PAI do dono. Sério, dedicado, organizado.
- Graziella: gestora de compras/operacional/contratação. NÃO aprova planejamento nem está no dia a dia.
- Yuri: marketing (parte) do lado do cliente — é quem executa (produção das captações).
- 8 gerentes no grupo "Líderes da Vivenda". Lojas com 3-7 vendedores; uma com laboratório de ~15 pessoas.

MOMENTO (Jul/2026) — VIRADA PÓS-COPA → DIA DOS PAIS (09/08): o Brasil caiu, a Copa virou memória, o Kit Copa saiu de cena. O mês é PONTE pro Mês dos Pais com conversão qualificada. Arco: (1) virada pós-Copa (recuperação/rotina) → (2) SÉRIE DOS PROPRIETÁRIOS (8 roteiros: donos filmados no dia a dia da loja, cortes a cada 3s — engaja 4x mais que produto) → (3) esquenta da campanha → (4) semana do Dia dos Pais.
CAMPANHA "MANDA A RECEITA DO PAI": foto da receita (do pai, do avô ou a própria) no WhatsApp → orçamento em minutos, retirada ou entrega. Receita = lead mais qualificado que existe (R$2,84/conversa no criativo campeão). Meta: 40% de conversão com receita (vs 32% do atendimento comum). REGRA DE OURO: brinde, não desconto (junho já deu R$222,5 mil de desconto). Expansão: Taguatinga e Sobradinho primeiro, depois rede inteira.`;

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
MODELO DE ENTREGA (assessoria Alpha — o cliente grava, a ARK dirige e roda tráfego): gestão de Meta Ads + relatório semanal de performance no grupo + direção criativa (roteiros e validação de criativos). SEM captação da ARK. Verba de mídia enxuta e eficiente (CPA baixo — anúncio roda pouco e vende).
FOCO: food porn + empurrar DELIVERY (iFood otimizado, fotos de cardápio que vendem, combos de bebida). Conteúdo serve salão E delivery.
TOM: apetite + praticidade (peça agora / venha agora). Destacar pratos campeões e bebidas.
FORMATOS: Reels de prato > destaque de itens do iFood/combos > stories de novidade. Coordenar com a auditoria de iFood (foto/descrição que convertem).`;

const STRAY = `STRAY HOUSE (Squad Alpha) — restaurante/bar. Fase de RECUPERAÇÃO. ROAS ~5 (saudável) — dá pra escalar.
MODELO DE ENTREGA (assessoria Alpha): a equipe DO CLIENTE produz os vídeos; a ARK pauta o criativo certo, valida antes de subir (edição só em caso excepcional) e roda Meta Ads (~R$550-600/semana) com relatório semanal no grupo. Contatos: Paulo/Paulinha; social media Joe acompanha. SEM captação da ARK.
PRIORIDADE: subir CRIATIVOS NOVOS com frequência (o ROAS aguenta investir mais; não deixar saturar). Testar ganchos e renovar o banco. Atenção: alinhar bem o briefing do vídeo com o cliente (já veio vídeo errado — ex.: kit Dia dos Namorados).
TOM: vibe de bar/noite — energia, drinks, ambiente, música, galera. Vender a EXPERIÊNCIA.
FORMATOS: Reels de drink/ambiente noturno (motor) > eventos/agenda da semana > UGC da galera.`;

// (Babbo Giovanni: churn em 16/07/2026 — brief removido)

const DGUST = `PIZZARIA DGUST (Brasília) — pizzaria. Cliente NOVO (jul/2026): fase de ONBOARDING.
PRIORIDADE: primeira linha editorial + primeiras captações. Estabelecer identidade visual do feed e cadência.
TOM: food porn de pizza — queijo puxando, forno, borda, massa aberta na mão. Apetite imediato.
FORMATOS: Reels de pizza saindo do forno (motor) > sabores/combos > bastidor do pizzaiolo. CTA de pedido/delivery e localização desde o início.`;

const KOPI = `KOPI COFFEE (Brasília) — cafeteria. Cliente NOVO (jul/2026): onboarding e presença inicial.
PRIORIDADE: apresentar a marca (quem é, onde fica, o que tem de especial) e criar hábito de conteúdo.
TOM: café de especialidade — método, aroma, ritual, estética minimalista. Público que valoriza o preparo.
FORMATOS: Reels de preparo/latte art (motor) > menu e novidades > ambiente pra trabalhar/encontrar. CTA "vem conhecer" com endereço e horário.`;

const LUMIERE = `CAFÉ LUMIÈRE (Brasília) — cafeteria. Cliente NOVO (jul/2026): onboarding, posicionamento e presença inicial.
PRIORIDADE: definir posicionamento (o que diferencia o Lumière) e construir presença do zero.
TOM: charme e luz — estética afrancesada, doces finos, café com experiência. Instagramável por natureza.
FORMATOS: Reels de ambiente/doce/café (motor) > carrossel de menu > stories de rotina da casa. CTA de visita com localização.`;

const QUATROB = `4B BURGER'S — hamburgueria ARTESANAL. Squad Alpha. (IG e praça a confirmar com o grupo.)
MOMENTO (jul/2026): vendas ABAIXO do esperado; plataformas de delivery quase zeradas (movimento é retirada). Captação em agendamento. Missão: recuperar venda e ativar o delivery.
FOCO: (1) girar o delivery — criativo que termina em "pede agora"; (2) provar o artesanal (blend, chapa, montagem) pra justificar escolher a 4B.
TOM: food porn direto — queijo derretendo, smash na chapa, mordida. Urgência leve de oferta.
FORMATOS: Reels de preparo/mordida (motor) > combo/oferta da semana > bastidor do fogo. CTA SEMPRE com canal de pedido.`;

const SABORLENHA = `PIZZARIA SABOR A LENHA (Osasco-SP) — pizzaria de forno a lenha (@pizzaria_saboralenha, ~13k seguidores, se posiciona como "a melhor pizzaria de Osasco"). Squad Alpha, cliente em ONBOARDING.
MOMENTO: presença inicial com a ARK — estabelecer linha editorial e cadência aproveitando a audiência que já existe.
TOM: rústico e caseiro — fogo, lenha, massa aberta na mão, queijo puxando. Orgulho de bairro ("a melhor de Osasco").
FORMATOS: Reels de forno/pizza saindo (motor) > sabores da casa > bastidor do pizzaiolo. CTA de pedido/delivery da região.`;

const VALHALLA = `VALHALLA (Andradas-MG) — 1ª hamburgueria MEDIEVAL de Andradas e região (@valhallaandradas, ~5,6k seguidores). Qua-dom, 18h à meia-noite. Squad Alpha.
DIFERENCIAL: temática viking/medieval — nome, ambientação e linguagem são o ativo da marca. Usar o universo (Valhalla, banquete, guerreiro) nos ganchos.
MOMENTO (jul/2026): tráfego Meta Ads ATIVO com relatório semanal; combos como carro-chefe (2 burgers + 2 fritas + 2 refris a partir de R$69,90 — "banquete pra dois").
TOM: épico e divertido — fartura de guerreiro, comida de banquete. Sem frescura. Cidade do interior: proximidade com o público local.
FORMATOS: Reels de combo/montagem (motor) > oferta da semana pro tráfego > ambientação temática. CTA de pedido; renovar criativos pro Ads não saturar.`;

const DIPATRICK = `LA PIZZA DI PATRICK — pizzaria AUTORAL do pizzaiolo Patrick Catapano (@lapizzadipatrick): pizza contemporânea ítalo-brasileira. Squad Alpha, cliente novo (reunião de kickoff 02/07).
DIFERENCIAL: o CHEF é a marca — autoridade do pizzaiolo, técnica, ingrediente. Não é pizzaria de bairro: é pizza de autor.
FOCO: construir a audiência em cima do Patrick (rosto, mão na massa, técnica) + educar sobre o que faz uma pizza contemporânea ser diferente.
TOM: craft/autoral — fermentação, forno, borda de leopardo, ingrediente escolhido. Sofisticado sem ser esnobe.
FORMATOS: Reels do Patrick trabalhando (motor) > "por que minha massa fermenta 48h" (educativo) > sabor autoral do mês. CTA de reserva/pedido.`;

const LAEMCASA = `LÁ EM CASA — restaurante de COZINHA AFETIVA, almoço self-service + delivery. Contrato 3 meses (~R$2.000/mês: 4 vídeos + 4 criativos). Contatos: Gilson (dono/decisor) e Renata (operação). (IG a confirmar no grupo.)
MOMENTO (jul/2026): casa em REESTRUTURAÇÃO — cardápio novo e carta de drinks a caminho (movimento pra ocupar também fim de tarde/noite; captações começando ~16h). REGRA: confirmar pauta com a Renata ANTES de gravar — não criar mídia de prato que vai sair do cardápio.
FOCO: comida com cara de casa (afeto, panela, tempero) + apresentar a nova fase quando lançar (drinks, novo cardápio) como acontecimento.
TOM: acolhedor, "almoço de família" — vapor de panela, prato generoso, gente servindo.
FORMATOS: Reels de buffet/prato do dia (motor) > teaser da nova fase > bastidor de cozinha. CTA de almoço e, na nova fase, do happy hour.`;

const BULLDOGS = `BULLDOGS — hamburgueria. ~R$2.500/mês, veio por indicação; coordenação direta do Gabriel. Contato: Rodrigo ("Rodrigão"). Cliente novo (onboarding — acessos sendo liberados). (IG e praça a confirmar no grupo.)
FOCO: primeira linha editorial — apresentar a casa e criar rotina de conteúdo do zero com o método ARK.
TOM: raiz de hamburgueria — chapa, fumaça, generosidade. "Vamos pra cima, foguete 🚀" (energia do próprio grupo).
FORMATOS: Reels de chapa/montagem (motor) > combos > bastidor. CTA de pedido/localização desde o início.`;

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
  dgust: DGUST,
  kopi: KOPI,
  lumiere: LUMIERE,
  "4b": QUATROB,
  "sabor e lenha": SABORLENHA,
  valhalla: VALHALLA,
  "di patrick": DIPATRICK,
  "la em casa": LAEMCASA,
  bulldog: BULLDOGS,
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
