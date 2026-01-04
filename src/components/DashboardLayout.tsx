import { ReactNode, useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CalendarCheck,
  CreditCard,
  Database,
  FileText,
  GraduationCap,
  Image,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Radio,
  Receipt,
  Settings,
  Shield,
  Sparkles,
  Tag,
  UserCheck,
  Users,
  UsersRound,
  Video,
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

  const telegramMenuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Sparkles, label: "Create Quiz", path: "/dashboard/create-quiz" },
    { icon: Radio, label: "Channels", path: "/dashboard/channels" },
    { icon: Image, label: "Stories", path: "/dashboard/stories" },
    { icon: Database, label: "Question Bank", path: "/dashboard/question-bank" },
    { icon: Calendar, label: "Scheduler", path: "/dashboard/scheduler" },
  ];

  const lmsMenuItems = [
    { icon: BookOpen, label: "Courses", path: "/dashboard/courses" },
    { icon: UsersRound, label: "Batches", path: "/dashboard/batches" },
    { icon: FileText, label: "Tests & Exams", path: "/dashboard/tests" },
    { icon: Video, label: "Live Classes", path: "/dashboard/live-classes" },
    { icon: Bell, label: "Notices", path: "/dashboard/notices" },
    { icon: GraduationCap, label: "Student Portal", path: "/dashboard/student" },
    { icon: UserCheck, label: "Teacher Portal", path: "/dashboard/teacher" },
  ];

  const financeMenuItems = [
    { icon: CreditCard, label: "Fee Plans", path: "/dashboard/fee-plans" },
    { icon: Receipt, label: "Payments", path: "/dashboard/payments" },
  ];

  const attendanceMenuItems = [
    { icon: CalendarCheck, label: "Attendance", path: "/dashboard/attendance" },
    { icon: Calendar, label: "Leave Requests", path: "/dashboard/leaves" },
  ];

  const settingsMenuItems = [
    { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const superAdminMenuItems = [
    { icon: Shield, label: "Admin Dashboard", path: "/dashboard/super-admin" },
    { icon: Users, label: "Manage Users", path: "/dashboard/super-admin/users" },
    { icon: Tag, label: "Manage Coupons", path: "/dashboard/super-admin/coupons" },
    { icon: Mail, label: "Manage Invitations", path: "/dashboard/super-admin/invitations" },
    { icon: BarChart3, label: "Audit Logs", path: "/dashboard/super-admin/audit-logs" },
    { icon: Settings, label: "Admin Settings", path: "/dashboard/super-admin/settings" },
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

  const renderMenuItems = (items: typeof telegramMenuItems) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path;

      return (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.label}
            className={`transition-all duration-300 rounded-2xl h-12 mb-1 ${isActive
              ? "nav-item-active"
              : "hover:bg-primary/10 hover:translate-x-1"
              }`}
          >
            <Link to={item.path} className="flex items-center gap-4 px-4">
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 text-primary' : 'group-hover:scale-110'}`} />
              <span className={`text-base tracking-tight ${isActive ? 'font-black' : 'font-bold text-muted-foreground'}`}>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full relative">
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
        <Sidebar collapsible="icon" className="border-r-0 z-50">
          <div className="absolute inset-0 sidebar-glass -z-10" />
          <SidebarHeader className="border-b border-white/10 dark:border-white/5 py-4">
            <div className="flex items-center gap-3 px-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary via-accent to-secondary rounded-2xl flex items-center justify-center shadow-xl ring-2 ring-white/20 transition-all duration-500 hover:scale-110 hover:rotate-3 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:h-10">
                <Sparkles className="w-7 h-7 text-white animate-pulse" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden animate-in fade-in slide-in-from-left-4 duration-500">
                <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent italic">
                  TelePost
                </span>
                <span className="text-[10px] text-muted-foreground/80 font-black uppercase tracking-[0.2em]">
                  AI ENGINE v2.0
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 py-4">
            {/* Telegram Quiz Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-4 mb-2">
                Telegram Quizzes
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {renderMenuItems(telegramMenuItems)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-6 opacity-20" />

            {/* LMS Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-4 mb-2">
                Learning Management
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {renderMenuItems(lmsMenuItems)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-6 opacity-20" />

            {/* Finance Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-4 mb-2">
                Finance
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {renderMenuItems(financeMenuItems)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-6 opacity-20" />

            {/* Attendance Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-4 mb-2">
                Attendance
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {renderMenuItems(attendanceMenuItems)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator className="my-6 opacity-20" />

            {/* Settings Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-black text-primary uppercase tracking-[0.2em] px-4 mb-2">
                Settings & Analytics
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {renderMenuItems(settingsMenuItems)}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Super Admin Section */}
            {isUserSuperAdmin && (
              <>
                <SidebarSeparator className="my-6 opacity-20" />
                <SidebarGroup>
                  <SidebarGroupLabel className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] px-4 mb-2">
                    Super Admin
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {renderMenuItems(superAdminMenuItems)}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </SidebarContent>

          <SidebarFooter className="p-0 border-t-0 pb-6">
            <div className="group-data-[collapsible=icon]:p-2 group-data-[collapsible=expanded]:px-4">
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="floating-profile-card h-16 px-3 group-data-[collapsible=icon]:h-12 group-data-[collapsible=icon]:w-12 group-data-[collapsible=icon]:m-0"
                      >
                        <Avatar className="h-10 w-10 ring-2 ring-primary/30 shadow-lg">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-black">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-left group-data-[collapsible=icon]:hidden overflow-hidden ml-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black tracking-tight truncate max-w-[110px]">
                              {profile?.full_name || 'User'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground/70 truncate max-w-[130px] uppercase tracking-wider">
                            {profile?.email?.split('@')[0] || ''}
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                          {isUserSuperAdmin && (
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-64 clay-card p-2"
                      align="end"
                      side="top"
                      sideOffset={12}
                    >
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
        <SidebarInset className="flex-1 bg-transparent transition-colors duration-500 overflow-visible">
          <div className="mesh-gradient" />
          <header className="sticky top-0 z-40 flex h-24 shrink-0 items-center gap-4 border-b border-white/10 bg-background/20 backdrop-blur-3xl px-12 transition-all">
            <SidebarTrigger className="clay-button rounded-2xl w-12 h-12 shadow-xl hover:scale-110 transition-transform" />
            <div className="flex-1">
              <Breadcrumb />
            </div>
            <div className="flex items-center gap-6">
              <Button variant="ghost" size="icon" className="rounded-2xl w-12 h-12 relative hover:bg-primary/10 transition-all duration-300 glass-card">
                <Bell className="w-6 h-6 text-muted-foreground" />
                <span className="absolute top-3 right-3 w-3 h-3 bg-accent rounded-full border-2 border-background animate-pulse shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
              </Button>
            </div>
          </header>
          <main className="p-8 md:p-12 lg:p-20 max-w-[1800px] mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out relative pb-32" id="main-content">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
