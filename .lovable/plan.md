# Plano de finalização — WorkFlowArk ARK Content

Vou organizar o trabalho em **fases** porque é muito coisa para uma única rodada. Cada fase é entregável e testável. Você me confirma e eu executo na ordem, parando se faltarem créditos.

## Fase 1 — Reorganização da navegação (rápido, baixo custo)

- **Remover** do sidebar HTML: "Mural de demandas", "Cloud · Dinâmico" inteiro (OKRs, Rotinas, Processos, Mural, Financeiro, Agenda como abas soltas).
- **Manter** apenas os ícones já existentes do HTML original.
- **Tirar tudo que é azul** do app (login, banners, badges) → preto/branco/amarelo.
- **Login**: já está branco/amarelo conforme print, mas vou revisar qualquer azul restante.

## Fase 2 — Google Agenda real DENTRO da aba "Reuniões" (a peça mais importante pra você)

- Implementar OAuth **por usuário** com Google Calendar (cada pessoa conecta a própria conta).
  - Requer eu criar fluxo OAuth próprio (o connector atual é só do seu Drive).
  - Você vai precisar **adicionar `https://arkcontent.lovable.app/api/public/google-callback` como redirect URI** no seu OAuth Client do Google Cloud (te passo o passo a passo).
- Dentro de "Reuniões": listar eventos da semana, criar evento, marcar reunião → aparece no Google Agenda real do usuário logado.
- Remover a aba separada "Google Agenda" do Cloud Dinâmico.

## Fase 3 — Conteúdo dinâmico nas abas certas do HTML

- **Atividades → Tarefas**: virar o CRUD que hoje é "Mural de demandas" + integrar com tarefas dos sprints (já existe a tabela). Remover "Mural" do menu.
- **Performance → OKRs**: pluga o CRUD de OKRs já feito + importar OKRs do XLSX que você mandou (`OKR'S ALPHA ABRIL`).
- **Atividades → Rotinas**: pluga o CRUD de Rotinas no item do HTML.
- **Processos por área**: tornar funcional usando o CRUD já existente.
- **Agenda Junho** (item do menu): kanban estilo Google Agenda com drag para cima/baixo entre dias do mês, salvando no banco.

## Fase 4 — Jornada do Cliente com sprints navegáveis

- Adicionar setas ◀ ▶ para passar cliente de Sprint 1 → Sprint 2 → Sprint 3…
- Importar os sprints do XLSX `Sprints Semanais` como template padrão por tipo de contrato.

## Fase 5 — Controladoria Jurídica (nova aba)

- Aba nova com 3 templates de contrato: **ALFA X**, **ARK Gold**, **ARK Silver**.
- Cada template define a estrutura de sprints (7 dias cada) que é aplicada automaticamente quando o cliente é criado com aquele plano.

## Fase 6 — Financeiro persistente

- Hoje é só embed do Sheets publicado (read-only).
- Migrar para tabelas no banco: lançamentos, categorias, recorrência, prestadores, composição de salário (ex.: Gabriel = R$2.000 gestão + R$850 Vivenda + R$650 estrategista).
- Manter botão "Importar do Sheets" para puxar o conteúdo atual via connector já conectado.
- **RLS restritiva**: só você (role = financeiro_admin) lê/escreve. Resto da equipe = sem acesso.

## Fase 7 — Equipe, papéis e convites

- Tabela `user_roles` (admin, financeiro_admin, gestor, criador, social, audiovisual, etc.).
- Aba **Configurações → Equipe**: enviar convite por e-mail, definir papel, definir o que enxerga.
- Atualizar organograma: adicionar **Márcio (audiovisual sênior, editor principal)**, remover Omar, manter Henrique/Nicolas/Anderson com câmera, João Gabriel/Maria Clara como social media, Maria Luiza sai dia 10, Bruno também como designer.

## Fase 8 — "Meu Dia" inteligente

- Saudação "Bom dia, Gabriel" estilo Cloud.
- Cards: reuniões do dia (Google Agenda real), tarefas pendentes do usuário, concluídas hoje.
- Campo de chat com IA (Lovable AI gateway, modelo `google/gemini-2.5-flash`) que responde "onde está X", "o que tenho hoje", consultando o banco.

---

## Como quero proceder

Cada fase consome créditos. **Fases 1, 2, 3 e 4 são as mais críticas pelo que você descreveu.** Fases 5-8 são valiosas mas grandes.

**Me responde só com os números das fases que você quer que eu execute AGORA**, na ordem. Eu paro entre fases pra você ver consumo de créditos e decidir se continua.

Sugestão minha: **1 → 2 → 3 → 4**, parar, avaliar créditos, depois 5/6/7/8.

Sobre acesso ao sistema da Alpha (operacional.assessorialpha.com): eu não consigo logar em sistemas externos via navegador autenticado — uso os prints que você mandou como referência visual, que já é suficiente.