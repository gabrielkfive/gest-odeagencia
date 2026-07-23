# Financeiro & Relatórios

> **Para quem:** Gabriel (acesso total), Gestor (acerto restrito). Equipe não tem acesso a valores.

---

## TL;DR — 30 segundos

Três módulos: **Cobranças** (o que os clientes devem pagar), **Acerto** (o que a ARK precisa pagar), **Financeiro** (visão geral via planilha Google). O sistema já sabe quem deve quanto — você só envia e marca como pago.

---

## Os 3 módulos financeiros

| Módulo | O que é | Quem usa |
|--------|---------|----------|
| **Financeiro** | Visão consolidada do mês, MRR, planilha Google | Gabriel, Gestor |
| **Cobranças** | Mensalidades a receber dos clientes — o agente já calculou tudo | Gabriel, Gestor |
| **Acerto · Pagamentos** | Pagamentos a fazer: equipe, freelas, verbas de anúncio | Só Gabriel (admin) |

**Acessar:** menu → **Financeiro** → escolha a sub-tela

---

## Cobranças — mensalidades a receber

### Ver as cobranças do mês
A tela lista todos os clientes ARK Direto com:
- Valor da mensalidade
- Data de vencimento (calculada para o último dia útil do mês)
- Responsável pela conta (Account)
- Botão **Abrir no WhatsApp**

### Enviar cobrança para um cliente
1. Localize o cliente
2. Clique **Abrir no WhatsApp**
3. O WhatsApp já abre com a mensagem escrita e formatada
4. Leia o texto → envie

**Pronto. 30 segundos por cliente.**

### Filtrar por tipo de cliente
- Aba **Todos** → todos os clientes
- Aba **ARK Direto** → mensalidade mensal
- Aba **Squad Alpha** → pré-pago via matriz (dinâmica diferente)

---

## Acerto · Pagamentos — o que a ARK paga

**Acesso restrito: só para Gabriel (admin)**

### Ver o que precisa pagar
Lista completa com:
- Nome do destinatário / serviço
- Valor
- Data sugerida de pagamento
- Chave Pix (clique para copiar)
- Status: ⬜ Pendente / ✅ Pago

### Pagamentos recorrentes (chegam automáticos no dia 1º)

| Item | Valor | Dia sugerido |
|------|-------|-------------|
| Mensalidade ARK · Vivenda | R$ 5.500 | Dia 7 |
| Verba Google Ads | R$ 1.500 | Dia 6 |
| Verba Meta Ads | R$ 1.000 | Dia 6 |
| Outdoor Sobradinho | R$ 1.600 | Dia 5 |
| Outdoor BR-040 | definir | Dia 5 |
| Outdoor Taguatinga | definir | Dia 5 |

### Registrar um pagamento como feito
1. Localize o item
2. Clique **Marcar como pago** (ou ✓)
3. Item fica verde/riscado e sai da fila de pendentes

### Copiar o Pix
Clique na chave Pix → copiada automaticamente. Cole no app bancário.

### Trazer do Financeiro
Botão **⤵ Trazer do Financeiro (dia 10)** → importa os valores da planilha quando tiver atualização.

---

## Financeiro — visão geral do mês

### Ver o resumo
1. Financeiro → aba aberta automaticamente
2. **↻ Atualizar** para puxar dados mais recentes da planilha Google
3. Selecione o **mês** no seletor
4. KPIs: Receita / Despesa / Lucro / MRR

### Abrir a planilha do Google
Botão **↗ Abrir planilha** → edite diretamente no Google Sheets.

> **Regra:** você edita na planilha, aqui reflete. Não tente editar os números aqui.

### Ver a planilha completa embutida
No rodapé da tela → **"Ver a planilha completa do Google"** → abre o Google Sheets em iframe.

---

## Relatórios mensais

### Meu Mês
Menu → Gestão do mês → **Meu Mês**
Painel visual com totais do mês: tarefas, clientes, MRR e entregas. Usado na revisão mensal do Gabriel.

### All Hands
Menu → Gestão do mês → **All Hands**
Para a reunião com toda a equipe. Mostra KPIs de forma visual e de fácil leitura. Projete na TV, percorra com a equipe.

---

## Rotina financeira do mês

### Dias 1–5: Cobranças
```
Financeiro → Cobranças
→ Percorre a lista de clientes
→ Para cada um: "Abrir no WhatsApp" → envia
→ ~20 minutos para cobrar todos os clientes do mês
```

### Dia 6: Verbas de anúncio
```
Financeiro → Acerto
→ "Verba Google Ads" → copia Pix → paga → marca como pago
→ "Verba Meta Ads" → copia Pix → paga → marca como pago
```

### Dia 7: Mensalidade Vivenda
```
Financeiro → Acerto
→ "Mensalidade ARK · Vivenda" → Pix → paga → marca como pago
```

### Dia 10: Acerto da equipe
```
Financeiro → Acerto → "Trazer do Financeiro"
→ Confere os valores com a planilha
→ Vai pagando e marcando um a um
```

### Final do mês: revisão
```
Gabriel → Financeiro → seleciona o mês
→ Confere MRR, receita, despesas
→ Compara com mês anterior
→ Lança dados relevantes no Obsidian
```

---

## Erros comuns

**Cliente não aparece nas cobranças**
Edite o cadastro: tipo = "ARK Direto" e valor mensal preenchido.

**Valor na cobrança está errado**
Edite o cadastro do cliente → campo "valor mensal". Recarregue as Cobranças.

**Planilha não atualiza**
Clique **↻ Atualizar**. Se não resolver, verifique login na conta Google correta.

**Pix não copiou automaticamente**
No celular pode falhar. Pressione e segure o campo Pix → **Copiar texto** manualmente.

**Acerto recorrente com valor errado**
Edite o item diretamente na tela de Acerto. Avise o Gabriel para atualizar o valor fixo no sistema.

---

## Regra de ouro

> Cobranças até o dia 5 e acertos até o dia 10. Quem não tem data não tem disciplina financeira. O sistema já sabe o que deve ser pago — você só precisa executar na ordem certa.
