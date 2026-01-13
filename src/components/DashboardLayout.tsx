import { ReactNode, useState, useCallback, useEffect, useRef } from "react";
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
  ChevronLeft,
  User,
  PenLine
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { isSuperAdmin } from "@/services/couponService";
import { isFeatureEnabled } from "@/services/featureService";
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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isUserSuperAdmin, setIsUserSuperAdmin] = useState(() => {
    return localStorage.getItem('is_super_admin') === 'true';
  });

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const [lmsEnabled, setLmsEnabled] = useState(false); // Default to false - hidden until feature check

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

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return;

        const { data, error } = await (supabase as any)
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading profile from DB:', error);
        }

        // Use metadata as fallback for full_name and avatar_url
        const metadata = user.user_metadata || {};
        const profileName = data?.full_name || metadata.full_name || metadata.name || null;
        const profileAvatar = data?.avatar_url || metadata.avatar_url || metadata.picture || null;

        const updatedProfile = {
          ...data,
          id: user.id,
          email: data?.email || user.email,
          full_name: profileName,
          avatar_url: profileAvatar,
        } as Profile;

        setProfile(updatedProfile);

        // Check if user is super admin
        // No longer needed for account_locked logic

      } catch (error) {
        console.error('Exception loading profile:', error);
      }
    };

    loadProfile();

    // Listen for custom event to reload profile
    window.addEventListener("profile-updated", loadProfile);
    return () => window.removeEventListener("profile-updated", loadProfile);
  }, []);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      try {
        const cacheKey = 'superAdminCheckTime';
        const lastCheck = localStorage.getItem(cacheKey);
        const now = Date.now();

        // Cache for 5 minutes to avoid excessive DB calls
        if (lastCheck && now - parseInt(lastCheck) < 5 * 60 * 1000) {
          return;
        }

        const superAdmin = await isSuperAdmin();
        setIsUserSuperAdmin(superAdmin);
        localStorage.setItem('is_super_admin', String(superAdmin));
        localStorage.setItem(cacheKey, String(now));
      } catch (error) {
        console.error('Error checking super admin status:', error);
      }
    };

    checkSuperAdminStatus();
  }, []);

  // Check feature toggles
  useEffect(() => {
    const checkFeatures = async () => {
      try {
        const lms = await isFeatureEnabled('lms_attendance');
        setLmsEnabled(lms);
      } catch (error) {
        console.error('Failed to check feature status:', error);
        setLmsEnabled(true); // Default to enabled on error
      }
    };
    checkFeatures();
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      // Clear all super admin cache
      localStorage.removeItem('is_super_admin');
      localStorage.removeItem('superAdminCheckTime');
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
    { icon: PenLine, label: "Create Post", path: "/dashboard/create-post" },
    { icon: Radio, label: "Channels", path: "/dashboard/channels" },
    { icon: Image, label: "Stories", path: "/dashboard/stories" },
    { icon: Database, label: "Question Bank", path: "/dashboard/question-bank" },
    { icon: FileText, label: "Knowledge Base", path: "/dashboard/documents" },
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

  // Finance menu - Only super admins see Fee Plans
  const financeMenuItems = isUserSuperAdmin ? [
    { icon: CreditCard, label: "Fee Plans", path: "/dashboard/fee-plans" },
    { icon: Receipt, label: "Payments", path: "/dashboard/payments" },
  ] : [
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
      return profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return profile?.email?.slice(0, 2).toUpperCase() || 'U';
  };

  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <DashboardLayoutInner
        profile={profile}
        isUserSuperAdmin={isUserSuperAdmin}
        lmsEnabled={lmsEnabled}
        handleSignOut={handleSignOut}
        sidebarScrollRef={sidebarScrollRef}
        handleSidebarScroll={handleSidebarScroll}
        getUserInitials={getUserInitials}
        telegramMenuItems={telegramMenuItems}
        lmsMenuItems={lmsMenuItems}
        financeMenuItems={financeMenuItems}
        attendanceMenuItems={attendanceMenuItems}
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
  lmsEnabled: boolean;
  handleSignOut: () => Promise<void>;
  sidebarScrollRef: React.RefObject<HTMLDivElement>;
  handleSidebarScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  getUserInitials: () => string;
  telegramMenuItems: any[];
  lmsMenuItems: any[];
  financeMenuItems: any[];
  attendanceMenuItems: any[];
  settingsMenuItems: any[];
  superAdminMenuItems: any[];
}

function DashboardLayoutInner({
  children,
  profile,
  isUserSuperAdmin,
  lmsEnabled,
  handleSignOut,
  sidebarScrollRef,
  handleSidebarScroll,
  getUserInitials,
  telegramMenuItems,
  lmsMenuItems,
  financeMenuItems,
  attendanceMenuItems,
  settingsMenuItems,
  superAdminMenuItems,
}: DashboardLayoutInnerProps) {
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <>
      <div className="flex min-h-screen w-full relative bg-background">
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

            {lmsEnabled && (
              <>
                <SidebarSeparator className="my-2" />

                {/* LMS Section */}
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Learning Management</span>
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {lmsMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className={`transition-all duration-300 rounded-xl relative h-11 ${isActive
                                ? "bg-emerald-500/20 text-emerald-500 font-bold shadow-lg scale-[1.02] border border-emerald-500/20"
                                : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                }`}
                            >
                              <Link to={item.path} className="flex items-center gap-3 px-3">
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="font-semibold text-sm">{item.label}</span>
                                {isActive && (
                                  <div className="absolute right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-in fade-in duration-500" />
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

            <SidebarSeparator className="my-2" />

            {/* Finance Section */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Finance</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {financeMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`transition-all duration-300 rounded-xl relative h-11 ${isActive
                            ? "bg-amber-500/20 text-amber-500 font-bold shadow-lg scale-[1.02] border border-amber-500/20"
                            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                            }`}
                        >
                          <Link to={item.path} className="flex items-center gap-3 px-3">
                            <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                            <span className="font-semibold text-sm">{item.label}</span>
                            {isActive && (
                              <div className="absolute right-2 w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-in fade-in duration-500" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {lmsEnabled && (
              <>
                <SidebarSeparator className="my-2" />

                {/* Attendance Section */}
                <SidebarGroup>
                  <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-2 flex items-center gap-2">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Attendance</span>
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {attendanceMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                          <SidebarMenuItem key={item.path}>
                            <SidebarMenuButton
                              asChild
                              isActive={isActive}
                              tooltip={item.label}
                              className={`transition-all duration-300 rounded-xl relative h-11 ${isActive
                                ? "bg-blue-500/20 text-blue-500 font-bold shadow-lg scale-[1.02] border border-blue-500/20"
                                : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
                                }`}
                            >
                              <Link to={item.path} className="flex items-center gap-3 px-3">
                                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                <span className="font-semibold text-sm">{item.label}</span>
                                {isActive && (
                                  <div className="absolute right-2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-in fade-in duration-500" />
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
        <SidebarInset className="flex-1 subtle-mesh transition-colors duration-500 overflow-hidden flex flex-col">
          {/* Mobile Navigation Header - Only visible on mobile */}
          <header className="md:hidden flex items-center justify-between p-3 border-b bg-background/80 backdrop-blur-lg sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg hover:bg-primary/10" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary via-accent to-secondary rounded-lg flex items-center justify-center shadow-lg">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-black tracking-tight bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent italic">
                  TelePost
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg relative hover:bg-primary/5">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent rounded-full border border-background shadow-sm" />
            </Button>
          </header>

          <main className="p-4 md:p-8 lg:p-12 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out flex-1" id="main-content">
            {children}
          </main>
        </SidebarInset>
      </div>
    </>
  );
}
