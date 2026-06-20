import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
      navigate("/app", { replace: true });
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await signUp(signupEmail, signupPassword, signupName);
      toast({ title: "Account created", description: "You are now logged in." });
      navigate("/app", { replace: true });
    } catch (e: any) {
      toast({ title: "Signup failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[420px] border border-border rounded-2xl p-8 space-y-6 bg-card relative z-10">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
          <img src="/logo.png" className="h-[22px] w-[22px]" alt="Saarthi Logo" />
          <span className="font-semibold tracking-tight">Saarthi</span>
        </Link>
        <p className="text-[13px] text-muted-foreground">Voice-first Hinglish teaching co-pilot</p>
        <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-lg flex items-start gap-2">
          <span className="text-base leading-none">🚨</span>
          <p>
            If you are using this for the first time, it can take up to 50 seconds to load up the backend because we are using a free backend service.
            Google Auth is coming in a future update!
          </p>
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label>Email</Label><Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required /></div>
              <div><Label>Password</Label><Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required /></div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign In
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            <form onSubmit={handleSignup} className="space-y-3">
              <div><Label>Full name</Label><Input value={signupName} onChange={(e) => setSignupName(e.target.value)} required /></div>
              <div><Label>Email</Label><Input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required /></div>
              <div><Label>Password</Label><Input type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t border-border">
          <button
            type="button"
            onClick={async () => {
              const r = await authFetch(`/api/bootstrap-admin`, { method: "POST" });
              const d = await r.json();
              if (d.ok) {
                toast({ title: "Admin ready", description: "admin@gmail.com / admin123 — please change after login." });
                setLoginEmail("admin@gmail.com");
                setLoginPassword("admin123");
              } else {
                toast({ title: "Bootstrap failed", description: d.error || "Unknown", variant: "destructive" });
              }
            }}
            className="text-[11px] text-muted-foreground hover:text-foreground underline"
          >
            Create demo admin account
          </button>
        </div>
      </div>
    </div>
  );
}
