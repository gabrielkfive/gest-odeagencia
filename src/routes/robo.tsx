import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

// Painel do robô comercial (SDR). Mostra só dado NÃO sensível (vem de ?health=1):
// status do canal, robô ligado, contadores. O controle é pelo WhatsApp do Gabriel.
export const Route = createFileRoute("/robo")({
  head: () => ({ meta: [{ title: "Robô Comercial · ARK Content" }] }),
  component: RoboPage,
});

type Health = {
  ok: boolean;
  canal: string;
  webhookSecretConfigurado: boolean;
  sdrLigado: boolean;
  ultimaEntradaMin: number | null;
  respostasEnviadas: number;
  leads: number;
};

function RoboPage() {
  const [h, setH] = useState<Health | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    const carrega = async () => {
      try {
        const r = await fetch("/api/workflowark/sdr?health=1");
        const j = await r.json();
        if (vivo) { setH(j); setErro(""); }
      } catch {
        if (vivo) setErro("Não consegui falar com o servidor.");
      }
    };
    carrega();
    const t = setInterval(carrega, 30000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const canalOk = h?.canal === "open";
  const webhookOk = !!h?.webhookSecretConfigurado;
  const entradaTxt =
    h?.ultimaEntradaMin == null
      ? "nenhuma mensagem registrada ainda"
      : h.ultimaEntradaMin < 60
        ? `há ${h.ultimaEntradaMin} min`
        : `há ${Math.round(h.ultimaEntradaMin / 60)} h`;

  const Item = ({ ok, titulo, detalhe }: { ok: boolean; titulo: string; detalhe: string }) => (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", background: "#141414", borderRadius: 14, border: "1px solid #222" }}>
      <span style={{ fontSize: 20 }}>{ok ? "✅" : "⛔"}</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{titulo}</div>
        <div style={{ color: "#a3a3a3", fontSize: 12.5, marginTop: 2, lineHeight: 1.5 }}>{detalhe}</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "system-ui,-apple-system,sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ color: "#ffd400", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", fontSize: 12 }}>ARK · Comercial</div>
        <h1 style={{ fontSize: 26, margin: "0 0 4px" }}>Robô Comercial (SDR)</h1>
        <p style={{ color: "#a3a3a3", fontSize: 14, margin: "0 0 16px", lineHeight: 1.6 }}>
          Lead que chega no WhatsApp por anúncio recebe resposta na hora, é qualificado e entra
          sozinho no funil da página Comercial. Quando o lead topa reunião, o Gabriel é avisado.
        </p>

        {erro && <div style={{ color: "#ff6b6b", fontSize: 14 }}>{erro}</div>}
        {!h && !erro && <div style={{ color: "#a3a3a3" }}>Carregando…</div>}

        {h && (
          <>
            <Item ok={h.sdrLigado} titulo={h.sdrLigado ? "Robô LIGADO" : "Robô DESLIGADO"} detalhe={h.sdrLigado ? "Respondendo leads novos automaticamente." : 'Mande "robo on" no seu WhatsApp para ligar.'} />
            <Item ok={canalOk} titulo={canalOk ? "WhatsApp conectado" : "WhatsApp fora do ar"} detalhe={canalOk ? `Última mensagem recebida: ${entradaTxt}.` : `Canal: ${h.canal}. Abra /api/workflowark/whatsapp/qr para reconectar.`} />
            <Item ok={webhookOk} titulo={webhookOk ? "Recebimento protegido e ativo" : "Recebimento BLOQUEADO"} detalhe={webhookOk ? "O webhook exige o token secreto (fechado desde 20/08)." : "Falta configurar o WEBHOOK_SECRET no servidor. Enquanto isso, NENHUMA mensagem entra no sistema. Avise o Claude."} />

            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <div style={{ flex: 1, padding: "16px", background: "#141414", borderRadius: 14, border: "1px solid #222", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#ffd400" }}>{h.leads}</div>
                <div style={{ fontSize: 12, color: "#a3a3a3" }}>leads captados</div>
              </div>
              <div style={{ flex: 1, padding: "16px", background: "#141414", borderRadius: 14, border: "1px solid #222", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#19d36b" }}>{h.respostasEnviadas}</div>
                <div style={{ fontSize: 12, color: "#a3a3a3" }}>respostas enviadas</div>
              </div>
            </div>
          </>
        )}

        <div style={{ marginTop: 16, padding: "16px", background: "#141414", borderRadius: 14, border: "1px solid #222" }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>Controles (no SEU WhatsApp, em qualquer conversa sua)</div>
          <div style={{ fontFamily: "ui-monospace,monospace", fontSize: 13, color: "#e5e5e5", lineHeight: 2 }}>
            robo status · como está tudo<br />
            robo off · desliga tudo<br />
            robo on · liga de novo<br />
            robo off 5561999998888 · robô sai daquela conversa<br />
            robo on 5561999998888 · robô volta pra conversa
          </div>
          <div style={{ color: "#a3a3a3", fontSize: 12.5, marginTop: 10, lineHeight: 1.5 }}>
            Respondeu um lead na mão? O robô sai daquela conversa sozinho e ela fica com você.
          </div>
        </div>
      </div>
    </div>
  );
}
