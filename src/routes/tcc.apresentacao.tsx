import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/tcc/apresentacao")({
  component: TccPresentationPage,
});

function TccPresentationPage() {
  useEffect(() => {
    window.location.replace("/tcc/apresentacao.html");
  }, []);
  return null;
}
