import { ReactNode, useState, useCallback, useEffect, useRef } from "react";
import {
  BarChart3,
  Bell,
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
  ChevronRight,
  ChevronLeft,
  User,
  PenLine,
  Calendar,
  CreditCard,
  Send
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  useSidebar,
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
// import type { Tables } from "@/integrations/supabase/types";
type Profile = any;

interface DashboardLayoutProps {
  children: ReactNode;
}

import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isUserSuperAdmin, signOut } = useAuth();

  // Read sidebar state from cookie for persistence across navigation
  const [initialSidebarOpen] = useState(() => {
    if (typeof document === "undefined") return true;
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sidebar:state="));
    if (cookie) {
      return cookie.split("=")[1] === "true";
    }
    return true; // Default to open
  });
  
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  // Restore sidebar scroll position
  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('sidebarScrollPosition');
    if (savedScrollPos && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = parseInt(savedScrollPos, 10);
    }
  }, []);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    sessionStorage.setItem('sidebarScrollPosition', String(scrollTop));
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
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
  }, [navigate, toast, signOut]);

  const { canAccess } = useSubscription();

  const telegramMenuItems = useMemo(() => [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    ...(canAccess('create_quiz') ? [{ icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" }] : []),
    ...(canAccess('create_post') ? [{ icon: PenLine, label: "Create Post", path: "/dashboard/create-post" }] : []),
    ...(canAccess('channels') ? [{ icon: Radio, label: "Channels", path: "/dashboard/channels" }] : []),
    ...(canAccess('stories') ? [{ icon: Image, label: "Stories", path: "/dashboard/stories" }] : []),
    ...(canAccess('question_bank') ? [{ icon: Database, label: "Question Bank", path: "/dashboard/question-bank" }] : []),
    ...(canAccess('knowledge_base') ? [{ icon: FileText, label: "Knowledge Base", path: "/dashboard/documents" }] : []),
    ...(canAccess('scheduler') ? [{ icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" }] : []),
  ], [canAccess]);

  const settingsMenuItems = useMemo(() => [
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ], []);

  const superAdminMenuItems = useMemo(() => [
    { icon: Shield, label: "Admin Dashboard", path: "/dashboard/super-admin" },
    { icon: Users, label: "Manage Users", path: "/dashboard/super-admin/users" },
    { icon: CreditCard, label: "Subscriptions", path: "/dashboard/super-admin/subscriptions" },
    { icon: Tag, label: "Manage Coupons", path: "/dashboard/super-admin/coupons" },
    { icon: BarChart3, label: "Audit Logs", path: "/dashboard/super-admin/audit-logs" },
    { icon: Settings, label: "Admin Settings", path: "/dashboard/super-admin/settings" },
  ], []);

  const getUserInitials = useCallback(() => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return profile?.email?.slice(0, 2).toUpperCase() || 'U';
  }, [profile]);

  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <DashboardLayoutInner
        profile={profile}
        isUserSuperAdmin={isUserSuperAdmin}
        handleSignOut={handleSignOut}
        sidebarScrollRef={sidebarScrollRef}
        handleSidebarScroll={handleSidebarScroll}
        getUserInitials={getUserInitials}
        telegramMenuItems={telegramMenuItems}
        settingsMenuItems={settingsMenuItems}
        superAdminMenuItems={superAdminMenuItems}
      >
        {children}
      </DashboardLayoutInner>
    </SidebarProvider>
  );
}

interface DashboardLayoutInnerProps extends DashboardLayoutProps {
  profile: Profile | null;
  isUserSuperAdmin: boolean;
  handleSignOut: () => Promise<void>;
  sidebarScrollRef: React.RefObject<HTMLDivElement>;
  handleSidebarScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  getUserInitials: () => string;
  telegramMenuItems: any[];
  settingsMenuItems: any[];
  superAdminMenuItems: any[];
}

function DashboardLayoutInner({
  children,
  profile,
  isUserSuperAdmin,
  handleSignOut,
  sidebarScrollRef,
  handleSidebarScroll,
  getUserInitials,
  telegramMenuItems,
  settingsMenuItems,
  superAdminMenuItems,
}: DashboardLayoutInnerProps) {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <>
      <div className="flex min-h-screen w-full relative bg-background overflow-x-hidden">
        <KeyboardShortcuts />

        {/* Persistent Edge Arrow Toggle - Outside Sidebar to prevent clipping */}
        <div
          className="hidden md:block fixed z-[100] transition-all duration-200 ease-linear"
          style={{
            left: isCollapsed ? "calc(var(--sidebar-width-icon) - 12px)" : "calc(var(--sidebar-width) - 12px)",
            top: "22px"
          }}
        >
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-background border-sidebar-border shadow-md hover:bg-accent text-sidebar-foreground transition-all duration-300 ring-4 ring-background"
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="hidden md:flex fixed bottom-6 right-6 z-50 glass-card shadow-xl rounded-full w-12 h-12 hover:scale-110 transition-transform items-center justify-center"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
        >
          <Keyboard className="w-5 h-5" />
        </Button>

        <Sidebar collapsible="icon" className="border-r-0 z-50">
          <div className="absolute inset-0 sidebar-glass -z-10" />
          <SidebarHeader className="border-b border-white/5 py-4">
            <div className="flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                {/* Paper plane icon matching Navbar logo */}
                <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#0088cc]">
                  <Send className="w-6 h-6 fill-[#0088cc] text-[#0088cc]" />
                </div>
                {/* TelePost text - hidden when collapsed */}
                <span className="text-xl font-bold text-foreground group-data-[collapsible=icon]:hidden">
                  TelePost
                </span>
              </div>
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg relative hover:bg-primary/5 transition-all">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full border border-background shadow-sm" />
                </Button>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent
            className="px-2"
            ref={sidebarScrollRef}
            onScroll={handleSidebarScroll}
          >
            {/* Telegram Quiz Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2">
                Telegram Quizzes
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {telegramMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`transition-all duration-300 rounded-xl relative h-11 ${isActive
                            ? "bg-white/10 text-white font-bold shadow-lg scale-[1.02] border border-white/20"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                            }`}
                        >
                          <Link
                            to={item.path}
                            className="flex items-center gap-3 px-3"
                          >
                            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'group-hover:scale-110'}`} />
                            <span className="font-semibold text-sm">{item.label}</span>
                            {isActive && (
                              <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white] animate-in fade-in duration-500" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>




            <SidebarSeparator className="my-2" />

            {/* Settings Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2">
                Settings & Analytics
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {settingsMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`transition-all duration-300 rounded-xl relative h-11 ${isActive
                            ? "bg-white/10 text-white font-bold shadow-lg scale-[1.02] border border-white/20"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                            }`}
                        >
                          <Link to={item.path} className="flex items-center gap-3 px-3">
                            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-semibold text-sm">{item.label}</span>
                            {isActive && (
                              <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white] animate-in fade-in duration-500" />
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
                              className={`transition-all duration-300 rounded-xl relative h-11 ${isActive
                                ? "bg-orange-500/20 text-orange-500 font-bold shadow-lg scale-[1.02] border border-orange-500/20"
                                : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                }`}
                            >
                              <Link to={item.path} className="flex items-center gap-3 px-3">
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="font-semibold text-sm">{item.label}</span>
                                {isActive && (
                                  <div className="absolute right-2 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] animate-in fade-in duration-500" />
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

          <SidebarFooter className="p-0 border-t-0 pb-6">
            <div className="group-data-[collapsible=icon]:p-1 group-data-[collapsible=expanded]:px-3">
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="floating-profile-card h-14 px-2 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:m-0"
                      >
                        <Avatar className="h-8 w-8 ring-1 ring-primary/20 shadow-md">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-black text-xs">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden overflow-hidden ml-2">
                          <span className="text-xs font-black tracking-tight truncate max-w-[150px]">
                            {profile?.full_name || 'User'}
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-1 group-data-[collapsible=icon]:hidden opacity-40">
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 glass-card p-2" align="end" side="top" sideOffset={12}>
                      <DropdownMenuLabel className="font-normal p-4">
                        <div className="flex flex-col space-y-1">
                          <p className="text-base font-black tracking-tight">{profile?.full_name || 'User'}</p>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{profile?.email || ''}</p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="opacity-10" />
                      <DropdownMenuItem asChild className="p-3 rounded-xl cursor-pointer font-bold">
                        <Link to="/dashboard/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="p-3 rounded-xl cursor-pointer font-bold">
                        <Link to="/dashboard">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="opacity-10" />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive p-3 rounded-xl cursor-pointer font-bold">
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1 subtle-mesh transition-colors duration-500 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Mobile Navigation Header - Only visible on mobile */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-xl relative z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl hover:bg-primary/10 shadow-sm transition-all active:scale-95" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 flex items-center justify-center shrink-0 text-[#0088cc]">
                  <Send className="w-6 h-6 fill-[#0088cc] text-[#0088cc]" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  TelePost
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg relative hover:bg-primary/5">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full border border-background shadow-sm" />
              </Button>
            </div>
          </header>

          <div className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto w-full animate-in fade-in duration-700 ease-out flex-1 min-w-0 overflow-x-hidden" id="main-content">
            {children}
          </div>
        </SidebarInset>
      </div>
    </>
  );
}
