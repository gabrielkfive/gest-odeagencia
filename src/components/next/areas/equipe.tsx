// Area Equipe do /next: carga por pessoa a partir das tarefas abertas (resp/resps) mais
// os membros cadastrados (lista so chega para admin). Responsavel e texto no sistema, entao
// a juncao e por nome sem acento; capacidade em horas nao existe no dado. Nada grava daqui.
import { useMemo } from "react";
import { AlertTriangle, UsersRound } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Abrir, Card, Kpi, Pill, Vazio } from "@/components/next/ui";
import { aberta, dataBR, hojeSP, norm, type Tarefa } from "@/components/next/dados";

const CSS = `
.nxe-kpis{display:grid;gap:14px;grid-template-columns:repeat(4,1fr)}
.nxe-nome{display:flex;align-items:center;gap:8px;min-width:0}
.nxe-nome b{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxe-av{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:var(--glass2);border:1px solid var(--line);font-size:11px;font-weight:700;flex:none}
.nxe-av.eu{background:var(--yel);color:#111;border-color:transparent}
.nxe-bar{min-width:120px}
.nxe-num{font-variant-numeric:tabular-nums;text-align:right}
.nxe-num.late{color:var(--red);font-weight:600}
.nxe-aviso{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;border:1px solid var(--line2);background:var(--glass);font-size:12.5px;color:var(--ink2)}
.nxe-aviso svg{flex:none;color:var(--yel);margin-top:1px}
.nxe-links{display:flex;flex-wrap:wrap;gap:8px}
@media (max-width:900px){.nxe-kpis{grid-template-columns:repeat(2,1fr);gap:10px}.nxe-bar{min-width:80px}}
`;

type Pessoa = {
  chave: string;
  nome: string;
  membro: boolean;
  ativo?: boolean;
  papel?: string;
  abertas: number;
  atrasadas: number;
  hoje: number;
  homolog: number;
  semPrazo: number;
};

const iniciais = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

export function Equipe() {
  const { carga, member, tarefas, abrirApp } = useNext();
  const hoje = hojeSP();
  const members = useMemo(() => carga?.members || [], [carga]);
  const admin = member?.role === "admin" || members.length > 0;

  const v = useMemo(() => {
    const abertas = tarefas.filter(aberta);
    const mapa = new Map<string, Pessoa>();
    const pega = (nome: string): Pessoa => {
      const chave = norm(nome);
      let p = mapa.get(chave);
      if (!p) {
        // mesmo primeiro nome de alguem ja visto e um dos dois e o nome completo do outro: junta
        const primeiro = chave.split(/\s+/)[0];
        for (const q of mapa.values()) {
          const qp = q.chave.split(/\s+/)[0];
          if (qp === primeiro && (q.chave === primeiro || chave === primeiro)) {
            p = q;
            break;
          }
        }
      }
      if (!p) {
        p = {
          chave,
          nome: nome.trim(),
          membro: false,
          abertas: 0,
          atrasadas: 0,
          hoje: 0,
          homolog: 0,
          semPrazo: 0,
        };
        mapa.set(chave, p);
      } else if (nome.trim().length > p.nome.length) {
        p.nome = nome.trim();
      }
      return p;
    };
    // membros primeiro, pra pessoa cadastrada sem tarefa aparecer com zero honesto
    for (const m of members) {
      if (!m.full_name) continue;
      const p = pega(m.full_name);
      p.membro = true;
      p.ativo = m.active !== false;
      p.papel = m.role || undefined;
    }
    let semDono = 0;
    const conta = (p: Pessoa, t: Tarefa) => {
      p.abertas++;
      if (t.data && t.data < hoje) p.atrasadas++;
      else if (t.data === hoje) p.hoje++;
      if (!t.data) p.semPrazo++;
      if (t.status === "aprovacao" || t.status === "homologcli") p.homolog++;
    };
    for (const t of abertas) {
      const nomes = Array.from(
        new Set([t.resp, ...(t.resps || [])].filter((x): x is string => !!x && !!x.trim())),
      );
      if (nomes.length === 0) {
        semDono++;
        continue;
      }
      for (const n of nomes) conta(pega(n), t);
    }
    const pessoas = Array.from(mapa.values()).sort(
      (a, b) => b.atrasadas - a.atrasadas || b.abertas - a.abertas || a.nome.localeCompare(b.nome),
    );
    const max = Math.max(1, ...pessoas.map((p) => p.abertas));
    return {
      pessoas,
      max,
      semDono,
      abertas: abertas.length,
      atrasadas: abertas.filter((t) => t.data && t.data < hoje).length,
      sobrecarga: pessoas.filter((p) => p.atrasadas > 0).length,
    };
  }, [tarefas, members, hoje]);

  const eu = norm(member?.full_name || "");
  const euPrimeiro = eu.split(/\s+/)[0];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Equipe</h1>
      <p className="nx-sub">
        {v.pessoas.length === 0
          ? "Nenhuma pessoa aparece como responsável de tarefa aberta."
          : `${v.pessoas.length} pessoa${v.pessoas.length === 1 ? "" : "s"} com tarefa aberta${admin ? " ou cadastro de membro" : ""}. Carga medida em quantidade de tarefas, não em horas.`}
      </p>

      <div className="nx-grid">
        <div className="c12 nxe-kpis">
          <Kpi
            label="Pessoas"
            value={v.pessoas.length}
            title="Nomes distintos que aparecem como responsável em tarefa aberta, mais membros cadastrados (só admin recebe a lista)."
          />
          <Kpi
            label="Abertas na equipe"
            value={v.abertas}
            title="Tarefas abertas de todo mundo, contando cartão de projeto uma vez. Sem período."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Atrasadas"
            value={v.atrasadas}
            tone={v.atrasadas ? "warn" : "ok"}
            detail={`${v.sobrecarga} pessoa${v.sobrecarga === 1 ? "" : "s"} com atraso`}
            title="Tarefas abertas com prazo antes de hoje (fuso de São Paulo)."
            onOpen={() => abrirApp("tarefas")}
          />
          <Kpi
            label="Sem dono"
            value={v.semDono}
            tone={v.semDono ? "warn" : undefined}
            title="Tarefas abertas sem responsável preenchido. Não entram na carga de ninguém."
            onOpen={() => abrirApp("tarefas")}
          />
        </div>

        <Card
          className="c12"
          title="Carga por pessoa"
          icon={<UsersRound size={16} />}
          count={v.pessoas.length}
          action={<Abrir onClick={() => abrirApp("tarefas")}>Kanban</Abrir>}
        >
          <div className="nxe-aviso">
            <AlertTriangle size={15} />
            <span>
              Capacidade em horas não existe no dado: o sistema não guarda horas disponíveis por
              pessoa. A barra compara a quantidade de tarefas abertas entre as pessoas desta lista
              (a maior carga é a barra cheia). Responsável é texto, então nomes escritos de formas
              diferentes podem aparecer separados.
            </span>
          </div>
          {v.pessoas.length === 0 ? (
            <Vazio
              titulo="Ninguém com tarefa aberta"
              texto={
                admin
                  ? "Membros cadastrados sem tarefa também apareceriam aqui."
                  : "Só admin recebe a lista de membros; aqui entram apenas nomes que estão nas tarefas."
              }
            />
          ) : (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th className="nxe-num">Abertas</th>
                    <th className="nxe-num">Atrasadas</th>
                    <th className="nxe-num">Hoje</th>
                    <th className="nxe-num">Homolog.</th>
                    <th className="nxe-num">Sem prazo</th>
                    <th>Carga relativa</th>
                  </tr>
                </thead>
                <tbody>
                  {v.pessoas.map((p) => {
                    const souEu =
                      !!eu &&
                      (p.chave === eu || (!!euPrimeiro && p.chave.split(/\s+/)[0] === euPrimeiro));
                    return (
                      <tr key={p.chave}>
                        <td>
                          <div className="nxe-nome">
                            <span className={`nxe-av ${souEu ? "eu" : ""}`}>
                              {iniciais(p.nome) || "?"}
                            </span>
                            <b>{p.nome}</b>
                            {p.membro && p.papel && <Pill>{p.papel}</Pill>}
                            {p.membro && p.ativo === false && <Pill cor="var(--red)">inativo</Pill>}
                            {!p.membro && admin && <Pill cor="var(--ink3)">só nas tarefas</Pill>}
                          </div>
                        </td>
                        <td className="num nxe-num">{p.abertas}</td>
                        <td className={`num nxe-num ${p.atrasadas ? "late" : ""}`}>
                          {p.atrasadas}
                        </td>
                        <td className="num nxe-num">{p.hoje}</td>
                        <td className="num nxe-num">{p.homolog}</td>
                        <td className="num nxe-num">{p.semPrazo}</td>
                        <td>
                          <div
                            className="nx-bar nxe-bar"
                            title={`${p.abertas} de ${v.max} (maior carga da lista)`}
                          >
                            <i
                              style={{
                                width: `${Math.round((p.abertas / v.max) * 100)}%`,
                                background: p.atrasadas ? "var(--red)" : "var(--yel)",
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <p className="nx-mute" style={{ fontSize: 11.5, margin: 0 }}>
            "Hoje" é prazo em {dataBR(hoje)}. "Homolog." soma Homologação e Homologação do cliente.
            Reatribuir tarefa continua no modal do Kanban.
          </p>
        </Card>

        <Card className="c12" title="Organização">
          <div className="nxe-links">
            <button type="button" className="nx-btn" onClick={() => abrirApp("organograma")}>
              Organograma
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("pops")}>
              POPs
            </button>
          </div>
          {!admin && (
            <p className="nx-mute" style={{ fontSize: 11.5, margin: 0 }}>
              A lista de membros (e-mail, papel, ativo) só chega para o papel admin e fica em
              Configurações.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
