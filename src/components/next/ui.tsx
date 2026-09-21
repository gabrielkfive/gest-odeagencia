// Pecas visuais do /next. Sem estado de dados aqui: recebem tudo por props.
import { ArrowUpRight, Check } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { STATUS_COR, STATUS_LABEL, dataBR, hojeSP, type Tarefa } from "./dados";

export function Card({
  title,
  icon,
  count,
  action,
  children,
  className = "",
  solid = false,
  id,
}: {
  title?: string;
  icon?: ReactNode;
  count?: number | string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  solid?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={`nx-card ${solid ? "solid" : "glass"} ${className}`}>
      {(title || action) && (
        <header className="nx-card-h">
          {icon && <span style={{ color: "var(--yel)", display: "grid" }}>{icon}</span>}
          {title && <h2 className="nx-h2">{title}</h2>}
          {count !== undefined && <span className="nx-pill">{count}</span>}
          <span className="sp" />
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  unit,
  detail,
  tone,
  onOpen,
  title,
}: {
  label: string;
  value: number | string;
  unit?: string;
  detail?: string;
  tone?: "hot" | "warn" | "ok";
  onOpen?: () => void;
  title?: string;
}) {
  return (
    <div className={`nx-kpi glass ${tone || ""}`} title={title}>
      <span className="l">{label}</span>
      <span className="v">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      {detail && <span className="d">{detail}</span>}
      {onOpen && (
        <button className="go" type="button" onClick={onOpen} aria-label={`Abrir ${label}`}>
          <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}

export function Vazio({ titulo, texto }: { titulo: string; texto?: string }) {
  return (
    <div className="nx-empty">
      <b>{titulo}</b>
      {texto}
    </div>
  );
}

export function Abrir({
  onClick,
  children = "Abrir",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button type="button" className="nx-link" onClick={onClick}>
      {children} <ArrowUpRight size={13} />
    </button>
  );
}

export function Pill({ cor, children, yel }: { cor?: string; children: ReactNode; yel?: boolean }) {
  return (
    <span className={`nx-pill ${yel ? "yel" : ""}`}>
      {cor && <i style={{ background: cor }} />}
      {children}
    </span>
  );
}

// Linha de tarefa: ponto na cor do status, titulo, cliente e prazo. Concluir e opcional
// (grava item unico com `up`; tarefa de projeto nao conclui daqui).
export function TarefaLinha({
  t,
  cliente,
  onConcluir,
  onAbrir,
  mostrarResp,
}: {
  t: Tarefa;
  cliente?: string;
  onConcluir?: (t: Tarefa) => Promise<void>;
  onAbrir?: () => void;
  mostrarResp?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const hoje = hojeSP();
  const atrasada = !!t.data && t.data < hoje && t.status !== "concluido";
  const podeConcluir = !!onConcluir && !String(t.id).startsWith("pj:") && t.status !== "concluido";
  return (
    <div className={`nx-row ${onAbrir ? "clk" : ""}`} onClick={onAbrir}>
      {podeConcluir ? (
        <button
          type="button"
          className={`nx-chk ${busy ? "busy" : ""}`}
          aria-label="Concluir tarefa"
          title="Concluir (grava no Kanban)"
          onClick={async (e) => {
            e.stopPropagation();
            setBusy(true);
            try {
              await onConcluir!(t);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Check size={13} strokeWidth={3} />
        </button>
      ) : (
        <span className="dot" style={{ background: STATUS_COR[t.status || "backlog"] || "#888" }} />
      )}
      <span className="t">
        <b>{t.title || "(sem título)"}</b>
        <span>
          {[cliente, mostrarResp ? t.resp : null, STATUS_LABEL[t.status || ""]]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className={`m ${atrasada ? "late" : ""}`}>{t.data ? dataBR(t.data) : ""}</span>
    </div>
  );
}

export function Skeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="nx-grid" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="nx-skel c3" />
      ))}
      <div className="nx-skel c8" style={{ minHeight: 260 }} />
      <div className="nx-skel c4" style={{ minHeight: 260 }} />
    </div>
  );
}
