// JARVIS DAEMON — controle remoto do PC via WhatsApp.
// Roda NESTE PC. A cada 20s pergunta ao Worker se o Gabriel mandou demanda
// ("jarvis <demanda>" no WhatsApp). Se sim, executa com o Claude Code headless
// (usa a assinatura do Claude logada nesta máquina, sem custo de API) e posta
// o resultado de volta; o Worker responde no WhatsApp.
// Config em remote/.env: REMOTE_KEY e WORKER_URL. Log em remote/jarvis-daemon.log.

import { spawn } from "node:child_process";
import { readFileSync, appendFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const PROJETO = join(DIR, ".."); // Claude roda na raiz do projeto (CLAUDE.md + skills)
const LOG = join(DIR, "jarvis-daemon.log");
const POLL_MS = 20_000;
const ERRO_MS = 60_000;
const TIMEOUT_MS = 25 * 60_000; // 25 min por demanda

// ---- config ----
function lerEnv() {
  const cfg = {};
  try {
    for (const linha of readFileSync(join(DIR, ".env"), "utf8").split(/\r?\n/)) {
      const m = linha.match(/^([A-Z_]+)=(.*)$/);
      if (m) cfg[m[1]] = m[2].trim();
    }
  } catch { /* sem .env */ }
  return cfg;
}
const { REMOTE_KEY, WORKER_URL } = lerEnv();
if (!REMOTE_KEY || !WORKER_URL) {
  console.error("Faltam REMOTE_KEY/WORKER_URL em remote/.env — daemon não pode iniciar.");
  process.exit(1);
}
const API = `${WORKER_URL.replace(/\/+$/, "")}/api/workflowark/remote?key=${REMOTE_KEY}`;

function log(msg) {
  const linha = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    try { if (statSync(LOG).size > 5_000_000) writeFileSync(LOG, ""); } catch { /* sem log ainda */ }
    appendFileSync(LOG, linha);
  } catch { /* disco: ignora */ }
  console.log(linha.trim());
}

// ---- executa a demanda com o Claude Code headless ----
function rodarClaude(demanda) {
  return new Promise((resolve) => {
    const prompt =
      "Demanda enviada pelo Gabriel via WhatsApp (controle remoto, ele está fora de casa). " +
      "Execute a demanda de ponta a ponta nesta máquina. Ao final, responda com um resumo " +
      "CURTO em português (máx ~1500 caracteres), texto simples sem markdown, direto ao ponto, " +
      "dizendo o que foi feito e o resultado. Se não conseguir, diga o que travou.\n\nDEMANDA: " +
      demanda;
    const child = spawn(
      "claude",
      ["-p", "--output-format", "text", "--dangerously-skip-permissions"],
      { cwd: PROJETO, shell: true, windowsHide: true },
    );
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* já morreu */ }
      resolve({ ok: false, result: "Tempo esgotado (25 min). A demanda pode ser grande demais pra rodar remota — divida em partes." });
    }, TIMEOUT_MS);
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("close", (code) => {
      clearTimeout(timer);
      const texto = (out || "").trim();
      if (code === 0 && texto) resolve({ ok: true, result: texto });
      else resolve({ ok: false, result: texto || (err || "").trim().slice(-1200) || `Claude saiu com código ${code}.` });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ ok: false, result: "Não consegui iniciar o Claude Code: " + e.message });
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// ---- loop principal ----
let ocupado = false;
async function tick() {
  if (ocupado) return POLL_MS;
  let job = null;
  try {
    const resp = await fetch(`${API}&action=poll`);
    if (resp.status === 401) { log("ERRO: chave rejeitada (401). O segredo REMOTE_KEY foi criado no Cloudflare?"); return ERRO_MS * 5; }
    if (!resp.ok) { log(`Poll falhou: HTTP ${resp.status}`); return ERRO_MS; }
    job = (await resp.json())?.job || null;
  } catch (e) {
    log("Sem conexão com o Worker: " + e.message);
    return ERRO_MS;
  }
  if (!job) return POLL_MS;

  ocupado = true;
  log(`Job ${job.id}: "${job.text.slice(0, 80)}"`);
  const inicio = Date.now();
  const r = await rodarClaude(job.text);
  const min = ((Date.now() - inicio) / 60000).toFixed(1);
  log(`Job ${job.id} terminou em ${min} min (ok=${r.ok})`);
  try {
    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", id: job.id, ok: r.ok, result: r.result }),
    });
  } catch (e) {
    log(`Job ${job.id}: não consegui postar o resultado: ` + e.message);
  }
  ocupado = false;
  return 2_000; // pode ter mais na fila: volta rápido
}

log("JARVIS daemon iniciado. Fila: " + WORKER_URL);
(async function loop() {
  for (;;) {
    let espera = POLL_MS;
    try { espera = await tick(); } catch (e) { log("Erro no loop: " + e.message); espera = ERRO_MS; }
    await new Promise((r) => setTimeout(r, espera));
  }
})();
