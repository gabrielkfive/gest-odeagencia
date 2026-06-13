import { createFileRoute } from "@tanstack/react-router";

const STATE_KEYS = new Set([
  "wfa-tarefas",
  "wfa-regua",
  "wfa-jornada",
  "wfa-demandas",
  "wfa-rotinas",
  "wfa-okrs",
  "wfa-okrs-edits",
  "wfa-inline-edits",
  "wfa-processos",
  "wfa-gcal",
  "wfa-fin",
  "wfa-crm",
  "wfa-agenda-events",
  "wfa-comercial",
  "wfa-cobranca",
  "wfa-acerto",
  "wfa-planilha",
  "wfa-planejamento",
]);

const VALID_ROLES = new Set([
  "admin",
  "gestor",
  "financeiro",
  "operacao",
  "comercial",
  "marketing",
  "viewer",
]);

// Donos do sistema: sempre admin ativos, nunca podem ser bloqueados/removidos.
const OWNER_EMAILS = new Set(["gabrielkomercial@gmail.com"]);

type WorkflowMember = {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  role: string;
  active: boolean;
  permissions: Record<string, unknown>;
};

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function readBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isStateKey(key: string) {
  return STATE_KEYS.has(key) || key.startsWith("wfa-ckl-");
}

async function getContext(request: Request) {
  const token = readBearer(request);
  if (!token) return { error: json({ error: "Não autenticado" }, { status: 401 }) };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;
  const { data, error } = await db.auth.getUser(token);
  const user = data?.user;
  const email = String(user?.email ?? "").toLowerCase();

  if (error || !user || !email) {
    return { error: json({ error: "Sessão inválida" }, { status: 401 }) };
  }

  const { count } = await db
    .from("workflowark_members")
    .select("id", { count: "exact", head: true });

  let { data: member } = await db
    .from("workflowark_members")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    const byEmail = await db
      .from("workflowark_members")
      .select("*")
      .eq("email", email)
      .maybeSingle();
    member = byEmail.data;
    if (member && !member.user_id) {
      const updated = await db
        .from("workflowark_members")
        .update({ user_id: user.id })
        .eq("id", member.id)
        .select("*")
        .single();
      member = updated.data ?? member;
    }
  }

  // Proteção de dono: garante sempre admin ativo (nunca trava o fundador para fora).
  if (OWNER_EMAILS.has(email)) {
    if (member) {
      if (!member.active || member.role !== "admin" || !member.user_id) {
        const fixed = await db
          .from("workflowark_members")
          .update({ active: true, role: "admin", user_id: user.id })
          .eq("id", member.id)
          .select("*")
          .single();
        member = fixed.data ?? { ...member, active: true, role: "admin" };
      }
    } else {
      const up = await db
        .from("workflowark_members")
        .upsert(
          {
            email,
            user_id: user.id,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "Gabriel Andrade",
            role: "admin",
            active: true,
            created_by: user.id,
          },
          { onConflict: "email" },
        )
        .select("*")
        .single();
      member = up.data;
    }
  }

  if (!member && (count ?? 0) === 0) {
    const created = await db
      .from("workflowark_members")
      .insert({
        email,
        user_id: user.id,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        role: "admin",
        active: true,
        created_by: user.id,
      })
      .select("*")
      .single();
    member = created.data;
  }

  // Usuário autenticado sem cadastro: registra como pendente (inativo) para o gestor liberar.
  if (!member) {
    const created = await db
      .from("workflowark_members")
      .insert({
        email,
        user_id: user.id,
        full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
        role: "viewer",
        active: false,
        created_by: user.id,
      })
      .select("*")
      .single();
    member = created.data;
  }

  if (!member || !member.active) {
    return {
      error: json(
        { error: "Sua conta foi criada e está aguardando liberação do gestor.", pending: true },
        { status: 403 },
      ),
    };
  }

  return { db, user, member: member as WorkflowMember, isAdmin: member.role === "admin" };
}

export const Route = createFileRoute("/api/workflowark/state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const ctx = await getContext(request);
        if ("error" in ctx) return ctx.error;

        const { data: rows, error } = await ctx.db
          .from("workflowark_state")
          .select("key,data,updated_at");
        if (error) return json({ error: "Não foi possível carregar os dados." }, { status: 500 });

        const state = Object.fromEntries((rows ?? []).map((row: any) => [row.key, row.data]));
        let members: WorkflowMember[] = [];
        if (ctx.isAdmin) {
          const result = await ctx.db
            .from("workflowark_members")
            .select("id,email,full_name,user_id,role,active,permissions")
            .order("created_at", { ascending: true });
          members = result.data ?? [];
        }

        return json({ state, member: ctx.member, members });
      },

      POST: async ({ request }) => {
        const ctx = await getContext(request);
        if ("error" in ctx) return ctx.error;

        const body = await request.json().catch(() => ({}));
        const action = String(body.action ?? "save-state");

        if (action === "save-state") {
          const key = String(body.key ?? "");
          if (!isStateKey(key)) return json({ error: "Bloco inválido" }, { status: 400 });
          const { error } = await ctx.db.from("workflowark_state").upsert({
            key,
            data: body.data ?? null,
            updated_by: ctx.user.id,
          });
          if (error) return json({ error: "Não foi possível salvar." }, { status: 500 });
          return json({ ok: true });
        }

        if (action === "save-many") {
          const entries = body.entries && typeof body.entries === "object" ? body.entries : {};
          const rows = Object.entries(entries)
            .filter(([key]) => isStateKey(key))
            .map(([key, data]) => ({ key, data, updated_by: ctx.user.id }));
          if (rows.length) {
            const { error } = await ctx.db.from("workflowark_state").upsert(rows);
            if (error) return json({ error: "Não foi possível sincronizar." }, { status: 500 });
          }
          return json({ ok: true, saved: rows.length });
        }

        if (action === "add-member") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode alterar acessos." }, { status: 403 });
          const email = String(body.email ?? "").trim().toLowerCase();
          const role = VALID_ROLES.has(String(body.role)) ? String(body.role) : "viewer";
          if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "E-mail inválido" }, { status: 400 });
          const { error } = await ctx.db.from("workflowark_members").upsert({
            email,
            full_name: String(body.full_name ?? "").trim() || null,
            role,
            active: body.active !== false,
            created_by: ctx.user.id,
          }, { onConflict: "email" });
          if (error) return json({ error: "Não foi possível salvar o acesso." }, { status: 500 });
          return json({ ok: true });
        }

        if (action === "update-member") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode alterar acessos." }, { status: 403 });
          const id = String(body.id ?? "");
          const patch: Record<string, unknown> = {};
          if (VALID_ROLES.has(String(body.role))) patch.role = String(body.role);
          if (typeof body.active === "boolean") patch.active = body.id === ctx.member.id ? true : body.active;
          if (typeof body.full_name === "string") patch.full_name = body.full_name.trim() || null;
          if (body.permissions && typeof body.permissions === "object") patch.permissions = body.permissions;
          const { error } = await ctx.db.from("workflowark_members").update(patch).eq("id", id);
          if (error) return json({ error: "Não foi possível atualizar o acesso." }, { status: 500 });
          return json({ ok: true });
        }

        if (action === "remove-member") {
          if (!ctx.isAdmin) return json({ error: "Apenas admin pode remover acessos." }, { status: 403 });
          const id = String(body.id ?? "");
          if (id === ctx.member.id) return json({ error: "Você não pode remover a si mesmo." }, { status: 400 });
          const { data: m } = await ctx.db
            .from("workflowark_members")
            .select("user_id")
            .eq("id", id)
            .maybeSingle();
          const { error } = await ctx.db.from("workflowark_members").delete().eq("id", id);
          if (error) return json({ error: "Não foi possível remover o membro." }, { status: 500 });
          if (m?.user_id) {
            try { await ctx.db.auth.admin.deleteUser(m.user_id); } catch { /* ignore */ }
          }
          return json({ ok: true });
        }

        if (action === "upload-file") {
          const filename = String(body.filename ?? "arquivo").replace(/[^\w.\-]+/g, "_").slice(0, 90);
          const contentType = String(body.contentType ?? "application/octet-stream");
          const b64 = String(body.dataBase64 ?? "");
          if (!b64) return json({ error: "Nenhum arquivo recebido." }, { status: 400 });
          try {
            const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const bucket = "arquivos";
            await (ctx.db as any).storage.createBucket(bucket, { public: true }).catch(() => {});
            const path = `${Date.now()}-${filename}`;
            const { error } = await (ctx.db as any).storage.from(bucket).upload(path, bin, { contentType, upsert: true });
            if (error) return json({ error: error.message || "Falha no upload" }, { status: 500 });
            const { data: pub } = (ctx.db as any).storage.from(bucket).getPublicUrl(path);
            return json({ ok: true, url: pub?.publicUrl, filename });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha no upload" }, { status: 500 });
          }
        }

        if (action === "agente-roteirista") {
          const tema = String(body.tema ?? body.prompt ?? "").trim();
          if (!tema) return json({ error: "Diga o tema/assunto do vídeo." }, { status: 400 });
          const cliente = String(body.cliente ?? "").trim();
          const plataforma = String(body.plataforma ?? "Instagram Reels").trim();
          const qtd = Math.min(Math.max(parseInt(String(body.qtd ?? "3"), 10) || 3, 1), 8);
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada." }, { status: 500 });
          const sys = [
            "Você é um ROTEIRISTA VIRAL sênior da ARK Content (agência de marketing gastronômico/varejo em Brasília). NÃO escreve como IA robótica — escreve como gente que entende de algoritmo e de scroll. Cria roteiros de vídeo curto que param o scroll, retêm e convertem (cliente entrando na loja / chamando no WhatsApp).",
            "REGRAS DE OURO:",
            "- GANCHO: máx 2 linhas (lido em ~3s). NUNCA comece com 'Olá pessoal', 'Hoje eu vou te mostrar', 'Nesse vídeo'. Primeiro frame é conflito, pergunta ou afirmação chocante. Padrões que funcionam: 'X pessoas fazem Y errado', 'Ninguém te conta que Z', 'Parei de X e aconteceu Y'.",
            "- Cada bloco com micro-gancho (a pessoa decide a cada 3s se fica). Frases curtas, uma ideia por frase, linguagem do cotidiano ('melhorar' não 'otimizar').",
            "- Entregue valor real (no mínimo 3 pontos) ANTES do CTA. CTA ÚNICO e integrado à última entrega (nunca solto tipo 'me segue').",
            "- Indique (Texto na tela: \"...\"), [CORTE], (mostra ...). Instagram Reels: o espectador decide em ~7s, ritmo rápido.",
            "Para CADA roteiro entregue NESTE formato (não mostre raciocínio):",
            "TÍTULO: ...",
            "GANCHO: ...",
            "BLOCO 1 — [nome]: ... (Visual: ...)",
            "BLOCO 2 — [nome]: ...",
            "CTA: ...",
            "LEGENDA: ... (+ 3 hashtags)",
            "POR QUE FUNCIONA: ...",
            "Separe cada roteiro com uma linha '———'. Não faça perguntas — assuma os melhores defaults e entregue pronto pra gravar.",
          ].join("\n");
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief(cliente);
          const sysFull = brief
            ? sys + "\n\nCONTEXTO REAL DO CLIENTE (use de verdade — pessoas, produtos, tom e plano; NADA genérico):\n" + brief
            : sys;
          const user = `Cliente: ${cliente || "(varejo gastronômico genérico)"} · Plataforma: ${plataforma} · Tema/assunto: ${tema}\nGere ${qtd} roteiro(s) de vídeo curto, prontos pra gravar.`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, system: sysFull, messages: [{ role: "user", content: user }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao gerar roteiros." }, { status: 502 });
          }
        }

        if (action === "agente-planejamento") {
          const cliente = String(body.cliente ?? "").trim();
          const periodo = String(body.periodo ?? "este mês").trim();
          const foco = String(body.foco ?? "").trim();
          const qtd = Math.min(Math.max(parseInt(String(body.qtd ?? "8"), 10) || 8, 3), 16);
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada." }, { status: 500 });
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief(cliente);
          const sys = [
            "Você é o PLANEJADOR DE CONTEÚDO sênior da ARK Content (agência de marketing em Brasília). Monta o calendário de conteúdo de redes sociais (Instagram/TikTok) de um cliente — pensando como dono de agência: realista, vendedor, conectado ao momento do cliente. NÃO genérico.",
            "Cada ideia deve ter um ÂNGULO/gancho específico (não 'poste sobre o produto X', e sim a abordagem que para o scroll). Varie formatos (Reels, Carrossel, Story, Foto). Conecte com datas/contexto quando fizer sentido.",
            "Distribua as ideias em DATAS CONCRETAS dentro do período (campo data em YYYY-MM-DD). Use o ano corrente se não for dito. Evite domingos para posts pesados, espalhe ao longo das semanas. Se uma ideia não tiver dia específico, deixe data:''.",
            "Responda SOMENTE com um JSON válido (nada fora dele): um objeto {\"ideias\":[...]}. Cada ideia: {\"data\":\"YYYY-MM-DD ou ''\",\"dia\":\"rótulo curto ex: Seg 16/06\",\"formato\":\"Reels|Carrossel|Story|Foto\",\"tema\":\"título curto e específico\",\"produto\":\"produto/serviço foco ou ''\",\"angulo\":\"o gancho/abordagem em 1 frase\",\"legenda\":\"primeira linha da legenda, no tom da marca\"}.",
            brief ? "CONTEXTO REAL DO CLIENTE (use de verdade — pessoas, produtos, tom, plano):\n" + brief : "",
          ].filter(Boolean).join("\n");
          const hoje = new Date().toISOString().split("T")[0];
          const user = `Hoje é ${hoje}. Cliente: ${cliente || "(varejo genérico)"} · Período: ${periodo}${foco ? " · Foco especial: " + foco : ""}\nMonte ${qtd} ideias de conteúdo para o período, com datas concretas, em JSON.`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3000, system: sys, messages: [{ role: "user", content: user }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            let raw: string = data?.content?.[0]?.text || "";
            raw = raw.replace(/```json|```/g, "").trim();
            const m = raw.match(/\{[\s\S]*\}/);
            let ideias: any[] = [];
            if (m) { try { ideias = JSON.parse(m[0])?.ideias || []; } catch { ideias = []; } }
            if (!Array.isArray(ideias)) ideias = [];
            return json({ ideias, text: raw });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao montar o planejamento." }, { status: 502 });
          }
        }

        if (action === "agente-legenda") {
          const tema = String(body.tema ?? "").trim();
          if (!tema) return json({ error: "Diga o tema/assunto (ou cole o roteiro)." }, { status: 400 });
          const cliente = String(body.cliente ?? "").trim();
          const rede = String(body.rede ?? "Instagram").trim();
          const objetivo = String(body.objetivo ?? "").trim();
          const qtd = Math.min(Math.max(parseInt(String(body.qtd ?? "2"), 10) || 2, 1), 4);
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada." }, { status: 500 });
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief(cliente);
          const sys = [
            "Você é COPYWRITER e SOCIAL MEDIA sênior da ARK Content (Brasília). Escreve legendas de Instagram/TikTok que param o scroll, retêm e convertem — NO TOM DA MARCA, como gente de verdade (nunca robótico, nunca clichê de IA).",
            "REGRAS: A 1ª linha é um GANCHO (a legenda também precisa parar o scroll — nada de 'Você sabia que...'). Corpo curto, quebrado em linhas com respiro, linguagem do cotidiano. UM CTA claro e específico. No fim, 4 a 6 hashtags relevantes (mistura nicho + local de Brasília).",
            "Para CADA legenda, entregue NESTE formato (sem explicar o raciocínio):",
            "GANCHO: ...",
            "CORPO: ... (2-5 linhas curtas)",
            "CTA: ...",
            "HASHTAGS: #... #...",
            "Separe cada variação com uma linha '———'. Assuma os melhores defaults e entregue pronto pra postar.",
            brief ? "CONTEXTO REAL DO CLIENTE (use de verdade — pessoas, produtos, tom, plano):\n" + brief : "",
          ].filter(Boolean).join("\n");
          const user = `Cliente: ${cliente || "(varejo genérico)"} · Rede: ${rede}${objetivo ? " · Objetivo: " + objetivo : ""}\nTema/roteiro:\n"""${tema}"""\nEscreva ${qtd} variação(ões) de legenda.`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1800, system: sys, messages: [{ role: "user", content: user }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao gerar legendas." }, { status: 502 });
          }
        }

        if (action === "agente-vivenda") {
          const prompt = String(body.prompt ?? "").trim();
          if (!prompt) return json({ error: "Escreva o que você quer pedir ao agente." }, { status: 400 });
          const { zapiEnv } = await import("@/integrations/zapi.server");
          const key = zapiEnv("ANTHROPIC_API_KEY");
          if (!key) return json({ error: "IA não configurada (sem ANTHROPIC_API_KEY)." }, { status: 500 });
          // contexto vivo: puxa dados da Vivenda já salvos no sistema (plano de Junho, etc.)
          let contexto = "";
          try {
            const { data: rows } = await ctx.db.from("workflowark_state").select("key,data").in("key", ["wfa-inline-edits", "wfa-tarefas"]);
            const inline = (rows || []).find((r: any) => r.key === "wfa-inline-edits")?.data || {};
            const viv = Object.fromEntries(Object.entries(inline).filter(([k]) => String(k).startsWith("viv_")));
            const tarefas = ((rows || []).find((r: any) => r.key === "wfa-tarefas")?.data || []) as any[];
            const tViv = tarefas.filter((t) => /viv/i.test(t?.clienteId || "") || /vivenda/i.test(t?.title || "")).slice(0, 15).map((t) => `- ${t.title} (${t.resp || "?"}, ${t.data || "?"})`).join("\n");
            contexto = `\n\nDADOS ATUAIS DA VIVENDA NO SISTEMA:\nCampos do plano (preenchidos): ${JSON.stringify(viv)}\nTarefas da Vivenda:\n${tViv || "(nenhuma)"}`;
          } catch { /* segue sem contexto extra */ }
          const { clienteBrief } = await import("@/integrations/clientes");
          const brief = clienteBrief("vivenda");
          const sys = `Você é o ESTRATEGISTA da ARK Content dedicado à FARMÁCIA VIVENDA — o cliente prioritário (empresa da família do dono, Plano X). NÃO invente dados nem campanhas genéricas/inviáveis: seja específico, realista e aplicável. Pense como dono de agência brasileiro: direto, prático, com foco em vender (gente entrando na farmácia / WhatsApp), respeitando o orçamento. Quando faltar informação real (resultados de tráfego, nº de produções, histórico), DIGA o que você precisa em vez de chutar. Entregue em tópicos curtos e acionáveis.\n\nCONTEXTO REAL DO CLIENTE (use sempre — pessoas/decisores, posicionamento, produtos, plano):\n${brief}${contexto}`;
          try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
              body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1600, system: sys, messages: [{ role: "user", content: prompt }] }),
            });
            const data: any = await r.json().catch(() => ({}));
            if (!r.ok) return json({ error: data?.error?.message || "Falha na IA" }, { status: 502 });
            return json({ text: data?.content?.[0]?.text || "(sem resposta)" });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao consultar o agente." }, { status: 502 });
          }
        }

        if (action === "send-whatsapp") {
          const phone = String(body.phone ?? "").replace(/\D/g, "");
          const jid = String(body.jid ?? "");
          const message = String(body.message ?? "").trim();
          if (!phone || !message) return json({ error: "Telefone e mensagem são obrigatórios." }, { status: 400 });
          const isGroup = jid.includes("@g.us");
          const target = isGroup ? jid : phone; // grupo: envia pro jid; pessoa: pro número
          try {
            const { waSendText, appendWhatsapp } = await import("@/integrations/zapi.server");
            await waSendText(target, message);
            await appendWhatsapp(ctx.db as any, { phone, dir: "out", text: message, isGroup, jid });
            return json({ ok: true });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao enviar pelo WhatsApp." }, { status: 502 });
          }
        }

        // Preenche nome + foto dos GRUPOS de uma vez (corrige conversas com nome do remetente).
        if (action === "wa-sync-groups") {
          try {
            const { evoAllGroups } = await import("@/integrations/zapi.server");
            const groups = await evoAllGroups();
            const byJid: Record<string, { subject: string; pic: string }> = {};
            const byDigits: Record<string, { subject: string; pic: string }> = {};
            groups.forEach((g) => {
              if (g.jid) byJid[g.jid] = { subject: g.subject, pic: g.pic };
              const d = g.jid.replace(/\D/g, "");
              if (d) byDigits[d] = { subject: g.subject, pic: g.pic };
            });
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            if (!st.conversas) st.conversas = {};
            let n = 0;
            Object.entries(st.conversas).forEach(([pk, c]: [string, any]) => {
              const j = c.jid || "";
              const d = String(c.phone || pk).replace(/\D/g, "");
              const g = byJid[j] || byDigits[d];
              if (g) {
                c.isGroup = true;
                if (g.subject) { c.nome = g.subject; c.subjFetched = true; }
                if (g.pic) c.avatar = g.pic;
                n++;
              }
            });
            await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
            return json({ ok: true, updated: n, groups: groups.length });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao sincronizar grupos" }, { status: 502 });
          }
        }

        // Marca uma conversa como LIDA (zera não-lidas) — persiste na nuvem.
        if (action === "wa-mark-read") {
          const phone = String(body.phone ?? "").replace(/\D/g, "");
          if (!phone) return json({ error: "phone obrigatório" }, { status: 400 });
          try {
            const { data: row } = await ctx.db.from("workflowark_state").select("data").eq("key", "wfa-whatsapp").maybeSingle();
            const st: any = row?.data && typeof row.data === "object" && !Array.isArray(row.data) ? row.data : { conversas: {} };
            if (st.conversas && st.conversas[phone]) {
              st.conversas[phone].unread = 0;
              await ctx.db.from("workflowark_state").upsert({ key: "wfa-whatsapp", data: st });
            }
            return json({ ok: true });
          } catch (e) {
            return json({ error: (e as Error)?.message || "Falha ao marcar como lido" }, { status: 502 });
          }
        }

        if (action === "set-my-name") {
          const full_name = String(body.full_name ?? "").trim();
          if (!full_name) return json({ error: "Informe um nome." }, { status: 400 });
          const { error } = await ctx.db
            .from("workflowark_members")
            .update({ full_name })
            .eq("id", ctx.member.id);
          if (error) return json({ error: "Não foi possível salvar o nome." }, { status: 500 });
          return json({ ok: true, full_name });
        }

        return json({ error: "Ação inválida" }, { status: 400 });
      },
    },
  },
});