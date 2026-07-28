import { createFileRoute } from "@tanstack/react-router";

// ============================================================================
// CONECTOR MCP do WorkFlowArk  —  as "mãos" que o Claude (plano Max, via Routines)
// usa para LER e AGIR no sistema, sem gastar crédito de API e sem VPS.
//
// Isto é um servidor MCP remoto (Streamable HTTP / JSON-RPC 2.0). O Gabriel conecta
// a URL em Claude → Settings → Connectors:
//     https://workflowark.arkcontent.workers.dev/api/mcp
//     Autenticação: Bearer <RUN_KEY>
//
// O "cérebro" (decidir o quê) continua nas Routines do plano Max. Este endpoint só
// EXECUTA (ler bloco, marcar cobrança, mandar WhatsApp). Zero IA aqui = zero custo.
//
// Segurança: exige o segredo RUN_KEY (header Authorization: Bearer, ou x-run-key,
// ou ?key=). Sem chave válida = 401. Nunca sobrescreve cego: escrita é
// read-modify-write preservando as outras chaves (medo nº1 do Gabriel = perder dado).
// ============================================================================

const PROTOCOL = "2024-11-05";

async function authorized(request: Request, url: URL): Promise<boolean> {
  const { runSecret } = await import("@/integrations/run-auth.server");
  const secret = await runSecret();
  if (!secret) return false;
  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const hdr = request.headers.get("x-run-key") ?? "";
  const qs = url.searchParams.get("key") ?? "";
  return bearer === secret || hdr === secret || qs === secret;
}

// ---- Definição das ferramentas expostas ao Claude -------------------------
const TOOLS = [
  {
    name: "read_block",
    description:
      "Lê um bloco de estado do WorkFlowArk (somente leitura). Ex.: wfa-cobranca (cobranças), wfa-crm (pipeline comercial), wfa-tarefas (kanban), wfa-jornada (sprints), wfa-producao, wfa-acerto, wfa-fin.",
    inputSchema: {
      type: "object",
      properties: { key: { type: "string", description: "Chave do bloco (ex.: wfa-cobranca)" } },
      required: ["key"],
    },
  },
  {
    name: "list_cobrancas",
    description: "Lista as cobranças do mês (bloco wfa-cobranca) com cliente, valor e status atual.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "set_cobranca_status",
    description:
      "Marca o status de pagamento de UM cliente na cobrança do mês. Não sobrescreve nada além do cliente indicado. Use pago=true quando o Pix/boleto entrou; forma pode ser 'pix', 'boleto' ou 'aguardando'.",
    inputSchema: {
      type: "object",
      properties: {
        cliente: { type: "string", description: "id ou nome do cliente (ex.: fercon, vivenda, sasse)" },
        pago: { type: "boolean", description: "true se pagou, false se ainda não" },
        forma: { type: "string", description: "pix | boleto | aguardando (opcional)" },
        obs: { type: "string", description: "observação curta (opcional)" },
      },
      required: ["cliente", "pago"],
    },
  },
  {
    name: "read_pipeline",
    description: "Lê o pipeline comercial (bloco wfa-crm): leads por etapa com valor, responsável e próxima ação.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "send_whatsapp",
    description:
      "Envia uma mensagem de WhatsApp pela ARK. 'to' pode ser um número (só dígitos, com DDI 55) ou o JID de um grupo (…@g.us). Use com responsabilidade: mensagem para cliente/grupo é definitiva.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "número (5561999999999) ou JID de grupo (…@g.us)" },
        message: { type: "string", description: "texto a enviar" },
      },
      required: ["to", "message"],
    },
  },
  {
    name: "create_task",
    description:
      "Cria uma tarefa no Kanban do time (wfa-tarefas). Use para delegar trabalho. Começa em 'backlog'. prio: alta|media|baixa. resp = nome da pessoa (ex.: 'Samuel Magalhães').",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "título da tarefa" },
        resp: { type: "string", description: "responsável (nome, ex.: Samuel Magalhães)" },
        prio: { type: "string", description: "alta | media | baixa (padrão media)" },
        data: { type: "string", description: "data-alvo YYYY-MM-DD (opcional)" },
        clienteId: { type: "string", description: "id do cliente (ex.: la-em-casa, vivenda)" },
        funcao: { type: "string", description: "função/área (ex.: Edição, Social Media)" },
      },
      required: ["title", "resp"],
    },
  },
  {
    name: "update_lead",
    description:
      "Atualiza um lead do pipeline comercial (wfa-crm): mover de etapa (stage 0=Prospecção 1=Diagnóstico 2=Proposta 3=Negociação 4=Fechado 5=Perdido), mudar valor, próxima ação ou anexar observação.",
    inputSchema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "nome do lead (ex.: Royal face)" },
        stage: { type: "number", description: "0..5 (4=Fechado, 5=Perdido)" },
        val: { type: "number", description: "valor R$ (opcional)" },
        next: { type: "string", description: "próxima ação (opcional)" },
        obs: { type: "string", description: "observação a anexar (opcional)" },
      },
      required: ["nome"],
    },
  },
  {
    name: "add_despesa",
    description:
      "Registra uma despesa/pagamento (wfa-acerto), ex.: pagamento a um freelancer/parceiro. pago=true se já saiu.",
    inputSchema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "quem recebe (ex.: Victor Gabriel)" },
        valor: { type: "number", description: "valor em reais" },
        pago: { type: "boolean", description: "true se já foi pago" },
        obs: { type: "string", description: "observação (opcional)" },
      },
      required: ["nome", "valor"],
    },
  },
];

// ---- Execução de cada ferramenta ------------------------------------------
async function callTool(name: string, args: any): Promise<{ text: string; isError?: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  const loadBlock = async (key: string) => {
    const { data } = await db.from("workflowark_state").select("data").eq("key", key).maybeSingle();
    return data?.data ?? null;
  };
  const saveBlock = async (key: string, value: any) => {
    await db.from("workflowark_state").upsert({ key, data: value });
  };

  try {
    if (name === "read_block") {
      const key = String(args?.key || "");
      if (!key.startsWith("wfa-")) return { text: "Chave inválida (deve começar com wfa-).", isError: true };
      if (/-(secret|oauth)$/.test(key) || key === "wfa-portal-tokens" || key.startsWith("wfa-backup-"))
        return { text: "Chave reservada.", isError: true };
      const v = await loadBlock(key);
      return { text: JSON.stringify(v) };
    }

    if (name === "list_cobrancas") {
      const v = await loadBlock("wfa-cobranca");
      return { text: JSON.stringify(v) };
    }

    if (name === "read_pipeline") {
      const v = await loadBlock("wfa-crm");
      return { text: JSON.stringify(v) };
    }

    if (name === "set_cobranca_status") {
      const cliente = String(args?.cliente || "").trim();
      if (!cliente) return { text: "cliente obrigatório.", isError: true };
      const cob = (await loadBlock("wfa-cobranca")) || {};
      // acha a entrada por id exato ou por nome aproximado
      let alvo = Object.keys(cob).find((k) => k.toLowerCase() === cliente.toLowerCase());
      if (!alvo) {
        alvo = Object.keys(cob).find(
          (k) =>
            k.toLowerCase().includes(cliente.toLowerCase()) ||
            String((cob[k] || {}).nome || (cob[k] || {}).cliente || "")
              .toLowerCase()
              .includes(cliente.toLowerCase()),
        );
      }
      const chave = alvo || cliente.toLowerCase().replace(/\s+/g, "-");
      const atual = (cob as any)[chave] || {};
      (cob as any)[chave] = {
        ...atual,
        pago: !!args?.pago,
        status: args?.pago ? "pago" : "pendente",
        forma: args?.forma ? String(args.forma) : atual.forma,
        obs: args?.obs ? String(args.obs) : atual.obs,
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: "claude-mcp",
      };
      await saveBlock("wfa-cobranca", cob);
      return { text: `OK: ${chave} => ${args?.pago ? "PAGO" : "PENDENTE"}${args?.forma ? " (" + args.forma + ")" : ""}.` };
    }

    if (name === "send_whatsapp") {
      const to = String(args?.to || "").trim();
      const message = String(args?.message || "").trim();
      if (!to || !message) return { text: "to e message obrigatórios.", isError: true };
      const target = to.includes("@") ? to : to.replace(/\D/g, "");
      const { waSendText, appendWhatsapp } = await import("@/integrations/zapi.server");
      await waSendText(target, message);
      try {
        await appendWhatsapp(db, { phone: target, dir: "out", text: message });
      } catch {
        /* registro é best-effort */
      }
      return { text: `Enviado para ${target}.` };
    }

    return { text: `Ferramenta desconhecida: ${name}`, isError: true };
  } catch (e) {
    return { text: `Falha: ${(e as Error)?.message || "erro"}`, isError: true };
  }
}

// ---- Transporte MCP (JSON-RPC 2.0 sobre HTTP) -----------------------------
function rpcResult(id: any, result: any) {
  return Response.json({ jsonrpc: "2.0", id, result });
}
function rpcError(id: any, code: number, message: string, status = 200) {
  return Response.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

async function handleRpc(msg: any): Promise<Response | null> {
  const { id, method, params } = msg || {};
  // Notificações (sem id) não exigem resposta.
  if (id === undefined || id === null) return null;

  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: PROTOCOL,
      capabilities: { tools: {} },
      serverInfo: { name: "workflowark", version: "1.0.0" },
    });
  }
  if (method === "ping") return rpcResult(id, {});
  if (method === "tools/list") return rpcResult(id, { tools: TOOLS });
  if (method === "tools/call") {
    const name = String(params?.name || "");
    const args = params?.arguments || {};
    const out = await callTool(name, args);
    return rpcResult(id, { content: [{ type: "text", text: out.text }], isError: !!out.isError });
  }
  return rpcError(id, -32601, `Método não suportado: ${method}`);
}

export const Route = createFileRoute("/api/mcp")({
  server: {
    handlers: {
      // Descoberta simples / health-check.
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await authorized(request, u)))
          return Response.json({ error: "unauthorized" }, { status: 401 });
        return Response.json({ ok: true, server: "workflowark-mcp", protocol: PROTOCOL, tools: TOOLS.map((t) => t.name) });
      },
      POST: async ({ request }) => {
        const u = new URL(request.url);
        if (!(await authorized(request, u)))
          return Response.json({ error: "unauthorized" }, { status: 401 });

        let body: any;
        try {
          body = await request.json();
        } catch {
          return rpcError(null, -32700, "JSON inválido");
        }

        // Suporta batch (array) e mensagem única.
        if (Array.isArray(body)) {
          const out: any[] = [];
          for (const m of body) {
            const r = await handleRpc(m);
            if (r) out.push(await r.json());
          }
          if (!out.length) return new Response(null, { status: 202 });
          return Response.json(out);
        }

        const resp = await handleRpc(body);
        if (!resp) return new Response(null, { status: 202 });
        return resp;
      },
    },
  },
});
