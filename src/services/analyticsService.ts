import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data?: Record<string, unknown>;
  quiz_generation_id: string | null;
  document_id: string | null;
  created_at: string;
}

export interface AnalyticsDashboardData {
  totalQuizzes: number;
  totalPdfsUploaded: number;
  totalQuestions: number;
  totalResponses: number;
  quizzesByDay: Array<{ date: string; count: number }>;
  quizzesByTopic: Array<{ topic: string; count: number }>;
  quizzesByDifficulty: Array<{ difficulty: string; count: number }>;
  averageScore: number;
  topTopics: Array<{ topic: string; count: number }>;
  recentActivity: Array<AnalyticsEvent>;
}

export class AnalyticsService {
  /**
   * Track an event
   */
  static async trackEvent(
    userId: string,
    eventType: string,
    eventData?: Record<string, unknown>,
    context?: {
      quizGenerationId?: string;
      documentId?: string;
    }
  ): Promise<void> {
    const { error } = await supabase.from("analytics_events").insert([{
      user_id: userId,
      event_type: eventType,
      event_data: eventData ? JSON.parse(JSON.stringify(eventData)) : null,
      quiz_generation_id: context?.quizGenerationId || null,
      document_id: context?.documentId || null,
    }]);

    if (error) throw error;
  }

  /**
   * Get dashboard analytics
   */
  static async getDashboardData(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<AnalyticsDashboardData> {
    // Build quiz query with optional date range
    let quizQueryBuilder = supabase
      .from("quiz_generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (dateRange) {
      quizQueryBuilder = quizQueryBuilder
        .gte("created_at", dateRange.start.toISOString())
        .lte("created_at", dateRange.end.toISOString());
    }

    // Fetch all counts and data in parallel for better performance
    const [
      quizGenerationsResult,
      sentScheduledQuizzesResult,
      postedTelegramPostsResult,
      pdfsCountResult,
      questionsCountResult,
      quizzesResult,
      recentActivityResult
    ] = await Promise.all([
      supabase
        .from("quiz_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "completed"),
      supabase
        .from("scheduled_telegram_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "sent"),
      supabase
        .from("telegram_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "posted"),
      supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("question_banks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId),
      quizQueryBuilder,
      supabase
        .from("analytics_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20)
    ]);

    // Calculate total quizzes sent to Telegram (from all sources)
    const totalQuizzesSent = (quizGenerationsResult.count || 0) + (sentScheduledQuizzesResult.count || 0) + (postedTelegramPostsResult.count || 0);

    const quizzes = quizzesResult.data || [];
    const quizIds = quizzes.map((q) => q.id);

    // Fetch responses only if there are quizzes
    let responses: Array<{ is_correct: boolean }> = [];
    let totalResponses = 0;

    if (quizIds.length > 0) {
      const { data: responsesData, count } = await supabase
        .from("quiz_responses")
        .select("*", { count: "exact" })
        .in("quiz_generation_id", quizIds);

      responses = responsesData || [];
      totalResponses = count || 0;
    }

    // Calculate average score from is_correct field
    const averageScore =
      responses.length > 0
        ? (responses.filter(r => r.is_correct).length / responses.length) * 100
        : 0;

    // Quizzes by day (last 30 days)
    const quizzesByDay = this.groupByDay(quizzes, 30);

    // Quizzes by topic
    const quizzesByTopic = this.groupByField(quizzes, "topic")
      .filter(q => q.topic)
      .map(q => ({ topic: q.topic!, count: q.count }));

    // Quizzes by difficulty
    const quizzesByDifficulty = this.groupByField(quizzes, "difficulty")
      .filter(q => q.difficulty)
      .map(q => ({ difficulty: q.difficulty!, count: q.count }));

    // Top topics
    const topTopics = quizzesByTopic.slice(0, 5);

    return {
      totalQuizzes: totalQuizzesSent,
      totalPdfsUploaded: pdfsCountResult.count || 0,
      totalQuestions: questionsCountResult.count || 0,
      totalResponses,
      quizzesByDay,
      quizzesByTopic,
      quizzesByDifficulty,
      averageScore: Math.round(averageScore * 100) / 100,
      topTopics,
      recentActivity: (recentActivityResult.data || []).map(event => ({
        ...event,
        event_data: event.event_data && typeof event.event_data === 'object' && !Array.isArray(event.event_data)
          ? event.event_data as Record<string, unknown>
          : undefined
      })),
    };
  }

  /**
   * Group data by day
   */
  private static groupByDay(
    data: Array<{ created_at: string }>,
    days: number
  ): Array<{ date: string; count: number }> {
    const result: { [key: string]: number } = {};
    const today = new Date();

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      result[dateStr] = 0;
    }

    // Count occurrences
    data.forEach((item) => {
      const dateStr = new Date(item.created_at).toISOString().split("T")[0];
      if (result[dateStr] !== undefined) {
        result[dateStr]++;
      }
    });

    return Object.entries(result).map(([date, count]) => ({ date, count }));
  }

  /**
   * Group data by field
   */
  private static groupByField(
    data: Array<Record<string, unknown>>,
    field: string
  ): Array<{ topic?: string; difficulty?: string; count: number }> {
    const result: { [key: string]: number } = {};

    data.forEach((item) => {
      const value = String(item[field] || "Unknown");
      result[value] = (result[value] || 0) + 1;
    });

    return Object.entries(result)
      .map(([key, count]) => ({
        [field]: key,
        count,
      } as { topic?: string; difficulty?: string; count: number }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get engagement metrics
   */
  static async getEngagementMetrics(userId: string): Promise<{
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageQuizzesPerUser: number;
    averageResponseTime: number;
  }> {
    // Get quiz responses
    const { data: quizzes } = await supabase
      .from("quiz_generations")
      .select("id")
      .eq("user_id", userId);

    const quizIds = quizzes?.map((q) => q.id) || [];

    if (quizIds.length === 0) {
      return {
        dailyActiveUsers: 0,
        weeklyActiveUsers: 0,
        monthlyActiveUsers: 0,
        averageQuizzesPerUser: 0,
        averageResponseTime: 0,
      };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Daily active users
    const { count: dailyActiveUsers } = await supabase
      .from("quiz_responses")
      .select("student_telegram_id", { count: "exact", head: true })
      .in("quiz_generation_id", quizIds)
      .gte("created_at", oneDayAgo.toISOString());

    // Weekly active users
    const { count: weeklyActiveUsers } = await supabase
      .from("quiz_responses")
      .select("student_telegram_id", { count: "exact", head: true })
      .in("quiz_generation_id", quizIds)
      .gte("created_at", oneWeekAgo.toISOString());

    // Monthly active users
    const { count: monthlyActiveUsers } = await supabase
      .from("quiz_responses")
      .select("student_telegram_id", { count: "exact", head: true })
      .in("quiz_generation_id", quizIds)
      .gte("created_at", oneMonthAgo.toISOString());

    // Average response time - using 0 as default since time_taken_seconds may not exist in schema
    const averageResponseTime = 0;

    return {
      dailyActiveUsers: dailyActiveUsers || 0,
      weeklyActiveUsers: weeklyActiveUsers || 0,
      monthlyActiveUsers: monthlyActiveUsers || 0,
      averageQuizzesPerUser:
        monthlyActiveUsers && monthlyActiveUsers > 0
          ? quizIds.length / monthlyActiveUsers
          : 0,
      averageResponseTime: Math.round(averageResponseTime),
    };
  }

  /**
   * Export analytics data
   */
  static async exportData(
    userId: string,
    format: "csv" | "json"
  ): Promise<string> {
    const data = await this.getDashboardData(userId);

    if (format === "json") {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    let csv = "Metric,Value\n";
    csv += `Total Quizzes,${data.totalQuizzes}\n`;
    csv += `Total PDFs,${data.totalPdfsUploaded}\n`;
    csv += `Total Questions,${data.totalQuestions}\n`;
    csv += `Total Responses,${data.totalResponses}\n`;
    csv += `Average Score,${data.averageScore}%\n\n`;

    csv += "Topic,Count\n";
    data.quizzesByTopic.forEach((item: { topic: string; count: number }) => {
      csv += `${item.topic},${item.count}\n`;
    });

    return csv;
  }
}
