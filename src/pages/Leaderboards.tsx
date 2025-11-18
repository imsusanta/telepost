import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star } from "lucide-react";
import { LeaderboardService, LeaderboardEntry } from "@/services/leaderboardService";
import { useToast } from "@/hooks/use-toast";

export default function Leaderboards() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await LeaderboardService.getLeaderboard("global", undefined, 50);
      setLeaderboard(data);
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return null;
  };

  const badgeDefinitions = LeaderboardService.getBadgeDefinitions();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">Loading leaderboard...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Leaderboards</h1>
          <p className="text-muted-foreground">Compete and track your progress</p>
        </div>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Available Badges
            </CardTitle>
            <CardDescription>Earn badges by completing achievements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badgeDefinitions.map((badge) => (
                <div
                  key={badge.id}
                  className="p-4 border rounded-lg text-center hover:border-primary transition-colors"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-semibold text-sm">{badge.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{badge.requirement}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Global Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Global Leaderboard
            </CardTitle>
            <CardDescription>Top performers worldwide</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No entries yet. Be the first to participate!
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      index < 3 ? "bg-primary/5 border-primary" : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-8 text-center font-bold">
                        {getRankIcon(index + 1) || `#${index + 1}`}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {entry.student_name || `User ${entry.user_id.substring(0, 8)}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Level {entry.level} • {entry.total_quizzes_taken} quizzes •{" "}
                          {entry.average_score.toFixed(1)}% avg
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xl text-primary">{entry.total_points}</div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                    {entry.badges && entry.badges.length > 0 && (
                      <div className="ml-4 flex gap-1">
                        {entry.badges.slice(0, 3).map((badgeId) => {
                          const badge = badgeDefinitions.find((b) => b.id === badgeId);
                          return badge ? (
                            <span key={badgeId} title={badge.name} className="text-xl">
                              {badge.icon}
                            </span>
                          ) : null;
                        })}
                        {entry.badges.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{entry.badges.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Participants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{leaderboard.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leaderboard.length > 0
                  ? (
                      leaderboard.reduce((sum, e) => sum + e.average_score, 0) /
                      leaderboard.length
                    ).toFixed(1)
                  : 0}
                %
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total Quizzes Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {leaderboard.reduce((sum, e) => sum + e.total_quizzes_taken, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
