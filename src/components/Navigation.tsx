import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "./ThemeToggle";

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
    { name: "Features", href: "/#features" },
    { name: "Pricing", href: "/#pricing" },
    { name: "How it works", href: "/#how-it-works" },
    { name: "FAQ", href: "/#faq" },
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
          className={`max-w-6xl mx-auto px-6 py-2.5 transition-all duration-300 ${
            isMenuOpen ? "rounded-2xl shadow-xl" : "rounded-full"
          } border border-border/60 bg-card/80 backdrop-blur-xl shadow-sm`}
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a
              href="/"
              className="flex items-center gap-2 text-lg font-display font-extrabold text-foreground hover:text-[#0088cc] transition-colors group"
              aria-label="TelePost - Home"
            >
              <div className="w-8 h-8 rounded-xl bg-[#0088cc]/10 flex items-center justify-center text-[#0088cc] group-hover:scale-105 transition-transform">
                <Send className="w-4 h-4 fill-[#0088cc] ml-[-1px]" />
              </div>
              <span className="font-extrabold text-foreground tracking-tight text-xl">TelePost</span>
            </a>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* CTA Buttons & Theme Toggle */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle />
              {isLoggedIn ? (
                <Button
                  onClick={handleGoToDashboard}
                  size="sm"
                  className="h-9 px-5 text-sm font-semibold bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-full gap-2 shadow-sm transition-all hover:scale-[1.02]"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/auth")}
                    className="text-muted-foreground hover:text-foreground font-medium transition-all"
                  >
                    Sign in
                  </Button>
                  <Button
                    onClick={handleGetStarted}
                    size="sm"
                    className="h-9 px-5 text-sm font-semibold bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-full gap-2 shadow-sm transition-all hover:scale-[1.02]"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Go to Dashboard
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Actions & Menu Button */}
            <div className="flex items-center gap-2 md:hidden">
              <ThemeToggle />
              <button
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden pt-4 pb-2 animate-fade-in border-t border-border/10 mt-2">
              <div className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
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
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("/auth");
                          setIsMenuOpen(false);
                        }}
                        className="text-left px-3 h-9 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all justify-start font-normal"
                      >
                        Sign in
                      </Button>
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

