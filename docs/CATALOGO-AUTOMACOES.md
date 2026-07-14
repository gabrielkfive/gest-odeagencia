# Catálogo de Automações · ARK Content (14/07/2026)

Minerado dos e-mails reais do Gabriel (Gmail) e do conhecimento do sistema.
A análise das conversas do WhatsApp (blob wfa-whatsapp no Supabase) ficou
pendente de credencial service role nesta máquina e entra na próxima rodada.

## Escala IAO (Índice de Automação Operacional)

Nível 0: totalmente manual. Nível 1: sistema lembra. Nível 2: sistema prepara
tudo e aguarda aprovação. Nível 3: executa sozinho e informa. Nível 4: aprende
com o histórico.

## Padrões encontrados

### 1. Solicitação de Acerto (Vivenda) · o padrão mais forte
Evidência: 201 threads com assunto "SOLICITO ACERTO".
Gatilho: ciclo da mídia ou da mensalidade vence.
Participantes: Gabriel → Remerson (autoriza com "Autorizado") → Gustavo Junio
(financeiro NEXUS) executa o pagamento.
Modelo real: "Solicito acerto referente a <item>. Valor: R$X" e às vezes
justificativa de desempenho e dados bancários (Agência 0001, Conta 6860143-8).
Recorrências: mensalidade ARK R$5.500 (~dia 7 a 9), Outdoor Sobradinho R$1.600
(mensal, ~dia 5 a 8), verba Google R$1.500 (mensal), verba Meta R$1.000
(mensal), BR-040 (mensal), Taguatinga (trimestral), mídias indoor (semestral).
Atrito real observado: "Cadê o boleto?" (boleto deveria ir junto).
IAO antes: 0. IAO agora: 2, IMPLEMENTADO 14/07 no bloco "Solicitações de
acerto" da página Cobranças (e-mail pronto, ciclo controlado, nunca domingo).
Próximo passo (IAO 3): enviar via API de e-mail (Resend) com aprovação em 1
clique na fila de notificações e boleto anexado (Hyper API gera o boleto).

### 2. Cobrança de mensalidade dos clientes ARK
Gatilho: todo cliente paga dia 10 (regra fixa; nota pronta D-2, nunca domingo).
Já existe página Cobranças com vencimento inteligente (dia 10, fim de semana
puxa pra sexta) e controle cobradoMes. IAO atual: 1,5 (lembra e organiza).
Para IAO 2: gerar a mensagem/NF pronta por cliente (WhatsApp já tem "Abrir no
WhatsApp"). Para IAO 3: link de cobrança automático via API da Hyper
(PENDENTE: credencial da Hyper com o Gabriel).

### 3. Nota fiscal via contabilidade (Vivenda, advogados, SAC)
Gatilho: D-2 do vencimento (dia 8).
Participantes: Gabriel → contabilidade (grupo WhatsApp).
Mensagem padrão: pedir NF "igual à do mês passado, só atualiza o mês".
IAO atual: 0. Alvo IAO 2: card na Cobrança que gera a mensagem pronta pro
grupo da contabilidade no dia 8 (o texto é quase estático). Depende de mapear
o grupo certo no WhatsApp conectado (Z-API/Evolution).

### 4. Captação → edição (frente audiovisual)
Gatilho: captação concluída.
IAO antes: 0 (tudo na cabeça do Gabriel). IAO agora: 2,5, IMPLEMENTADO 14/07:
página Produção com checklist do produtor travando a conclusão e geração
automática das tarefas de edição com roteiro, material, checklist do editor,
prazo e responsável. Próximo (IAO 3): aviso automático no WhatsApp do editor.

### 5. Pauta de conteúdo (social → roteiro → design/edição → aprovação)
Gatilho: briefing estruturado.
IAO antes: 0 (freestyle no WhatsApp, 40% do tempo em clarificação).
IAO agora: 2,5, IMPLEMENTADO 14/07: página Pautas com briefing obrigatório,
cadeia que anda sozinha (concluir etapa cria a próxima) e prazos
retroplanejados. Performance loop: o que performou entra no briefing.

### 6. Alertas de saúde do cliente (Account)
IAO agora: 2, IMPLEMENTADO 14/07: aprovação parada 5+ dias, risco de atraso,
pauta travada, captação contratada sem agendamento. Superfícies: página
Clientes + Meu Dia + Inteligência Executiva.

### 7. Visão executiva de segunda-feira
IAO agora: 2, IMPLEMENTADO 14/07: card Inteligência Executiva no Meu Dia
(problemas + oportunidades calculados). Próximo (IAO 3): resumo narrado pelo
JARVIS + envio diário no WhatsApp do Gabriel com aprovação.

## Fila priorizada (impacto x esforço)

1. Hyper API: boleto/link de cobrança automático (impacto alto; bloqueado na
   credencial do Gabriel).
2. Envio real de e-mail de acerto com aprovação em 1 clique (Resend; precisa
   API key, 10 minutos de setup).
3. WhatsApp do editor na passagem de bastão (Evolution já conectada).
4. Mensagem pronta pra contabilidade no dia 8 (grupo WhatsApp).
5. Mineração do wfa-whatsapp (precisa service role nesta máquina) para achar
   os padrões que ainda não vemos.

## Pergunta permanente do conselho
Quantos processos ainda estão no nível 0, e o que impede os principais de
chegarem ao nível 3?
