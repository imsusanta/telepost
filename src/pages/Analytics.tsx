import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AnalyticsService, AnalyticsDashboardData } from "@/services/analyticsService";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, FileText, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Analytics() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const analyticsData = await AnalyticsService.getDashboardData(user.id);
      setData(analyticsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Loading analytics...</div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">No analytics data available</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your quiz engagement and performance</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalQuizzes}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total PDFs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalPdfsUploaded}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Question Bank</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.averageScore.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quizzes Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Quizzes Over Time (Last 30 Days)</CardTitle>
              <CardDescription>Daily quiz generation trend</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.quizzesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" name="Quizzes" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quizzes by Topic */}
          <Card>
            <CardHeader>
              <CardTitle>Quizzes by Topic</CardTitle>
              <CardDescription>Distribution of quiz topics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.quizzesByTopic.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="topic" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Difficulty Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Distribution</CardTitle>
              <CardDescription>Quiz difficulty breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.quizzesByDifficulty}
                    dataKey="count"
                    nameKey="difficulty"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {data.quizzesByDifficulty.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Topics */}
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Topics</CardTitle>
              <CardDescription>Most popular quiz topics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.topTopics.map((topic: any, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{topic.topic}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(topic.count / data.topTopics[0].count) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-8">{topic.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest quiz generation events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentActivity.slice(0, 10).map((event) => (
                <div key={event.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <span className="font-medium">{event.event_type}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
