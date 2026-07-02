# ARK OS V2 · Handoff de Design

Atualizado: 02/07/2026, madrugada
Para: próxima sessão (Opus/Sonnet/Fable) continuar o design do ARK OS

## Missão imediata (decisão do Gabriel)

Replicar FIELMENTE as referências do Figma no Mission Control, em vez de interpretar. O MCP do Figma já está conectado e autenticado (carrega em sessão nova do Claude Code). Arquivos:

1. SaaS Dashboard UI Kit: https://www.figma.com/design/LrIM92EtOy7enD8wbsGNvQ (node 0-1)
2. Dashboard Marketing: https://www.figma.com/design/fna6B94itGZ77fWZgAKKSd (node 1-8)
3. Apple Vision Pro HR (referência de vidro/espacial): https://www.figma.com/design/MQPXFD30CUtKCRmOisFhcM (node 0-1)

Extrair de lá tokens reais (cores, tipografia, espaçamentos, cards, gráficos) e reconstruir o `/os` fiel a eles, mantendo a marca ARK (amarelo `#FFC700`, Sora/Inter).

## O que já existe (não jogar fora)

- **`src/routes/os.tsx`** (~700 linhas): rota `/os` completa, NÃO commitada. Contém:
  - Design tokens em CSS no topo do arquivo (dark: `--void #08080A`, vidro, aurora animada).
  - Boot sequence (ARK OS montando com springs), física AML (`spring`, `springSoft`, `morph`).
  - KPI tiles com sparkline SVG animado (componente `Spark`), números tabulares.
  - Cards: Hoje na operação (tarefas reais por prazo), Fila de aprovação, Clientes ativos.
  - Sociedade de agentes com expansão estilo pasta do iOS (`layoutId` compartilhado + backdrop blur). Esc fecha.
  - Feed "Operações ao vivo" em timeline, itens chegam um a um.
  - Dados reais via GET `/api/workflowark/state` com sessão Supabase; modo demonstração sem login.
  - `prefers-reduced-motion` respeitado em tudo.
- **Biblioteca `motion`** (Framer Motion) instalada. **lucide-react** para ícones (nunca emoji).
- **Plano macro**: `docs/ARK-V2-MIGRATION-PLAN.md` (fases, épicos, riscos).

## Feedback acumulado do Gabriel nesta sessão

1. Reprovou visual "quadradão de dev" (primeira versão com painéis colados e caixas com borda).
2. Aprovou a evolução para vidro visionOS + motion físico, "melhorou muito", mas "ainda não tá como quero".
3. Referências dele: motion.dev (contenção, 1 acento), iOS app folder (expansão espacial), Mintlify (luz ambiente), mindcloud, Landingfolio, Fiverr ("site foda", produto completo, denso e amigável). Muitas dessas são CLARAS, considerar tema claro como no V1 (`#FAFAF7` + amarelo).
4. Regras dele: nunca usar travessão em texto, vírgula ou ponto. Motion com propósito ("Apple anima objetos, não pixels"). Nada de spinner mudo, sempre progresso narrado.

## Como rodar e validar

```bash
cd "Documents/ARK CONTENT/SOFTWARE/Agency Sync Hub"
npm run dev   # abre em http://localhost:8080/os
```
Validar com Playwright (screenshot + console) antes de mostrar. Build tem que passar antes de qualquer deploy, e deploy = commit + push (CI reconstrói do git).

## Estado das ferramentas

- rtk instalado com hook global no `~/.claude/settings.json` (economia de tokens em comandos). Ativa após reiniciar o Claude Code.
- MCP Figma: conectado, tools disponíveis em sessão nova.
- Registro contínuo no Obsidian: `Documents\Obsidian Vault\ARK\WorkFlowArk\ARK OS V2 — Mission Control.md`.
