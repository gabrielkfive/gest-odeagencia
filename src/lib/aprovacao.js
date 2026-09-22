// Aprovação sem estresse dentro do /app (tarefa 07 do doc 11, 22/09/2026). Módulo puro,
// sem DOM e sem banco: a Área do Cliente usa isto pra mostrar o mesmo que o cliente vê no
// portal, com a arte no enquadramento do Instagram. Testado em deploy/teste-aprovacao.mjs.

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

const CORTE = 125;

// Enquadramento do Instagram por formato. Reel e story ocupam a tela inteira, feed é 4:5
// (o retrato que o Instagram mostra maior) e carrossel fica quadrado.
const PROPORCAO = {
  reel: "9:16",
  reels: "9:16",
  story: "9:16",
  stories: "9:16",
  carrossel: "1:1",
  carousel: "1:1",
};

const IMAGEM = /\.(png|jpe?g|webp|gif|avif)(\?|$)/i;
const VIDEO = /\.(mp4|mov|webm|m4v)(\?|$)/i;

function doCliente(t, clienteNorm) {
  if (!t) return false;
  const id = norm(t.clienteId);
  if (id && id === clienteNorm) return true;
  // fallback do legado: tarefa sem clienteId, nome do cliente no título
  return !id && !!clienteNorm && norm(t.title).includes(clienteNorm);
}

function anexos(t) {
  return (Array.isArray(t.attachments) ? t.attachments : []).filter(
    (a) => a && /^https?:\/\//.test(String(a.url || "")),
  );
}

// A prévia é a arte que o cliente vai olhar. Imagem ganha do vídeo: o portal mostra quadro
// parado, e um .mp4 do Drive não toca embutido.
function escolherPrevia(lista) {
  const img = lista.find((a) => IMAGEM.test(String(a.url)) || /imagem|image/i.test(String(a.tipo || "")));
  const alvo = img || lista.find((a) => VIDEO.test(String(a.url))) || lista[0];
  if (!alvo) return null;
  const url = String(alvo.url);
  return {
    url,
    nome: String(alvo.nome || url),
    tipo: IMAGEM.test(url) || img === alvo ? "imagem" : VIDEO.test(url) ? "video" : "arquivo",
  };
}

function dias(deIso, ateIso) {
  if (!deIso) return 0;
  const de = new Date(deIso).getTime();
  const ate = new Date(ateIso || Date.now()).getTime();
  if (!de || !ate || ate < de) return 0;
  return Math.floor((ate - de) / 86400000);
}

export function derivarAprovacoes(tarefas, cliente, agoraIso) {
  const c = norm(cliente);
  return (Array.isArray(tarefas) ? tarefas : [])
    .filter((t) => t.status === "homologcli" && doCliente(t, c))
    .map((t) => {
      const lista = anexos(t);
      const legenda = String(t.legenda || "");
      const corta = legenda.length > CORTE;
      return {
        id: t.id,
        titulo: t.title || "(sem título)",
        formato: t.formato || "",
        proporcao: PROPORCAO[norm(t.formato)] || "4:5",
        publicarEm: t.publicarEm || "",
        previa: escolherPrevia(lista),
        arquivos: lista.length,
        semArquivo: lista.length === 0,
        legenda,
        legendaCurta: corta ? legenda.slice(0, CORTE).trimEnd() + "..." : legenda,
        legendaMais: corta,
        diasParado: dias(t.aprovacaoEm, agoraIso),
        enviadoClienteEm: t.enviadoClienteEm || "",
      };
    });
}

// Registra que a arte foi mandada pro cliente. O histórico ganha uma linha por dia: reenviar
// o link cinco vezes na mesma tarde não vira cinco linhas (o Gabriel odeia flood).
export function marcarEnviadoAoCliente(tarefa, agoraIso) {
  if (!tarefa) throw new Error("Tarefa não encontrada.");
  const agora = agoraIso || new Date().toISOString();
  const hist = Array.isArray(tarefa.hist) ? tarefa.hist.slice() : [];
  const dia = agora.slice(0, 10);
  const jaHoje = hist.some((h) => h && /[Ee]nviad/.test(String(h.txt || "")) && String(h.em || "").slice(0, 10) === dia);
  if (!jaHoje) hist.push({ em: agora, txt: "Enviado ao cliente para aprovação (link do portal)" });
  return { ...tarefa, enviadoClienteEm: agora, hist, up: agora };
}
