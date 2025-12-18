import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CourseService, Course, Enrollment } from "@/services/courseService";
import { 
  BookOpen, 
  Clock, 
  Trophy,
  Play,
  Calendar,
  TrendingUp,
  GraduationCap,
  Bell,
  ChevronRight,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function StudentDashboard() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [enrollmentsData, coursesData] = await Promise.all([
        CourseService.getMyEnrollments(),
        CourseService.getCourses({ publishedOnly: true, limit: 6 }),
      ]);
      setEnrollments(enrollmentsData);
      setFeaturedCourses(coursesData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const totalProgress = activeEnrollments.length > 0
    ? Math.round(activeEnrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / activeEnrollments.length)
    : 0;

  const stats = [
    {
      icon: BookOpen,
      label: "Enrolled Courses",
      value: enrollments.length,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Play,
      label: "In Progress",
      value: activeEnrollments.length,
      color: "text-accent-foreground",
      bg: "bg-accent/10",
    },
    {
      icon: Trophy,
      label: "Completed",
      value: completedEnrollments.length,
      color: "text-success-foreground",
      bg: "bg-success/10",
    },
    {
      icon: TrendingUp,
      label: "Avg. Progress",
      value: `${totalProgress}%`,
      color: "text-secondary-foreground",
      bg: "bg-secondary/10",
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold gradient-text-primary">Welcome Back!</h1>
            <p className="text-muted-foreground mt-1">Continue your learning journey</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 clay-input"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="clay-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${stat.bg}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Learning */}
        {activeEnrollments.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Continue Learning</h2>
              <Link to="/dashboard/my-courses">
                <Button variant="ghost" className="gap-2">
                  View All <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEnrollments.slice(0, 3).map((enrollment) => (
                <Card key={enrollment.id} className="clay-card-hover overflow-hidden group">
                  <div className="h-32 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center relative">
                    {enrollment.course?.thumbnail_url ? (
                      <img
                        src={enrollment.course.thumbnail_url}
                        alt={enrollment.course?.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-12 h-12 text-primary/50" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <Button
                      size="icon"
                      className="absolute bottom-3 right-3 clay-button rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold line-clamp-1">{enrollment.course?.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {enrollment.course?.description || "No description"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{enrollment.progress_percentage}%</span>
                      </div>
                      <Progress value={enrollment.progress_percentage} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Explore Courses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Explore Courses</h2>
            <Link to="/dashboard/explore">
              <Button variant="ghost" className="gap-2">
                Browse All <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {featuredCourses.length === 0 ? (
            <Card className="clay-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No courses available</h3>
                <p className="text-muted-foreground">Check back later for new courses</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredCourses.map((course) => (
                <Card key={course.id} className="clay-card-hover overflow-hidden">
                  <div className="h-40 bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20 flex items-center justify-center">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen className="w-16 h-16 text-primary/50" />
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{course.category}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{course.difficulty_level}</Badge>
                    </div>
                    <CardTitle className="line-clamp-1">{course.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {course.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {course.duration_hours}h
                      </div>
                      <p className="font-bold text-lg">
                        {course.price > 0 ? `₹${course.price}` : "Free"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="clay-card-hover cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Upcoming Classes</h3>
                <p className="text-sm text-muted-foreground">View your schedule</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="clay-card-hover cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-accent/10">
                <Bell className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">Stay updated</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="clay-card-hover cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-success/10">
                <Trophy className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Certificates</h3>
                <p className="text-sm text-muted-foreground">View your achievements</p>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
