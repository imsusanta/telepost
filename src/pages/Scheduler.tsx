import DashboardLayout from "@/components/DashboardLayout";
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
  Info
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
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Quiz } from "@/types/quiz";

export default function Scheduler() {
  const { scheduledPosts, isLoading, statistics, refetch, cancelPost, retryPost } = useScheduledPosts();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");

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
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
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
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              className="gap-2 clay-button shadow-clay-sm hover:shadow-glow-primary transition-all duration-300 rounded-xl px-6"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

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
                          {post.status === 'pending' && (
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
                  <Table>
                    <TableHeader className="bg-black/5">
                      <TableRow className="hover:bg-transparent border-white/20">
                        <TableHead className="font-black text-foreground/70 pl-6 h-14">Quiz Topic</TableHead>
                        <TableHead className="font-black text-foreground/70 h-14">Target Chat</TableHead>
                        <TableHead className="font-black text-foreground/70 h-14">Scheduled For</TableHead>
                        <TableHead className="font-black text-foreground/70 h-14">Status</TableHead>
                        <TableHead className="font-black text-foreground/70 h-14">Execution</TableHead>
                        <TableHead className="font-black text-foreground/70 pr-6 h-14 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPosts.map((post) => {
                        const quizData = post.quiz_data as unknown as Quiz;
                        return (
                          <TableRow key={post.id} className="group hover:bg-white/40 border-white/20 transition-colors h-16">
                            <TableCell className="font-bold pl-6">
                              {quizData?.topic || 'N/A'}
                            </TableCell>
                            <TableCell className="font-medium text-muted-foreground">
                              {post.chat_id}
                            </TableCell>
                            <TableCell className="font-semibold text-foreground/80">
                              {formatDateTime(post.scheduled_time)}
                            </TableCell>
                            <TableCell>{getStatusBadge(post)}</TableCell>
                            <TableCell className="text-sm font-medium text-muted-foreground">
                              {post.sent_at ? formatDateTime(post.sent_at) : '-'}
                            </TableCell>
                            <TableCell className="pr-6 text-right">
                              <div className="flex gap-2 justify-end">
                                {post.status === 'pending' && (
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
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
