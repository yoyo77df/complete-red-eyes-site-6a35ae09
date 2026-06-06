import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Gamepad2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const { user, loading } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { username } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Welcome.");
    navigate({ to: "/dashboard" });
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reset link sent to your email.");
    setMode("login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="h-14 w-14 rounded-xl object-cover btn-glow" />
          ) : settings === null ? (
            <div className="h-14 w-14 rounded-xl bg-card animate-pulse" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary btn-glow">
              <Gamepad2 className="h-7 w-7 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold gradient-text">{settings?.site_title ?? ""}</h1>
          <p className="text-center text-sm text-muted-foreground"># WE WANT DOMINATIONS.</p>
        </div>

        {mode === "forgot" ? (
          <form onSubmit={handleForgot} className="space-y-4">
            <h2 className="text-lg font-semibold">Reset password</h2>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={busy} className="w-full btn-glow">
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
            </Button>
            <button type="button" className="text-sm text-muted-foreground hover:text-primary" onClick={() => setMode("login")}>
              ← Back to login
            </button>
          </form>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="li-email">Email</Label>
                  <Input id="li-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="li-pw">Password</Label>
                  <Input id="li-pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full btn-glow">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Login
                </Button>
                <button type="button" className="block text-sm text-muted-foreground hover:text-primary" onClick={() => setMode("forgot")}>
                  Forgot password?
                </button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-user">Username</Label>
                  <Input id="su-user" required value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">Password</Label>
                  <Input id="su-pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={busy} className="w-full btn-glow">
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
