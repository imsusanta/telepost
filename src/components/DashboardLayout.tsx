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
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { isSuperAdmin } from "@/services/couponService";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
            className={`transition-all duration-300 rounded-xl h-10 mb-0.5 ${isActive
              ? "nav-item-active"
              : "hover:bg-primary/5 hover:translate-x-1"
              }`}
          >
            <Link to={item.path} className="flex items-center gap-3 px-3">
              <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110 text-primary' : 'group-hover:scale-110'}`} />
              <span className={`text-sm tracking-tight ${isActive ? 'font-bold' : 'font-semibold text-muted-foreground/80'}`}>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full relative bg-background">
        <KeyboardShortcuts />

        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-6 right-6 z-50 glass-card shadow-xl rounded-full w-12 h-12 hover:scale-110 transition-transform"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
        >
          <Keyboard className="w-5 h-5" />
        </Button>

        <Sidebar collapsible="icon" className="border-r-0 z-50 overflow-hidden">
          <div className="absolute inset-0 sidebar-glass -z-10" />
          <SidebarHeader className="border-b border-white/5 py-4">
            <div className="flex items-center justify-between px-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary via-accent to-secondary rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                  <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent italic">
                    TelePost
                  </span>
                  <span className="text-[8px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] -mt-1">
                    AI ENGINE
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg relative hover:bg-primary/5 transition-all">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full border border-background shadow-sm" />
                </Button>
                <SidebarTrigger className="h-8 w-8 hover:bg-primary/5 rounded-lg" />
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="px-2 py-4">
            <SidebarMenu className="gap-0.5">
              {renderMenuItems(telegramMenuItems)}
              <SidebarSeparator className="my-4 opacity-5 mx-4" />
              {renderMenuItems(lmsMenuItems)}
              <SidebarSeparator className="my-4 opacity-5 mx-4" />
              {renderMenuItems(financeMenuItems)}
              <SidebarSeparator className="my-4 opacity-5 mx-4" />
              {renderMenuItems(attendanceMenuItems)}
              <SidebarSeparator className="my-4 opacity-5 mx-4" />
              {renderMenuItems(settingsMenuItems)}
              {isUserSuperAdmin && (
                <>
                  <SidebarSeparator className="my-4 opacity-5 mx-4" />
                  {renderMenuItems(superAdminMenuItems)}
                </>
              )}
            </SidebarMenu>
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
                          <span className="text-xs font-black tracking-tight truncate max-w-[100px]">
                            {profile?.full_name || 'User'}
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground/60 truncate max-w-[100px] uppercase tracking-wider">
                            {profile?.email?.split('@')[0] || ''}
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

        <SidebarInset className="flex-1 bg-transparent overflow-visible">
          <div className="mesh-gradient" />

          <main className="p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out relative pb-20">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
