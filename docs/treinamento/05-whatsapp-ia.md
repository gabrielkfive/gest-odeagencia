# WhatsApp & IA

> **Para quem:** Gestor, Admin (Gabriel). Módulo com controle de acesso restrito.

> ⚠️ **Status atual (jul/2026):** WhatsApp em manutenção — não aparece no menu para a maioria da equipe. Quando reativar, este guia se aplica integralmente.

---

## TL;DR — 30 segundos

O WhatsApp chega no sistema, a IA lê, entende o pedido, cria a tarefa e sugere a resposta — você só revisa e envia. Nenhuma mensagem sai sem passar pelos seus olhos. Resumo do dia em voz: 2 minutos para saber tudo que chegou.

---

## Como o fluxo funciona

```
Mensagem chega no WhatsApp da ARK
  ↓
IA lê e classifica (cliente, lead, fornecedor)
  ↓
Se for pedido de serviço → tarefa criada automaticamente
  ↓
IA escreve sugestão de resposta
  ↓
Você revisa, edita se quiser, envia
  ↓
Histórico fica registrado no sistema
```

---

## Como usar

### Acessar o WhatsApp
Menu lateral → ícone verde 🟢 **WhatsApp** (parte de baixo do menu)

### Ver as conversas
A tela lista todas as conversas com:
- Nome do contato
- Última mensagem
- Tag: **ARK** / **ALPHA** / **Lead** / **Fornecedor**
- Badge numérico: mensagens não lidas

### Ler e responder uma mensagem
1. Clique na conversa
2. A IA já analisou — você vê:
   - **Resumo do pedido** (o que a pessoa quer em 1 linha)
   - **Sugestão de resposta** (texto completo)
   - **Tarefa sugerida** (se for demanda de serviço)
3. Revise a sugestão de resposta
4. Edite se necessário
5. **Enviar** ou **Abrir no WhatsApp** para confirmar

### Marcar com etiqueta
Dentro da conversa → botão de etiqueta → escolha:
- **ARK** → cliente ativo ARK Direto
- **ALPHA** → cliente Squad Alpha
- **Lead** → prospect / novo contato
- **Fornecedor** → parceiro ou prestador

### Encaminhar para a equipe
1. Selecione a mensagem (checkbox na mensagem)
2. **Encaminhar**
3. Escolha o membro da equipe
4. A mensagem chega como demanda interna — sem precisar de WhatsApp pessoal

### Resumo do dia
Botão **Resumo do dia** na tela do WhatsApp → abre modal com tudo que chegou no dia.
- **🔊 Ouvir (JARVIS)** → narração em voz — escuta enquanto toma café

---

## Módulo de Notificações

**Acesso:** menu → Ferramentas → **Notificações**

Badge vermelho no ícone = tem coisa nova. Aqui ficam:
- Novas mensagens de WhatsApp recebidas
- Tarefas criadas automaticamente pela IA a partir de mensagens
- Alertas internos do sistema

Não precisa abrir o WhatsApp para saber se chegou algo — as Notificações avisam.

---

## Rotina por função

### 👤 Gestor — início do dia
```
WhatsApp → Resumo do dia → 🔊 Ouvir (JARVIS)
  → 2 minutos de áudio = você sabe tudo que chegou

Conversas novas:
  → Urgentes: responde direto pelo sistema
  → Demandas de serviço: tarefa já criada pela IA, revisa o responsável
  → Leads: vai para o Comercial → Funil

Final do dia:
  → Badge de notificações = zero antes de fechar
```

### 👤 Account (Lucas) — demandas de clientes
```
Cliente mandou mensagem no WhatsApp:
  → Sistema cria a tarefa automaticamente
  → Lucas abre nas Atividades, revisa e executa
  → Não precisa ficar monitorando o WhatsApp diretamente
```

---

## Erros comuns

**WhatsApp não aparece no menu**
Módulo desativado ou sem permissão. É decisão do Gabriel. Quando ativo, aparece no final do menu com ícone verde.

**Mensagens não atualizam**
O sistema puxa a cada 3,5 segundos com a aba aberta. Se travar: F5 na página.

**IA criou tarefa errada a partir de uma mensagem**
Atividades → encontre a tarefa → edite ou exclua. A IA aprende com o tempo, mas mensagens ambíguas podem gerar erros.

**Não consigo ver fotos/vídeos enviados pelo cliente**
Ícone 📎 dentro da conversa → abre modal de mídias.

---

## Regra de ouro

> Nunca responda pelo WhatsApp pessoal enquanto o módulo estiver ativo. A resposta precisa passar pelo sistema para ter histórico, rastreabilidade e a IA aprender. Uma resposta fora do sistema = dado perdido.
