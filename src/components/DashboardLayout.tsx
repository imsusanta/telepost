import { ReactNode, useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  BarChart3,
  Bell,
  Database,
  FileText,
  Image,
  LayoutDashboard,
  LogOut,
  Radio,
  Settings,
  Shield,
  Sparkles,
  Tag,
  Users,
  ChevronRight,
  PenLine,
  Calendar,
  CreditCard,
  Send,
  Plus,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Breadcrumb } from "@/components/Breadcrumb";
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

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, isUserSuperAdmin, signOut } = useAuth();

  const [initialSidebarOpen] = useState(() => {
    if (typeof document === "undefined") return true;
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("sidebar:state="));
    return cookie ? cookie.split("=")[1] === "true" : true;
  });

  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem("sidebarScrollPosition");
    if (savedScrollPos && sidebarScrollRef.current) {
      sidebarScrollRef.current.scrollTop = parseInt(savedScrollPos, 10);
    }
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
      const errorMsg = error instanceof Error ? error.message : "Failed to sign out";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    }
  }, [navigate, toast, signOut]);

  const { canAccess } = useSubscription();

  const telegramMenuItems = useMemo<MenuItem[]>(
    () => [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      ...(canAccess("create_quiz") ? [{ icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" }] : []),
      ...(canAccess("create_post") ? [{ icon: PenLine, label: "Create Post", path: "/dashboard/create-post" }] : []),
      ...(canAccess("channels") ? [{ icon: Radio, label: "Channels", path: "/dashboard/channels" }] : []),
      ...(canAccess("stories") ? [{ icon: Image, label: "Stories", path: "/dashboard/stories" }] : []),
      ...(canAccess("question_bank") ? [{ icon: Database, label: "Question Bank", path: "/dashboard/question-bank" }] : []),
      ...(canAccess("knowledge_base") ? [{ icon: FileText, label: "Knowledge Base", path: "/dashboard/documents" }] : []),
      ...(canAccess("scheduler") ? [{ icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" }] : []),
    ],
    [canAccess],
  );

  const settingsMenuItems = useMemo<MenuItem[]>(
    () => [
      { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
      { icon: Settings, label: "Settings", path: "/dashboard/settings" },
    ],
    [],
  );

  const superAdminMenuItems = useMemo<MenuItem[]>(
    () => [
      { icon: Shield, label: "Admin Dashboard", path: "/dashboard/super-admin" },
      { icon: Users, label: "Manage Users", path: "/dashboard/super-admin/users" },
      { icon: CreditCard, label: "Subscriptions", path: "/dashboard/super-admin/subscriptions" },
      { icon: Tag, label: "Manage Coupons", path: "/dashboard/super-admin/coupons" },
      { icon: BarChart3, label: "Audit Logs", path: "/dashboard/super-admin/audit-logs" },
      { icon: Settings, label: "Admin Settings", path: "/dashboard/super-admin/settings" },
    ],
    [],
  );

  const getUserInitials = useCallback(() => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((name: string) => name[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
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
  telegramMenuItems: MenuItem[];
  settingsMenuItems: MenuItem[];
  superAdminMenuItems: MenuItem[];
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
  const navigate = useNavigate();

  const menuItemClass = (isActive: boolean) => `
    group transition-colors duration-150 rounded-lg relative h-10 px-3
    ${isActive
      ? "bg-primary/10 text-primary font-semibold"
      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
    }
  `;

  const menuIconClass = (isActive: boolean) => `
    w-4 h-4 shrink-0 transition-colors
    ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}
  `;

  return (
    <>
      <div className="flex min-h-screen w-full bg-background">
        <KeyboardShortcuts />

        {/* Sidebar */}
        <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar">
          <SidebarHeader className="border-b border-border/40 h-14 flex items-center justify-between px-3">
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <Send className="w-4 h-4 fill-current text-primary" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-base font-bold text-foreground leading-none">TelePost</span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Quiz Platform</span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-2 py-2" ref={sidebarScrollRef} onScroll={handleSidebarScroll}>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                Telegram Quizzes
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {telegramMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={menuItemClass(isActive)}>
                          <Link to={item.path} className="flex items-center gap-3">
                            <Icon className={menuIconClass(isActive)} />
                            <span className="text-sm">{item.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-2" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
                Settings & Analytics
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {settingsMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label} className={menuItemClass(isActive)}>
                          <Link to={item.path} className="flex items-center gap-3">
                            <Icon className={menuIconClass(isActive)} />
                            <span className="text-sm">{item.label}</span>
                            {isActive && <div className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isUserSuperAdmin && (
              <>
                <SidebarSeparator className="my-2" />
                <SidebarGroup>
                  <SidebarGroupLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-orange-500" />
                    <span>Super Admin</span>
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {superAdminMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className={`group transition-colors duration-150 rounded-lg relative h-10 px-3 ${isActive
                                ? "bg-orange-500/10 text-orange-500 font-semibold"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                              }`}
                            >
                              <Link to={item.path} className="flex items-center gap-3">
                                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-orange-500" : "text-muted-foreground group-hover:text-foreground"}`} />
                                <span className="text-sm">{item.label}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full" />}
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

          <SidebarFooter className="border-t border-border/40 p-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" className="h-11 px-2 hover:bg-accent/60 transition-colors rounded-lg">
                      <Avatar className="h-7 w-7 ring-1 ring-primary/20 shrink-0">
                        <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "User"} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden overflow-hidden ml-2">
                        <span className="font-semibold text-xs truncate w-full text-foreground">{profile?.full_name || "User"}</span>
                        <span className="text-[10px] text-muted-foreground truncate w-full">{profile?.email || ""}</span>
                      </div>
                      <ChevronRight className="ml-auto w-3.5 h-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" side="top" className="w-52">
                    <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="text-xs cursor-pointer">
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="text-xs text-destructive focus:text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-3.5 w-3.5" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content with Top Navigation Bar */}
        <SidebarInset className="flex-1 min-w-0 flex flex-col bg-background">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/40 bg-background/90 backdrop-blur-sm px-4 md:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-accent" />
              <div className="hidden sm:block">
                <Breadcrumb />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                onClick={() => navigate("/dashboard/create-quiz")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Quiz</span>
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md relative hover:bg-accent"
                onClick={() => navigate("/dashboard/scheduler")}
                title="Schedules & Notices"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full" id="main-content">
            {children}
          </main>
        </SidebarInset>
      </div>
    </>
  );
}
