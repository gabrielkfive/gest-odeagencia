import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sistema")({
  head: () => ({ meta: [{ title: "Sistema legado · WorkFlowArk" }] }),
  component: () => (
    <iframe
      src="/workflowark.html"
      title="WorkFlowArk"
      style={{ border: 0, width: "100vw", height: "100vh", display: "block" }}
    />
  ),
});