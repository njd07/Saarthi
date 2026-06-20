import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SignIn } from "@clerk/clerk-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Loader2, Home } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (user) return <Navigate to="/app" replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 relative">
      {/* Top bar: Home + Theme toggle */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
          <span className="text-sm font-medium">Home</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Disclaimer */}
      <div className="mb-6 max-w-md w-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs p-3 rounded-lg flex items-start gap-2 border border-amber-500/20">
        <span className="text-base leading-none">⏳</span>
        <p>
          Please cooperate if you are logging in for the first time — You can continue with log-in/sign-up, but since we are using our backend on free services, it might take 10-15 seconds to wake up on the first request. Rest assured, everything will run smoothly after that!
        </p>
      </div>

      <SignIn routing="hash" />
    </div>
  );
}
