import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/paginas")({
  head: () => ({ meta: [{ title: "Páginas no ar · ARK Content" }] }),
  component: PaginasPage,
});

function PaginasPage() {
  useEffect(() => {
    window.location.replace("/paginas.html");
  }, []);
  return null;
}
