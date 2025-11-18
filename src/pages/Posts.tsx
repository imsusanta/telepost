import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PostService } from "@/services/postService";
import { ChannelPost, PostType, PostStatus, PostStatistics } from "@/types/post";
import {
  FileText,
  Image,
  BarChart3,
  FileIcon,
  Megaphone,
  HelpCircle,
  Plus,
  Send,
  Trash2,
  Calendar,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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

export default function Posts() {
  const [posts, setPosts] = useState<ChannelPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<ChannelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PostType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<PostStatus | "all">("all");
  const [statistics, setStatistics] = useState<PostStatistics | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserAndPosts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [posts, searchQuery, filterType, filterStatus]);

  const loadUserAndPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);
    await loadPosts(user.id);
    await loadStatistics(user.id);
  };

  const loadPosts = async (uid: string) => {
    try {
      setLoading(true);
      const fetchedPosts = await PostService.fetchPosts(uid);
      setPosts(fetchedPosts);
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

  const loadStatistics = async (uid: string) => {
    try {
      const stats = await PostService.getStatistics(uid);
      setStatistics(stats);
    } catch (error: any) {
      console.error("Failed to load statistics:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...posts];

    // Apply type filter
    if (filterType !== "all") {
      filtered = filtered.filter((post) => post.post_type === filterType);
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((post) => post.status === filterStatus);
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
  };

  const handlePublish = async (postId: string) => {
    try {
      await PostService.publishPost(postId);
      toast({
        title: "Success",
        description: "Post published successfully!",
      });
      await loadPosts(userId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      await PostService.deletePost(postToDelete);
      toast({
        title: "Success",
        description: "Post deleted successfully!",
      });
      await loadPosts(userId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setPostToDelete(null);
    }
  };

  const getPostIcon = (type: PostType) => {
    const icons = {
      text: FileText,
      image: Image,
      poll: BarChart3,
      pdf: FileIcon,
      promotional: Megaphone,
      quiz: HelpCircle,
    };
    const Icon = icons[type];
    return <Icon className="w-4 h-4" />;
  };

  const getStatusBadge = (status: PostStatus) => {
    const variants: Record<PostStatus, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      scheduled: "outline",
      published: "default",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold">Posts</h1>
            <p className="text-muted-foreground">
              Manage all your channel posts
            </p>
          </div>
          <Button onClick={() => navigate("/create-post")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Post
          </Button>
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics.total_posts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Published</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {statistics.by_status.published}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {statistics.scheduled_posts}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{statistics.total_views}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search posts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterType} onValueChange={(v) => setFilterType(v as PostType | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="poll">Poll</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as PostStatus | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Posts List */}
        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery || filterType !== "all" || filterStatus !== "all"
                  ? "No matching posts"
                  : "No posts yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first post to get started"}
              </p>
              <Button onClick={() => navigate("/create-post")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getPostIcon(post.post_type)}
                        <CardTitle className="text-lg">
                          {post.title || `${post.post_type.charAt(0).toUpperCase() + post.post_type.slice(1)} Post`}
                        </CardTitle>
                        {getStatusBadge(post.status)}
                      </div>
                      <CardDescription>
                        {post.content?.substring(0, 100) || "No content"}
                        {post.content && post.content.length > 100 && "..."}
                      </CardDescription>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {new Date(post.created_at).toLocaleDateString()}</span>
                        {post.scheduled_time && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Scheduled: {new Date(post.scheduled_time).toLocaleString()}
                          </span>
                        )}
                        {post.sent_at && (
                          <span>Sent: {new Date(post.sent_at).toLocaleString()}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {post.view_count} views
                        </span>
                      </div>
                      {post.error_message && (
                        <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                          Error: {post.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {post.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handlePublish(post.id)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Publish Now
                      </Button>
                    )}
                    {post.status === "failed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(post.id)}
                      >
                        Retry
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setPostToDelete(post.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
