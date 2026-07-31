# Propostas ARK · Estrategista Comercial

Ferramenta do agente **Estrategista Comercial** da ARK: gera propostas comerciais premium (HTML + PDF) a partir de um modelo pronto, só preenchendo os dados do cliente.

## Como gerar uma proposta

1. Crie a pasta do cliente em `clientes/<nome>/` com:
   - `dados.json` (copie o de `clientes/ahava/` e troque os valores)
   - `avatar.jpg` (foto de perfil do Instagram do cliente)
2. Rode:

```bash
python gerar.py clientes/<nome> --pdf
```

Sai o `proposta.html` e o PDF de 17 páginas na pasta do cliente, já na IDV da ARK (amarelo #FEEF02 sobre preto).

Na prática: é só dar os dados do cliente pro Claude (nome, @ do Instagram, preços dos planos e a proposta concorrente, se houver) que ele coleta os números do perfil, preenche o `dados.json`, adapta o texto se precisar e entrega o PDF verificado.

## O que o dados.json controla

Nome do cliente, @ e números do Instagram (posts, seguidores, seguindo), mês da proposta, preços e totais dos 3 planos, preço da proposta concorrente e a diferença mensal usada no comparativo.

## Modelos disponíveis

- `modelos/saude-odontologia.html`, modelo completo tokenizado (usado na Ahava). Estrutura: capa, carta honesta, diagnóstico com card real do Instagram, benchmark de mercado, case Fábula (0 a 40 pacientes no 1º mês), tese, Método ARK em 4 pilares com "quem cuida", projeção, primeiros 90 dias, planos e CTA.
- `modelos/referencia-gastronomia-sal-e-fumaca.html`, referência de copy e estrutura para gastronomia (feita para a Sal & Fumaça com a marca Alpha).
- `modelos/automotivo-seminovos.html`, modelo de 15 páginas para loja de seminovos com equipe de vendedores (usado na Localiza Seminovos). Estrutura comercial diferente: em vez de 3 planos, o investimento é mídia Meta individual por vendedor + 1 diária de captação mensal rateada pela loja. Tokens de números: QTD_VENDEDORES, MIDIA_VENDEDOR, CAPTACAO_MES, RATEIO_VENDEDOR, TOTAL_VENDEDOR, TOTAL_MIDIA, TOTAL_OPERACAO.

**Novo segmento?** Peça pro Claude adaptar o modelo mais próximo: o que muda é o vocabulário (paciente/agenda vira cliente/casa cheia), o case e os benchmarks. O design e a argumentação (esforço sem direção, o barato que sai caro, equipe integrada vs freelancer) valem para qualquer segmento.

## Regras de ouro

1. **Nunca travessão** (—, –) nem linha de desenho (─). O gerador avisa se encontrar.
2. **Dados reais**: números de Instagram coletados na hora (perfil público), nunca inventados.
3. **Verificar o PDF real** página por página antes de enviar (media query de impressão é traiçoeira: responsivo sempre em `@media screen`).
4. PDF final enviado ao cliente também vai pro Drive (documento comercial); aqui no repo ficam modelo e dados.
