# Motor de Conteúdo · Vivenda (Spec)

Data: 2026-07-16  
Escopo piloto: cliente Vivenda  
Expansível para outros clientes após validação

---

## Objetivo

Fazer a operação de conteúdo da Vivenda parecer autônoma: o sistema chega com o
plano pronto, gera as legendas sozinho e avisa quando há captações sem data. O
Gabriel só aprova ou ajusta — não parte do zero.

---

## Arquitetura

Nova rota React `/motor` (arquivo `src/routes/motor.tsx`), no padrão das rotas
existentes `/postagens` e `/calendario`. Fica fora do iframe do workflowark.html.
Link "Motor" adicionado ao sidebar do workflowark.html. Item "Pautas" removido do
sidebar.

### Pipeline do conteúdo

```
[1] Roteiro gerado pela IA  →  aprovado no Motor
[2] Captação criada em wfa-producao
[3] Tarefas de edição criadas ao concluir captação (fluxo já existente em Produção)
[4] Legenda gerada pela IA ao concluir edição
[5] Legenda aprovada em /postagens  →  entra no Calendário Editorial
[6] Marcado como Publicado no Motor
```

### Fontes de dados

| Chave             | O que guarda                              | Situação     |
|-------------------|-------------------------------------------|--------------|
| `wfa-producao`    | Captações agendadas                       | Existe       |
| `wfa-tarefas`     | Tarefas de edição                         | Existe       |
| `wfa-social-fila` | Legendas aguardando aprovação             | Existe       |
| `wfa-editorial`   | Calendário com postagens agendadas        | Existe       |
| `wfa-motor-plano` | Roteiros gerados pelo planejamento mensal | **Novo**     |

---

## Layout da página `/motor`

### Topo

- Nome do cliente (Vivenda) + mês/ano corrente
- Três botões dourados em linha:
  - `Gerar Plano de [Mês]`
  - `Gerar Legendas Pendentes`
  - `Ver Radar de Captações`

### Corpo: pipeline kanban horizontal

Colunas fixas na ordem:

```
Roteiro | Captação | Em Edição | Legenda | Agendado | Publicado
```

Cada card exibe: título do conteúdo, formato (Reels / Feed / Stories), data
prevista. Clique no card abre modal de detalhe. Cards na coluna "Roteiro" têm
botão "Aprovar → cria captação" que move o item para a coluna seguinte e grava
a captação em `wfa-producao`.

### Painel lateral: Radar de Captações

Abre ao clicar no botão correspondente. Duas seções empilhadas:

- **Próximos 14 dias** — captações com data marcada (verde) e slots sem data (vermelho)
- **Próximo mês** — captações contratadas vs. agendadas; gap exibido como slots
  vazios com alerta "agendar até X para fechar o mês"

### Visual

Dark + gold da marca ARK. Playfair Display nos títulos, Inter no corpo.
Mesmo padrão de `/postagens` e `/calendario`.

---

## Rotinas (3 ações no servidor)

### 1. `motor-plano-mensal`

**Disparado por:** botão "Gerar Plano de [Mês]"  
**Input para o servidor:** `{ clienteId: 'vivenda', mes: 'YYYY-MM' }`

O servidor monta prompt com:
- Brief completo da Vivenda (`docs/clientes/vivenda.md`)
- `cap` (captações/mês do cadastro do cliente)
- Entradas já existentes em `wfa-editorial` do mês alvo (evita repetição)
- Datas comemorativas relevantes do mês alvo

Claude Sonnet retorna array de roteiros — um por captação prevista:

```ts
{
  id: string;
  clienteId: 'vivenda';
  mes: string;           // YYYY-MM
  titulo: string;
  formato: 'Reels' | 'Feed' | 'Stories';
  gancho: string;
  roteiro: string;       // script completo
  melhorDia: string;     // YYYY-MM-DD sugerido
  status: 'pendente' | 'aprovado' | 'descartado';
}
```

Resultados gravados em `wfa-motor-plano`. Aparecem na coluna "Roteiro" do pipeline.

### 2. `motor-gerar-legendas`

**Disparado por:** botão "Gerar Legendas Pendentes"  
**Input:** `{ clienteId: 'vivenda' }`

O servidor:
1. Busca tarefas em `wfa-tarefas` da Vivenda com `status === 'concluída'` e
   `funcao === 'Edição'`
2. Cruza com `wfa-social-fila` para identificar as que ainda não têm legenda
3. Para cada uma, chama Claude Sonnet com o roteiro original da captação e gera:
   legenda (gancho + corpo + CTA) + hashtags
4. Grava os itens em `wfa-social-fila` com `status: 'pendente'`

As legendas aparecem imediatamente em `/postagens` para aprovação em 1 toque.

### 3. Radar de Captações (sem IA)

**Disparado por:** botão "Ver Radar de Captações" — leitura do estado já carregado.

Cálculo local no cliente:
- Lê `cap` do cadastro da Vivenda
- Conta captações em `wfa-producao` com data dentro dos próximos 14 dias
- Conta captações com data dentro do próximo mês calendário
- Exibe gap: captações contratadas − agendadas = slots vazios

---

## Mudanças no workflowark.html

1. Remover item "Pautas" do menu lateral
2. Garantir que "Produção" está visível no menu lateral
3. Adicionar item "Motor" no menu lateral com link para `/motor`

---

## O que NÃO entra nesta versão

- Múltiplos clientes (só Vivenda)
- Disparo automático por cron (tudo por botão)
- Integração com Meta Ads ou agendamento automático de postagem
- Geração de arte/imagem

---

## Critérios de sucesso

- Plano do mês gerado e visível no pipeline com um botão
- Legendas das edições concluídas da Vivenda geradas e caindo em /postagens
- Radar mostra captações agendadas vs. contratadas nos próximos 14 dias e mês seguinte
- Pautas removida do menu; Motor acessível pelo menu
- Build passa; mobile não quebra
