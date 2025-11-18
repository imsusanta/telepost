import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ScheduledPost = Database['public']['Tables']['scheduled_telegram_posts']['Row'];

export default function Scheduler() {
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScheduledPosts();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('scheduled_posts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_telegram_posts'
        },
        () => {
          fetchScheduledPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchScheduledPosts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('scheduled_telegram_posts')
      .select('*')
      .order('scheduled_time', { ascending: false });

    if (error) {
      console.error('Error fetching scheduled posts:', error);
    } else {
      setScheduledPosts(data || []);
    }
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'sent':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="w-3 h-3" /> Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Quiz Scheduler</h1>
          <p className="text-gray-400">View and manage scheduled quiz posts to your Telegram channel</p>
        </div>

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledPosts.map((post) => {
                      const quizData = post.quiz_data as any;
                      return (
                        <TableRow key={post.id}>
                          <TableCell className="font-medium">
                            {quizData?.topic || 'N/A'}
                          </TableCell>
                          <TableCell>{post.chat_id}</TableCell>
                          <TableCell>
                            {format(new Date(post.scheduled_time), 'PPp')}
                          </TableCell>
                          <TableCell>{getStatusBadge(post.status)}</TableCell>
                          <TableCell>
                            {post.sent_at ? format(new Date(post.sent_at), 'PPp') : '-'}
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
