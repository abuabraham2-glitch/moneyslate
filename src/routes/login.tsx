import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!loading && session) nav({ to: "/dashboard" });
  }, [session, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      }
    } catch (e: any) {
      toast.error(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary/95 to-primary p-12 text-primary-foreground">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="h-6 w-6" /> Finance OS
        </div>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            Run your brokerage's books like a modern company.
          </h1>
          <p className="mt-4 text-primary-foreground/80 max-w-md">
            Invoices, POs, bills, expenses, and AI-assisted bank reconciliation — all in one focused workspace.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/70">© {new Date().getFullYear()} Finance OS</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5 text-primary" /> Finance OS
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Sign in" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Welcome back. Enter your credentials." : "Set up your single-user workspace."}
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
          >
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
