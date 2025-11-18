import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award, Star, RefreshCw, User } from "lucide-react";
import { LeaderboardService, LeaderboardEntry } from "@/services/leaderboardService";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboards() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<{
    rank: number;
    total: number;
    entry: LeaderboardEntry;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLeaderboard();
    loadUserRank();
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

  const loadUserRank = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const rank = await LeaderboardService.getUserRank(user.id, "global");
      setUserRank(rank);
    } catch (error: any) {
      // User might not be on leaderboard yet - this is not an error condition
      // Only show error for unexpected failures
      if (error.message && !error.message.includes("not found")) {
        toast({
          title: "Notice",
          description: "Could not load your rank data",
          variant: "default",
        });
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaderboard();
    await loadUserRank();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Leaderboard updated",
    });
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
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2">
                <Trophy className="w-10 h-10" />
                Leaderboards
              </h1>
              <p className="text-muted-foreground">Compete and track your progress</p>
            </div>
          </div>
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <Trophy className="w-10 h-10" />
              Leaderboards
            </h1>
            <p className="text-muted-foreground">Compete and track your progress</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Your Position */}
        {userRank && (
          <Card className="bg-primary/5 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Your Position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold">#{userRank.rank}</div>
                  <p className="text-sm text-muted-foreground">
                    out of {userRank.total} participants
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{userRank.entry.total_points}</div>
                  <p className="text-sm text-muted-foreground">
                    Level {userRank.entry.level} • {userRank.entry.average_score.toFixed(1)}% avg
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
