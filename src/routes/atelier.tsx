import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/atelier")({
  component: AtelierLoginPage,
  beforeLoad: async () => {
    if (import.meta.env.SSR) return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/admin" });
  },
  head: () => ({ meta: [{ title: "Atelier — Bos' Kọ́nà" }] }),
});

function AtelierLoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const fn =
        mode === "signin"
          ? supabase.auth.signInWithPassword({ email, password })
          : supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: window.location.origin + "/admin" },
            });
      const { error } = await fn;
      if (error) throw error;
      toast.success(mode === "signin" ? "Welcome back" : "Account created — check your email");
      if (mode === "signin") {
        window.location.assign("/admin");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 text-foreground grain flex items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
      >
        <Link to="/" className="font-mono text-[10px] uppercase tracking-[0.3em] text-bronze">
          ← Bos' Kọ́nà
        </Link>
        <h1 className="mt-4 font-serif text-3xl leading-tight">Atelier admin</h1>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {mode === "signin" ? "Sign in to manage the narrative" : "Create your admin account"}
        </p>
        <form onSubmit={handle} className="mt-6 space-y-3">
          <input
            type="email"
            required
            placeholder="email@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-3 text-sm outline-none focus:border-bronze/50"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="password (8+ chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-stone-900 px-3 py-3 text-sm outline-none focus:border-bronze/50"
          />
          <button
            disabled={busy}
            className="h-12 w-full rounded-lg bg-bronze font-bold text-stone-950 disabled:opacity-60"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-center font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-bronze"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </motion.div>
    </div>
  );
}
