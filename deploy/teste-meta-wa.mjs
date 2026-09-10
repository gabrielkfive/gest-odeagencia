/*
  Teste do canal oficial do WhatsApp (Cloud API da Meta), sem rede:
  parser do webhook, handshake de verificação e assinatura HMAC.
  Código testado: src/lib/meta-wa.js (importado aqui direto, como o teste-merge-estado).

  Uso: node deploy/teste-meta-wa.mjs   (ou npm run teste:meta)
*/
import { parseMetaWebhook, metaVerificationChallenge, metaSignatureValid } from "../src/lib/meta-wa.js";

let falhas = 0;
const ok = (cond, nome) => { console.log((cond ? "  ok   " : "  FALHA") + " " + nome); if (!cond) falhas++; };

// Payload real de exemplo (formato da documentação da Meta), com número fictício.
const payload = {
  object: "whatsapp_business_account",
  entry: [{
    id: "1234567890",
    changes: [{
      field: "messages",
      value: {
        messaging_product: "whatsapp",
        metadata: { display_phone_number: "556130000000", phone_number_id: "111222333" },
        contacts: [{ profile: { name: "Maria Teste" }, wa_id: "5561900000000" }],
        messages: [
          { from: "5561900000000", id: "wamid.AAA", timestamp: "1757520000", type: "text", text: { body: "Oi, quero saber do plano" } },
          { from: "5561900000000", id: "wamid.BBB", timestamp: "1757520010", type: "image", image: { id: "MEDIA1", mime_type: "image/jpeg", caption: "minha loja" } },
          { from: "5561900000000", id: "wamid.CCC", timestamp: "1757520020", type: "audio", audio: { id: "MEDIA2", mime_type: "audio/ogg", voice: true } },
          { from: "5561900000000", id: "wamid.DDD", timestamp: "1757520030", type: "reaction", reaction: { emoji: "👍", message_id: "wamid.AAA" } },
          { from: "5561900000000", id: "wamid.EEE", timestamp: "1757520040", type: "document", document: { id: "MEDIA3", mime_type: "application/pdf", filename: "contrato.pdf" } },
        ],
      },
    }],
  }],
};

console.log("1. parser");
const p = parseMetaWebhook(payload);
ok(p.messages.length === 4, "4 mensagens (reação ignorada)");
ok(p.messages[0].phone === "5561900000000" && p.messages[0].name === "Maria Teste", "telefone e nome pelo contacts");
ok(p.messages[0].text === "Oi, quero saber do plano", "texto");
ok(p.messages[0].ts === 1757520000 * 1000, "timestamp em ms");
ok(p.messages[1].text === "minha loja" && p.messages[1].media?.type === "image" && p.messages[1].mediaId === "MEDIA1", "imagem com legenda e id de mídia");
ok(p.messages[2].text === "🎤 [Áudio]" && p.messages[2].media?.ptt === true, "áudio vira placeholder até transcrever");
ok(p.messages[3].text === "📎 [Documento]: contrato.pdf" && p.messages[3].media?.fileName === "contrato.pdf", "documento com nome");
ok(p.messages[0].phoneNumberId === "111222333", "phone_number_id do metadata");

console.log("2. status e lixo");
const st = parseMetaWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messaging_product: "whatsapp", statuses: [{ id: "x", status: "delivered" }] } }] }] });
ok(st.messages.length === 0 && st.statuses === 1, "status de entrega não vira mensagem");
ok(parseMetaWebhook(null).messages.length === 0, "null não quebra");
ok(parseMetaWebhook({ object: "page", entry: [] }).messages.length === 0, "objeto de outro produto é ignorado");
ok(parseMetaWebhook({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messaging_product: "whatsapp", messages: [{ from: "", type: "text", text: { body: "x" } }] } }] }] }).messages.length === 0, "sem remetente é ignorado");

console.log("3. handshake");
const q = (s) => new URLSearchParams(s);
ok(metaVerificationChallenge(q("hub.mode=subscribe&hub.verify_token=abc&hub.challenge=12345"), "abc") === "12345", "token certo devolve o challenge");
ok(metaVerificationChallenge(q("hub.mode=subscribe&hub.verify_token=errado&hub.challenge=12345"), "abc") === null, "token errado recusa");
ok(metaVerificationChallenge(q("hub.mode=subscribe&hub.verify_token=abc&hub.challenge=12345"), "") === null, "sem token configurado recusa");

console.log("4. assinatura");
const raw = JSON.stringify(payload);
const secret = "segredo-de-teste";
const enc = new TextEncoder();
const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const sig = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(raw))), (b) => b.toString(16).padStart(2, "0")).join("");
ok(await metaSignatureValid(raw, "sha256=" + sig, secret) === true, "assinatura correta passa");
ok(await metaSignatureValid(raw, "sha256=" + sig, "outro") === false, "segredo errado recusa");
ok(await metaSignatureValid(raw + " ", "sha256=" + sig, secret) === false, "corpo alterado recusa");
ok(await metaSignatureValid(raw, "", secret) === false, "sem header recusa");
ok(await metaSignatureValid(raw, "sha256=zz", secret) === false, "header malformado recusa");

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo passou.");
process.exit(falhas ? 1 : 0);
