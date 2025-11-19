import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { formatDateTime } from "@/lib/utils";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Clock from "lucide-react/dist/esm/icons/clock";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import XCircle from "lucide-react/dist/esm/icons/x-circle";
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
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Quiz Scheduler</h1>
            <p className="text-gray-400">View and manage scheduled quiz posts to your Telegram channel</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">{statistics.pending}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{statistics.sent}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/50 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{statistics.failed}</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-slate-900/50 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Scheduled Posts</span>
            </CardTitle>
            <CardDescription>
              All your scheduled quiz posts and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading scheduled posts...</div>
            ) : scheduledPosts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
