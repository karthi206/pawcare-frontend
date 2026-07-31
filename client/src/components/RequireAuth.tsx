import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // While we're still checking if a saved session exists, show nothing rather
  // than briefly flashing the "login required" screen incorrectly.
  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-md text-center">
        <div className="mb-4 p-4 bg-muted/40 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-muted-foreground mb-6">
          Please log in or create an account to access this page.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/login")}>Log In</Button>
          <Button variant="outline" onClick={() => navigate("/register")}>
            Sign Up
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
