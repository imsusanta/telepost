import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    CheckCircle2,
    Clock,
    Image,
    Loader2,
    PenLine,
    Send,
    Sparkles,
    Trash2,
    Upload,
    Wand2,
    X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChannelService } from "@/services/channelService";
import { PostService, Post } from "@/services/postService";
import { Channel } from "@/types/channel";
import { LoadingState } from "@/components/LoadingState";

export default function CreatePost() {
    const { toast } = useToast();

    // User and channel state
    const [userId, setUserId] = useState<string>("");
    const [channels, setChannels] = useState<Channel[]>([]);
    const [isLoadingChannels, setIsLoadingChannels] = useState(true);

    // Post form state
    const [selectedChannel, setSelectedChannel] = useState<string>("");
    const [content, setContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");

    // Scheduling state
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledTime, setScheduledTime] = useState("");

    // UI state
    const [isUploading, setIsUploading] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [activeTab, setActiveTab] = useState("create");
    const [aiPrompt, setAiPrompt] = useState("");
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [showAiInput, setShowAiInput] = useState(false);

    // Recent posts state
    const [recentPosts, setRecentPosts] = useState<Post[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);



    // Load user and channels
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);
                    const userChannels = await ChannelService.getUserChannels(user.id);
                    setChannels(userChannels);


                }
            } catch (error) {
                console.error("Error loading user data:", error);
                toast({
                    title: "Error",
                    description: "Failed to load channels",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingChannels(false);
            }
        };

        loadUserData();
    }, [toast]);

    // Load recent posts
    const loadRecentPosts = useCallback(async () => {
        if (!userId) return;

        try {
            setIsLoadingPosts(true);
            const posts = await PostService.getUserPosts(userId, { limit: 10 });
            setRecentPosts(posts);
        } catch (error) {
            console.error("Error loading posts:", error);
        } finally {
            setIsLoadingPosts(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            loadRecentPosts();
        }
    }, [userId, loadRecentPosts]);

    // Handle file selection
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast({
                title: "Invalid file type",
                description: "Please select an image file (JPG, PNG, GIF, etc.)",
                variant: "destructive",
            });
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "Maximum file size is 10MB",
                variant: "destructive",
            });
            return;
        }

        setSelectedFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));
    };

    const removeImage = () => {
        setSelectedFile(null);
        setImagePreviewUrl("");
    };

    const resetForm = () => {
        setContent("");
        setSelectedFile(null);
        setImagePreviewUrl("");
        setScheduledTime("");
        setIsScheduled(false);
    };

    const handleGenerateWithAi = async () => {
        if (!aiPrompt.trim()) {
            toast({
                title: "Prompt required",
                description: "Please enter what you want the AI to write about",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsAiGenerating(true);
            const { data, error } = await supabase.functions.invoke('ai-generate-text', {
                body: {
                    prompt: aiPrompt.trim(),
                    systemPrompt: "You are a social media copywriter. Write a compelling post based on the user's prompt. Keep it concise and engaging. Supports Markdown: *bold* _italic_ `code` and emojis 😊. Do not include any title or preamble, just the post content."
                }
            });

            if (error) throw error;

            if (data?.text) {
                setContent(data.text);
                toast({
                    title: "Content generated! ✨",
                    description: "AI has written a post for you. You can now edit it manually.",
                });
                setShowAiInput(false);
                setAiPrompt("");
            } else {
                throw new Error(data?.error || "Failed to generate content");
            }
        } catch (error) {
            console.error("AI Generation error:", error);
            toast({
                title: "Generation failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsAiGenerating(false);
        }
    };

    const handleSubmit = async (postNow: boolean = false) => {
        if (!selectedChannel) {
            toast({
                title: "Channel required",
                description: "Please select a channel to post to",
                variant: "destructive",
            });
            return;
        }

        if (!content.trim() && !selectedFile && !imagePreviewUrl) {
            toast({
                title: "Content required",
                description: "Please add some text or an image",
                variant: "destructive",
            });
            return;
        }

        if (isScheduled && !scheduledTime) {
            toast({
                title: "Schedule time required",
                description: "Please select when to post",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsPosting(true);

            let imageUrl: string | undefined;
            if (selectedFile) {
                setIsUploading(true);
                imageUrl = await PostService.uploadPostImage(userId, selectedFile);
                setIsUploading(false);
            } else if (imagePreviewUrl && imagePreviewUrl.startsWith("http")) {
                imageUrl = imagePreviewUrl;
            }

            const post = await PostService.createPost(userId, {
                channel_id: selectedChannel,
                content: content.trim(),
                image_url: imageUrl,
                scheduled_time: isScheduled && !postNow ? scheduledTime : undefined,
            });

            if (postNow || (!isScheduled && !postNow)) {
                await PostService.postNow(post.id);
                toast({
                    title: "Posted successfully! 🎉",
                    description: "Your post has been published to Telegram",
                });
            } else {
                toast({
                    title: "Post scheduled! 📅",
                    description: `Your post will be published on ${new Date(scheduledTime).toLocaleString()}`,
                });
            }

            resetForm();
            loadRecentPosts();
        } catch (error) {
            toast({
                title: "Failed to post",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            setIsPosting(false);
        }
    };

    const handleDeletePost = async (postId: string) => {
        try {
            await PostService.deletePost(postId, userId);
            toast({
                title: "Post deleted",
                description: "The post has been removed",
            });
            loadRecentPosts();
        } catch (error) {
            toast({
                title: "Failed to delete",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        }
    };

    const getStatusBadge = (status: Post["status"]) => {
        switch (status) {
            case "posted":
                return (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Posted
                    </Badge>
                );
            case "scheduled":
                return (
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Scheduled
                    </Badge>
                );
            case "draft":
                return (
                    <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">
                        <PenLine className="h-3 w-3 mr-1" />
                        Draft
                    </Badge>
                );
            case "failed":
                return (
                    <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                        <X className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                );
            default:
                return null;
        }
    };

    const getMinScheduleTime = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 5);
        return now.toISOString().slice(0, 16);
    };

    if (isLoadingChannels) {
        return (
            <DashboardLayout>
                <LoadingState />
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                            Create Post
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Publish text and image posts to your Telegram channels
                        </p>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="create" className="flex items-center gap-2">
                            <PenLine className="h-4 w-4" />
                            Create
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="create" className="space-y-6">
                        <div className="grid gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Send className="h-5 w-5 text-primary" />
                                            New Post
                                        </CardTitle>
                                        <CardDescription>
                                            Compose your message and select a channel
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="channel">Channel *</Label>
                                            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                                                <SelectTrigger id="channel">
                                                    <SelectValue placeholder="Select a channel..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {channels.length === 0 ? (
                                                        <div className="p-4 text-center text-muted-foreground">
                                                            No channels found. Create one first.
                                                        </div>
                                                    ) : (
                                                        channels.map((channel) => (
                                                            <SelectItem key={channel.id} value={channel.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <span>{channel.name}</span>
                                                                    {channel.telegram_channel_id && (
                                                                        <Badge variant="outline" className="text-xs">
                                                                            Connected
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="content">Message</Label>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`gap-2 text-xs h-8 ${showAiInput ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                                                    onClick={() => setShowAiInput(!showAiInput)}
                                                >
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    {showAiInput ? "Close AI Assistant" : "Write with AI"}
                                                </Button>
                                            </div>

                                            {showAiInput && (
                                                <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl p-4 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Wand2 className="h-4 w-4 text-primary" />
                                                        <span className="text-sm font-semibold text-primary">AI Assistant</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="What should this post be about? (e.g., 'A welcome post for my new study group')"
                                                            value={aiPrompt}
                                                            onChange={(e) => setAiPrompt(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAi()}
                                                            className="flex-1 bg-white dark:bg-slate-950 border-primary/20"
                                                            disabled={isAiGenerating}
                                                        />
                                                        <Button
                                                            onClick={handleGenerateWithAi}
                                                            disabled={isAiGenerating || !aiPrompt.trim()}
                                                            className="bg-primary hover:bg-primary/90 shadow-sm"
                                                        >
                                                            {isAiGenerating ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                "Generate"
                                                            )}
                                                        </Button>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground italic">
                                                        Tip: Be specific for better results. The generated text will replace your current message.
                                                    </p>
                                                </div>
                                            )}

                                            <Textarea
                                                id="content"
                                                placeholder="Write your post here... Supports Markdown: *bold* _italic_ `code` and emojis 😊"
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                rows={6}
                                                className={`resize-y min-h-[150px] font-mono ${content.length > (imagePreviewUrl ? 1024 : 4096) ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                                style={{ resize: 'vertical' }}
                                            />
                                            <p className={`text-xs mt-1 flex justify-between ${content.length > (imagePreviewUrl ? 1024 : 4096) ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                                <span>
                                                    {content.length > (imagePreviewUrl ? 1024 : 4096) && (
                                                        "⚠️ Exceeds Telegram limit"
                                                    )}
                                                </span>
                                                <span>
                                                    {content.length} / {imagePreviewUrl ? 1024 : 4096} characters
                                                </span>
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Image (optional)</Label>
                                            {imagePreviewUrl ? (
                                                <div className="relative inline-block">
                                                    <img
                                                        src={imagePreviewUrl}
                                                        alt="Preview"
                                                        className="max-h-48 rounded-lg border shadow-sm"
                                                    />
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                                                        onClick={removeImage}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                                    <p className="text-sm text-muted-foreground text-center mb-3">
                                                        Click to upload image<br />
                                                        <span className="text-xs">Max 10MB</span>
                                                    </p>
                                                    <label className="cursor-pointer">
                                                        <Button variant="outline" size="sm" asChild>
                                                            <span>
                                                                <Upload className="mr-1 h-3.5 w-3.5" />
                                                                Upload
                                                            </span>
                                                        </Button>
                                                        <Input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleFileSelect}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <Calendar className="h-4 w-4 text-primary" />
                                            Scheduling
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="schedule-toggle" className="cursor-pointer">
                                                Schedule for later
                                            </Label>
                                            <Switch
                                                id="schedule-toggle"
                                                checked={isScheduled}
                                                onCheckedChange={setIsScheduled}
                                            />
                                        </div>
                                        {isScheduled && (
                                            <div className="space-y-2 animate-in slide-in-from-top-2">
                                                <Label htmlFor="schedule-time">Date & Time</Label>
                                                <Input
                                                    id="schedule-time"
                                                    type="datetime-local"
                                                    value={scheduledTime}
                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                    min={getMinScheduleTime()}
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5">
                                    <CardContent className="pt-6 space-y-3">
                                        <Button
                                            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                                            size="lg"
                                            onClick={() => handleSubmit(!isScheduled)}
                                            disabled={isPosting || isUploading}
                                        >
                                            {isUploading ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                                            ) : isPosting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Posting...</>
                                            ) : isScheduled ? (
                                                <><Calendar className="mr-2 h-4 w-4" />Schedule Post</>
                                            ) : (
                                                <><Send className="mr-2 h-4 w-4" />Post Now</>
                                            )}
                                        </Button>
                                        <Button variant="outline" className="w-full" onClick={resetForm} disabled={isPosting}>
                                            Clear
                                        </Button>
                                    </CardContent>
                                </Card>

                                {(content || imagePreviewUrl) && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Preview</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                                {imagePreviewUrl && <img src={imagePreviewUrl} alt="Preview" className="w-full rounded-md" />}
                                                {content && <p className="text-sm whitespace-pre-wrap">{content}</p>}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Posts</CardTitle>
                                <CardDescription>Your latest posts across all channels</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {isLoadingPosts ? (
                                    <LoadingState />
                                ) : recentPosts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Image className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No posts yet</p>
                                        <p className="text-sm text-muted-foreground">Create your first post to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentPosts.map((post) => (
                                            <div key={post.id} className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                                                {post.image_url && <img src={post.image_url} alt="" className="w-16 h-16 object-cover rounded-md flex-shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <p className="line-clamp-2 text-sm">{post.content || "(No text)"}</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        {getStatusBadge(post.status)}
                                                        <span className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    {post.error_message && <p className="text-xs text-red-500 mt-1">{post.error_message}</p>}
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDeletePost(post.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

        </DashboardLayout>
    );
}
