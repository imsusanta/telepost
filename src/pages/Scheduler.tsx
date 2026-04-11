import DashboardLayout from "@/components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
  Trash2,
  XCircle,
  Search,
  LayoutGrid,
  List,
  MessageSquare,
  Timer,
  History,
  MoreVertical,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScheduledPosts } from "@/hooks/useScheduledPosts";
import { ScheduledPost } from "@/services/schedulerService";
import { formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useState, useMemo, useEffect, useRef } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Quiz } from "@/types/quiz";
import { AutoScheduleCard } from "@/components/AutoScheduleCard";
import { supabase } from "@/integrations/supabase/client";
import { Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Scheduler() {
  const navigate = useNavigate();
  const {
    scheduledPosts,
    isLoading,
    statistics,
    refetch,
    cancelPost,
    retryPost,
    page,
    setPage,
    totalPages,
    totalCount
  } = useScheduledPosts();

  const { canAccess } = useSubscription();
  const hasAccess = canAccess('scheduler');

  if (!hasAccess && !isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Calendar className="w-16 h-16 text-muted-foreground opacity-20" />
          <h2 className="text-2xl font-bold">Premium Feature</h2>
          <p className="text-muted-foreground text-center max-w-md">
            The Scheduler is available for Basic and Pro users. Upgrade your plan to unlock automated Telegram broadcasts.
          </p>
          <Button onClick={() => navigate("/dashboard/settings")}>
            Upgrade to Pro
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoProcessEnabled, setAutoProcessEnabled] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const lastAutoProcessRef = useRef<Date | null>(null);
  const lastScheduleCheckRef = useRef<string | null>(null);

  // Auto-poll: Process pending posts every 30 seconds
  useEffect(() => {
    if (!autoProcessEnabled) return;

    const autoProcessPendingPosts = async () => {
      // Only process if there are pending posts and not currently processing
      if ((statistics?.pending ?? 0) > 0 && !isProcessing) {
        try {
          console.log('[Auto-Scheduler] Processing pending posts...');
          const { data, error } = await supabase.functions.invoke('process-scheduled-posts', {
            body: { triggered_by: 'auto-poll' }
          });

          if (!error && (data?.sent || 0) > 0) {
            console.log(`[Auto-Scheduler] Sent ${data.sent} post(s)`);
            lastAutoProcessRef.current = new Date();
            await refetch();
          }
        } catch (err) {
          console.error('[Auto-Scheduler] Post processing error:', err);
        }
      }
    };

    // Initial check after 5 seconds
    const initialTimeout = setTimeout(autoProcessPendingPosts, 5000);

    // Then check every 30 seconds
    const interval = setInterval(autoProcessPendingPosts, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [autoProcessEnabled, statistics?.pending, isProcessing, refetch]);

  // Auto-poll: Check scheduled times and create new posts every minute (for daily loop)
  useEffect(() => {
    if (!autoProcessEnabled) return;

    const checkScheduledTimes = async () => {
      // Get current minute to avoid duplicate calls within the same minute
      const now = new Date();
      const currentMinuteKey = `${now.getHours()}:${now.getMinutes()}`;

      if (lastScheduleCheckRef.current === currentMinuteKey) {
        return; // Already checked this minute
      }

      try {
        console.log(`[Daily-Loop] Checking schedules at ${currentMinuteKey}...`);
        const { data, error } = await supabase.functions.invoke('process-auto-schedule', {
          body: { triggered_by: 'daily-loop' }
        });

        lastScheduleCheckRef.current = currentMinuteKey;

        if (!error && data?.processed > 0) {
          console.log(`[Daily-Loop] Created ${data.processed} scheduled post(s)`);
          toast({
            title: "Auto-Scheduler",
            description: `Created ${data.processed} new quiz post(s)`,
          });
          await refetch();
        }
      } catch (err) {
        console.error('[Daily-Loop] Schedule check error:', err);
      }
    };

    // Initial check after 10 seconds
    const initialTimeout = setTimeout(checkScheduledTimes, 10000);

    // Then check every 60 seconds (minutely)
    const interval = setInterval(checkScheduledTimes, 60000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [autoProcessEnabled, refetch, toast]);

  const handleProcessPending = async () => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-scheduled-posts', {
        body: { triggered_by: 'manual' }
      });

      if (error) throw error;

      toast({
        title: "Posts Processed",
        description: `Successfully processed ${data?.sent || 0} post(s). ${data?.failed || 0} failed.`,
      });

      // Refresh the list
      await refetch();
    } catch (error: any) {
      console.error('Error processing posts:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process pending posts.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = (postId: string) => {
    setCancelTargetId(postId);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (cancelTargetId) {
      await cancelPost(cancelTargetId);
    }
    setCancelDialogOpen(false);
    setCancelTargetId(null);
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

  const filteredPosts = useMemo(() => {
    return scheduledPosts.filter((post) => {
      const quizData = post.quiz_data as unknown as Quiz;
      const matchesSearch = (quizData?.topic || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || post.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [scheduledPosts, searchQuery, statusFilter]);

  const getStatusBadge = (post: ScheduledPost) => {
    switch (post.status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-blue-500/10 text-blue-500 border-blue-500/20"><Timer className="w-3.5 h-3.5" /> Pending</Badge>;
      case 'sent':
        return <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5" /> Sent</Badge>;
      case 'failed':
        return (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1 px-3 bg-rose-500/10 text-rose-500 border-rose-500/20"><XCircle className="w-3.5 h-3.5" /> Failed</Badge>
            {post.error_message && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-1 hover:bg-rose-50 rounded-full cursor-help transition-colors">
                      <Info className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[250px] p-3 bg-rose-500 text-white border-none shadow-xl">
                    <p className="text-xs font-bold mb-1 uppercase tracking-tight opacity-80">Failure Reason</p>
                    <p className="text-sm font-medium">{post.error_message}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      default:
        return <Badge variant="secondary" className="py-1 px-3">{post.status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-foreground tracking-tight drop-shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              Scheduler
            </h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              Manage your automated Telegram quiz broadcasts
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
            <Button
              variant="default"
              size="lg"
              onClick={handleProcessPending}
              disabled={isProcessing || (statistics?.pending ?? 0) === 0}
              className="gap-2 shadow-glow-primary transition-all duration-300 rounded-xl px-4 sm:px-6 flex-1 sm:flex-initial text-sm"
            >
              <Send className={`w-4 h-4 ${isProcessing ? 'animate-pulse' : ''}`} />
              <span className="whitespace-nowrap">{isProcessing ? 'Sending...' : `Send ${statistics?.pending ?? 0} Pending`}</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              className="gap-2 clay-button shadow-clay-sm hover:shadow-glow-primary transition-all duration-300 rounded-xl px-4 sm:px-6 flex-1 sm:flex-initial text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>


        <AutoScheduleCard />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="clay-card-hover border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <MessageSquare className="w-16 h-16 text-foreground" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Total Scheduled</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-4xl font-black text-foreground">{statistics?.total ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="clay-card-hover border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-16 h-16 text-blue-500" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-black uppercase tracking-widest text-blue-500/80">Awaiting Post</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-4xl font-black text-blue-500">{statistics?.pending ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="clay-card-hover border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-black uppercase tracking-widest text-emerald-500/80">Successfully Sent</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-4xl font-black text-emerald-500">{statistics?.sent ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="clay-card-hover border-none overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertCircle className="w-16 h-16 text-rose-500" />
            </div>
            <CardHeader className="p-5 pb-2">
              <CardDescription className="text-xs font-black uppercase tracking-widest text-rose-500/80">Failed Posts</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-4xl font-black text-rose-500">{statistics?.failed ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & View Toggle */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by quiz topic..."
              className="pl-10 h-11 bg-white/50 backdrop-blur-sm border-white/20 rounded-xl focus:ring-primary/20 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full md:w-auto">
              <TabsList className="bg-white/50 backdrop-blur-sm border border-white/20 p-1 h-11 rounded-xl shadow-sm">
                <TabsTrigger value="all" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Pending</TabsTrigger>
                <TabsTrigger value="sent" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-emerald-600">Sent</TabsTrigger>
                <TabsTrigger value="failed" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-rose-600">Failed</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex p-1 bg-white/50 backdrop-blur-sm border border-white/20 rounded-xl shadow-sm ml-auto md:ml-0">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                className={`h-9 w-9 rounded-lg transition-all ${viewMode === "grid" ? 'shadow-sm' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                onClick={() => setViewMode("table")}
                className={`h-9 w-9 rounded-lg transition-all ${viewMode === "table" ? 'shadow-sm' : ''}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {[...Array(6)].map((_, i) => (
                viewMode === "grid" ? (
                  <Card key={i} className="clay-card border-none h-48">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-6 w-3/4 rounded-lg" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-1/2 rounded-md" />
                      <Skeleton className="h-4 w-2/3 rounded-md" />
                    </CardContent>
                  </Card>
                ) : (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                )
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="clay-card p-12 flex flex-col items-center justify-center text-center space-y-4 bg-white/30 backdrop-blur-md">
              <div className="w-20 h-20 bg-muted/20 rounded-full flex items-center justify-center mb-2">
                <Calendar className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold">No scheduled posts found</h3>
                <p className="text-muted-foreground max-w-xs">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters to find what you're looking for."
                    : "You haven't scheduled any posts yet. Start by creating a quiz!"}
                </p>
              </div>
              {!searchQuery && statusFilter === "all" && (
                <Button className="clay-button rounded-xl px-8 shadow-clay-sm" asChild>
                  <a href="/dashboard/create-quiz">Create Your First Quiz</a>
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.map((post) => {
                    const quizData = post.quiz_data as unknown as Quiz;
                    return (
                      <Card key={post.id} className="clay-card border-none flex flex-col group hover:scale-[1.02] transition-all duration-300">
                        <CardHeader className="p-5 pb-3">
                          <div className="flex justify-between items-start mb-2">
                            {getStatusBadge(post)}
                            <div className="p-1.5 hover:bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                          <CardTitle className="text-xl font-black line-clamp-1 leading-tight tracking-tight">
                            {quizData?.topic || 'Untitled Quiz'}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 pt-0 flex-grow space-y-4">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground bg-black/5 p-2 rounded-lg">
                              <History className="w-4 h-4 text-primary/70" />
                              <span className="truncate">{post.chat_id}</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground bg-primary/5 p-2 rounded-lg border border-primary/10">
                              <Calendar className="w-4 h-4 text-primary" />
                              {formatDateTime(post.scheduled_time)}
                            </div>
                            {post.sent_at && (
                              <div className="flex items-center gap-2.5 text-xs font-medium text-emerald-600/80 pl-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sent on {formatDateTime(post.sent_at)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="p-5 pt-0 flex gap-2">
                          {(post.status === 'pending' || post.status === 'processing') && (
                            <Button
                              variant="ghost"
                              className="flex-1 gap-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-xl"
                              onClick={() => handleCancel(post.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                              Cancel
                            </Button>
                          )}
                          {post.status === 'failed' && (
                            <Button
                              variant="secondary"
                              className="flex-1 gap-2 font-bold rounded-xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                              onClick={() => handleRetry(post.id)}
                            >
                              <RotateCcw className="w-4 h-4" />
                              Retry
                            </Button>
                          )}
                          <Button variant="outline" className="flex-1 gap-2 font-bold rounded-xl border-primary/20 text-primary hover:bg-primary/5">
                            Details
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="clay-card overflow-hidden border-none p-0 bg-white/40 backdrop-blur-lg">
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader className="bg-black/5">
                        <TableRow className="hover:bg-transparent border-white/20">
                          <TableHead className="font-black text-foreground/70 pl-6 h-14 whitespace-nowrap">Quiz Topic</TableHead>
                          <TableHead className="font-black text-foreground/70 h-14 whitespace-nowrap">Target Chat</TableHead>
                          <TableHead className="font-black text-foreground/70 h-14 whitespace-nowrap">Scheduled For</TableHead>
                          <TableHead className="font-black text-foreground/70 h-14 whitespace-nowrap">Status</TableHead>
                          <TableHead className="font-black text-foreground/70 h-14 whitespace-nowrap">Execution</TableHead>
                          <TableHead className="font-black text-foreground/70 pr-6 h-14 text-right whitespace-nowrap">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPosts.map((post) => {
                          const quizData = post.quiz_data as unknown as Quiz;
                          return (
                            <TableRow key={post.id} className="group hover:bg-white/40 border-white/20 transition-colors h-16">
                              <TableCell className="font-bold pl-6 whitespace-nowrap">
                                {quizData?.topic || 'N/A'}
                              </TableCell>
                              <TableCell className="font-medium text-muted-foreground whitespace-nowrap">
                                {post.chat_id}
                              </TableCell>
                              <TableCell className="font-semibold text-foreground/80 whitespace-nowrap">
                                {formatDateTime(post.scheduled_time)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{getStatusBadge(post)}</TableCell>
                              <TableCell className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                {post.sent_at ? formatDateTime(post.sent_at) : '-'}
                              </TableCell>
                              <TableCell className="pr-6 text-right whitespace-nowrap">
                                <div className="flex gap-2 justify-end">
                                  {(post.status === 'pending' || post.status === 'processing') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCancel(post.id)}
                                      className="h-8 px-3 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg group-hover:scale-105 transition-all font-bold"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                      Cancel
                                    </Button>
                                  )}
                                  {post.status === 'failed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRetry(post.id)}
                                      className="h-8 px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10 rounded-lg group-hover:scale-105 transition-all font-bold"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
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
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 px-2">
                  <p className="text-sm font-bold text-slate-500 italic">
                    Showing <span className="text-slate-800">{(page - 1) * 50 + 1}</span> to <span className="text-slate-800">{Math.min(page * 50, totalCount)}</span> of <span className="text-slate-800">{totalCount}</span> posts
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="gap-1 rounded-xl clay-button shadow-clay-sm"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                      {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Only show first, last, and pages around current
                        if (
                          pageNum === 1 ||
                          pageNum === totalPages ||
                          (pageNum >= page - 1 && pageNum <= page + 1)
                        ) {
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(pageNum)}
                              className={`w-9 h-9 rounded-xl font-bold transition-all ${page === pageNum
                                ? "shadow-glow-primary scale-110"
                                : "clay-button shadow-clay-sm"
                                }`}
                            >
                              {pageNum}
                            </Button>
                          );
                        } else if (
                          (pageNum === 2 && page > 3) ||
                          (pageNum === totalPages - 1 && page < totalPages - 2)
                        ) {
                          return <span key={pageNum} className="text-slate-400 font-black px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="gap-1 rounded-xl clay-button shadow-clay-sm"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-xl max-w-md">
          <AlertDialogHeader className="text-center space-y-3">
            <div className="mx-auto w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-7 h-7 text-rose-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">Cancel Scheduled Post?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove the post from the schedule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-3 pt-2">
            <AlertDialogCancel className="rounded-xl font-bold border-gray-200 hover:bg-gray-50 flex-1">
              Keep It
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="rounded-xl font-bold bg-rose-500 hover:bg-rose-600 text-white flex-1 shadow-lg"
            >
              Yes, Cancel Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
