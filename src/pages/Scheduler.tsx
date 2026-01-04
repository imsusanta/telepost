import DashboardLayout from "@/components/DashboardLayout";
import { AlertCircle, Calendar, CheckCircle2, Clock, RefreshCw, RotateCcw, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { formatDateTime } from "@/lib/utils";
import { LoadingState } from "@/components/LoadingState";
import { useToast } from "@/hooks/use-toast";
import type { Quiz } from "@/types/quiz";

export default function Scheduler() {
  const { scheduledPosts, isLoading, statistics, refetch, cancelPost, retryPost } = useScheduledPosts();
  const { toast } = useToast();

  const handleCancel = async (postId: string) => {
    if (window.confirm("Are you sure you want to cancel this scheduled post?")) {
      await cancelPost(postId);
    }
  };

  const handleRetry = async (postId: string) => {
    await retryPost(postId);
  };

  const handleRefresh = async () => {
    await refetch();
    toast({
      title: "Refreshed",
      description: "Scheduled posts updated",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'sent':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="w-3 h-3" /> Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Quiz Scheduler</h1>
              <p className="text-muted-foreground">View and manage your scheduled Telegram posts</p>
            </div>
          </div>
          <LoadingState message="Loading scheduled posts..." />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center bg-white/5 p-6 rounded-3xl backdrop-blur-sm border border-white/10">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-tight">Post Statistics</h2>
            <p className="text-muted-foreground font-medium">Overview of your scheduled quiz performance</p>
          </div>
          <Button variant="outline" size="lg" onClick={handleRefresh} className="gap-2 clay-button shadow-clay-lg hover:shadow-glow-primary transition-all duration-300">
            <RefreshCw className="w-5 h-5" />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="clay-card-hover p-6 flex flex-col justify-between h-32">
              <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Total Posts</span>
              <div className="text-4xl font-black text-foreground">{statistics.total}</div>
            </div>
            <div className="clay-card-hover p-6 flex flex-col justify-between h-32">
              <span className="text-xs font-black text-yellow-500/80 uppercase tracking-widest">Pending</span>
              <div className="text-4xl font-black text-yellow-500">{statistics.pending}</div>
            </div>
            <div className="clay-card-hover p-6 flex flex-col justify-between h-32">
              <span className="text-xs font-black text-emerald-500/80 uppercase tracking-widest">Sent</span>
              <div className="text-4xl font-black text-emerald-500">{statistics.sent}</div>
            </div>
            <div className="clay-card-hover p-6 flex flex-col justify-between h-32">
              <span className="text-xs font-black text-destructive/80 uppercase tracking-widest">Failed</span>
              <div className="text-4xl font-black text-destructive">{statistics.failed}</div>
            </div>
          </div>
        )}

        <div className="clay-card p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-foreground flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                Scheduled Posts
              </h3>
              <p className="text-muted-foreground font-medium">All your scheduled quiz posts and their status</p>
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading scheduled posts...</div>
            ) : scheduledPosts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted" />
                <p>No scheduled posts yet. Create a quiz and schedule it to see it here!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Quiz Topic</TableHead>
                      <TableHead>Chat ID</TableHead>
                      <TableHead>Scheduled Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledPosts.map((post) => {
                      const quizData = post.quiz_data as unknown as Quiz;
                      return (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">
                            {quizData?.topic || 'N/A'}
                          </TableCell>
                          <TableCell>{post.chat_id}</TableCell>
                          <TableCell>
                            {formatDateTime(post.scheduled_time)}
                          </TableCell>
                          <TableCell>{getStatusBadge(post.status)}</TableCell>
                          <TableCell>
                            {post.sent_at ? formatDateTime(post.sent_at) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {post.status === 'pending' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(post.id)}
                                  className="gap-1 text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Cancel
                                </Button>
                              )}
                              {post.status === 'failed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetry(post.id)}
                                  className="gap-1"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Retry
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
