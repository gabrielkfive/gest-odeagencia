# /app lote 1 (veredito do vídeo de 21/09): rodapé com foto, visão de cliente, configurações, Início

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** aplicar no `/app` (a base escolhida pelo Gabriel) as quatro melhorias aprovadas, sem casca paralela.

**Architecture:** tudo dentro do monolito `public/workflowark.html` + `workflowark-app-<data>.js` (renomeado por regra), mais dois arquivos novos e datados para a página do cliente (`workflowark-cliente-20260921a.{css,js}`), extraídos do bloco que já roda no `/next` com o gate `body.next` removido.

**Spec:** memória `feedback-veredito-video-21-09-app-e-a-base` e Ark Brain (mesmo título).

## Global Constraints
- Sem traço nem travessão em texto novo. Nada criado automaticamente. Nenhum número inventado.
- Arquivo do app com data no nome ao mudar (git mv + referência + marcador `<!-- build 20260921b-lote1-app -->`).
- `npm run build` verde, `npm run teste:mobile` verde antes do push. Deploy pelo CI (push em main), marcador conferido por curl, screenshots antes x depois em produção.

### Task 1: Rodapé da sidebar com foto e cargo
- Modify: `public/workflowark-app-20260921a.js` → `git mv` para `20260921b`; função que preenche `#side-av/#side-nm/#side-rl` (linhas ~5075 a 5082).
- [ ] Ler foto do usuário no `localStorage` (`sb-fxfnonozzekxnxddxsnh-auth-token` → `user.user_metadata.avatar_url || picture`); se houver, `#side-av` vira `<img>`; senão sigla.
- [ ] `#side-rl` = `<cargo> · ARK Content`. CSS: `.side-foot .av{min-width:34px;min-height:34px}` e `img` redonda, também no modo compacto.
- [ ] Prova: screenshot do rodapé aberto e recolhido.

### Task 2: Visão de cliente (Modo Criador) no /app
- Create: `public/workflowark-cliente-20260921a.js` (bloco "pagina do cliente com abas" de `workflowark-next-20260921b.js`, linhas 1 a 543, sem `if(!body.next)return`), `public/workflowark-cliente-20260921a.css` (bloco `.nxc-*` do CSS da pele).
- Modify: `public/workflowark.html` (link do CSS no head, script `defer` depois do app).
- [ ] Extrair, renomear gate, `node --check`.
- [ ] Prova: abrir Área do Cliente, escolher Vivenda, ver abas Posts, Reels, Stories, Aprovação, Ficha, Faturas, Saúde; salvar cartão de post grava `formato` na tarefa.

### Task 3: Configurações da v2 e Régua dos 15 fora
- Modify: `public/workflowark.html`: remover subitem `data-nav="regua"` (linhas 191 a 194) e o bloco de preferência (4303 a 4307); nova aba "Sistema" no modal com 6 cartões (Marca, Equipe e papéis, Integrações, Planos e contratos, Automações, Assinatura eletrônica) apontando pra telas existentes.
- [ ] Prova: modal aberto com a aba Sistema; menu sem Régua.

### Task 4: Início com "Decisões que esperam você" e sem "Novo Meu Dia"
- Modify: JS (dois títulos "Decisões de hoje"), HTML (botão `href="/meu-dia"` no cabeçalho do dashboard).
- [ ] Prova: screenshot do Início.

### Task 5: Publicar e medir
- [ ] Marcador, build, `teste:mobile`, commit, push em main, `gh run` success, curl do marcador, screenshots antes x depois em `deploy/prova-app-lote1-*.png`.
