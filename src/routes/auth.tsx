import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Lock, Mail, UserRound } from "lucide-react";
import { ArkAppIcon } from "@/components/ui/ark-app-icons";
import { GlassButton, GlassDock, GlassEffect, GlassFilter } from "@/components/ui/liquid-glass";
import { SmokeyBackground } from "@/components/ui/smokey-background";
import { lerEGuardarModo, type Modo } from "@/lib/modo-agencia";
import { corAceita, corSobre, nomeCurto, nomeProduto } from "@/lib/marca-agencia";

// Marca da agencia (white label). O /app grava wfa-brand no localStorage desta mesma origem,
// entao a tela de entrada mostra o logo e o nome de quem esta usando o sistema, nao o da ARK.
type Marca = { name?: string; short?: string; color?: string; logo?: string };
function usarMarca(): Marca {
  const [marca, setMarca] = useState<Marca>({});
  useEffect(() => {
    try {
      const cru = localStorage.getItem("wfa-brand");
      if (cru) setMarca(JSON.parse(cru) || {});
    } catch {
      // navegador sem localStorage (aba privada, cookie bloqueado): fica a marca ARK
    }
  }, []);
  return marca;
}

// Modo agência (23/09/2026): na instância de outra agência (ou na prévia com ?agencia=1) a
// entrada vira white label, sem os textos, números e apps da ARK. Na ARK nada muda.
function usarModo(): Modo | null {
  const [modo, setModo] = useState<Modo | null>(null);
  useEffect(() => {
    setModo(lerEGuardarModo(window.location, window.localStorage));
  }, []);
  return modo;
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrar · WorkFlowArk" }] }),
  component: AuthPage,
});

function AuthPage() {
  const marca = usarMarca();
  const modo = usarModo();
  const agencia = modo === "agencia";
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

  const dock = [
    { icon: <ArkAppIcon name="meudia" />, label: "Meu Dia", href: "/meu-dia" },
    { icon: <ArkAppIcon name="tarefas" />, label: "Tarefas", href: "/app" },
    { icon: <ArkAppIcon name="agenda" />, label: "Agenda", href: "/calendario" },
    { icon: <ArkAppIcon name="propostas" />, label: "Propostas", href: "/propostas" },
    { icon: <ArkAppIcon name="contratos" />, label: "Contratos", href: "/contratos.html" },
    { icon: <ArkAppIcon name="comercial" />, label: "Comercial", href: "/comercial.html" },
  ];

  if (modo === null) return <div className="fixed inset-0 bg-[#0b0b0d]" />;
  if (agencia) {
    return (
      <EntradaAgencia
        marca={marca} mode={mode} setMode={(m) => { setMode(m); setErr(null); setOk(null); }}
        email={email} setEmail={setEmail} password={password} setPassword={setPassword} name={name} setName={setName}
        loading={loading} err={err} ok={ok} submit={submit} forgotPassword={forgotPassword} signInGoogle={signInGoogle}
      />
    );
  }

  return (
    <div className="fixed inset-0 overflow-auto bg-[#0a0a0a] font-[Inter,system-ui,sans-serif] text-white">
      <GlassFilter />
      <SmokeyBackground color="#8A6A00" backdropBlurAmount="sm" className="fixed" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(0,0,0,.15)_0%,rgba(0,0,0,.65)_70%)]" />

      <div className="relative z-10 grid min-h-full grid-cols-1 md:grid-cols-[1.1fr_.9fr]">
        {/* Lado da marca: texto + dock de vidro com os apps da ARK */}
        <div className="flex flex-col justify-center gap-6 px-[8vw] pb-[3vh] pt-[7vh] md:px-[5vw] md:py-[6vh]">
          {modo === null ? null : agencia ? (
            <LadoAgencia marca={marca} />
          ) : (<>
          <div className="flex items-center gap-3">
            <img
              src={marca.logo || "/ark-mark.png"}
              alt={marca.name || "ARK Content"}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/ark-mark.png"; }}
              className="block h-14 w-14 object-contain"
            />
            <span className="text-[17px] font-extrabold tracking-[-.01em] text-white">Ark<sup className="ml-px text-[9px] font-semibold text-[#FFC700] align-super">®</sup> Content</span>
          </div>
          <h1 className="m-0 max-w-[14ch] text-[clamp(26px,3.4vw,46px)] font-extrabold leading-[1.08] tracking-[-.02em]">
            Seja bem-vindo ao centro de comando da <span className="text-[#FFC700]">maior agência de marketing do Brasil</span>.
          </h1>
          <p className="m-0 max-w-[34ch] border-l-[3px] border-[#FFC700] pl-3.5 text-[clamp(14px,1.3vw,18px)] leading-normal text-[#d4d0c4]">
            Trabalhar na Ark® não é brincadeira. É método, ritmo e resultado, todo santo dia.
          </p>

          <div className="mt-2 flex flex-col items-start gap-4">
            <div className="max-w-full">
              <GlassDock items={dock} />
            </div>
            <GlassButton onClick={() => document.getElementById("floating_email")?.focus()}>
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <span>
                  {marca.name ? (
                    "Entrar em " + marca.name
                  ) : (
                    <>
                      Entrar no WorkFlowArk<sup className="ml-px text-[8px] align-super">®</sup>
                    </>
                  )}
                </span>
                <ArrowRight size={16} />
              </div>
            </GlassButton>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Quem entra aqui e a equipe, entao o selo fala de quem a ARK e, nao de
                recorte interno de carteira. Carteira ativa (27) sai do painel de KPIs da
                pagina Clientes, conferida em 30/08/2026. Posicionamento e metodo vem de
                "A Agencia ARK" e "Metodo dos 5 Eixos". */}
            {["+500 clientes atendidos", "27 clientes ativos", "Especialistas em gastronomia", "Método dos 5 Eixos"].map((t) => (
              <span key={t} className="rounded-full border border-[#FFC700]/25 bg-[#FFC700]/10 px-2.5 py-1 font-mono text-[10.5px] text-[#FFC700]">
                {t}
              </span>
            ))}
          </div>
          </>)}
        </div>

        {/* Cartao de vidro com o formulario */}
        <div className="flex items-center justify-center px-[8vw] pb-[8vh] md:px-[4vw] md:py-[5vh]">
          <GlassEffect className="w-full max-w-[400px] rounded-3xl">
            <div className="space-y-6 p-7">
              <div className="text-center">
                {agencia && !marca.logo ? (
                  <MonogramaNeutro className="mx-auto mb-3" />
                ) : (
                  <img
                    src={marca.logo || "/ark-logo.png"}
                    alt={marca.name || (agencia ? "WorkFlowArk" : "ARK Content")}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/ark-logo.png"; }}
                    className="mx-auto mb-3 block h-14 w-14 rounded-2xl object-contain"
                  />
                )}
                <h2 className="text-2xl font-extrabold tracking-[-.02em] text-white">
                  {marca.name || (
                    <>
                      WorkFlowArk<sup className="ml-px text-[10px] font-semibold text-[#FFC700] align-super">®</sup>
                    </>
                  )}
                </h2>
                <p className="mt-1 text-xs text-white/60">
                  {agencia ? "A gestão da sua agência num lugar só" : "Sistema operacional da Ark® Content"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/10 p-1">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMode(m); setErr(null); setOk(null); }}
                    className={
                      "rounded-lg py-2 text-[13px] font-bold transition-colors " +
                      (mode === m ? "bg-[#0a0a0a] text-[#FFC700]" : "text-white/60 hover:text-white")
                    }
                  >
                    {m === "signin" ? "Entrar" : agencia ? "Criar acesso" : "Criar conta"}
                  </button>
                ))}
              </div>

              <form className="space-y-7" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                {mode === "signup" && (
                  <Field id="floating_name" type="text" value={name} onChange={setName} label="Nome completo" icon={<UserRound size={15} />} autoComplete="name" />
                )}
                <Field id="floating_email" type="email" value={email} onChange={setEmail} label="E-mail" icon={<Mail size={15} />} autoComplete="email" />
                <Field
                  id="floating_password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  label={mode === "signup" ? "Senha (mínimo 6 caracteres)" : "Senha"}
                  icon={<Lock size={15} />}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />

                {err && <div className="rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2.5 text-[12.5px] leading-snug text-red-100">{err}</div>}
                {ok && <div className="rounded-lg border border-[#FFC700]/50 bg-[#FFC700]/15 px-3 py-2.5 text-[12.5px] leading-snug text-[#FFE680]">{ok}</div>}

                {mode === "signin" && (
                  <div className="-mt-3 flex items-center justify-between">
                    <button type="button" onClick={forgotPassword} disabled={loading} className="text-xs text-white/60 transition hover:text-white disabled:opacity-50">
                      Esqueci minha senha
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group flex w-full items-center justify-center rounded-lg bg-[#FFC700] px-4 py-3 text-sm font-extrabold text-[#0a0a0a] transition-all duration-300 hover:bg-[#ffd53d] focus:outline-none focus:ring-2 focus:ring-[#FFC700] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60"
                >
                  {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
                  {!loading && <ArrowRight className="ml-2 h-5 w-5 transform transition-transform group-hover:translate-x-1" />}
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-white/20" />
                  <span className="mx-4 flex-shrink text-[11px] uppercase tracking-wider text-white/50">ou continue com</span>
                  <div className="flex-grow border-t border-white/20" />
                </div>

                <button
                  type="button"
                  onClick={signInGoogle}
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-lg bg-white/90 px-4 py-2.5 text-sm font-semibold text-gray-800 transition-all duration-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFC700] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-60"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"/><path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"/>
                  </svg>
                  Entrar com Google
                </button>
              </form>

              {agencia ? (
                <p className="text-center text-[10.5px] leading-snug text-white/50">
                  {mode === "signup"
                    ? "Teste de 30 dias. O primeiro acesso da agência vira o administrador; quem vem depois espera a liberação em Configurações, Equipe."
                    : "Acesso da sua agência. Criou o acesso ou entrou com Google? Você já está dentro."}
                </p>
              ) : (
                <p className="text-center text-[10.5px] leading-snug text-white/50">
                  Acesso da equipe Ark®. Criou a conta ou entrou com Google? Você já está dentro.
                </p>
              )}

              {/* Exigencia do Google pra tela de login com a conta Google: os dois documentos
                  precisam estar visiveis e clicaveis aqui, nao so no rodape da landing. */}
              <p className="text-center text-[10.5px] leading-snug text-white/50">
                Ao entrar você aceita os{" "}
                <a href="/termos" target="_blank" rel="noreferrer" className="text-[#FFC700]/80 underline underline-offset-2 hover:text-[#FFC700]">
                  Termos de Uso
                </a>{" "}
                e a{" "}
                <a href="/privacidade" target="_blank" rel="noreferrer" className="text-[#FFC700]/80 underline underline-offset-2 hover:text-[#FFC700]">
                  Política de Privacidade
                </a>
                .
              </p>
            </div>
          </GlassEffect>
        </div>
      </div>
    </div>
  );
}

// Entrada da instância de outra agência (23/09/2026, pedido do Gabriel: "se for a agência do Zé
// vai ser WorkFlowZé"). Nome do produto, logo e cor vêm da agência; nada da ARK aparece aqui.
type EntradaProps = {
  marca: Marca; mode: "signin" | "signup"; setMode: (m: "signin" | "signup") => void;
  email: string; setEmail: (v: string) => void; password: string; setPassword: (v: string) => void;
  name: string; setName: (v: string) => void; loading: boolean; err: string | null; ok: string | null;
  submit: () => void; forgotPassword: () => void; signInGoogle: () => void;
};
function EntradaAgencia(p: EntradaProps) {
  const cor = p.marca.color && corAceita(p.marca.color) ? p.marca.color : "#FFC700";
  const produto = nomeProduto(p.marca);
  const agencia = (p.marca.name || "").trim();
  const inicial = (nomeCurto(p.marca) || "W").charAt(0);
  const registrado = produto === "WorkFlowArk";
  useEffect(() => {
    document.title = (p.mode === "signin" ? "Entrar · " : "Criar acesso · ") + produto;
  }, [produto, p.mode]);
  const vars = { "--acc": cor, "--on": corSobre(cor) } as CSSProperties;
  const logo = p.marca.logo ? (
    <img src={p.marca.logo} alt={agencia || produto} className="block h-12 w-12 rounded-2xl object-contain" />
  ) : (
    <div aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--acc)] text-2xl font-extrabold text-[var(--on)]">
      {inicial}
    </div>
  );
  return (
    <div data-agx="entrada" style={vars} className="fixed inset-0 overflow-auto bg-[#0b0b0d] font-[Inter,system-ui,sans-serif] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-[.18] [background:radial-gradient(60%_50%_at_15%_10%,var(--acc)_0%,transparent_70%)]" />
      <div className="relative z-10 mx-auto grid min-h-full max-w-[1120px] grid-cols-1 items-center gap-10 px-6 py-10 md:grid-cols-[1.05fr_.95fr] md:px-10">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-3.5">
            {logo}
            <div className="leading-tight">
              <div className="text-[19px] font-extrabold tracking-[-.01em]" data-agx="produto">
                {produto}
                {registrado && <sup className="ml-px text-[.45em] font-semibold text-[var(--acc)] align-super">®</sup>}
              </div>
              {agencia && <div className="text-[13px] text-white/55">{agencia}</div>}
            </div>
          </div>
          <div>
            <h1 className="m-0 max-w-[15ch] text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.04] tracking-[-.03em]">
              {p.mode === "signin" ? "Bom te ver de novo." : "Crie o acesso da sua agência."}
            </h1>
            <p className="mt-4 max-w-[38ch] text-[clamp(15px,1.35vw,18px)] leading-relaxed text-white/60">
              Clientes, tarefas, aprovação e financeiro da sua agência no mesmo fluxo.
            </p>
          </div>
        </div>

        <div className="w-full max-w-[420px] justify-self-center md:justify-self-end">
          <div className="rounded-3xl border border-white/10 bg-[#141417]/90 p-7 shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-white/[.06] p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => p.setMode(m)}
                  className={"rounded-lg py-2 text-[13px] font-bold transition-colors " + (p.mode === m ? "bg-white/[.12] text-white" : "text-white/50 hover:text-white")}
                >
                  {m === "signin" ? "Entrar" : "Criar acesso"}
                </button>
              ))}
            </div>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); p.submit(); }}>
              {p.mode === "signup" && (
                <CampoAg id="floating_name" type="text" label="Seu nome" value={p.name} onChange={p.setName} autoComplete="name" />
              )}
              <CampoAg id="floating_email" type="email" label="E-mail" value={p.email} onChange={p.setEmail} autoComplete="email" />
              <CampoAg
                id="floating_password"
                type="password"
                label={p.mode === "signup" ? "Senha (mínimo 6 caracteres)" : "Senha"}
                value={p.password}
                onChange={p.setPassword}
                autoComplete={p.mode === "signup" ? "new-password" : "current-password"}
              />
              {p.err && <div className="rounded-lg border border-red-300/30 bg-red-500/15 px-3 py-2.5 text-[12.5px] leading-snug text-red-100">{p.err}</div>}
              {p.ok && <div className="rounded-lg border border-white/15 bg-white/[.06] px-3 py-2.5 text-[12.5px] leading-snug text-white/85">{p.ok}</div>}
              {p.mode === "signin" && (
                <button type="button" onClick={p.forgotPassword} disabled={p.loading} className="text-xs text-white/50 transition hover:text-white disabled:opacity-50">
                  Esqueci minha senha
                </button>
              )}
              <button
                type="submit"
                disabled={p.loading}
                className="group flex w-full items-center justify-center rounded-xl bg-[var(--acc)] px-4 py-3 text-sm font-extrabold text-[var(--on)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--acc)] focus:ring-offset-2 focus:ring-offset-[#141417] disabled:opacity-60"
              >
                {p.loading ? "Aguarde…" : p.mode === "signin" ? "Entrar" : "Criar acesso"}
                {!p.loading && <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
              </button>
              <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-white/35">
                <div className="h-px flex-1 bg-white/10" />ou<div className="h-px flex-1 bg-white/10" />
              </div>
              <button
                type="button"
                onClick={p.signInGoogle}
                disabled={p.loading}
                className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[.08] disabled:opacity-60"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.802 8.841C34.553 4.806 29.613 2.5 24 2.5C11.983 2.5 2.5 11.983 2.5 24s9.483 21.5 21.5 21.5S45.5 36.017 45.5 24c0-1.538-.135-3.022-.389-4.417z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12.5 24 12.5c3.059 0 5.842 1.154 7.961 3.039l5.839-5.841C34.553 4.806 29.613 2.5 24 2.5C16.318 2.5 9.642 6.723 6.306 14.691z"/><path fill="#4CAF50" d="M24 45.5c5.613 0 10.553-2.306 14.802-6.341l-5.839-5.841C30.842 35.846 27.059 38 24 38c-5.039 0-9.345-2.608-11.124-6.481l-6.571 4.819C9.642 41.277 16.318 45.5 24 45.5z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l5.839 5.841C44.196 35.123 45.5 29.837 45.5 24c0-1.538-.135-3.022-.389-4.417z"/>
                </svg>
                Entrar com Google
              </button>
            </form>
            <p className="mt-5 text-center text-[11px] leading-snug text-white/40">
              {p.mode === "signup"
                ? "Teste grátis de 30 dias. O primeiro acesso vira o administrador da agência."
                : "Recebeu um convite? Entre com o e-mail em que ele chegou."}
            </p>
            <p className="mt-2 text-center text-[11px] leading-snug text-white/40">
              Ao entrar você aceita os{" "}
              <a href="/termos" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">Termos de Uso</a> e a{" "}
              <a href="/privacidade" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">Política de Privacidade</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CampoAg({ id, type, label, value, onChange, autoComplete }: {
  id: string; type: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-semibold text-white/55">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className="block w-full rounded-xl border border-white/10 bg-white/[.05] px-3.5 py-2.5 text-[15px] text-white outline-none transition focus:border-[var(--acc)] focus:bg-white/[.07]"
      />
    </div>
  );
}

// Lado esquerdo da entrada no modo agência: só a marca da agência e o que o sistema faz.
// Nada de número, cliente ou app da ARK.
function LadoAgencia({ marca }: { marca: Marca }) {
  return (
    <>
      <div className="flex items-center gap-3" data-agx="entrada">
        {marca.logo ? (
          <img src={marca.logo} alt={marca.name || "Agência"} className="block h-14 w-14 object-contain" />
        ) : (
          <MonogramaNeutro />
        )}
        <span className="text-[17px] font-extrabold tracking-[-.01em] text-white">
          {marca.name || (
            <>
              WorkFlowArk<sup className="ml-px text-[9px] font-semibold text-[#FFC700] align-super">®</sup>
            </>
          )}
        </span>
      </div>
      <h1 className="m-0 max-w-[16ch] text-[clamp(26px,3.4vw,46px)] font-extrabold leading-[1.08] tracking-[-.02em]">
        Entre no WorkFlowArk<sup className="ml-px text-[.4em] font-semibold text-[#FFC700] align-super">®</sup> da{" "}
        <span className="text-[#FFC700]">sua agência</span>.
      </h1>
      <p className="m-0 max-w-[36ch] border-l-[3px] border-[#FFC700] pl-3.5 text-[clamp(14px,1.3vw,18px)] leading-normal text-[#d4d0c4]">
        Clientes, tarefas, aprovação e financeiro no mesmo fluxo. No primeiro acesso, o sistema mostra onde fica cada coisa.
      </p>
      <div className="mt-2 flex flex-col items-start gap-4">
        <GlassButton onClick={() => document.getElementById("floating_email")?.focus()}>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>{marca.name ? "Entrar em " + marca.name : "Entrar"}</span>
            <ArrowRight size={16} />
          </div>
        </GlassButton>
      </div>
    </>
  );
}

// Marca neutra quando a agência ainda não enviou o logo: um W em vez do símbolo da ARK.
function MonogramaNeutro({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={"flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-extrabold text-[#FFC700] " + className}
    >
      W
    </div>
  );
}

// Campo com rotulo flutuante (padrao do Login Form do 21st), na paleta da ARK.
// Fica fora do AuthPage pra nao ser recriado a cada render (perderia o foco ao digitar).
function Field({ id, type, value, onChange, label, icon, autoComplete }: {
  id: string; type: string; value: string; onChange: (v: string) => void; label: string; icon: ReactNode; autoComplete: string;
}) {
  return (
    <div className="relative z-0">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        required
        className="peer block w-full appearance-none border-0 border-b-2 border-white/30 bg-transparent px-0 py-2.5 text-[15px] text-white focus:border-[#FFC700] focus:outline-none focus:ring-0"
      />
      <label
        htmlFor={id}
        className="absolute top-3 -z-10 origin-[0] -translate-y-6 scale-75 transform text-sm text-white/60 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:left-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-[#FFC700]"
      >
        <span className="-mt-1 mr-2 inline-block align-middle">{icon}</span>
        {label}
      </label>
    </div>
  );
}
