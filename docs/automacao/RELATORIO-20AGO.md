# Automacao financeira da ARK + Hermes Agent
Sessao de 20/08/2026. NADA foi enviado, cobrado ou pago.

## 1. Hermes Agent: NO AR nesta maquina
Hermes Agent v0.20.4 (2026.8.18), Python 3.11.16, instalado em
`C:\Users\USER\AppData\Local\hermes`. Comando `hermes` no PATH do usuario.

Identidade da ARK gravada em `SOUL.md` (o original virou `SOUL.md.original`):
regra de nao usar traco, regra de "pronto so depois de verificar a URL",
e a trava de nunca enviar mensagem nem mexer em dinheiro sem aprovacao.

FALTA para ele operar: escolher o provedor de modelo (`hermes model`).
Isso e gasto de dinheiro, entao nao fiz. Ver secao 6.

## 2. O buraco mais caro que achei: R$ 6.000 por mes de custo fantasma

A tela de Acerto soma TODOS os registros marcados como `custom`. Hoje existem
43 registros e o Danilo esta cadastrado 3 vezes, com R$ 3.000 em cada:

| id do registro | valor | ja foi pago alguma vez? |
|---|---|---|
| `fin-danilo-(coo-+-cmo)` | 3.000 | sim, jun + jul + ago (este e o real) |
| `fin-danilo-(coo)` | 3.000 | nunca |
| `fin-danilo-(coo-)` | 3.000 | nunca |

Resultado: o app mostra **R$ 34.661** de custo fixo no mes quando o real e
**R$ 28.661**. Sao R$ 6.000/mes de despesa que nao existe, e mais 2 pessoas
falsas na fila de "a pagar".

Causa: o campo de nome salva a cada tecla digitada, entao cada letra criou um
registro novo. Por isso existem `fin-po`, `fin-pot`, `fin-porte` e a serie
`fin-samuel(`, `fin-samuel(prod`, `fin-samuel(prod.-audio`.

### Limpeza proposta (13 registros zerados, nenhum nunca foi pago)
`fin-po`, `fin-pot`, `fin-porte`, `fin-samuel(`, `fin-samuel(prod`,
`fin-samuel(prod.-audio`, `fin-samuel(prod.-audiovisual`,
`fin-samuel-(prod.-audiovisual)`, `fin-produtor-s`, `fin-produtor-scao`,
`fin-produtor-sao-paulo`, `fin-lucas-macei`, `fin-trafego`.

Mais os 2 Danilos fantasmas. Total: 15 registros a apagar, R$ 6.000/mes a menos.

### Precisa da sua decisao (nao mexi)
Sao casos em que os dois registros ja receberam pagamento, entao pode ser
pessoa com duas funcoes ou pode ser duplicata:
- Portela: `fin-portela` R$ 100 (pago em ago) x `fin-portela-(designer)` R$ 600 (pago jun e jul)
- Henrique: `fin-henrique` R$ 900 (pago jun) x `fin-henrique-(produtor-audiovisual)` R$ 1.200 (pago jun e jul)
- Samuel: R$ 2.800 (editor) x R$ 800 (prod. audiovisual) x R$ 150 (dev Lunna's)
- Victor: `fin-victor` R$ 1.300 x `fin-victor-gabriel` R$ 450

## 3. Cobranca: a ARK vinha cobrando sem mandar a chave Pix

O gerador de mensagem (`cobMensagem`) so inclui a chave se o campo `pix` do
cliente estiver preenchido. Conferi: **esta vazio em todos os clientes**, e o
campo `whatsapp` tambem. Ou seja, toda cobranca saia sem chave e sem destino.

Achei a chave de recebimento da ARK no seu WhatsApp:
**CNPJ 48674401000153**, Ark Content Solucoes de Marketing LTDA, C6 S.A.
Ela ja esta embutida no agente novo, entao a cobranca sai completa.

## 4. Agente Financeiro criado
`src/routes/api/workflowark.financeiro-run.ts` (compila, build limpo, rota
registrada no routeTree).

- `GET /api/workflowark/financeiro-run?key=<RUN_KEY>` devolve o relatorio e
  NAO grava nada. Este e o padrao.
- `&apply=1` grava a fila de propostas em `wfa-fin-fila` e notifica voce.
- Nunca envia. O arquivo nao importa nenhuma funcao de envio, entao a garantia
  e estrutural e nao promessa.

O que ele entrega: regua de cobranca por data (D-3 lembrete, D0 vencimento,
D+3 cobranca, D+7 insistencia, depois escalar), mensagem pronta por cliente ja
com a chave Pix, lista de acerto do dia 10, e a lista de problemas (quem esta
sem Pix, sem WhatsApp, e quais registros estao duplicados).

### Cobranca centralizada em voce
Antes: Danilo cobrava Vaca Velha, Sasse, Lunnas e Shopping.
Agora: **voce e o cobrador padrao de todos**, com tres excecoes por
proximidade, que sao as que voce disse que funcionam:
Fercon e Fonseca & Cavalcanti com o Lucas Rosiron, Nael com o Saulo.

## 5. Chaves Pix da equipe (parcial)
Achadas no WhatsApp: Victor `61994190543`, Henrique `henriquebsbmendes@gmail.com`.
As demais nao sairam pela busca global porque o WhatsApp Web mostra so um
preview truncado, e a chave fica cortada quando esta dentro de mensagem longa.
Guardei o que achei fora do repositorio, em arquivo local, por ser dado sensivel.

## 6. Bloqueios (precisam de voce)
1. **Evolution API fora do ar.** `136.248.75.53:8080` nao responde. Sem ela o
   Worker nao envia nem le WhatsApp, entao o bot de comando e a coleta
   automatica de Pix ficam parados. Precisa religar a VM na Oracle.
2. **Provedor de modelo do Hermes.** `hermes model` exige escolher provedor e
   assinar. E gasto, entao parei aqui.
3. **As 4 duplicatas ambiguas** da secao 2.

## 7. Varredura da operacao: o que ainda falta automatizar

### 7.1 Furo de receita no comercial
`Fabio (Agencia de marketing)` esta na etapa **Fechado** no CRM com R$ 1.500,
mas nao existe nenhum registro de cobranca com esse nome em `wfa-cobranca`.
Royal Face e La em Casa fecharam e viraram cobranca, ele nao virou.

AUTOMACAO PROPOSTA: quando um lead entra na etapa 4 (Fechado) com valor maior
que zero, criar automaticamente a linha de cobranca. Hoje isso e manual e ja
falhou pelo menos uma vez.

### 7.2 Follow-up comercial vencido e parado
Leads cuja proxima acao passou da data, contados em 20/08:

| Lead | Vencido ha | Etapa | Responsavel |
|---|---|---|---|
| Carlos eduardo, Pizzaria D'Italia | 63 dias | Perdido | Saulo |
| Estacao Lanche | 45 dias | Diagnostico | Gabriel |
| Nei, Fogo arte churrasqueira | 28 dias | Prospeccao | Gabriel |
| Colorado burguer | 24 dias | Perdido | Saulo |
| Colorado Beef (R$ 2.000) | 21 dias | Negociacao | Outro |
| Joeuma, Farmacia Biovida | 3 dias | Prospeccao | Saulo |
| Paulo, Brunella pizzaria | vence hoje | Diagnostico | Saulo |

Colorado Beef e o mais caro: R$ 2.000 parados em Negociacao ha 21 dias, e o
responsavel esta como "Outro", ou seja, ninguem.

AUTOMACAO PROPOSTA: varredura diaria que junta os vencidos, agrupa por
responsavel e manda um unico resumo. Um aviso por dia por pessoa, nao um
alerta por lead, pra nao virar flood.

### 7.3 Cobrancas de agosto que ainda nao sairam
Ja cobrados em agosto: Vaca Velha, Fonseca, Vivenda, Attraverssiamo, Esfirras.
Sem registro de cobranca em agosto: Sasse, Fercon, Lunnas, Shopping, Bellavita,
plan-sasse (R$ 3.000), plan-la-em-casa (R$ 2.000), plan-royal-face (R$ 3.800),
plan-captacao-alpha (R$ 700).

So nos tres planos maiores sao R$ 8.800 sem cobranca registrada no mes, com o
vencimento (dia 8, porque dia 10 cai domingo) ja passado. O agente novo pega
exatamente isso e ja monta a mensagem.

### 7.4 Fila de automacoes propostas (nenhuma ligada)
| # | Automacao | Depende de |
|---|---|---|
| A1 | Financeiro diario: monta cobrancas e acerto na fila de aprovacao | so ligar o cron |
| A2 | Lead Fechado vira linha de cobranca sozinho | so codar |
| A3 | Resumo diario de follow-up vencido por responsavel | so codar |
| A4 | Coleta automatica das chaves Pix da equipe pelo WhatsApp | Evolution no ar |
| A5 | Bot de comando no WhatsApp ("cobrancas de hoje", "quem falta pagar") | Evolution no ar |
| A6 | Baixa automatica: comprovante recebido marca o cliente como pago | Evolution no ar |

Metade da fila depende do mesmo bloqueio: a VM da Evolution na Oracle.

## 8. Agente Comercial criado
`src/routes/api/workflowark.comercial-run.ts` (build limpo, rota registrada).

- `GET /api/workflowark/comercial-run?key=<RUN_KEY>` so relatorio.
- `&apply=1` grava a fila e notifica. Nunca envia mensagem.

Faz duas coisas:
1. Acha lead na etapa Fechado com valor que nao tem linha de cobranca.
   Testado contra os dados reais: acusou o Fabio (R$ 1.500) e nao deu falso
   positivo em Royal Face nem La em Casa, que ja tem cobranca.
2. Junta os follow-up vencidos e monta UM resumo por responsavel, nao um
   alerta por lead.

## 9. Estado do codigo
Tudo compila e o build passa. NADA foi deployado e NADA foi commitado ainda.
Os dois agentes existem so nesta maquina.

Deploy quando voce autorizar:
    cd ~/gest-odeagencia && npx wrangler deploy

Depois, para conferir sem disparar nada:
    /api/workflowark/financeiro-run?key=<RUN_KEY>
    /api/workflowark/comercial-run?key=<RUN_KEY>

Os dois sem `apply=1` sao somente leitura.
