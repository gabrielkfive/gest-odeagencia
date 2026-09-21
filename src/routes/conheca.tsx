import { createFileRoute } from "@tanstack/react-router";
import { ESTILO_CONHECA } from "@/components/landing/estilo";
import { FAQ, IA_EM_EVOLUCAO, IA_FLUXO, IA_HOJE, JORNADA, PAPEIS, PRODUTO } from "@/components/landing/conteudo";
import { FormularioLead } from "@/components/landing/formulario-lead";

// Landing PÚBLICA de venda do WorkFlowArk (/conheca). Fora de _authenticated, sem
// iframe, sem biblioteca nova. Renderiza no servidor (SEO) e o único JS de verdade é
// o formulário, que grava em wfa-crm via /api/workflowark/lead-site.
// Conteúdo em src/components/landing/conteudo.ts; CSS em estilo.ts (inline).
// Promessa da página: só o que existe hoje no sistema. Nada de depoimento, número
// de cliente, logo de terceiro ou preço.

const TITULO = "Conheça o WorkFlowArk · ARK Content";
const DESCRICAO = "Sua agência inteira no mesmo fluxo. O sistema que a ARK Content usa todo dia para produção, clientes, aprovações, comercial e financeiro, agora disponível para outras agências. Conversa de 30 minutos e acesso de demonstração.";

export const Route = createFileRoute("/conheca")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0a0a" },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/ark-logo.png" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITULO },
      { name: "twitter:description", content: DESCRICAO },
      { name: "twitter:image", content: "/ark-logo.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@700;800&display=swap" },
    ],
  }),
  component: Conheca,
});

// Ícones simples (traço, 24x24) pra grade do produto. Sem biblioteca.
const ICONES: Record<string, string> = {
  sol: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  colunas: "M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v7h-4z",
  pasta: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  funil: "M4 5h16l-6 8v6l-4-2v-4z",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6",
  moeda: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5h3.75a1.75 1.75 0 0 1 0 3.5h-2.5a1.75 1.75 0 0 0 0 3.5H14.5",
  agenda: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  video: "M3 7h12v10H3zM15 10l6-3v10l-6-3",
  link: "M9 15l6-6M8 17a3 3 0 0 1 0-4l2-2M16 7a3 3 0 0 1 0 4l-2 2M5 12l-1 1a4 4 0 0 0 6 6l1-1M19 12l1-1a4 4 0 0 0-6-6l-1 1",
  brilho: "M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z",
  chat: "M4 5h16v11H9l-5 4z",
  celular: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2",
};
const ORDEM_ICONES = ["sol", "colunas", "pasta", "funil", "doc", "moeda", "agenda", "video", "link", "brilho", "chat", "celular"];

function Icone({ nome }: { nome: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONES[nome] || ICONES.brilho} />
    </svg>
  );
}

// Ilustração do Kanban em HTML e CSS: colunas e rótulos reais, cartões de exemplo.
// Marcada como ilustração na legenda pra não passar por captura de tela.
function QuadroIlustracao() {
  const cols: { t: string; cards: { t: string; r: string; extra?: string }[] }[] = [
    { t: "Andamento", cards: [{ t: "Reels de inauguração, corte final", r: "D", extra: "01:12:40" }, { t: "Roteiro do carrossel de setembro", r: "C" }] },
    { t: "Homologação", cards: [{ t: "Proposta da clínica, revisão", r: "S" }] },
    { t: "Homologação do cliente", cards: [{ t: "Feed da semana, 4 peças", r: "G", extra: "link enviado" }] },
  ];
  return (
    <div className="lc-quadro" aria-label="Ilustração do Kanban de Atividades">
      <div className="lc-quadro-topo">
        <b>Kanban de Atividades</b>
        <span className="lc-quadro-sync"><i /> Salvo 14:02</span>
      </div>
      <div className="lc-colunas">
        {cols.map((c) => (
          <div className="lc-col" key={c.t}>
            <div className="lc-col-t">{c.t}</div>
            {c.cards.map((k) => (
              <div className="lc-card" key={k.t}>
                <div className="lc-card-t">{k.t}</div>
                <div className="lc-card-m"><i>{k.r}</i>{k.extra ? <em>{k.extra}</em> : <span>hoje</span>}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="lc-quadro-legenda">Ilustração com as colunas reais do quadro. A demonstração mostra o sistema de verdade.</div>
    </div>
  );
}

function Conheca() {
  return (
    <div className="lc-pagina">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_CONHECA }} />

      <header className="lc-topo">
        <div className="lc-wrap lc-topo-in">
          <a className="lc-marca" href="/conheca" aria-label="WorkFlowArk, ARK Content">
            <img src="/ark-logo.png" alt="" width={36} height={36} />
            <span>WorkFlowArk<sup>®</sup></span>
          </a>
          <nav className="lc-nav" aria-label="Seções">
            <a href="#produto">O produto</a>
            <a href="#jornada">Como funciona</a>
            <a href="#ia">IA</a>
            <a href="#faq">Perguntas</a>
          </nav>
          <a className="lc-btn lc-btn-amarelo lc-btn-peq" href="#contato">Quero ver funcionando</a>
        </div>
      </header>

      <main>
        {/* 1) Hero */}
        <section className="lc-hero" aria-labelledby="hero-titulo">
          <div className="lc-wrap lc-hero-grid">
            <div className="lc-hero-texto">
              <span className="lc-rotulo">Sistema operacional para agências</span>
              <h1 className="lc-h1" id="hero-titulo">Sua agência inteira. <span className="lc-destaque">No mesmo fluxo.</span></h1>
              <p className="lc-lead">
                Produção, clientes, aprovações, comercial e financeiro num lugar só, com sincronização entre computador e celular.
                É o sistema que a ARK Content usa todo dia na própria operação, agora aberto para outras agências.
              </p>
              <div className="lc-hero-ctas">
                <a className="lc-btn lc-btn-amarelo" href="#contato">Quero ver funcionando</a>
                <a className="lc-btn lc-btn-vazado" href="#produto">Ver o que existe hoje</a>
              </div>
              <p className="lc-hero-nota">Conversa de 30 minutos e acesso de demonstração. Sem cartão, sem cadastro em massa.</p>
            </div>
            <div className="lc-hero-visual">
              <QuadroIlustracao />
            </div>
          </div>
        </section>

        {/* 2) O produto real */}
        <section className="lc-sec" id="produto" aria-labelledby="produto-titulo">
          <div className="lc-wrap">
            <div className="lc-cabeca">
              <span className="lc-rotulo">O que existe hoje</span>
              <h2 className="lc-h2" id="produto-titulo">Tudo abaixo está em uso na ARK. Nada de roteiro futuro disfarçado de recurso.</h2>
              <p className="lc-p lc-p-max">Doze módulos, um estado só. O que a equipe muda no celular aparece no computador em segundos, item por item.</p>
            </div>
            <div className="lc-grade">
              {PRODUTO.map((b, i) => (
                <article className="lc-bloco" key={b.titulo}>
                  <div className="lc-bloco-ico"><Icone nome={ORDEM_ICONES[i] || "brilho"} /></div>
                  <h3 className="lc-h3">{b.titulo}</h3>
                  <p className="lc-p">{b.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 3) Jornada operacional */}
        <section className="lc-sec lc-sec-escura" id="jornada" aria-labelledby="jornada-titulo">
          <div className="lc-wrap">
            <div className="lc-cabeca">
              <span className="lc-rotulo">Como funciona</span>
              <h2 className="lc-h2" id="jornada-titulo">Do briefing ao relatório, cada passo aponta para uma tela que existe.</h2>
            </div>
            <ol className="lc-jornada" aria-label="Jornada em cinco passos">
              {JORNADA.map((p, i) => (
                <li className="lc-passo" key={p.titulo}>
                  <div className="lc-bloco-num">{i + 1}</div>
                  <h3 className="lc-h3">{p.titulo}</h3>
                  <p className="lc-p">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4) Benefícios por papel */}
        <section className="lc-sec" id="papeis" aria-labelledby="papeis-titulo">
          <div className="lc-wrap">
            <div className="lc-cabeca">
              <span className="lc-rotulo">Por papel</span>
              <h2 className="lc-h2" id="papeis-titulo">Cada pessoa abre o sistema e encontra a parte dela.</h2>
              <p className="lc-p lc-p-max">Situações do dia a dia da agência. Sem promessa de economia que não foi medida.</p>
            </div>
            <div className="lc-grade">
              {PAPEIS.map((b) => (
                <article className="lc-bloco" key={b.titulo}>
                  <h3 className="lc-h3"><span className="lc-destaque">{b.titulo}</span></h3>
                  <p className="lc-p">{b.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5) Hermes e IA */}
        <section className="lc-sec lc-sec-escura" id="ia" aria-labelledby="ia-titulo">
          <div className="lc-wrap">
            <div className="lc-cabeca">
              <span className="lc-rotulo">Hermes e os agentes de IA</span>
              <h2 className="lc-h2" id="ia-titulo">Agentes propõem. Pessoas decidem.</h2>
              <p className="lc-p lc-p-max">
                A camada de IA do WorkFlowArk não publica, não manda mensagem para cliente e não move o funil sozinha.
                Ela prepara o trabalho e espera o clique de alguém da equipe.
              </p>
            </div>
            <div className="lc-ia">
              <div className="lc-fluxo" aria-label="Fluxo de aprovação dos agentes">
                {IA_FLUXO.map((f) => (
                  <div className={"lc-fluxo-item" + (f.humano ? " lc-humano" : "")} key={f.passo}>
                    <i aria-hidden="true">{f.passo}</i>
                    <div>
                      <b>{f.quem}</b>
                      <span>{f.texto}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="lc-grade-2" style={{ gridTemplateColumns: "1fr" }}>
                <article className="lc-bloco">
                  <h3 className="lc-h3">Em uso hoje</h3>
                  <ul className="lc-lista">
                    {IA_HOJE.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  <span className="lc-tag lc-tag-amarelo">Disponível</span>
                </article>
                <article className="lc-bloco">
                  <h3 className="lc-h3">Em evolução</h3>
                  <ul className="lc-lista">
                    {IA_EM_EVOLUCAO.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                  <span className="lc-tag">Em construção, mostrado como tal na demonstração</span>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* 6) Prova */}
        <section className="lc-sec" id="prova" aria-labelledby="prova-titulo">
          <div className="lc-wrap">
            <span className="lc-rotulo">Prova</span>
            <h2 className="lc-h2" id="prova-titulo">Uma prova só, e ela é verificável na demonstração.</h2>
            <div className="lc-prova">
              <p>A ARK Content usa o WorkFlowArk todo dia na própria operação, no computador e no celular.</p>
              <small>
                É o mesmo sistema, com os dados reais da agência, que você vai ver na conversa. Sem depoimento encomendado,
                sem contador de clientes, sem logo emprestado. Quando houver caso de outra agência, ele entra aqui com nome e autorização.
              </small>
            </div>
          </div>
        </section>

        {/* 7) Oferta */}
        <section className="lc-sec lc-sec-escura" id="oferta" aria-labelledby="oferta-titulo">
          <div className="lc-wrap lc-oferta">
            <div>
              <span className="lc-rotulo">Oferta</span>
              <h2 className="lc-h2" id="oferta-titulo">Conversa de 30 minutos e acesso de demonstração.</h2>
              <p className="lc-p lc-p-max">
                Primeiro a gente entende como a sua agência trabalha: quantas pessoas, quantos clientes, o que trava.
                Depois você recebe acesso de demonstração para andar pelo sistema com calma. Valor e implantação são combinados nessa conversa,
                de acordo com o tamanho da operação.
              </p>
            </div>
            <ul className="lc-lista">
              <li>Conversa por videochamada ou WhatsApp, 30 minutos, com quem opera o sistema na ARK.</li>
              <li>Acesso de demonstração para você e mais uma pessoa da equipe.</li>
              <li>Migração de dados combinada caso a caso, sem promessa automática.</li>
              <li>Sem cartão de crédito nesta etapa.</li>
            </ul>
          </div>
        </section>

        {/* 8) FAQ */}
        <section className="lc-sec" id="faq" aria-labelledby="faq-titulo">
          <div className="lc-wrap">
            <div className="lc-cabeca">
              <span className="lc-rotulo">Perguntas</span>
              <h2 className="lc-h2" id="faq-titulo">O que costumam perguntar antes da conversa.</h2>
            </div>
            <div className="lc-faq">
              {FAQ.map((f) => (
                <details key={f.p}>
                  <summary>{f.p}</summary>
                  <p>{f.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 9) CTA final com formulário */}
        <section className="lc-sec lc-sec-escura" id="contato" aria-labelledby="contato-titulo">
          <div className="lc-wrap lc-contato">
            <div>
              <span className="lc-rotulo">Vamos conversar</span>
              <h2 className="lc-h2" id="contato-titulo">Quero ver funcionando.</h2>
              <p className="lc-p lc-p-max">
                Deixe nome e WhatsApp. O Saulo, do comercial da ARK, responde e marca a conversa de 30 minutos.
                Seu contato entra no mesmo funil que você viu aqui em cima, como lead de Prospecção.
              </p>
            </div>
            <FormularioLead />
          </div>
        </section>
      </main>

      <footer className="lc-rodape">
        <div className="lc-wrap lc-rodape-in">
          <div>
            <strong style={{ color: "#efefef" }}>ARK Content</strong>. WorkFlowArk® é software da ARK Content.
          </div>
          <div className="lc-rodape-links">
            <a href="/privacidade.html">Privacidade</a>
            <a href="/termos.html">Termos</a>
            <a href="/auth">Entrar</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
