// Conteúdo da landing /conheca. Fonte da verdade: specs/system.md e as rotas que
// existem no repositório. Regra: só entra aqui o que o WorkFlowArk faz HOJE.
// Sem depoimento inventado, sem número de cliente, sem logo de terceiro, sem preço.
// Copy sem traço ou travessão como separador (vírgula ou ponto).

export type Bloco = { titulo: string; texto: string; tag?: string };

// 2) O produto real. Cada item corresponde a um módulo em uso na ARK.
export const PRODUTO: Bloco[] = [
  {
    titulo: "Meu Dia",
    texto:
      "Cada pessoa abre o dia e vê o que é dela: atrasadas, as de hoje, entregas dos próximos sete dias, aprovações pendentes e agenda. Sem perguntar no grupo o que fazer primeiro.",
  },
  {
    titulo: "Kanban de Atividades",
    texto:
      "Colunas Backlog, Iniciar, Andamento, Homologação, Homologação do cliente e Concluído. Cronômetro por tarefa, checklist, anexos e histórico. A sincronização é item por item: duas pessoas mexendo ao mesmo tempo não apagam o trabalho uma da outra.",
  },
  {
    titulo: "Projetos por cliente",
    texto:
      "Um quadro por cliente, com sprint e prontuário. A tarefa do projeto aparece no Kanban da equipe sem virar cópia: mover num lugar move no outro.",
  },
  {
    titulo: "Comercial e funil",
    texto:
      "Leads em Prospecção, Diagnóstico, Proposta, Negociação, Fechado ou Perdido, com responsável, próximo passo e histórico. O formulário desta página cai direto na Prospecção.",
  },
  {
    titulo: "Propostas e contratos",
    texto:
      "Propostas e contratos gerados dentro do sistema, com a identidade da agência, guardados junto do cliente.",
  },
  {
    titulo: "Financeiro e cobranças",
    texto:
      "Faturamento e custo por cliente, margem, cobranças com status pago ou pendente e acertos. Quem cuida do dinheiro vê o que está em atraso sem cruzar planilha.",
  },
  {
    titulo: "Calendário editorial",
    texto:
      "O que sai em cada dia, por cliente. A equipe de conteúdo e o gestor olham o mesmo calendário.",
  },
  {
    titulo: "Produção audiovisual",
    texto:
      "Captações registradas com cliente, data, local, produtor e vídeos gerados. A edição e a entrega andam como tarefas no Kanban, ligadas à captação.",
  },
  {
    titulo: "Aprovação por link e portal",
    texto:
      "O cliente aprova ou pede ajuste por um link, sem criar conta. No portal, ele acompanha o plano de conteúdo ao vivo e abre demandas que chegam na equipe.",
  },
  {
    titulo: "Agentes de IA com fila",
    texto:
      "Agentes propõem leads, ideias, tarefas e conteúdo. Tudo entra numa fila e alguém da equipe aprova, recusa ou copia. Nada executa sem esse clique.",
  },
  {
    titulo: "WhatsApp",
    texto:
      "A equipe envia WhatsApp pelo WorkFlowArk e as mensagens ficam registradas por número, no mesmo lugar em que o lead e o cliente vivem.",
  },
  {
    titulo: "Celular e rede ruim",
    texto:
      "Metade da equipe da ARK usa pelo celular. Se a rede cair, o que foi feito fica no aparelho e sobe quando a conexão voltar, com aviso na tela.",
  },
];

// 3) Jornada operacional em cinco passos.
export const JORNADA: Bloco[] = [
  {
    titulo: "Briefing",
    texto:
      "O cliente entra com briefing e plano de conteúdo. As demandas chegam pelo portal ou são abertas pela equipe, já ligadas ao cliente.",
  },
  {
    titulo: "Produção",
    texto:
      "Vira tarefa no Kanban e no projeto do cliente, com responsável, prazo e cronômetro. Captação e edição andam como etapas visíveis.",
  },
  {
    titulo: "Aprovação",
    texto:
      "Homologação interna primeiro. Depois, link de aprovação para o cliente. O retorno cai na equipe, sem print de WhatsApp.",
  },
  {
    titulo: "Publicação",
    texto:
      "A peça aprovada entra no calendário editorial com data e cliente. Quem publica sabe o que sai e quando.",
  },
  {
    titulo: "Relatório",
    texto:
      "O fechamento do mês sai do que foi feito no sistema: entregas, aprovações, tempo por tarefa. Sem montar planilha à parte.",
  },
];

// 4) Benefícios por papel. Situações reais, sem economia não medida.
export const PAPEIS: Bloco[] = [
  {
    titulo: "Dono",
    texto:
      "Vê a operação inteira sem perguntar no grupo: o que está atrasado, quem está com o quê, o que espera aprovação e o que entrou no funil.",
  },
  {
    titulo: "Gestor",
    texto:
      "Distribui tarefas, acompanha prazo e homologação, recebe o retorno do cliente no mesmo lugar em que a tarefa vive.",
  },
  {
    titulo: "Produção",
    texto:
      "Abre o Meu Dia e sabe o que gravar, editar e entregar. Cronômetro e checklist na tarefa. No celular, funciona na captação.",
  },
  {
    titulo: "Comercial",
    texto:
      "Funil com etapas claras, proposta gerada no sistema e lead novo do site chegando direto na Prospecção com responsável definido.",
  },
  {
    titulo: "Financeiro",
    texto:
      "Contratos, cobranças e custo por cliente no mesmo lugar. Sabe quem está atrasado sem esperar o fim do mês.",
  },
];

// 5) Hermes e IA: o que existe hoje e o que está em evolução, separado.
export const IA_FLUXO: { passo: string; quem: string; texto: string; humano?: boolean }[] = [
  {
    passo: "1",
    quem: "Agente propõe",
    texto:
      "Prospecção, ideias, conteúdo, follow-up, tarefas para a equipe, processos e proposta. Cada agente roda na própria rodada e escreve na fila.",
  },
  {
    passo: "2",
    quem: "Fila aguarda",
    texto: "O item fica pendente com título, corpo e origem. Nada sai da fila sozinho.",
  },
  {
    passo: "3",
    quem: "Pessoa decide",
    texto:
      "Alguém da equipe aprova, recusa ou copia. Lead aprovado vai para o CRM. Tarefa aprovada entra no Kanban com responsável.",
    humano: true,
  },
  {
    passo: "4",
    quem: "Sistema registra",
    texto: "Quem decidiu, quando e o que aconteceu. Dá para auditar depois.",
  },
];

export const IA_HOJE = [
  "Agentes de prospecção, ideias, conteúdo, follow-up, tarefas, processos e proposta, com fila de aprovação em /agentes.",
  "Aprovar cria a tarefa no Kanban ou o lead no CRM. Recusar arquiva com registro.",
  "Servidor MCP com chave secreta: um assistente de IA autorizado lê o funil e as cobranças, cria tarefa e lead e marca cobrança como paga, sem sobrescrever o que já existe.",
];

export const IA_EM_EVOLUCAO = [
  "Execução de cartões marcados pela equipe (implantar, testar ideia) pelos agentes, com revisão humana antes de fechar.",
  "Pergunta livre sobre a operação com resposta baseada nos dados do sistema.",
];

// 8) FAQ honesta.
export const FAQ: { p: string; r: string }[] = [
  {
    p: "Quem faz o WorkFlowArk?",
    r: "É software da ARK Content, agência de marketing de Brasília. Foi construído para a própria operação e agora está sendo oferecido a outras agências. Quem desenvolve é quem usa.",
  },
  {
    p: "Precisa instalar alguma coisa?",
    r: "Não. Roda no navegador, no computador e no celular. Dá para adicionar à tela inicial do telefone como um aplicativo, sem loja.",
  },
  {
    p: "Onde ficam os dados?",
    r: "No Supabase (Postgres), com o banco trancado: o navegador nunca fala com o banco direto, tudo passa pelo servidor. Cada pessoa entra com login próprio ou com a conta Google, e o gestor libera o acesso.",
  },
  {
    p: "Já tenho tudo no Trello, na planilha e no WhatsApp. Como migro?",
    r: "A migração é combinada caso a caso na implantação. Olhamos o que você tem, definimos o que vale trazer e como. Não prometemos importação automática de qualquer ferramenta.",
  },
  {
    p: "A IA publica ou manda mensagem sozinha?",
    r: "Não. Os agentes propõem e alguém da equipe aprova. Nada é publicado, enviado ao cliente ou movido no funil sem essa aprovação.",
  },
];
