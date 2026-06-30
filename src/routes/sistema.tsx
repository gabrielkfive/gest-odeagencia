import { createFileRoute, redirect } from "@tanstack/react-router";

// SEGURANÇA: /sistema servia o sistema inteiro (iframe do workflowark.html) SEM login.
// A entrada correta é /app (autenticada, repassa o token via postMessage). Aqui só
// redirecionamos pra lá — quem não estiver logado cai na tela de login do /app.
export const Route = createFileRoute("/sistema")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});