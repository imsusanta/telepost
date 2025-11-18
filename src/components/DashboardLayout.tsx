import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  Send, 
  Calendar, 
  CreditCard, 
  Settings, 
  LogOut,
  LayoutDashboard 
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Send, label: "Connect Bot", path: "/dashboard/connect-bot" },
    { icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" },
    { icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" },
    { icon: CreditCard, label: "Billing", path: "/dashboard/billing" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  return (
    <div className="min-h-screen relative">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border p-6 shadow-clay-lg z-50">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-clay">
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-gradient bg-gradient-to-r from-primary to-accent">
            QuizGenie
          </span>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all ${
                  isActive
                    ? "clay-button bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-clay-hover scale-105"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent clay-card font-medium"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground clay-card-hover rounded-2xl py-6"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-72 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
