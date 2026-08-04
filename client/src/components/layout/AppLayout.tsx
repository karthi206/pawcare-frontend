import { Link, useLocation } from "wouter";
import { PawPrint, Menu, X, LogOut, User as UserIcon, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { title: "Home", url: "/" },
  { title: "Disease Detection", url: "/disease-detection" },
  { title: "NGO Locator", url: "/ngo-locator" },
  { title: "Case Tracker", url: "/cases" },
  { title: "Adoption Portal", url: "/adoption" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-border h-16 flex items-center">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-[#1F4E79] text-white p-1.5 rounded-lg">
              <PawPrint className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-[#1F4E79]">PawCare AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <Link 
                key={item.url} 
                href={item.url} 
                className={`text-sm font-semibold transition-colors hover:text-[#1F4E79] ${
                  location === item.url ? "text-[#1F4E79]" : "text-muted-foreground"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  {user.role === "vet" ? <Stethoscope className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  {user.username}
                  {user.role === "vet" && !user.is_verified && (
                    <span className="text-xs text-amber-600">(pending)</span>
                  )}
                </div>
                {user.role === "admin" && (
                  <Link href="/admin" className="text-sm font-semibold text-amber-600 hover:text-amber-700">
                    Admin
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-muted-foreground hover:text-[#1F4E79]">
                  Log in
                </Link>
                <Link href="/register">
                  <Button className="bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white rounded-full px-6 font-bold shadow-lg shadow-[#1F4E79]/20">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <button 
            className="lg:hidden p-2 text-primary" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Menu */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 w-full bg-white border-b border-border p-4 flex flex-col gap-4 lg:hidden shadow-xl animate-in fade-in slide-in-from-top-4">
            {navItems.map((item) => (
              <Link 
                key={item.url} 
                href={item.url} 
                onClick={() => setIsMenuOpen(false)}
                className={`text-lg font-bold p-2 ${
                  location === item.url ? "text-[#1F4E79] bg-primary/5 rounded-lg" : "text-muted-foreground"
                }`}
              >
                {item.title}
              </Link>
            ))}
            <Link href="/cases" onClick={() => setIsMenuOpen(false)}>
              <Button className="w-full bg-[#1F4E79] h-12 rounded-xl text-lg font-bold">Report an Animal</Button>
            </Link>

            <div className="border-t border-border pt-4 mt-2">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground px-2">
                    {user.role === "vet" ? <Stethoscope className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    {user.username}
                    {user.role === "vet" && !user.is_verified && (
                      <span className="text-xs text-amber-600">(pending)</span>
                    )}
                  </div>
                  {user.role === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="text-lg font-bold p-2 text-amber-600"
                    >
                      Admin
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-bold p-2 text-muted-foreground"
                  >
                    Log in
                  </Link>
                  <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full bg-[#1F4E79] hover:bg-[#1F4E79]/90 text-white rounded-xl h-12 font-bold">
                      Sign up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1F4E79] text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
            <div className="space-y-4 max-w-sm">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <div className="bg-white text-[#1F4E79] p-1.5 rounded-lg">
                  <PawPrint className="w-5 h-5" />
                </div>
                <span className="font-display font-bold text-2xl tracking-tight">PawCare AI</span>
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                Empowering communities with AI technology to provide better healthcare and faster rescue operations for stray animals worldwide.
              </p>
            </div>
            <div className="flex gap-8 text-sm font-medium text-white/80">
              <Link href="/disease-detection" className="hover:text-white transition-colors">Technology</Link>
              <Link href="/ngo-locator" className="hover:text-white transition-colors">Network</Link>
              <Link href="/cases" className="hover:text-white transition-colors">Operations</Link>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/40 text-xs tracking-widest font-bold uppercase">
            PawCare AI © 2026 — AI-Powered Street Animal Healthcare
          </div>
        </div>
      </footer>
    </div>
  );
}