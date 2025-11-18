import { supabase } from "@/integrations/supabase/client";

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  student_name?: string;
  student_telegram_id?: string;
  board_type: string;
  board_key?: string;
  total_quizzes_taken: number;
  total_questions_answered: number;
  total_correct_answers: number;
  average_score: number;
  total_points: number;
  rank?: number;
  level: number;
  experience_points: number;
  badges?: string[];
  last_quiz_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: string;
}

export class LeaderboardService {
  /**
   * Update leaderboard after quiz completion
   */
  static async updateAfterQuizCompletion(
    userId: string,
    studentInfo: {
      name?: string;
      telegramId?: string;
    },
    quizResult: {
      totalQuestions: number;
      correctAnswers: number;
      score: number;
      percentage: number;
    },
    boardType: string = "global",
    boardKey?: string
  ): Promise<LeaderboardEntry> {
    // Calculate points (could be customized)
    const pointsEarned = Math.round(quizResult.percentage * 10);
    const xpEarned = quizResult.correctAnswers * 10;

    // Get existing entry or create new
    const { data: existing } = await supabase
      .from("leaderboards")
      .select("*")
      .eq("user_id", userId)
      .eq("board_type", boardType)
      .eq("board_key", boardKey || "")
      .single();

    if (existing) {
      // Update existing entry
      const newTotalPoints = existing.total_points + pointsEarned;
      const newXp = existing.experience_points + xpEarned;
      const newLevel = Math.floor(newXp / 1000) + 1; // Level up every 1000 XP
      const newTotalQuestions =
        existing.total_questions_answered + quizResult.totalQuestions;
      const newTotalCorrect =
        existing.total_correct_answers + quizResult.correctAnswers;
      const newAverageScore = (newTotalCorrect / newTotalQuestions) * 100;

      const { data, error } = await supabase
        .from("leaderboards")
        .update({
          total_quizzes_taken: existing.total_quizzes_taken + 1,
          total_questions_answered: newTotalQuestions,
          total_correct_answers: newTotalCorrect,
          average_score: newAverageScore,
          total_points: newTotalPoints,
          experience_points: newXp,
          level: newLevel,
          last_quiz_at: new Date().toISOString(),
          student_name: studentInfo.name || existing.student_name,
          student_telegram_id: studentInfo.telegramId || existing.student_telegram_id,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;

      // Check for new badges
      await this.checkAndAwardBadges(data.id, data);

      return data;
    } else {
      // Create new entry
      const level = Math.floor(xpEarned / 1000) + 1;

      const { data, error } = await supabase
        .from("leaderboards")
        .insert({
          user_id: userId,
          student_name: studentInfo.name,
          student_telegram_id: studentInfo.telegramId,
          board_type: boardType,
          board_key: boardKey,
          total_quizzes_taken: 1,
          total_questions_answered: quizResult.totalQuestions,
          total_correct_answers: quizResult.correctAnswers,
          average_score: quizResult.percentage,
          total_points: pointsEarned,
          level: level,
          experience_points: xpEarned,
          badges: [],
          last_quiz_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Check for new badges
      await this.checkAndAwardBadges(data.id, data);

      return data;
    }
  }

  /**
   * Get leaderboard rankings
   */
  static async getLeaderboard(
    boardType: string = "global",
    boardKey?: string,
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    let query = supabase
      .from("leaderboards")
      .select("*")
      .eq("board_type", boardType)
      .order("total_points", { ascending: false })
      .limit(limit);

    if (boardKey) {
      query = query.eq("board_key", boardKey);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Add ranks
    return (data || []).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  /**
   * Get user's rank
   */
  static async getUserRank(
    userId: string,
    boardType: string = "global",
    boardKey?: string
  ): Promise<{ rank: number; total: number; entry: LeaderboardEntry }> {
    const leaderboard = await this.getLeaderboard(boardType, boardKey, 10000);
    const userEntry = leaderboard.find((entry) => entry.user_id === userId);

    if (!userEntry) {
      throw new Error("User not found in leaderboard");
    }

    return {
      rank: userEntry.rank || 0,
      total: leaderboard.length,
      entry: userEntry,
    };
  }

  /**
   * Check and award badges
   */
  private static async checkAndAwardBadges(
    leaderboardId: string,
    entry: LeaderboardEntry
  ): Promise<string[]> {
    const newBadges: string[] = [];
    const currentBadges = entry.badges || [];

    // Define badge criteria
    const badgeCriteria = [
      {
        id: "first_quiz",
        name: "First Steps",
        condition: entry.total_quizzes_taken >= 1,
      },
      {
        id: "quiz_master",
        name: "Quiz Master",
        condition: entry.total_quizzes_taken >= 10,
      },
      {
        id: "quiz_legend",
        name: "Quiz Legend",
        condition: entry.total_quizzes_taken >= 50,
      },
      {
        id: "perfect_score",
        name: "Perfect Score",
        condition: entry.average_score === 100,
      },
      {
        id: "high_achiever",
        name: "High Achiever",
        condition: entry.average_score >= 90,
      },
      {
        id: "level_5",
        name: "Level 5 Unlocked",
        condition: entry.level >= 5,
      },
      {
        id: "level_10",
        name: "Level 10 Unlocked",
        condition: entry.level >= 10,
      },
      {
        id: "point_collector",
        name: "Point Collector",
        condition: entry.total_points >= 1000,
      },
    ];

    // Check each badge
    for (const badge of badgeCriteria) {
      if (badge.condition && !currentBadges.includes(badge.id)) {
        newBadges.push(badge.id);
      }
    }

    // Update if there are new badges
    if (newBadges.length > 0) {
      const updatedBadges = [...currentBadges, ...newBadges];
      await supabase
        .from("leaderboards")
        .update({ badges: updatedBadges })
        .eq("id", leaderboardId);
    }

    return newBadges;
  }

  /**
   * Get available badges
   */
  static getBadgeDefinitions(): Badge[] {
    return [
      {
        id: "first_quiz",
        name: "First Steps",
        description: "Complete your first quiz",
        icon: "🎯",
        requirement: "Take 1 quiz",
      },
      {
        id: "quiz_master",
        name: "Quiz Master",
        description: "Complete 10 quizzes",
        icon: "🏆",
        requirement: "Take 10 quizzes",
      },
      {
        id: "quiz_legend",
        name: "Quiz Legend",
        description: "Complete 50 quizzes",
        icon: "👑",
        requirement: "Take 50 quizzes",
      },
      {
        id: "perfect_score",
        name: "Perfect Score",
        description: "Maintain 100% average",
        icon: "⭐",
        requirement: "100% average score",
      },
      {
        id: "high_achiever",
        name: "High Achiever",
        description: "Maintain 90%+ average",
        icon: "🌟",
        requirement: "90%+ average score",
      },
      {
        id: "level_5",
        name: "Level 5 Unlocked",
        description: "Reach level 5",
        icon: "🔥",
        requirement: "Reach level 5",
      },
      {
        id: "level_10",
        name: "Level 10 Unlocked",
        description: "Reach level 10",
        icon: "💎",
        requirement: "Reach level 10",
      },
      {
        id: "point_collector",
        name: "Point Collector",
        description: "Earn 1000 points",
        icon: "💰",
        requirement: "Earn 1000 points",
      },
    ];
  }

  /**
   * Get leaderboard statistics
   */
  static async getStatistics(
    boardType: string = "global",
    boardKey?: string
  ): Promise<{
    totalParticipants: number;
    averageScore: number;
    totalQuizzesTaken: number;
    topPerformer: LeaderboardEntry | null;
  }> {
    const leaderboard = await this.getLeaderboard(boardType, boardKey, 10000);

    if (leaderboard.length === 0) {
      return {
        totalParticipants: 0,
        averageScore: 0,
        totalQuizzesTaken: 0,
        topPerformer: null,
      };
    }

    const totalQuizzes = leaderboard.reduce(
      (sum, entry) => sum + entry.total_quizzes_taken,
      0
    );
    const avgScore =
      leaderboard.reduce((sum, entry) => sum + entry.average_score, 0) /
      leaderboard.length;

    return {
      totalParticipants: leaderboard.length,
      averageScore: Math.round(avgScore * 100) / 100,
      totalQuizzesTaken: totalQuizzes,
      topPerformer: leaderboard[0] || null,
    };
  }
}
