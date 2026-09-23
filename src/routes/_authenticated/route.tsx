import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { lerEGuardarModo } from "@/lib/modo-agencia";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // guarda o ?agencia= antes do redirect, senão a tela de entrada perde o modo agência
    if (typeof window !== "undefined") lerEGuardarModo(window.location, window.localStorage);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});