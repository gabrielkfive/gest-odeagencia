import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar · WorkFlowArk" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
    });
  }, [navigate]);

  // Após autenticar, confere se o acesso já foi liberado pelo gestor.
  const checkAndEnter = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setErr("Não foi possível iniciar a sessão. Tente novamente.");
      return;
    }
    const r = await fetch("/api/workflowark/state", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      navigate({ to: "/app" });
      return;
    }
    const j = await r.json().catch(() => ({}) as { error?: string });
    await supabase.auth.signOut();
    setOk(null);
    setErr(j?.error || "Seu acesso ainda não foi liberado pelo gestor.");
  };

  const signIn = async () => {
    setLoading(true); setErr(null); setOk(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      setErr(
        /confirm/i.test(error.message)
          ? "Conta ainda não confirmada. Crie a conta novamente ou fale com o gestor."
          : "E-mail ou senha incorretos.",
      );
      return;
    }
    await checkAndEnter();
    setLoading(false);
  };

  const signUp = async () => {
    setLoading(true); setErr(null); setOk(null);
    try {
      const resp = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, full_name: name.trim() }),
      });
      const j = await resp.json().catch(() => ({}) as { error?: string; pending?: boolean });
      if (!resp.ok) {
        setLoading(false);
        setErr(j?.error || "Não foi possível criar a conta.");
        return;
      }
      if (j?.pending) {
        setLoading(false);
        setMode("signin");
        setPassword("");
        setOk(
          `Conta criada com sucesso, ${name.trim() || "bem-vindo"}! Seu acesso está aguardando a liberação do gestor. Assim que ele liberar, é só entrar.`,
        );
        return;
      }
      // Primeiro usuário (admin) — entra direto.
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setLoading(false);
        setMode("signin");
        setOk("Conta criada! Agora é só entrar.");
        return;
      }
      await checkAndEnter();
      setLoading(false);
    } catch {
      setLoading(false);
      setErr("Falha de conexão. Tente novamente.");
    }
  };

  const signInGoogle = async () => {
    setErr(null); setOk(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/app" },
    });
    if (error) setErr(error.message);
  };

  const submit = () => (mode === "signin" ? signIn() : signUp());

  const forgotPassword = async () => {
    if (!email.trim()) { setErr("Digite seu e-mail acima para receber o link de recuperação."); return; }
    setLoading(true); setErr(null); setOk(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) setErr("Não foi possível enviar o e-mail. Tente novamente.");
    else setOk("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
  };

  return (
    <div className="ax-wrap">
      <style>{CSS}</style>

      <div className="ax-brand">
        <div className="ax-logo">
          <img src="/ark-mark.png" alt="ARK Content" className="ax-logo-img" />
          <span className="ax-logo-sub">ARK CONTENT</span>
        </div>
        <h1 className="ax-h1">
          Seja bem-vindo ao centro de comando da <span className="hl">maior agência de marketing do Brasil</span>.
        </h1>
        <p className="ax-quote">
          Trabalhar na ARK não é brincadeira. É método, ritmo e resultado, todo santo dia.
        </p>
        <div className="ax-badges">
          {/* Numeros vindos do painel de KPIs da propria carteira (pagina Clientes),
              conferidos em 30/08/2026: carteira ativa 27, sendo 15 ARK e 11 Alpha,
              e 11 captacoes por mes. Quando a carteira mudar, e so olhar la e atualizar aqui. */}
          <span>27 clientes ativos</span>
          <span>15 ARK Direto · 11 Squad Alpha</span>
          <span>11 captações por mês</span>
        </div>
      </div>

      <div className="ax-card-shell">
        <div className="ax-card">
          <div className="ax-card-head">
            <img src="/ark-logo.png" alt="ARK Content" className="ax-card-logo" />
            <div className="ax-card-title">WorkFlowArk</div>
            <div className="ax-card-sb">Sistema operacional da ARK Content</div>
          </div>

          <div className="ax-tabs">
            <button
              className={"ax-tab" + (mode === "signin" ? " on" : "")}
              onClick={() => { setMode("signin"); setErr(null); setOk(null); }}
            >Entrar</button>
            <button
              className={"ax-tab" + (mode === "signup" ? " on" : "")}
              onClick={() => { setMode("signup"); setErr(null); setOk(null); }}
            >Criar conta</button>
          </div>

          <div className="ax-form">
            {mode === "signup" && (
              <div className="ax-fi">
                <label>Nome completo</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Gabriel Andrade"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="ax-fi">
              <label>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="voce@arkcontent.com"
                autoComplete="email"
              />
            </div>
            <div className="ax-fi">
              <label>Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "••••••••"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            {err && <div className="ax-msg err">{err}</div>}
            {ok && <div className="ax-msg ok">{ok}</div>}

            <button className="ax-btn" onClick={submit} disabled={loading}>
              {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
            </button>

            {mode === "signin" && (
              <button type="button" className="ax-forgot" onClick={forgotPassword} disabled={loading}>
                Esqueci minha senha
              </button>
            )}

            <div className="ax-or"><span>ou</span></div>

            <button className="ax-btn ghost" onClick={signInGoogle} disabled={loading}>
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="#FFC700" d="M21.35 11.1H12v3.2h5.35c-.25 1.5-1.7 4.4-5.35 4.4a5.7 5.7 0 110-11.4c1.6 0 2.7.7 3.3 1.3l2.25-2.2A8.9 8.9 0 0012 3a9 9 0 100 18c5.2 0 8.65-3.65 8.65-8.8 0-.6-.06-1.05-.15-1.5z"/>
              </svg>
              Entrar com Google
            </button>
          </div>

          <div className="ax-foot">
            Acesso restrito à equipe ARK · novos cadastros passam por liberação do gestor.
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.ax-wrap{position:fixed;inset:0;background:#0a0a0a;color:#fff;display:grid;grid-template-columns:1.1fr .9fr;font-family:'Inter',system-ui,sans-serif;overflow:auto}
.ax-wrap *{box-sizing:border-box}
.ax-brand{padding:6vh 5vw;display:flex;flex-direction:column;justify-content:center;gap:22px;background:radial-gradient(120% 90% at 0% 0%,#1a1a1a 0%,#0a0a0a 60%)}
.ax-logo{display:flex;align-items:center;gap:12px}
.ax-logo-img{height:56px;width:56px;object-fit:contain;display:block}
.ax-logo-mark{font-weight:900;font-size:26px;letter-spacing:-.02em;color:#FFC700}
.ax-logo-sub{font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.35em;color:#FFC700}
.ax-card-logo{height:58px;width:58px;object-fit:contain;display:block;margin:0 auto 12px;border-radius:14px}
.ax-h1{font-size:clamp(26px,3.4vw,46px);line-height:1.08;font-weight:800;letter-spacing:-.02em;margin:0;max-width:14ch}
.ax-h1 .hl{color:#FFC700}
.ax-quote{font-size:clamp(14px,1.3vw,18px);color:#d4d0c4;margin:0;max-width:34ch;line-height:1.5;border-left:3px solid #FFC700;padding-left:14px}
.ax-badges{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.ax-badges span{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#FFC700;background:rgba(255,199,0,.08);border:1px solid rgba(255,199,0,.25);padding:5px 10px;border-radius:20px}
.ax-card-shell{display:flex;align-items:center;justify-content:center;padding:5vh 4vw}
.ax-card{width:100%;max-width:380px;background:#fff;color:#0a0a0a;border:2px solid #FFC700;border-radius:18px;padding:26px 24px;box-shadow:0 24px 70px rgba(0,0,0,.55),0 0 0 6px rgba(255,199,0,.08)}
.ax-card-head{text-align:center;margin-bottom:18px}
.ax-card-title{font-size:20px;font-weight:800;letter-spacing:-.02em}
.ax-card-sb{font-size:11.5px;color:#737373;margin-top:2px}
.ax-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:#f4f2ec;border-radius:10px;padding:4px;margin-bottom:18px}
.ax-tab{border:none;background:none;padding:9px;border-radius:7px;font-size:13px;font-weight:700;color:#737373;cursor:pointer;font-family:inherit}
.ax-tab.on{background:#0a0a0a;color:#FFC700}
.ax-form{display:flex;flex-direction:column;gap:12px}
.ax-fi{display:flex;flex-direction:column;gap:5px}
.ax-fi label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#1a1a1a}
.ax-fi input{padding:11px 12px;border:1px solid #e2e0d8;border-radius:9px;font-size:14px;color:#0a0a0a;outline:none;transition:border-color .12s,box-shadow .12s;font-family:inherit}
.ax-fi input:focus{border-color:#FFC700;box-shadow:0 0 0 3px rgba(255,199,0,.25)}
.ax-msg{font-size:12.5px;padding:10px 12px;border-radius:9px;line-height:1.4}
.ax-msg.err{background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5}
.ax-msg.ok{background:#fffbeb;color:#854d0e;border:1px solid #FFC700}
.ax-btn{margin-top:4px;padding:12px;border:none;border-radius:10px;background:#0a0a0a;color:#FFC700;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .06s,opacity .12s}
.ax-btn:hover{transform:translateY(-1px)}
.ax-btn:disabled{opacity:.6;cursor:default;transform:none}
.ax-btn.ghost{background:#fff;color:#0a0a0a;border:1px solid #e2e0d8}
.ax-or{display:flex;align-items:center;gap:10px;color:#a3a3a3;font-size:11px;margin:2px 0}
.ax-or::before,.ax-or::after{content:"";flex:1;height:1px;background:#e8e6e0}
.ax-forgot{background:none;border:none;color:#737373;font-size:12px;cursor:pointer;font-family:inherit;padding:0;text-decoration:underline;text-underline-offset:2px;align-self:center;margin-top:-4px}
.ax-forgot:hover{color:#0a0a0a}
.ax-forgot:disabled{opacity:.5;cursor:default}
.ax-foot{margin-top:16px;font-size:10.5px;color:#a3a3a3;text-align:center;line-height:1.45}
@media(max-width:860px){
  .ax-wrap{grid-template-columns:1fr;grid-template-rows:auto 1fr}
  .ax-brand{padding:7vh 8vw 3vh}
  .ax-h1{max-width:none}
  .ax-card-shell{padding:0 8vw 8vh}
}
`;
