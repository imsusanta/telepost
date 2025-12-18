import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Users, 
  Calendar, 
  FileText, 
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingState } from "@/components/LoadingState";
import { Link } from "react-router-dom";

export default function TeacherDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: myCourses, isLoading: coursesLoading } = useQuery({
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

  const { data: myBatches } = useQuery({
    queryKey: ['teacher-batches', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('batches')
        .select('*, enrollments(count)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: upcomingClasses } = useQuery({
    queryKey: ['upcoming-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('live_classes')
        .select('*, batch:batches(name), course:courses(title)')
        .eq('created_by', user.id)
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at')
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: recentTests } = useQuery({
    queryKey: ['recent-tests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('tests')
        .select('*, test_questions(count)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const stats = {
    totalCourses: myCourses?.length || 0,
    totalBatches: myBatches?.length || 0,
    totalStudents: myBatches?.reduce((sum, b) => sum + (b.enrollments?.[0]?.count || 0), 0) || 0,
    upcomingClasses: upcomingClasses?.length || 0,
  };

  if (coursesLoading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading teacher dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your courses, students, and content</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCourses}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">My Batches</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBatches}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingClasses}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/dashboard/courses"><BookOpen className="w-4 h-4 mr-2" /> Create Course</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/batches"><Users className="w-4 h-4 mr-2" /> Create Batch</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/tests"><FileText className="w-4 h-4 mr-2" /> Create Test</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard/live-classes"><Calendar className="w-4 h-4 mr-2" /> Schedule Class</Link>
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">My Courses</TabsTrigger>
            <TabsTrigger value="batches">My Batches</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Upcoming Classes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Upcoming Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingClasses?.length ? (
                    <div className="space-y-3">
                      {upcomingClasses.map((cls: Record<string, unknown>) => (
                        <div key={cls.id as string} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{cls.title as string}</p>
                            <p className="text-sm text-muted-foreground">
                              {(cls.batch as { name: string })?.name || (cls.course as { title: string })?.title}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(cls.scheduled_at as string).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No upcoming classes</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Tests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Recent Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentTests?.length ? (
                    <div className="space-y-3">
                      {recentTests.map((test: Record<string, unknown>) => (
                        <div key={test.id as string} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{test.title as string}</p>
                            <p className="text-sm text-muted-foreground">
                              {(test.test_questions as { count: number }[])?.[0]?.count || 0} questions
                            </p>
                          </div>
                          <Badge variant={test.is_published ? "default" : "secondary"}>
                            {test.is_published ? "Published" : "Draft"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">No tests created</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCourses?.map((course: Record<string, unknown>) => (
                <Card key={course.id as string}>
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title as string}</CardTitle>
                    <CardDescription>{course.category as string || "General"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Chapters</span>
                        <span>{(course.chapters as { count: number }[])?.[0]?.count || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Enrollments</span>
                        <span>{(course.enrollments as { count: number }[])?.[0]?.count || 0}</span>
                      </div>
                      <Badge variant={course.is_published ? "default" : "secondary"} className="mt-2">
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!myCourses || myCourses.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No courses created yet. <Link to="/dashboard/courses" className="text-primary underline">Create your first course</Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="batches">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myBatches?.map((batch: Record<string, unknown>) => (
                <Card key={batch.id as string}>
                  <CardHeader>
                    <CardTitle className="text-lg">{batch.name as string}</CardTitle>
                    <CardDescription>{batch.timing as string || "No timing set"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Students</span>
                        <span>
                          {(() => {
                            const enrollments = batch.enrollments as unknown as { count: number }[] | null;
                            const count = enrollments?.[0]?.count ?? 0;
                            const capacity = batch.capacity as number | null;
                            return `${count} / ${capacity ?? '∞'}`;
                          })()}
                        </span>
                      </div>
                      <Progress 
                        value={batch.capacity ? (((batch.enrollments as unknown as { count: number }[])?.[0]?.count ?? 0) / (batch.capacity as number) * 100) : 0}
                        className="h-2"
                      />
                      <Badge variant={batch.status === 'active' ? "default" : "secondary"} className="mt-2">
                        {batch.status as string}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!myBatches || myBatches.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No batches created yet. <Link to="/dashboard/batches" className="text-primary underline">Create your first batch</Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Your upcoming classes and sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingClasses?.length ? (
                  <div className="space-y-4">
                    {upcomingClasses.map((cls: Record<string, unknown>) => (
                      <div key={cls.id as string} className="flex items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0 w-16 h-16 bg-primary/10 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            {new Date(cls.scheduled_at as string).toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-xl font-bold">
                            {new Date(cls.scheduled_at as string).getDate()}
                          </span>
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium">{cls.title as string}</p>
                          <p className="text-sm text-muted-foreground">
                            {(cls.batch as { name: string })?.name} • {cls.duration_minutes as number} mins
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {new Date(cls.scheduled_at as string).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <Badge variant="outline">{(cls.platform as string) || "Online"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No upcoming classes scheduled
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
