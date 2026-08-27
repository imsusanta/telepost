import { ReactNode, useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  BarChart3, Bell, Database, FileText, Image, LayoutDashboard, LogOut,
  Radio, Settings, Shield, Sparkles, Tag, Users, ChevronRight, PenLine,
  Calendar, CreditCard, Send, Plus,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

type Profile = {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type MenuItem = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
};

interface DashboardLayoutProps { children: ReactNode }

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isUserSuperAdmin, signOut } = useAuth();
  const [initialSidebarOpen] = useState(() => {
    if (typeof document === "undefined") return true;
    const cookie = document.cookie.split("; ").find((row) => row.startsWith("sidebar:state="));
    return cookie ? cookie.split("=")[1] === "true" : true;
  });
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("sidebarScrollPosition");
    if (saved && sidebarScrollRef.current) sidebarScrollRef.current.scrollTop = parseInt(saved, 10);
  }, []);

  const handleSidebarScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sessionStorage.setItem("sidebarScrollPosition", String(e.currentTarget.scrollTop));
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      navigate("/");
      toast({ title: "Signed out successfully", description: "Come back soon!" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign out",
        variant: "destructive",
      });
    }
  }, [navigate, toast, signOut]);

  const { canAccess } = useSubscription();
  const telegramMenuItems = useMemo<MenuItem[]>(() => [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    ...(canAccess("create_quiz") ? [{ icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" }] : []),
    ...(canAccess("create_post") ? [{ icon: PenLine, label: "Create Post", path: "/dashboard/create-post" }] : []),
    ...(canAccess("channels") ? [{ icon: Radio, label: "Channels", path: "/dashboard/channels" }] : []),
    ...(canAccess("stories") ? [{ icon: Image, label: "Stories", path: "/dashboard/stories" }] : []),
    ...(canAccess("question_bank") ? [{ icon: Database, label: "Question Bank", path: "/dashboard/question-bank" }] : []),
    ...(canAccess("knowledge_base") ? [{ icon: FileText, label: "Knowledge Base", path: "/dashboard/documents" }] : []),
    ...(canAccess("scheduler") ? [{ icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" }] : []),
  ], [canAccess]);

  const settingsMenuItems = useMemo<MenuItem[]>(() => [
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ], []);

  const superAdminMenuItems = useMemo<MenuItem[]>(() => [
    { icon: Shield, label: "Admin Dashboard", path: "/dashboard/super-admin" },
    { icon: Users, label: "Manage Users", path: "/dashboard/super-admin/users" },
    { icon: CreditCard, label: "Subscriptions", path: "/dashboard/super-admin/subscriptions" },
    { icon: Tag, label: "Manage Coupons", path: "/dashboard/super-admin/coupons" },
    { icon: BarChart3, label: "Audit Logs", path: "/dashboard/super-admin/audit-logs" },
    { icon: Settings, label: "Admin Settings", path: "/dashboard/super-admin/settings" },
  ], []);

  const getUserInitials = useCallback(() => {
    if (profile?.full_name) return profile.full_name.split(" ").map((name: string) => name[0]).join("").toUpperCase().slice(0, 2);
    return profile?.email?.slice(0, 2).toUpperCase() || "U";
  }, [profile]);

  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <DashboardLayoutInner
        profile={profile as Profile | null}
        isUserSuperAdmin={isUserSuperAdmin}
        handleSignOut={handleSignOut}
        sidebarScrollRef={sidebarScrollRef}
        handleSidebarScroll={handleSidebarScroll}
        getUserInitials={getUserInitials}
        telegramMenuItems={telegramMenuItems}
        settingsMenuItems={settingsMenuItems}
        superAdminMenuItems={superAdminMenuItems}
      >{children}</DashboardLayoutInner>
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
  telegramMenuItems: MenuItem[];
  settingsMenuItems: MenuItem[];
  superAdminMenuItems: MenuItem[];
}

function DashboardLayoutInner({
  children, profile, isUserSuperAdmin, handleSignOut, sidebarScrollRef,
  handleSidebarScroll, getUserInitials, telegramMenuItems, settingsMenuItems,
  superAdminMenuItems,
}: DashboardLayoutInnerProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItemClass = (active: boolean) => `group rounded-lg relative h-10 px-3 transition-all duration-200 ease-out motion-reduce:transition-none ${
    active
      ? "bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0_hsl(var(--primary)/0.8)]"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5 active:scale-[0.985]"
  }`;
  const menuIconClass = (active: boolean) => `w-4 h-4 shrink-0 transition-all duration-200 ease-out motion-reduce:transition-none ${
    active
      ? "text-primary scale-105"
      : "text-muted-foreground group-hover:text-foreground group-hover:scale-110 group-hover:-rotate-3"
  }`;

  const renderMenu = (items: MenuItem[], admin = false) => (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <SidebarMenuItem key={item.path}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.label}
              className={admin
                ? `group rounded-lg relative h-10 px-3 transition-all duration-200 ease-out motion-reduce:transition-none ${isActive ? "bg-orange-500/10 text-orange-500 font-semibold shadow-[inset_3px_0_0_rgb(249_115_22_/_0.8)]" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground hover:translate-x-0.5 active:scale-[0.985]"}`
                : menuItemClass(isActive)}
            >
              <Link to={item.path} className="flex items-center gap-4 px-1">
                <Icon className={admin
                  ? `w-4 h-4 shrink-0 transition-all duration-200 ease-out motion-reduce:transition-none ${isActive ? "text-orange-500 scale-105" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110 group-hover:-rotate-3"}`
                  : menuIconClass(isActive)} />
                <span className="text-sm transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none">{item.label}</span>
                {isActive && <div className={admin ? "ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" : "ml-auto w-1.5 h-1.5 bg-primary rounded-full animate-pulse"} />}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      <KeyboardShortcuts />
      <Sidebar collapsible="offcanvas" className="border-r border-border/60 bg-sidebar">
        <SidebarHeader className="border-b border-border/40 h-16 flex items-center px-3">
          <Link to="/dashboard" className="flex items-center gap-3 w-full pl-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <Send className="w-4 h-4 fill-current text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground leading-none">TelePost</span>
              <span className="text-[10px] text-muted-foreground font-medium mt-1">Quiz Platform</span>
            </div>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-3 py-4" ref={sidebarScrollRef} onScroll={handleSidebarScroll}>
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-2">Telegram Quizzes</SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(telegramMenuItems)}</SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator className="my-3" />
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-2">Settings & Analytics</SidebarGroupLabel>
            <SidebarGroupContent>{renderMenu(settingsMenuItems)}</SidebarGroupContent>
          </SidebarGroup>
          {isUserSuperAdmin && (
            <>
              <SidebarSeparator className="my-3" />
              <SidebarGroup>
                <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-2 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-orange-500" />
                  <span>Super Admin</span>
                </SidebarGroupLabel>
                <SidebarGroupContent>{renderMenu(superAdminMenuItems, true)}</SidebarGroupContent>
              </SidebarGroup>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="h-12 px-2 hover:bg-accent/60 transition-colors rounded-lg">
                    <Avatar className="h-8 w-8 ring-1 ring-primary/20 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start text-left overflow-hidden ml-2">
                      <span className="font-semibold text-xs truncate w-full text-foreground">{profile?.full_name || "User"}</span>
                      <span className="text-[10px] text-muted-foreground truncate w-full">{profile?.email || ""}</span>
                    </div>
                    <ChevronRight className="ml-auto w-3.5 h-3.5 text-muted-foreground" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-52 max-w-[calc(100vw-2rem)]">
                  <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="min-h-11 text-xs cursor-pointer"><Settings className="mr-2 h-3.5 w-3.5" />Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="min-h-11 text-xs text-destructive focus:text-destructive cursor-pointer"><LogOut className="mr-2 h-3.5 w-3.5" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex-1 min-w-0 flex flex-col bg-background overflow-x-hidden">
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border/40 bg-background/90 backdrop-blur-sm px-3 sm:px-4 md:px-6 pt-[env(safe-area-inset-top)]">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3"><SidebarTrigger className="h-9 w-9 shrink-0 rounded-md hover:bg-accent" /><div className="hidden sm:block min-w-0 truncate"><Breadcrumb /></div></div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button variant="outline" size="sm" className="h-9 min-w-9 gap-1.5 px-2 sm:px-3 text-xs font-medium" onClick={() => navigate("/dashboard/create-quiz")} aria-label="New Quiz"><Plus className="w-3.5 h-3.5" /><span className="hidden sm:inline">New Quiz</span></Button>
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md relative hover:bg-accent" onClick={() => navigate("/dashboard/scheduler")} title="Schedules & Notices" aria-label="Schedules & Notices"><Bell className="w-4 h-4 text-muted-foreground" /></Button>
          </div>
        </header>
        <main className="flex-1 min-w-0 px-3 py-4 sm:px-4 md:px-6 lg:px-8 md:py-6 lg:py-8 max-w-7xl mx-auto w-full overflow-x-hidden" id="main-content">{children}</main>
      </SidebarInset>
    </div>
  );
}
