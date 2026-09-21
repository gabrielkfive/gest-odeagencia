// Area Configuracoes do /next: cartao da pessoa, tema ativo, atalhos pras configuracoes
// que moram no classico e, para admin, a lista de membros (carga.members). Nada grava
// daqui: papel, tema e integracoes mudam nos lugares de origem.
import { Bell, FolderOpen, Moon, Palette, Plug, Sun, UserRound, UsersRound } from "lucide-react";
import { useNext } from "@/components/next/contexto";
import { Card, Pill, Vazio } from "@/components/next/ui";

const CSS = `
.nxs-pessoa{display:flex;align-items:center;gap:14px}
.nxs-av{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:var(--yel);color:#111;font-weight:800;font-size:18px;flex:none}
.nxs-pessoa .n{min-width:0}
.nxs-pessoa .n b{display:block;font-size:16px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxs-pessoa .n span{display:block;font-size:12.5px;color:var(--ink3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nxs-tags{display:flex;flex-wrap:wrap;gap:6px}
.nxs-tema{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--glass);border:1px solid var(--line)}
.nxs-tema .ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--glass2);border:1px solid var(--line);color:var(--yel);flex:none}
.nxs-tema b{display:block;font-weight:600}
.nxs-tema span{font-size:12px;color:var(--ink3)}
.nxs-links{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.nxs-links .nx-btn{justify-content:flex-start}
.nxs-p{font-size:12.5px;color:var(--ink2);margin:0;line-height:1.5}
`;

const iniciais = (n: string) =>
  n
    .split(/[\s@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");

export function Configuracoes() {
  const { carga, member, abrirApp, claro } = useNext();
  const members = carga?.members || [];
  const admin = member?.role === "admin";
  const nome = member?.full_name || member?.email || "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <h1 className="nx-h1">Configurações</h1>
      <p className="nx-sub">
        Sua conta, o tema deste aparelho e os atalhos para o que se configura no WorkFlowArk
        clássico.
      </p>

      <div className="nx-grid">
        <Card className="c6" title="Sua conta" icon={<UserRound size={16} />}>
          {!member ? (
            <Vazio
              titulo="Cadastro não encontrado"
              texto="A sessão está válida, mas não há registro em workflowark_members para este e-mail."
            />
          ) : (
            <>
              <div className="nxs-pessoa">
                <span className="nxs-av">{iniciais(nome) || "?"}</span>
                <span className="n">
                  <b>{member.full_name || <span className="nx-mute">sem nome no cadastro</span>}</b>
                  <span>{member.email || "sem e-mail"}</span>
                </span>
              </div>
              <div className="nxs-tags">
                <Pill yel>{member.role || "sem papel"}</Pill>
                <Pill cor={member.active === false ? "var(--red)" : "var(--green)"}>
                  {member.active === false ? "inativo" : "ativo"}
                </Pill>
              </div>
              <p className="nxs-p">
                {member.full_name
                  ? "O nome do cadastro é o que liga as tarefas a você (responsável é texto no sistema)."
                  : "Sem nome no cadastro, o Meu Dia mostra as tarefas da equipe inteira. Peça a um admin para preencher."}{" "}
                Papel e nome são alterados por um admin no clássico.
              </p>
            </>
          )}
        </Card>

        <Card className="c6" title="Tema" icon={<Palette size={16} />}>
          <div className="nxs-tema">
            <span className="ic">{claro ? <Sun size={18} /> : <Moon size={18} />}</span>
            <div>
              <b>{claro ? "ARK Soft (claro)" : "ARK Glass (escuro)"} está ativo</b>
              <span>
                O botão de sol e lua no topo troca o tema. A escolha fica guardada neste aparelho;
                na primeira vez ele segue o sistema.
              </span>
            </div>
          </div>
        </Card>

        <Card className="c12" title="Configurações no clássico" icon={<Plug size={16} />}>
          <div className="nxs-links">
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("integracoes")}>
              <Plug size={14} /> Integrações
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("notificacoes")}>
              <Bell size={14} /> Notificações
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("drive")}>
              <FolderOpen size={14} /> Drive
            </button>
            <button type="button" className="nx-btn ghost" onClick={() => abrirApp("marcas")}>
              <Palette size={14} /> Marcas
            </button>
            <a className="nx-btn" href="/app">
              WorkFlowArk clássico
            </a>
          </div>
          <p className="nxs-p">
            Agenda Google, WhatsApp e chaves de IA ficam em Integrações. Preferências de aviso em
            Notificações. Pastas dos clientes em Drive. Identidade de cada cliente em Marcas.
          </p>
        </Card>

        <Card
          className="c12"
          title="Membros"
          icon={<UsersRound size={16} />}
          count={admin ? members.length : undefined}
        >
          {!admin ? (
            <Vazio
              titulo="Sem acesso a este bloco"
              texto="A lista de membros só chega para o papel admin."
            />
          ) : members.length === 0 ? (
            <Vazio titulo="Nenhum membro na leitura" texto="A carga veio sem a lista de membros." />
          ) : (
            <div className="nx-table-wrap">
              <table className="nx-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Papel</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.full_name || <span className="nx-mute">sem nome</span>}
                        {m.id === member?.id && <Pill yel>você</Pill>}
                      </td>
                      <td>{m.email || <span className="nx-mute">sem e-mail</span>}</td>
                      <td>{m.role || <span className="nx-mute">sem papel</span>}</td>
                      <td>
                        {m.active === false ? (
                          <Pill cor="var(--red)">inativo</Pill>
                        ) : (
                          <Pill cor="var(--green)">ativo</Pill>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {admin && (
            <p className="nxs-p">Convidar, trocar papel ou bloquear alguém continua no clássico.</p>
          )}
        </Card>
      </div>
    </>
  );
}
