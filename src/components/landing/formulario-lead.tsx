import { useState, type FormEvent } from "react";

// Formulário da landing /conheca. Envia para POST /api/workflowark/lead-site, que
// grava o lead em wfa-crm (Prospecção, responsável Saulo). Estados: parado,
// enviando, sucesso, erro. Sucesso SÓ quando a resposta vem com ok:true; qualquer
// outra coisa mostra a mensagem real do servidor ou um erro genérico.
// Honeypot: campo "site" fora da tela (não display:none, pra não atrapalhar o
// autofill dos campos reais); robô que preenche recebe 200 e nada é gravado.

type Estado = "parado" | "enviando" | "sucesso" | "erro";

const ENDPOINT = "/api/workflowark/lead-site";
const MSG_SUCESSO = "Recebemos, o Saulo responde no WhatsApp.";

function soDigitos(v: string) {
  return v.replace(/\D/g, "");
}

export function FormularioLead() {
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [site, setSite] = useState(""); // honeypot
  const [estado, setEstado] = useState<Estado>("parado");
  const [erro, setErro] = useState("");
  const [erroCampo, setErroCampo] = useState<{ nome?: string; whatsapp?: string; email?: string }>(
    {},
  );

  function validar() {
    const e: typeof erroCampo = {};
    if (!nome.trim()) e.nome = "Diga seu nome.";
    else if (nome.trim().length > 120) e.nome = "Nome muito longo.";
    const dig = soDigitos(whatsapp);
    if (dig.length < 10 || dig.length > 13)
      e.whatsapp = "WhatsApp com DDD, só números (10 a 13 dígitos).";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "E-mail não parece válido.";
    setErroCampo(e);
    return Object.keys(e).length === 0;
  }

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setErro("");
    if (!validar()) return;
    setEstado("enviando");
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          empresa: empresa.trim(),
          whatsapp: soDigitos(whatsapp),
          email: email.trim(),
          mensagem: mensagem.trim(),
          site,
        }),
      });
      let out: { ok?: boolean; error?: string; repetido?: boolean } = {};
      try {
        out = await res.json();
      } catch {
        out = {};
      }
      if (res.ok && out.ok === true) {
        setEstado("sucesso");
        return;
      }
      setErro(
        out.error ||
          (res.status === 429
            ? "Muitos envios seguidos deste aparelho. Aguarde alguns minutos e tente de novo."
            : "Não foi possível registrar agora. Tente de novo em instantes."),
      );
      setEstado("erro");
    } catch {
      setErro("Sem conexão com o servidor. Confira a internet e tente de novo.");
      setEstado("erro");
    }
  }

  if (estado === "sucesso") {
    return (
      <div className="lc-sucesso" role="status" aria-live="polite">
        <h3>{MSG_SUCESSO}</h3>
        <p>
          Seu contato entrou no funil da ARK como lead de Prospecção. A resposta vem no número que
          você informou.
        </p>
      </div>
    );
  }

  const enviando = estado === "enviando";

  return (
    <form className="lc-form" onSubmit={enviar} noValidate aria-describedby="lc-form-nota">
      <div className="lc-form-linha">
        <div className="lc-campo">
          <label htmlFor="lc-nome">
            Nome <em aria-hidden="true">*</em>
          </label>
          <input
            id="lc-nome"
            name="nome"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={erroCampo.nome ? "true" : undefined}
            aria-describedby={erroCampo.nome ? "lc-nome-erro" : undefined}
            placeholder="Como você se chama"
          />
          {erroCampo.nome && <small id="lc-nome-erro">{erroCampo.nome}</small>}
        </div>
        <div className="lc-campo">
          <label htmlFor="lc-empresa">Agência ou empresa</label>
          <input
            id="lc-empresa"
            name="empresa"
            type="text"
            autoComplete="organization"
            maxLength={120}
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Nome da sua operação"
          />
        </div>
      </div>

      <div className="lc-form-linha">
        <div className="lc-campo">
          <label htmlFor="lc-whatsapp">
            WhatsApp com DDD <em aria-hidden="true">*</em>
          </label>
          <input
            id="lc-whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            aria-invalid={erroCampo.whatsapp ? "true" : undefined}
            aria-describedby={erroCampo.whatsapp ? "lc-whatsapp-erro" : undefined}
            placeholder="61 99999 9999"
          />
          {erroCampo.whatsapp && <small id="lc-whatsapp-erro">{erroCampo.whatsapp}</small>}
        </div>
        <div className="lc-campo">
          <label htmlFor="lc-email">E-mail</label>
          <input
            id="lc-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={160}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={erroCampo.email ? "true" : undefined}
            aria-describedby={erroCampo.email ? "lc-email-erro" : undefined}
            placeholder="opcional"
          />
          {erroCampo.email && <small id="lc-email-erro">{erroCampo.email}</small>}
        </div>
      </div>

      <div className="lc-campo">
        <label htmlFor="lc-mensagem">Como é a sua operação hoje?</label>
        <textarea
          id="lc-mensagem"
          name="mensagem"
          maxLength={1000}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Quantas pessoas, quantos clientes, o que mais trava. Opcional, ajuda a conversa a começar no ponto certo."
        />
      </div>

      {/* Honeypot: pessoa não vê nem tabula até aqui. Robô preenche e o servidor ignora. */}
      <div className="lc-hp" aria-hidden="true">
        <label htmlFor="lc-site">Site</label>
        <input
          id="lc-site"
          name="site"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={site}
          onChange={(e) => setSite(e.target.value)}
        />
      </div>

      {estado === "erro" && erro && (
        <div className="lc-aviso lc-aviso-erro" role="alert">
          {erro}
        </div>
      )}

      <button
        type="submit"
        className="lc-btn lc-btn-amarelo"
        disabled={enviando}
        aria-busy={enviando}
      >
        {enviando ? "Enviando…" : "Quero ver funcionando"}
      </button>
      <p className="lc-form-nota" id="lc-form-nota">
        Usamos seu contato só para responder este pedido. Nada de lista de e-mail.
      </p>
    </form>
  );
}
