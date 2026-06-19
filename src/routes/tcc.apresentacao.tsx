import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/tcc/apresentacao")({
  head: () => ({
    meta: [
      { title: "Apresentacao TCC | ARK Content" },
      {
        name: "description",
        content: "Apresentacao de TCC hospedada no WorkFlowArk.",
      },
    ],
  }),
  component: TccPresentationPage,
});

function TccPresentationPage() {
  return (
    <main className="min-h-screen bg-[#f7f4ec] text-neutral-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8">
        <header className="flex items-center justify-between border-b border-neutral-300 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Trabalho de Conclusao de Curso
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
              Apresentacao TCC
            </h1>
          </div>
          <div className="rounded-md bg-yellow-400 px-4 py-2 text-sm font-bold">
            ARK Content
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Tema
            </p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Estrategia, tecnologia e operacao aplicadas a uma agencia de
              marketing gastronomico.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-700">
              Esta pagina hospeda a apresentacao do TCC em formato web,
              preparada para acesso publico, rapido e estavel pelo dominio da
              ARK Content.
            </p>
          </section>

          <aside className="rounded-lg border border-neutral-300 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
              Estrutura
            </p>
            <ol className="mt-5 space-y-4 text-sm text-neutral-700">
              <li>
                <strong className="text-neutral-950">1. Contexto</strong>
                <br />
                Problema, oportunidade e justificativa.
              </li>
              <li>
                <strong className="text-neutral-950">2. Metodologia</strong>
                <br />
                Pesquisa, ferramentas e processo de desenvolvimento.
              </li>
              <li>
                <strong className="text-neutral-950">3. Solucao</strong>
                <br />
                Sistema, operacao e aplicacao pratica.
              </li>
              <li>
                <strong className="text-neutral-950">4. Resultados</strong>
                <br />
                Impactos, aprendizados e proximos passos.
              </li>
            </ol>
          </aside>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-300 pt-4 text-xs text-neutral-500">
          <span>WorkFlowArk / ARK Content</span>
          <span>workflowark.arkcontent.workers.dev/tcc/apresentacao</span>
        </footer>
      </section>
    </main>
  );
}
