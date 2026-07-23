# Clientes & CRM

> **Para quem:** Account (Lucas), Gestor, Gabriel. Produção e Edição usam raramente.

---

## TL;DR — 30 segundos

Aqui ficam todos os clientes com status de saúde, contratos e histórico de sprints. 🟢 = tudo bem, 🟡 = atenção, 🔴 = precisa de ação hoje. Clique em qualquer cliente para ver o detalhe e agir.

---

## As 4 sub-telas

| Sub-tela | O que é | Acesso pelo menu |
|----------|---------|-----------------|
| **Lista de Clientes** | Cadastro + status de saúde de cada conta | Clientes → Lista de Clientes |
| **Jornada · Sprints** | Fase em que o cliente está (onboarding, evolução…) | Clientes → Jornada · Sprints |
| **Régua dos 15** | Matriz de ativações do mês (account + equipe) | Clientes → Régua dos 15 |
| **Squad Alpha** | Clientes pré-pagos via matriz Alpha | Clientes → Squad Alpha |

---

## Lista de Clientes

### Ver o status de um cliente
A lista mostra todos com um círculo colorido:
- 🟢 **Verde** → conta saudável
- 🟡 **Amarelo** → atenção — algo está levemente fora
- 🔴 **Vermelho** → crítico — action required hoje

O sistema calcula o status automaticamente com base em: tarefas atrasadas, captações em falta, tempo sem atividade.

### Abrir o detalhe de um cliente
Clique no nome do cliente. Abre painel lateral com:
- Dados de contato (WhatsApp, e-mail)
- Tipo: ARK Direto (mensalidade) ou Squad Alpha (pré-pago)
- Captações do mês: quantas foram feitas vs. o contrato
- Tarefas ativas vinculadas a esse cliente
- Botões rápidos: **Tarefas / Cobranças / Jornada**

### Cadastrar cliente novo
1. Botão **+ Novo cliente**
2. Preencha:
   - **Nome** → exatamente como vai aparecer em tudo (tarefas, cobranças, relatórios)
   - **Contato** → WhatsApp do responsável no cliente
   - **Tipo** → ARK Direto ou Alpha
   - **Captações/mês** → número previsto no contrato
   - **Valor mensal** → mensalidade (usado nas cobranças)
3. **Salvar** → cliente já aparece em toda a agência

### Editar um cliente
Abre o detalhe → botão **Editar** → altera o que precisar → salva.

---

## Jornada · Sprints

Onde está cada cliente na trilha de evolução:

| Sprint | Fase | O que acontece |
|--------|------|----------------|
| Sprint 0 | Onboarding | Configuração inicial: Instagram, pixel, briefing de marca, estratégia |
| Sprint 1 | Primeiro mês | Primeiro ciclo de conteúdo e anúncios rodando |
| Sprint 2+ | Evolução | Otimização e crescimento contínuo |

**Avançar o cliente de sprint:**
1. Clique no sprint atual do cliente
2. Sistema lista as atividades da próxima fase
3. Clique **Criar tarefas** → tarefas de onboarding vão direto para o Kanban, com responsáveis e prazos

---

## Régua dos 15

Matriz visual: **linhas = clientes** / **colunas = 15 ativações do mês** (captações, reunião, entrega de artes, etc.)

- 🟩 Verde → feito
- 🟨 Amarelo → em andamento
- 🟥 Vermelho → não feito

**Quando usar:** na reunião semanal de account — varre tudo em 5 minutos e identifica o que está descoberto.

---

## Squad Alpha

Clientes do plano pré-pago (comprados via matriz). Tem abas específicas:

| Aba | O que mostra |
|-----|-------------|
| Account | Relacionamento e tarefas de CS |
| Tráfego | Performance dos anúncios |
| Produtor | Captações e entregas audiovisuais |
| Edição | Vídeos editados no mês |
| Comercial | Score do cliente / risco de churn |

---

## Rotina por função

### 👤 Lucas (Account) — toda manhã
```
Lista de Clientes → quem está em 🔴?
  → Clica no cliente → vê o que está faltando
  → Se for captação → cria tarefa no Meu Dia ou nas Atividades
  → Contato com o cliente até meio-dia
```

### 👤 Gestor — reunião semanal de account
```
Régua dos 15 → projeta na tela
→ Coluna a coluna: o que está faltando?
→ Distribui responsabilidades para a semana
→ Clientes em 🔴 com ≥3 colunas vermelhas = atenção máxima
```

### 👤 Gabriel — novo fechamento
```
Lista de Clientes → + Novo cliente
→ Preenche dados do contrato
→ Jornada → Sprint 0 → Criar tarefas
→ Lucas recebe as tarefas de onboarding no Kanban automaticamente
```

---

## Erros comuns

**Cliente não aparece nas cobranças**
O tipo precisa ser "ARK Direto" e o campo "valor mensal" precisa ter valor. Edite o cadastro.

**Status vermelho mas está tudo bem**
O sistema baseou em dados desatualizados. Conclua as tarefas pendentes e registre as captações → status atualiza em minutos.

**Não achei o cliente na lista**
O nome no sistema pode estar diferente do que você espera. Use a busca no topo — ela aceita partes do nome.

**Sprint não avança**
O sprint avança quando as tarefas da fase estão com status "Concluído" no Kanban. Conclua as atividades abertas e o sprint avança automaticamente.

---

## Regra de ouro

> Cliente em 🔴 não pode passar de 24 horas sem contato. O sistema detectou o problema — agora é com você resolver. Um e-mail ou WhatsApp rápido já tira do vermelho.
