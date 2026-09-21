// Areas do /next. Cada uma mora em src/components/next/areas/<area>.tsx e recebe os dados
// pelo useNext(). Area desconhecida cai num aviso, nunca em tela branca.
import { createFileRoute, Link } from "@tanstack/react-router";
import type React from "react";
import { AREAS, useNext } from "@/components/next/contexto";
import { Skeleton } from "@/components/next/ui";
import { Comercial } from "@/components/next/areas/comercial";
import { Clientes } from "@/components/next/areas/clientes";
import { Producao } from "@/components/next/areas/producao";
import { Aprovacoes } from "@/components/next/areas/aprovacoes";
import { Calendario } from "@/components/next/areas/calendario";
import { Financeiro } from "@/components/next/areas/financeiro";
import { Equipe } from "@/components/next/areas/equipe";
import { Relatorios } from "@/components/next/areas/relatorios";
import { Automacoes } from "@/components/next/areas/automacoes";
import { Hermes } from "@/components/next/areas/hermes";
import { Configuracoes } from "@/components/next/areas/configuracoes";

export const Route = createFileRoute("/_authenticated/painel/$area")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { q?: string } =>
    typeof s.q === "string" && s.q ? { q: s.q } : {},
  head: ({ params }) => {
    const a = AREAS.find((x) => x.id === params.area);
    return { meta: [{ title: `${a?.label || "Área"} · WorkFlowArk Next` }] };
  },
  component: Area,
});

const VIEWS: Record<string, () => React.ReactElement> = {
  comercial: Comercial,
  clientes: Clientes,
  producao: Producao,
  aprovacoes: Aprovacoes,
  calendario: Calendario,
  financeiro: Financeiro,
  equipe: Equipe,
  relatorios: Relatorios,
  automacoes: Automacoes,
  hermes: Hermes,
  configuracoes: Configuracoes,
};

function Area() {
  const { area } = Route.useParams();
  const { carga, carregando } = useNext();
  const View = VIEWS[area];
  if (!View) {
    return (
      <div className="nx-alert" role="alert">
        Essa área não existe.{" "}
        <Link to="/painel" className="nx-link">
          Voltar para o Meu Dia
        </Link>
      </div>
    );
  }
  if (carregando && !carga) return <Skeleton />;
  if (!carga) return null;
  return (
    <div className="nx-in" key={area}>
      <View />
    </div>
  );
}
