import { ReactNode, useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  Database,
  FileText,
  Image,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
  Mail,
  ChevronRight,
  User
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb } from "@/components/Breadcrumb";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { isSuperAdmin } from "@/services/couponService";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUserSuperAdmin, setIsUserSuperAdmin] = useState(() => {
    const cached = sessionStorage.getItem('isUserSuperAdmin');
    return cached === 'true';
  });
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const cacheKey = 'superAdminCheckTime';
        const lastCheck = sessionStorage.getItem(cacheKey);
        const now = Date.now();

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
      // Clear cached super admin status
      sessionStorage.removeItem('isUserSuperAdmin');
      sessionStorage.removeItem('superAdminCheckTime');
      
      await supabase.auth.signOut();
      navigate("/");
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
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
    { icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" },
    { icon: Radio, label: "Channels", path: "/dashboard/channels" },
    { icon: Image, label: "Stories", path: "/dashboard/stories" },
    { icon: FileText, label: "Documents", path: "/dashboard/documents" },
    { icon: Database, label: "Question Bank", path: "/dashboard/question-bank" },
    { icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" },
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const superAdminMenuItems = [
    { icon: Shield, label: "Admin Dashboard", path: "/dashboard/super-admin" },
    { icon: Users, label: "Manage Users", path: "/dashboard/super-admin/users" },
    { icon: Tag, label: "Manage Coupons", path: "/dashboard/super-admin/coupons" },
    { icon: Mail, label: "Manage Invitations", path: "/dashboard/super-admin/invitations" },
  ];

  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
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

        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r-0">
          <SidebarHeader className="border-b border-sidebar-border/50">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-accent to-secondary rounded-xl flex items-center justify-center shadow-lg ring-2 ring-primary/20 transition-transform hover:scale-105">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  TelePost
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  AI Quiz Platform
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {baseMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-md hover:shadow-lg scale-[1.02]"
                              : "hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <Link to={item.path} className="flex items-center gap-3 px-3 py-2.5">
                            <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                            <span className="font-medium">{item.label}</span>
                            {isActive && (
                              <ChevronRight className="w-4 h-4 ml-auto group-data-[collapsible=icon]:hidden" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Super Admin Section */}
            {isUserSuperAdmin && (
              <>
                <SidebarSeparator className="my-2" />
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Super Admin</span>
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {superAdminMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className={`transition-all duration-200 ${
                                isActive
                                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold shadow-md hover:shadow-lg scale-[1.02]"
                                  : "hover:bg-sidebar-accent/50"
                              }`}
                            >
                              <Link to={item.path} className="flex items-center gap-3 px-3 py-2.5">
                                <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                                <span className="font-medium">{item.label}</span>
                                {isActive && (
                                  <ChevronRight className="w-4 h-4 ml-auto group-data-[collapsible=icon]:hidden" />
                                )}
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/50 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-all"
                    >
                      <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate max-w-[120px]">
                            {profile?.full_name || 'User'}
                          </span>
                          {isUserSuperAdmin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md shadow-sm">
                              <Shield className="w-2.5 h-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {profile?.email || ''}
                        </span>
                      </div>
                      <ChevronRight className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 clay-card"
                    align="end"
                    side="top"
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email || ''}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="clay-button" />
            <div className="flex-1">
              <Breadcrumb />
            </div>
          </header>
          <main className="p-4 md:p-8 animate-in fade-in duration-300" id="main-content">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
