import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ChevronDown,
  Info,
  Grid
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/LoadingState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardStats } from "@/components/DashboardStats";
import { StatusDistribution } from "@/components/StatusDistribution";

export default function TeacherDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('courses')
        .select('*, chapters(count), enrollments(count)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Mock data for students to match the UI inspiration
  const mockStudents = [
    { id: "1", name: "Sabine Klein", workCompleted: 33, totalWork: 36, averageScore: 23, needingAttention: 45, workingTowards: 8, mastered: 7, status: "coral" },
    { id: "2", name: "Dante Podenzana", workCompleted: 31, totalWork: 36, averageScore: 53, needingAttention: 6, workingTowards: 35, mastered: 19, status: "yellow" },
    { id: "3", name: "Susan Chan", workCompleted: 27, totalWork: 36, averageScore: 82, needingAttention: 1, workingTowards: 14, mastered: 45, status: "green" },
  ];

  if (coursesLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading teacher dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 pb-20">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div className="flex items-center gap-6">
            <h1 className="text-5xl font-black text-foreground tracking-tight">Dashboard</h1>

            <div className="hidden lg:flex items-center gap-4">
              <Button variant="outline" className="rounded-2xl border-2 px-4 py-6 gap-2 font-bold text-lg hover:bg-muted/50 transition-all">
                <Users className="w-5 h-5" />
                Class A
                <ChevronDown className="w-5 h-5 opacity-50" />
              </Button>

              <div className="flex -space-x-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Avatar key={i} className="w-12 h-12 border-4 border-background shadow-md">
                    <AvatarImage src={`https://i.pravatar.cc/150?u=${i}`} />
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                ))}
                <div className="w-12 h-12 rounded-full bg-muted border-4 border-background flex items-center justify-center text-sm font-bold shadow-md">
                  +8
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-card px-6 py-4 rounded-2xl flex items-center gap-4 shadow-sm border border-border/40">
              <span className="flex items-center gap-2 font-bold text-muted-foreground mr-2">
                <span className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                Alerts
              </span>
              <div className="flex gap-2">
                <Badge className="bg-muted text-foreground font-bold px-2 rounded-lg">6</Badge>
                <Badge className="bg-destructive text-destructive-foreground font-bold px-2 rounded-lg">3</Badge>
              </div>
              <Button variant="ghost" size="icon" className="ml-2">
                <Grid className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-transparent h-auto p-0 gap-8 mb-8 border-b-2 border-border/20 w-full justify-start rounded-none">
            {["overview", "prepare", "teach", "assess", "monitor"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-foreground border-b-4 border-transparent rounded-none px-4 py-4 text-xl font-bold text-muted-foreground transition-all hover:text-foreground/70"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-10 mt-6 outline-none">
            {/* Hero Stats */}
            <DashboardStats
              overallScore={68}
              gradeAverage={71}
              workAssigned={36}
              workAssignedAverage={38}
            />

            {/* Status Distribution Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatusDistribution
                count={5}
                percentage={20}
                gradeAvg={23}
                status="green"
                students={mockStudents.map(s => ({ name: s.name }))}
              />
              <StatusDistribution
                count={10}
                percentage={40}
                gradeAvg={50}
                status="yellow"
                students={mockStudents.map(s => ({ name: s.name }))}
              />
              <StatusDistribution
                count={5}
                percentage={20}
                gradeAvg={15}
                status="coral"
                students={mockStudents.map(s => ({ name: s.name }))}
              />
            </div>

            {/* Students Proficiency Section */}
            <div className="space-y-6 pt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-foreground">Students Proficiency</h2>
                <div className="flex items-center gap-6 text-sm font-bold text-muted-foreground">
                  <span className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors">
                    <Info className="w-4 h-4" /> Learning Objectives
                  </span>
                  <span className="flex items-center gap-2 cursor-pointer hover:text-foreground transition-colors underline underline-offset-4 decoration-2">
                    All Strands
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-card rounded-5xl soft-shadow-lg border border-border/40 overflow-hidden">
                <div className="grid grid-cols-[2fr,1fr,2fr,1fr,1fr,1fr] px-8 py-6 text-xs font-black text-muted-foreground uppercase tracking-widest border-b border-border/20">
                  <div>Full Name</div>
                  <div className="text-center">Work Completed</div>
                  <div className="text-center">Average Score</div>
                  <div className="text-center">Needing Attention</div>
                  <div className="text-center">Working Towards</div>
                  <div className="text-center">Mastered</div>
                </div>

                <div className="p-4 space-y-4">
                  {mockStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`grid grid-cols-[2fr,1fr,2fr,1fr,1fr,1fr] items-center px-6 py-6 rounded-4xl transition-all duration-300 hover:scale-[1.01] shadow-sm ${student.status === "green" ? "row-green" :
                          student.status === "yellow" ? "row-yellow" :
                            "row-coral"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-white/50">
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${student.id}`} />
                          <AvatarFallback>{student.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-lg font-bold text-foreground">{student.name}</span>
                      </div>

                      <div className="text-center text-lg font-bold text-muted-foreground">
                        {student.workCompleted} / {student.totalWork}
                      </div>

                      <div className="px-8">
                        <div className="relative h-12 bg-white dark:bg-background/20 rounded-xl overflow-hidden shadow-inner flex items-center">
                          <div
                            className={`h-full opacity-80 ${student.status === "green" ? "bg-[hsl(var(--playful-green))]" :
                                student.status === "yellow" ? "bg-[hsl(var(--playful-yellow))]" :
                                  "bg-[hsl(var(--playful-coral))]"
                              }`}
                            style={{ width: `${student.averageScore}%` }}
                          />
                          <span className="absolute left-4 text-xl font-black text-foreground">{student.averageScore}%</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/40 dark:bg-background/40">
                          <div className={`w-3 h-3 rounded-full ${student.needingAttention > 10 ? 'bg-destructive animate-pulse' : 'bg-destructive/30'}`} />
                          <span className="ml-1 text-lg font-bold">{student.needingAttention}</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/40 dark:bg-background/40">
                          <div className="w-3 h-3 rounded-full bg-playful-yellow" />
                          <span className="ml-1 text-lg font-bold">{student.workingTowards}</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/40 dark:bg-background/40">
                          <div className="w-3 h-3 rounded-full bg-playful-green" />
                          <span className="ml-1 text-lg font-bold">{student.mastered}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
