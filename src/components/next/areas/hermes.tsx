// Area Hermes do /next. Placeholder ate o lote desta area.
import { useNext } from "@/components/next/contexto";
import { Card, Vazio } from "@/components/next/ui";

export function Hermes() {
  const { abrirApp } = useNext();
  return (
    <>
      <h1 className="nx-h1">Hermes</h1>
      <p className="nx-sub">Esta área ainda está sendo montada no Next. O fluxo completo continua no WorkFlowArk clássico.</p>
      <Card title="Em construção">
        <Vazio titulo="Ainda sem painel aqui" />
        <button type="button" className="nx-btn ghost" onClick={() => abrirApp("dashboard")}>Abrir no clássico</button>
      </Card>
    </>
  );
}
