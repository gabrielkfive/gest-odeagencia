# Motor de Conteúdo · Vivenda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a rota React `/motor` com pipeline kanban de conteúdo da Vivenda e 3 rotinas de IA acionadas por botão (plano mensal, legendas automáticas, radar de captações), removendo "Pautas" do sidebar e adicionando "Motor".

**Architecture:** Nova rota React `src/routes/motor.tsx` seguindo o padrão de `postagens.tsx` e `calendario.tsx`. Três novas actions no handler POST de `workflowark.state.ts`. A página lê wfa-motor-plano (novo), wfa-producao, wfa-tarefas e wfa-social-fila para montar o pipeline. O sidebar do `workflowark.html` troca o navitem de Pautas por um link que abre `/motor` em nova aba.

**Tech Stack:** React 19, TanStack Router (file-based), Cloudflare Workers, Supabase, Claude claude-sonnet-4-6, mesmo padrão dark+gold do `/postagens`

## Global Constraints

- `npm run build` deve passar antes de qualquer deploy
- Feature nova vai em rota React, NUNCA no monolito `public/workflowark.html`
- Mudanças no `workflowark.html`: rodar `npm run teste:mobile` antes do deploy
- Não remover o bloco HTML da página Pautas do monolito (só o navitem) — cirurgia mínima
- Prompts de IA: model `claude-sonnet-4-6`, max_tokens dentro do razoável (4000 para plano, 800 para legenda)
- Vivenda clienteId = `"vivenda"`, cap = `3` (hardcoded do cadastro)
- Mesmo visual: `BG="#0C0A09"`, `SURFACE="#1A1714"`, `BORDER="#2C2825"`, `GOLD="#E3B341"`, fontes Inter + Playfair Display
- Toda escrita no DB usa `updated_by: ctx.user.id`

---

### Task 1: Registrar wfa-motor-plano em STATE_KEYS

**Files:**
- Modify: `src/routes/api/workflowark.state.ts:56` (dentro do Set STATE_KEYS)

**Interfaces:**
- Produces: key `"wfa-motor-plano"` válida para leitura via GET /api/workflowark/state

- [ ] **Step 1: Abrir o arquivo e localizar o Set**

```bash
grep -n "wfa-producao\|wfa-briefings\|wfa-editorial" src/routes/api/workflowark.state.ts | head -5
```
Esperado: linha ~52 com `"wfa-producao"` e ~38 com `"wfa-editorial"`.

- [ ] **Step 2: Adicionar a chave após wfa-producao**

No arquivo `src/routes/api/workflowark.state.ts`, após a linha com `"wfa-producao"`, adicionar:

```typescript
  // Motor de Conteúdo: roteiros gerados pelo planejamento mensal (escrito pelo servidor,
  // lido pela rota /motor). Piloto com Vivenda; expansível por clienteId depois.
  "wfa-motor-plano",
```

- [ ] **Step 3: Verificar que o Set ficou correto**

```bash
grep -n "wfa-motor-plano\|wfa-producao" src/routes/api/workflowark.state.ts
```
Esperado: ambas as linhas presentes, `wfa-motor-plano` logo abaixo de `wfa-producao`.

- [ ] **Step 4: Build rápido para garantir sem erro de sintaxe**

```bash
npm run build 2>&1 | tail -5
```
Esperado: `▲ [SUCCESS]` ou similar sem erros TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/workflowark.state.ts
git commit -m "feat: registrar wfa-motor-plano em STATE_KEYS"
```

---

### Task 2: Action motor-plano-mensal no servidor

**Files:**
- Modify: `src/routes/api/workflowark.state.ts` — inserir antes de `return json({ error: "Ação inválida" }` (última linha do POST handler, ~linha 1100)

**Interfaces:**
- Consumes: `body.mes: string` (YYYY-MM, default = próximo mês); `clienteBrief("vivenda")`; `wfa-editorial` (DB); `ANTHROPIC_API_KEY`
- Produces: array de `PlanoItem` gravado em `wfa-motor-plano`; retorna `{ ok: true, gerados: number, roteiros: PlanoItem[] }`

Tipo `PlanoItem` (para referência das tasks seguintes):
```typescript
{
  id: string;           // "mpl-{ts}-{rand}"
  clienteId: "vivenda";
  mes: string;          // "YYYY-MM"
  titulo: string;
  formato: string;      // "Reels" | "Feed" | "Stories" | "Carrossel"
  gancho: string;
  roteiro: string;
  melhorDia: string;    // "YYYY-MM-DD"
  status: "pendente" | "aprovado" | "descartado" | "publicado";
  criadoEm: string;
}
```

- [ ] **Step 1: Inserir o bloco da action antes da linha `return json({ error: "Ação inválida" }`**

```typescript
        if (action === "motor-plano-mensal") {
          const mes = /^\d{4}-\d{2}$/.test(String(body.mes ?? ""))
            ? String(body.mes)
            : (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; })();

          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada." }, { status: 500 });

          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief("vivenda");
          const cap = 3; // captações/mês da Vivenda (Plano X)

          const { data: edRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-editorial").maybeSingle();
          const editorial: any[] = Array.isArray(edRow?.data) ? edRow.data : [];
          const jaNoMes = editorial
            .filter((e: any) => e.clienteId === "vivenda" && String(e.data || "").startsWith(mes))
            .map((e: any) => e.titulo);

          const sys = [
            "Você é o PLANEJADOR DE CONTEÚDO sênior da ARK Content (Brasília). Cria roteiros de captação para a Farmácia Vivenda prontos para gravar.",
            "REGRAS: ganchos que param o scroll — nunca 'Olá pessoal', 'Nesse vídeo', 'Você sabia que'. Primeiro frame é conflito, pergunta ou afirmação chocante. Frases curtas, tom clínico mas acessível. Indique BLOCOS e CTA único.",
            "Responda SOMENTE com JSON válido: {\"roteiros\":[...]}.",
            "Cada roteiro: {\"titulo\":\"título curto e específico\",\"formato\":\"Reels|Feed|Stories|Carrossel\",\"gancho\":\"1ª frase do vídeo (2 linhas max)\",\"roteiro\":\"script completo com BLOCO 1, BLOCO 2 e CTA\",\"melhorDia\":\"YYYY-MM-DD sugerido\"}",
            "CONTEXTO DO CLIENTE (use sempre — pessoas, produtos, protocolos, tom):\n" + brief,
          ].join("\n");

          const userMsg = `Hoje é ${hojeSP()}. Gere ${cap} roteiro(s) de captação para a Vivenda no mês ${mes}.\nJá planejado este mês: ${jaNoMes.join(", ") || "nenhum"}.\nVariar formatos e temas. Conectar com os protocolos (Pós-Mounjaro, Pele em Equilíbrio, 60+ Ativa) e o contexto de Brasília.`;

          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, system: sys, messages: [{ role: "user", content: userMsg }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });

            let raw: string = data?.content?.[0]?.text || "";
            raw = raw.replace(/```json|```/g, "").trim();
            const m = raw.match(/\{[\s\S]*\}/);
            let roteiros: any[] = [];
            if (m) { try { roteiros = JSON.parse(m[0])?.roteiros || []; } catch { roteiros = []; } }
            if (!Array.isArray(roteiros)) roteiros = [];

            const novos = roteiros.map((rt: any) => ({
              id: `mpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              clienteId: "vivenda",
              mes,
              titulo: String(rt.titulo || ""),
              formato: String(rt.formato || "Reels"),
              gancho: String(rt.gancho || ""),
              roteiro: String(rt.roteiro || ""),
              melhorDia: String(rt.melhorDia || ""),
              status: "pendente",
              criadoEm: new Date().toISOString(),
            }));

            const { data: mRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-motor-plano").maybeSingle();
            const planoAtual: any[] = Array.isArray(mRow?.data) ? mRow.data : [];
            const planoNovo = [...novos, ...planoAtual].slice(0, 200);
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-motor-plano", data: planoNovo, updated_by: ctx.user.id });

            return json({ ok: true, gerados: novos.length, roteiros: novos });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao gerar plano." }, { status: 502 });
          }
        }
```

- [ ] **Step 2: Build para verificar tipos**

```bash
npm run build 2>&1 | tail -8
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/workflowark.state.ts
git commit -m "feat: action motor-plano-mensal — plano mensal de conteúdo Vivenda via IA"
```

---

### Task 3: Action motor-gerar-legendas no servidor

**Files:**
- Modify: `src/routes/api/workflowark.state.ts` — inserir após o bloco `motor-plano-mensal` e antes de `return json({ error: "Ação inválida" }`

**Interfaces:**
- Consumes: `wfa-tarefas` (DB); `wfa-social-fila` (DB); `clienteBrief("vivenda")`; `ANTHROPIC_API_KEY`
- Produces: novos itens adicionados em `wfa-social-fila` com `tarefaId` e `clienteId: "vivenda"`; retorna `{ ok: true, gerados: number }`

Formato do item criado em wfa-social-fila:
```typescript
{
  id: string;           // "leg-{ts}-{rand}"
  clienteId: "vivenda";
  cliente: "Vivenda";
  tarefaId: string;     // id da tarefa de edição — evita duplicatas
  date: string;         // YYYY-MM-DD de hoje
  ts: number;           // Date.now()
  status: "pendente";
  formato: string;      // da tag da tarefa ou "Reels"
  tema: string;         // title da tarefa
  gancho: string;
  roteiro: string;      // desc da tarefa
  legenda: string;      // texto completo formatado
  cta: string;
  captacao: "";
  melhorDia: "";
  hashtags: string;
}
```

- [ ] **Step 1: Inserir o bloco da action**

```typescript
        if (action === "motor-gerar-legendas") {
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const aiKey = zapiEnv("ANTHROPIC_API_KEY");
          if (!aiKey) return json({ error: "IA não configurada." }, { status: 500 });

          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief("vivenda");

          const { data: tRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-tarefas").maybeSingle();
          const tarefas: any[] = Array.isArray(tRow?.data) ? tRow.data : [];
          const edicoesConcluidas = tarefas.filter((t: any) =>
            (t.clienteId === "vivenda" || String(t.clienteId || "").includes("vivenda")) &&
            String(t.funcao || "").toLowerCase().includes("edit") &&
            t.status === "concluido"
          );

          const { data: fRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-social-fila").maybeSingle();
          const fila: any[] = Array.isArray(fRow?.data) ? fRow.data : [];
          const jaTemLegenda = new Set(fila.filter((f: any) => f.tarefaId).map((f: any) => f.tarefaId));

          const pendentes = edicoesConcluidas.filter((t: any) => !jaTemLegenda.has(t.id));
          if (!pendentes.length) return json({ ok: true, gerados: 0, msg: "Nenhuma edição nova sem legenda." });

          const sys = [
            "Você é COPYWRITER e SOCIAL MEDIA sênior da ARK Content (Brasília). Crie UMA legenda de Instagram pronta pra postar para a Farmácia Vivenda.",
            "REGRAS: 1ª linha é o GANCHO (para o scroll, nunca 'Você sabia que'). Corpo em 3-4 linhas curtas com respiro. CTA específico. 5 hashtags (nicho + local Brasília).",
            "Responda SOMENTE com JSON: {\"gancho\":\"...\",\"legenda\":\"texto completo formatado\",\"cta\":\"...\",\"hashtags\":\"#... #...\"}",
            "CONTEXTO DO CLIENTE:\n" + brief,
          ].join("\n");

          const novasLegendas: any[] = [];
          for (const tarefa of pendentes.slice(0, 5)) {
            try {
              const userMsg = `Vídeo editado: ${tarefa.title}\n${tarefa.desc ? "Descrição: " + tarefa.desc : ""}`;
              const r = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "content-type": "application/json", "x-api-key": aiKey, "anthropic-version": "2023-06-01" },
                body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 800, system: sys, messages: [{ role: "user", content: userMsg }] }),
              });
              const d: any = await r.json().catch(() => ({}));
              if (!r.ok) continue;
              let raw2 = (d?.content?.[0]?.text || "").replace(/```json|```/g, "").trim();
              const m2 = raw2.match(/\{[\s\S]*\}/);
              if (!m2) continue;
              let parsed: any = {};
              try { parsed = JSON.parse(m2[0]); } catch { continue; }
              novasLegendas.push({
                id: `leg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                clienteId: "vivenda",
                cliente: "Vivenda",
                tarefaId: tarefa.id,
                date: new Date().toISOString().slice(0, 10),
                ts: Date.now(),
                status: "pendente",
                formato: String((tarefa.tags || [])[0] || "Reels"),
                tema: tarefa.title,
                gancho: parsed.gancho || "",
                roteiro: tarefa.desc || "",
                legenda: parsed.legenda || "",
                cta: parsed.cta || "",
                captacao: "",
                melhorDia: "",
                hashtags: parsed.hashtags || "",
              });
            } catch { continue; }
          }

          if (novasLegendas.length) {
            const filaAtualizada = [...novasLegendas, ...fila].slice(0, 500);
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-social-fila", data: filaAtualizada, updated_by: ctx.user.id });
          }

          return json({ ok: true, gerados: novasLegendas.length });
        }
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -8
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/workflowark.state.ts
git commit -m "feat: action motor-gerar-legendas — legenda automática pós-edição Vivenda"
```

---

### Task 4: Action motor-status no servidor

**Files:**
- Modify: `src/routes/api/workflowark.state.ts` — inserir após o bloco `motor-gerar-legendas`

**Interfaces:**
- Consumes: `body.id: string`, `body.status: "aprovado" | "descartado" | "publicado"`
- Produces: atualiza item em `wfa-motor-plano`; se `status === "aprovado"`, cria captação em `wfa-producao`; retorna `{ ok: true }`

Formato da captação criada em wfa-producao ao aprovar:
```typescript
{
  id: string;           // "cap-{ts}-{rand}"
  clienteId: "vivenda";
  data: string;         // melhorDia do roteiro
  produtor: "";
  local: "";
  roteiro: string;      // roteiro completo do item aprovado
  status: "agendada";
  motorPlanoId: string; // id do PlanoItem aprovado
  titulo: string;
  videos: [{ id: string; titulo: string; roteiroTrecho: string; editor: ""; prazo: ""; status: "fila" }];
}
```

- [ ] **Step 1: Inserir o bloco da action**

```typescript
        if (action === "motor-status") {
          const id = String(body.id ?? "");
          const novoStatus = String(body.status ?? "");
          if (!id || !["aprovado", "descartado", "publicado"].includes(novoStatus)) {
            return json({ error: "Parâmetros inválidos." }, { status: 400 });
          }

          const { data: mRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-motor-plano").maybeSingle();
          const plano: any[] = Array.isArray(mRow?.data) ? mRow.data : [];
          const idx = plano.findIndex((p: any) => p.id === id);
          if (idx < 0) return json({ error: "Roteiro não encontrado." }, { status: 404 });

          plano[idx] = { ...plano[idx], status: novoStatus, atualizadoEm: new Date().toISOString() };

          if (novoStatus === "aprovado") {
            const item = plano[idx];
            const { data: pRow } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-producao").maybeSingle();
            const producao: any[] = Array.isArray(pRow?.data) ? pRow.data : [];
            producao.unshift({
              id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              clienteId: "vivenda",
              data: item.melhorDia || "",
              produtor: "",
              local: "",
              roteiro: item.roteiro,
              status: "agendada",
              motorPlanoId: item.id,
              titulo: item.titulo,
              videos: [{ id: `vid-${Date.now()}`, titulo: item.titulo, roteiroTrecho: item.gancho, editor: "", prazo: "", status: "fila" }],
            });
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-producao", data: producao.slice(0, 300), updated_by: ctx.user.id });
          }

          await ctx.db.from("workflowark_state").upsert({ key: "wfa-motor-plano", data: plano, updated_by: ctx.user.id });
          return json({ ok: true });
        }
```

- [ ] **Step 2: Build**

```bash
npm run build 2>&1 | tail -8
```
Esperado: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/workflowark.state.ts
git commit -m "feat: action motor-status — aprovar roteiro cria captação em wfa-producao"
```

---

### Task 5: Criar src/routes/motor.tsx

**Files:**
- Create: `src/routes/motor.tsx`

**Interfaces:**
- Consumes: `authedFetch("load")` → lê `state["wfa-motor-plano"]`, `state["wfa-producao"]`, `state["wfa-tarefas"]`, `state["wfa-social-fila"]`
- Consumes: `authedFetch("motor-plano-mensal", { mes })` → gera plano
- Consumes: `authedFetch("motor-gerar-legendas", {})` → gera legendas
- Consumes: `authedFetch("motor-status", { id, status })` → atualiza status
- Produces: página em `/motor`, acessível via autenticação Supabase

- [ ] **Step 1: Criar o arquivo**

Criar `src/routes/motor.tsx` com o conteúdo completo abaixo:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/motor")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [{ title: "Motor de Conteúdo · Vivenda · ARK" }, { name: "viewport", content: "width=device-width, initial-scale=1" }],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" },
    ],
  }),
  component: Motor,
});

type PlanoItem = {
  id: string; clienteId: string; mes: string;
  titulo: string; formato: string; gancho: string; roteiro: string; melhorDia: string;
  status: "pendente" | "aprovado" | "descartado" | "publicado";
  criadoEm: string;
};
type Captacao = {
  id: string; clienteId: string; data: string; titulo?: string;
  status: "agendada" | "concluida"; motorPlanoId?: string;
  videos: { id: string; titulo: string; roteiroTrecho: string; editor: string; prazo: string; status: string }[];
};
type Tarefa = {
  id: string; title: string; clienteId: string; funcao: string; status: string;
  desc?: string; resp?: string; tags?: string[];
};
type FilaItem = {
  id: string; clienteId: string; cliente: string; tarefaId?: string;
  status: "pendente" | "aprovada" | "recusada" | "agendada";
  formato: string; tema: string; gancho: string; legenda: string; cta: string; melhorDia?: string; ts: number;
};

const GOLD = "#E3B341";
const BG = "#0C0A09";
const SURFACE = "#1A1714";
const BORDER = "#2C2825";
const SERIF = "'Playfair Display', Georgia, serif";
const SANS = "'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

function mesProximo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function mesLabel(ym: string): string {
  const [, m] = ym.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(m) - 1]}`;
}

async function authedFetch(action: string, payload?: Record<string, unknown>) {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token;
  if (!token) { const r = await supabase.auth.refreshSession(); token = r.data.session?.access_token; }
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const isLoad = action === "load";
  const res = await fetch("/api/workflowark/state", {
    method: isLoad ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, ...(isLoad ? {} : { "Content-Type": "application/json" }) },
    body: isLoad ? undefined : JSON.stringify(payload ?? {}),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.error || "Falha ao falar com o servidor.");
  return out;
}

function Motor() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [plano, setPlano] = useState<PlanoItem[]>([]);
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [gerandoPlano, setGerandoPlano] = useState(false);
  const [gerandoLegendas, setGerandoLegendas] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [busy, setBusy] = useState("");
  const [detail, setDetail] = useState<PlanoItem | null>(null);

  const mes = mesProximo();
  const CAP_VIVENDA = 3;

  const carregar = useCallback(async () => {
    setErr(""); setLoading(true);
    try {
      const out = await authedFetch("load");
      const s = out?.state ?? {};
      setPlano(Array.isArray(s["wfa-motor-plano"]) ? s["wfa-motor-plano"] : []);
      setCaptacoes(Array.isArray(s["wfa-producao"]) ? s["wfa-producao"] : []);
      setTarefas(Array.isArray(s["wfa-tarefas"]) ? s["wfa-tarefas"] : []);
      setFila(Array.isArray(s["wfa-social-fila"]) ? s["wfa-social-fila"] : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function gerarPlano() {
    setGerandoPlano(true); setErr("");
    try { await authedFetch("motor-plano-mensal", { mes }); await carregar(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setGerandoPlano(false); }
  }

  async function gerarLegendas() {
    setGerandoLegendas(true); setErr("");
    try {
      const out = await authedFetch("motor-gerar-legendas", {});
      if (out.gerados === 0) setErr(out.msg || "Nenhuma edição nova sem legenda encontrada.");
      else await carregar();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setGerandoLegendas(false); }
  }

  async function atualizarStatus(id: string, status: "aprovado" | "descartado" | "publicado") {
    setBusy(id);
    try {
      await authedFetch("motor-status", { id, status });
      setPlano((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      if (status === "aprovado") await carregar(); // recarrega para ver nova captação
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(""); }
  }

  // Pipeline: derivar dados de cada coluna
  const vivPlano = plano.filter((p) => p.clienteId === "vivenda");
  const roteiros = vivPlano.filter((p) => p.status === "pendente");
  const captados = captacoes.filter((c) => c.clienteId === "vivenda" && c.status === "agendada");
  const emEdicao = tarefas.filter((t) =>
    (t.clienteId === "vivenda" || String(t.clienteId || "").includes("vivenda")) &&
    String(t.funcao || "").toLowerCase().includes("edit") &&
    t.status !== "concluido"
  );
  const vivFila = fila.filter((f) => f.clienteId === "vivenda" || f.cliente === "Vivenda");
  const legendasPend = vivFila.filter((f) => f.status === "pendente");
  const agendados = vivFila.filter((f) => f.status === "aprovada" || f.status === "agendada");
  const publicados = vivPlano.filter((p) => p.status === "publicado");

  // Radar
  const hoje = new Date().toISOString().slice(0, 10);
  const em14 = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const proxMesStart = mes + "-01";
  const proxMesEnd = mes + "-31";
  const proximas14 = captados.filter((c) => c.data >= hoje && c.data <= em14);
  const proxMesCap = captados.filter((c) => c.data >= proxMesStart && c.data <= proxMesEnd);
  const gap = CAP_VIVENDA - proxMesCap.length;

  const COLS = [
    { key: "roteiro" as const, label: "Roteiro", count: roteiros.length, color: "#A89F92" },
    { key: "captacao" as const, label: "Captação", count: captados.length, color: GOLD },
    { key: "edicao" as const, label: "Em Edição", count: emEdicao.length, color: "#3b82f6" },
    { key: "legenda" as const, label: "Legenda", count: legendasPend.length, color: "#a855f7" },
    { key: "agendado" as const, label: "Agendado", count: agendados.length, color: "#22c55e" },
    { key: "publicado" as const, label: "Publicado", count: publicados.length, color: "#4ade80" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#F5F0E8", fontFamily: SANS }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: SERIF, fontSize: 24, margin: 0, color: GOLD }}>Motor de Conteúdo</h1>
          <p style={{ margin: "3px 0 0", color: "#A89F92", fontSize: 13 }}>Vivenda · pipeline completo</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={gerarPlano} disabled={gerandoPlano} style={actionBtn(gerandoPlano)}>
            {gerandoPlano ? "Gerando…" : `✨ Gerar Plano de ${mesLabel(mes)}`}
          </button>
          <button onClick={gerarLegendas} disabled={gerandoLegendas} style={actionBtn(gerandoLegendas)}>
            {gerandoLegendas ? "Gerando…" : "✍️ Gerar Legendas Pendentes"}
          </button>
          <button onClick={() => setShowRadar((v) => !v)}
            style={{ ...actionBtn(false), background: showRadar ? "#2a2520" : SURFACE, color: showRadar ? GOLD : "#CFC7B8", border: `1px solid ${showRadar ? GOLD : BORDER}` }}>
            📡 Radar de Captações
          </button>
        </div>
      </div>

      {err && (
        <div style={{ background: "#3a1414", border: "1px solid #5a2020", color: "#ffd5d5", padding: "10px 20px", fontSize: 13 }}>{err}</div>
      )}

      {/* Radar panel */}
      {showRadar && (
        <div style={{ background: "#111010", borderBottom: `1px solid ${BORDER}`, padding: "18px 20px" }}>
          <h3 style={{ fontFamily: SERIF, fontSize: 16, margin: "0 0 14px", color: GOLD }}>Radar de Captações · Vivenda</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 20 }}>
            <div>
              <div style={sectionLabel}>Próximos 14 dias</div>
              {proximas14.length === 0
                ? <div style={{ color: "#ef4444", fontSize: 13 }}>⚠ Nenhuma captação agendada</div>
                : proximas14.map((c) => <div key={c.id} style={{ color: "#22c55e", fontSize: 13, marginBottom: 4 }}>✓ {c.titulo || "Captação"} · {c.data}</div>)
              }
            </div>
            <div>
              <div style={sectionLabel}>Próximo mês · {mesLabel(mes)}</div>
              <div style={{ fontSize: 13, color: "#CFC7B8", marginBottom: 6 }}>{proxMesCap.length} de {CAP_VIVENDA} captações agendadas</div>
              {gap > 0
                ? <div style={{ color: "#ef4444", fontSize: 13 }}>⚠ {gap} slot(s) em aberto — agendar até o dia 20</div>
                : <div style={{ color: "#22c55e", fontSize: 13 }}>✓ Mês fechado</div>
              }
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: "#A89F92", padding: 24 }}>Carregando pipeline…</p>}

      {/* Pipeline kanban */}
      {!loading && (
        <div style={{ display: "flex", gap: 0, overflowX: "auto", minHeight: "calc(100vh - 130px)" }}>
          {COLS.map((col) => (
            <div key={col.key} style={{ flex: "0 0 230px", borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8, background: "#0e0c0b" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: col.color, flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 }}>{col.label}</span>
                <span style={{ marginLeft: "auto", background: "#2C2825", color: "#A89F92", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999 }}>{col.count}</span>
              </div>
              <div style={{ padding: 8, flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
                {col.key === "roteiro" && roteiros.map((r) => (
                  <RoteiroCard key={r.id} item={r} isBusy={busy === r.id}
                    onAprovar={() => atualizarStatus(r.id, "aprovado")}
                    onDescartar={() => atualizarStatus(r.id, "descartado")}
                    onDetail={() => setDetail(r)} />
                ))}
                {col.key === "captacao" && captados.map((c) => (
                  <PipeCard key={c.id} title={c.titulo || "Captação agendada"} sub={c.data || "sem data"} dot={GOLD} />
                ))}
                {col.key === "edicao" && emEdicao.map((t) => (
                  <PipeCard key={t.id} title={t.title} sub={t.resp || "sem responsável"} dot="#3b82f6" />
                ))}
                {col.key === "legenda" && legendasPend.map((f) => (
                  <PipeCard key={f.id} title={f.tema} sub="ver em /postagens" dot="#a855f7" />
                ))}
                {col.key === "agendado" && agendados.map((f) => (
                  <PipeCard key={f.id} title={f.tema} sub={f.melhorDia || "agendado"} dot="#22c55e" />
                ))}
                {col.key === "publicado" && publicados.map((p) => (
                  <PipeCard key={p.id} title={p.titulo} sub={p.melhorDia || ""} dot="#4ade80" />
                ))}
                {col.count === 0 && (
                  <div style={{ color: "#333", fontSize: 12, textAlign: "center" as const, padding: "18px 6px" }}>—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalhe do roteiro */}
      {detail && (
        <div onClick={() => setDetail(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24, maxWidth: 600, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <h2 style={{ fontFamily: SERIF, fontSize: 20, margin: 0, color: GOLD, flex: 1, paddingRight: 12 }}>{detail.titulo}</h2>
              <button onClick={() => setDetail(null)} style={{ background: "none", border: 0, color: "#A89F92", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <Pill text={detail.formato} />
              {detail.melhorDia && <Pill text={`📅 ${detail.melhorDia}`} />}
            </div>
            {detail.gancho && <Bloco titulo="Gancho" texto={detail.gancho} />}
            {detail.roteiro && <Bloco titulo="Roteiro" texto={detail.roteiro} />}
            {detail.status === "pendente" && (
              <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
                <button onClick={() => { atualizarStatus(detail.id, "aprovado"); setDetail(null); }} style={btn("#1f7a3d", "#fff")}>
                  ✅ Aprovar → criar captação
                </button>
                <button onClick={() => { atualizarStatus(detail.id, "descartado"); setDetail(null); }} style={btn("#5a2020", "#ffd5d5")}>
                  ✕ Descartar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoteiroCard({ item, isBusy, onAprovar, onDescartar, onDetail }: {
  item: PlanoItem; isBusy: boolean; onAprovar: () => void; onDescartar: () => void; onDetail: () => void;
}) {
  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 11 }}>
      <div style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#F5F0E8", marginBottom: 3 }} onClick={onDetail}>
        {item.titulo}
      </div>
      <div style={{ fontSize: 11, color: "#A89F92", marginBottom: 7 }}>{item.formato} · {item.melhorDia || "sem data"}</div>
      {item.gancho && (
        <p style={{ fontSize: 11.5, color: GOLD, fontStyle: "italic", margin: "0 0 8px", lineHeight: 1.4 }}>
          {item.gancho.length > 90 ? item.gancho.slice(0, 90) + "…" : item.gancho}
        </p>
      )}
      <div style={{ display: "flex", gap: 5 }}>
        <button onClick={onAprovar} disabled={isBusy} style={{ ...smallBtn("#1a5c30", "#6ee7a0"), flex: 1 }}>✅ Aprovar</button>
        <button onClick={onDescartar} disabled={isBusy} style={{ ...smallBtn("#3a1414", "#f87171"), flex: 1 }}>✕</button>
      </div>
    </div>
  );
}

function PipeCard({ title, sub, dot }: { title: string; sub: string; dot: string }) {
  return (
    <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 11 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F5F0E8", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: dot }}>● {sub}</div>
    </div>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ color: "#A89F92", fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 3 }}>{titulo}</div>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" as const, fontSize: 13, lineHeight: 1.6, color: "#E8E0D4" }}>{texto}</p>
    </div>
  );
}

function Pill({ text }: { text: string }) {
  return <span style={{ background: "#2C2825", color: "#CFC7B8", fontSize: 11, padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}>{text}</span>;
}

const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#A89F92", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 };

function actionBtn(disabled: boolean): React.CSSProperties {
  return { background: disabled ? "#3a342c" : GOLD, color: disabled ? "#6b5d3f" : "#111", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer" };
}
function btn(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 10, padding: "10px 15px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" };
}
function smallBtn(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 8, padding: "6px 8px", fontWeight: 600, fontSize: 11.5, cursor: "pointer" };
}
```

- [ ] **Step 2: Build — confirmar que a rota é detectada e TypeScript passa**

```bash
npm run build 2>&1 | tail -10
```
Esperado: sem erros TypeScript; `motor` aparece no bundle.

- [ ] **Step 3: Confirmar que routeTree.gen.ts foi atualizado**

```bash
grep "motor" src/routeTree.gen.ts
```
Esperado: `/motor` presente no arquivo gerado.

- [ ] **Step 4: Commit**

```bash
git add src/routes/motor.tsx src/routeTree.gen.ts
git commit -m "feat: rota /motor — Motor de Conteúdo Vivenda com pipeline kanban e 3 rotinas"
```

---

### Task 6: Substituir Pautas por Motor no sidebar do workflowark.html

**Files:**
- Modify: `public/workflowark.html:1615-1619`

**Interfaces:**
- Consumes: evento click no navitem → `window.open('/motor','_blank')`
- Produces: "Pautas" some do sidebar; "Motor" aparece no lugar, abre `/motor` em nova aba

- [ ] **Step 1: Localizar o navitem de Pautas**

```bash
grep -n 'data-nav="pauta"' public/workflowark.html
```
Esperado: linha ~1615.

- [ ] **Step 2: Substituir o bloco**

No arquivo `public/workflowark.html`, substituir:

```html
      <div class="navitem" data-nav="pauta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        <span>Pautas</span>
        <span class="badge" id="pauta-badge" style="display:none">0</span>
      </div>
```

por:

```html
      <div class="navitem" onclick="window.open('/motor','_blank')" style="cursor:pointer">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        <span>Motor</span>
      </div>
```

- [ ] **Step 3: Verificar que não restou referência ao pauta-badge que quebraria JS**

```bash
grep -n "pauta-badge\|pauta-count\|loadPautas\|renderPauta\|savePautas" public/workflowark.html | grep -v "function\|=function\|//\|var \|let \|const " | head -10
```
Se houver referências ao `pauta-badge` fora de funções (ex.: `document.getElementById('pauta-badge')`), verificar que não causam erro quando o elemento não existe. As funções `loadPautas`, `savePautas` e `renderPauta` podem permanecer no código sem causar problemas (apenas ficam inacessíveis pelo menu).

- [ ] **Step 4: Teste mobile obrigatório (CLAUDE.md)**

```bash
npm run teste:mobile 2>&1 | tail -15
```
Esperado: sidebar começa escondida, abre pelo hamburger, fecha corretamente. Se o comando não existir, pular e anotar.

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | tail -8
```
Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add public/workflowark.html
git commit -m "feat: substitui Pautas por Motor no sidebar — link abre /motor em nova aba"
```

---

### Task 7: Deploy e verificação final

**Files:**
- No code changes — deploy e verificação

**Interfaces:**
- Consumes: resultado do build da Task 6
- Produces: sistema em produção com Motor acessível em `https://workflowark.arkcontent.workers.dev/motor`

- [ ] **Step 1: Push para o GitHub (dispara CI)**

```bash
git push
```
Esperado: push aceito; CI em `.github/workflows/deploy.yml` inicia o deploy automaticamente.

- [ ] **Step 2: (Opcional) Deploy manual imediato**

```bash
npx wrangler deploy
```
Esperado: `✨ Successfully deployed to ... arkcontent.workers.dev`.

- [ ] **Step 3: Verificar a rota /motor em produção**

Abrir `https://workflowark.arkcontent.workers.dev/motor` no navegador.

Checklist visual:
- [ ] Página carrega sem erro 404 ou de autenticação
- [ ] Header mostra "Motor de Conteúdo / Vivenda"
- [ ] Três botões dourados visíveis
- [ ] Pipeline com 6 colunas visíveis (Roteiro, Captação, Em Edição, Legenda, Agendado, Publicado)
- [ ] Botão "Radar de Captações" expande o painel lateral

- [ ] **Step 4: Testar botão "Gerar Plano"**

Clicar em "✨ Gerar Plano de [Mês]". Aguardar (pode levar 10–15s por ser Sonnet).

Esperado:
- Botão mostra "Gerando…"
- Ao terminar, coluna "Roteiro" exibe os cards gerados com título, formato e gancho

- [ ] **Step 5: Testar aprovação de roteiro**

Clicar "✅ Aprovar" em um roteiro.

Esperado:
- Card some da coluna "Roteiro"
- Card aparece na coluna "Captação"

- [ ] **Step 6: Verificar sidebar no workflowark.html**

Acessar `https://workflowark.arkcontent.workers.dev/app`.

Esperado:
- Item "Pautas" não aparece no menu lateral
- Item "Motor" aparece com ícone de raio
- Clicar "Motor" abre `/motor` em nova aba

- [ ] **Step 7: Commit final de verificação (se houver ajustes)**

```bash
git add -p  # só os arquivos que foram ajustados
git commit -m "fix: ajustes pós-deploy Motor de Conteúdo"
git push
```
