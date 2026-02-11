import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NavigationProps {
  onGetStarted?: () => void;
}

export const Navigation = ({ onGetStarted }: NavigationProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Check auth state
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    }
    setIsMenuOpen(false);
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
    setIsMenuOpen(false);
  };

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg z-50"
      >
        Skip to main content
      </a>

      <div className="mx-4 mt-4">
        <nav
          className={`max-w-5xl mx-auto px-6 py-3 rounded-full border transition-all duration-300 ${isScrolled
            ? "bg-background/80 backdrop-blur-lg border-border/50 shadow-sm"
            : "bg-transparent border-transparent"
            }`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between">
            {/* Logo - Minimal */}
            <a
              href="/"
              className="flex items-center gap-2.5 text-lg font-display font-semibold text-foreground hover:text-primary transition-colors group"
              aria-label="TelePost - Home"
            >
              <div className="w-6 h-6 rounded-md overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform">
                <img src="/favicon.png" alt="TelePost Logo" className="w-full h-full object-contain" />
              </div>
              TelePost
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA Buttons - Conditional based on auth state */}
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                <Button
                  onClick={handleGoToDashboard}
                  size="sm"
                  className="h-8 px-4 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/auth")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Sign in
                  </button>
                  <Button
                    onClick={handleGetStarted}
                    size="sm"
                    className="h-8 px-4 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pt-4 pb-2 animate-fade-in">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
                  {isLoggedIn ? (
                    <Button
                      onClick={handleGoToDashboard}
                      size="sm"
                      className="h-9 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          navigate("/auth");
                          setIsMenuOpen(false);
                        }}
                        className="px-3 py-2 text-sm text-muted-foreground"
                      >
                        Sign in
                      </button>
                      <Button
                        onClick={handleGetStarted}
                        size="sm"
                        className="h-9 text-sm font-medium bg-foreground text-background hover:bg-foreground/90 rounded-full"
                      >
                        Get Started
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

