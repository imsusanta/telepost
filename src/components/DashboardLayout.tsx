import { ReactNode, useState, useCallback, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Calendar, Image, Keyboard, LayoutDashboard, LogOut, Menu, Radio, Settings, Shield, Sparkles, Tag, Users, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumb } from "@/components/Breadcrumb";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { isSuperAdmin } from "@/services/couponService";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserSuperAdmin, setIsUserSuperAdmin] = useState(() => {
    // Initialize from cache to avoid blocking render
    const cached = sessionStorage.getItem('isUserSuperAdmin');
    return cached === 'true';
  });

  useEffect(() => {
    // Check super admin status in background without blocking render
    const checkSuperAdminStatus = async () => {
      try {
        // Check cache first to avoid unnecessary API calls
        const cacheKey = 'superAdminCheckTime';
        const lastCheck = sessionStorage.getItem(cacheKey);
        const now = Date.now();

        // Only recheck if more than 5 minutes have passed
        if (lastCheck && now - parseInt(lastCheck) < 5 * 60 * 1000) {
          return;
        }

        const superAdmin = await isSuperAdmin();
        setIsUserSuperAdmin(superAdmin);
        sessionStorage.setItem('isUserSuperAdmin', String(superAdmin));
        sessionStorage.setItem(cacheKey, String(now));
      } catch (error) {
        console.error('Error checking super admin status:', error);
      }
    };

    checkSuperAdminStatus();
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to sign out";
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  const baseMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Radio, label: "Channels", path: "/dashboard/channels" },
    { icon: Image, label: "Stories", path: "/dashboard/stories" },
    { icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" },
    { icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const superAdminMenuItems = [
    { icon: Shield, label: "Super Admin", path: "", isSeparator: true },
    { icon: Users, label: "Manage Users", path: "/dashboard/super-admin/users" },
    { icon: Tag, label: "Manage Coupons", path: "/dashboard/super-admin/coupons" },
  ];

  const menuItems = isUserSuperAdmin
    ? [...baseMenuItems, ...superAdminMenuItems]
    : baseMenuItems;

  const SidebarContent = () => (
    <>
      <div className="flex items-center space-x-3 mb-10">
        <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-clay">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold text-gradient bg-gradient-to-r from-primary to-accent">
          QuizGenie
        </span>
      </div>

      <nav className="space-y-2 flex-1">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          // Render separator for super admin section
          if ('isSeparator' in item && item.isSeparator) {
            return (
              <div key={`separator-${index}`} className="pt-4 pb-2">
                <div className="flex items-center space-x-2 px-5 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                <div className="mt-2 border-t border-sidebar-border"></div>
              </div>
            );
          }

          return (
            <div key={item.path}>
              <Link
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? "clay-button bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-clay-hover scale-105"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent clay-card font-medium"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground clay-card-hover rounded-2xl py-6"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen relative">
      <KeyboardShortcuts />

      {/* Keyboard Shortcut Indicator */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 z-50 clay-button shadow-clay-lg rounded-full w-12 h-12"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="w-5 h-5" />
      </Button>
      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar/95 backdrop-blur-xl border-b border-sidebar-border px-4 flex items-center justify-between z-50">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-clay">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-gradient bg-gradient-to-r from-primary to-accent">
            QuizGenie
          </span>
        </div>

        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-6 bg-sidebar/95 backdrop-blur-xl border-sidebar-border">
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-72 bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border p-6 shadow-clay-lg z-40 flex-col">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="md:ml-72 pt-16 md:pt-0 p-4 md:p-8 min-h-screen" id="main-content">
        <Breadcrumb />
        <div className="animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}
