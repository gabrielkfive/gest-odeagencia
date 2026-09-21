// Area Automacoes do /next: rotinas cadastradas (wfa-rotinas) e onde vivem os agentes.
// O dado de rotina e so cadastro (titulo, frequencia, dia, hora, responsavel, ativa):
// nao existe registro de execucao no estado, entao nada de "ultima" ou "proxima" aqui.
import { useMemo } from "react";
import { Bot, Cloud, Workflow } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Abrir, Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import { rotinas } from "@/components/next/dados";

const CSS = `
.nxm-kpis{display:grid;gap:14px;grid-template-columns:repeat(3,1fr)}
.nxm-links{display:flex;flex-wrap:wrap;gap:8px}
.nxm-p{font-size:12.5px;color:var(--ink2);margin:0;line-height:1.5}
.nxm-p b{color:var(--ink);font-weight:600}
@media (max-width:900px){.nxm-kpis{grid-template-columns:repeat(2,1fr);gap:10px}.nxm-kpis .nx-kpi:last-child{grid-column:span 2}}
`;

const FREQ: Record<string, string> = {
  diaria: "Diária",
  diario: "Diária",
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
};
const rotuloFreq = (f?: string) => (f ? FREQ[f.toLowerCase()] || f : "sem frequência");

export function Automacoes() {
  const { carga, abrirApp } = useNext();
  const st = useMemo(() => carga?.state || {}, [carga]);
  const temRotinas = "wfa-rotinas" in st;

  const v = useMemo(() => {
    const lst = rotinas(st);
    const ativas = lst.filter((r) => r.ativo !== false);
    const porFreq: Record<string, number> = {};
    for (const r of ativas) {
      const k = rotuloFreq(r.freq);
      porFreq[k] = (porFreq[k] || 0) + 1;
    }
    return { lst, ativas, inativas: lst.length - ativas.length, porFreq };
  }, [st]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Automações</h1>
      <p className="nx-sub">
        Rotinas cadastradas pela equipe e os dois lugares onde os agentes trabalham. Este painel não
        registra execuções: mostra só o que está configurado.
      </p>

      <div className="nx-grid">
        <div className="c12 nxm-kpis">
          <Kpi
            label="Rotinas cadastradas"
            value={temRotinas ? v.lst.length : "sem acesso"}
            title="Itens em wfa-rotinas, ativos ou não. Sem período."
            onOpen={() => abrirApp("rotinas")}
          />
          <Kpi
            label="Ativas"
            value={temRotinas ? v.ativas.length : "sem acesso"}
            tone={v.ativas.length ? "ok" : undefined}
            detail={
              temRotinas && v.inativas
                ? `${v.inativas} desligada${v.inativas === 1 ? "" : "s"}`
                : undefined
            }
            title="Rotinas com o campo ativo diferente de falso."
            onOpen={() => abrirApp("rotinas")}
          />
          <Kpi
            label="Por frequência"
            value={temRotinas ? Object.keys(v.porFreq).length : "sem acesso"}
            detail={
              temRotinas
                ? Object.entries(v.porFreq)
                    .map(([k, n]) => `${n} ${k.toLowerCase()}`)
                    .join(", ") || undefined
                : undefined
            }
            title="Quantas frequências distintas existem entre as rotinas ativas."
          />
        </div>

        <Card
          className="c12"
          title="Rotinas"
          icon={<Workflow size={16} />}
          count={temRotinas ? v.lst.length : undefined}
          action={<Abrir onClick={() => abrirApp("rotinas")}>Editar no clássico</Abrir>}
        >
          {!temRotinas ? (
            <Vazio
              titulo="Sem acesso a este bloco"
              texto="A leitura não trouxe wfa-rotinas. Pode ser permissão do papel ou o bloco ainda não existe."
            />
          ) : v.lst.length === 0 ? (
            <Vazio
              titulo="Nenhuma rotina cadastrada"
              texto="Cadastre em Rotinas, no clássico (título, frequência, dia, hora e responsável)."
            />
          ) : (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Rotina</th>
                    <th>Frequência</th>
                    <th>Dia e hora</th>
                    <th>Responsável</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {v.lst.map((r) => (
                    <tr key={r.id}>
                      <td>{r.titulo || "(sem título)"}</td>
                      <td>{rotuloFreq(r.freq)}</td>
                      <td>
                        {[r.dia, r.hora].filter(Boolean).join(" às ") || (
                          <span className="nx-mute">não definido</span>
                        )}
                      </td>
                      <td>{r.resp || <span className="nx-mute">sem responsável</span>}</td>
                      <td>
                        {r.ativo === false ? (
                          <Pill cor="var(--ink3)">desligada</Pill>
                        ) : (
                          <Pill cor="var(--green)">ativa</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="nxm-p">
            Rotina aqui é lembrete recorrente da equipe. O estado guarda só o cadastro; última e
            próxima execução não existem no dado e por isso não aparecem.
          </p>
        </Card>

        <Card
          className="c6"
          title="Agentes locais"
          icon={<Bot size={16} />}
          action={
            <a className="nx-link" href="/agentes">
              Fila dos agentes
            </a>
          }
        >
          <p className="nxm-p">
            Os agentes locais rodam no PC da ARK (modelos no Ollama) e empurram propostas para uma
            fila própria: <b>leads, ideias, tarefas, conteúdo, follow-up, propostas e melhorias</b>.
            Nada é executado sem alguém aprovar na fila; o PC lê a decisão e só então age.
          </p>
          <div className="nxm-links">
            <a className="nx-btn" href="/agentes">
              Abrir /agentes
            </a>
            <a className="nx-btn ghost" href="/postagens">
              Fila do agente social
            </a>
          </div>
          <p className="nxm-p">
            Quantidade de itens pendentes na fila não vem na carga deste painel; ela aparece ao
            abrir a fila.
          </p>
        </Card>

        <Card
          className="c6"
          title="Rotinas de nuvem"
          icon={<Cloud size={16} />}
          action={<Abrir onClick={() => abrirApp("agentes")}>Agentes no clássico</Abrir>}
        >
          <p className="nxm-p">
            As rotinas que rodam na nuvem (publicação agendada, agentes de geração, cobrança) são
            configuradas na aba <b>Agentes</b> do WorkFlowArk clássico e nas integrações. O Worker
            não tem agendador próprio, então o gatilho vem de fora ou do PC.
          </p>
          <div className="nxm-links">
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("agentes")}>
              Agentes
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("integracoes")}>
              Integrações
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("rotinas")}>
              Rotinas
            </button>
          </div>
        </Card>
      </div>
    </>
  );
}
