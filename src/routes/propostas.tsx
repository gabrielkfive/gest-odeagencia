import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/propostas")({
  head: () => ({ meta: [{ title: "Gerador de Propostas · ARK Content" }] }),
  component: PropostasPage,
});

function PropostasPage() {
  useEffect(() => {
    window.location.replace("/propostas.html");
  }, []);
  return null;
}
