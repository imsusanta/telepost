import { useState, useEffect, useCallback } from "react";
import {
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Image,
    LayoutPanelLeft,
    Loader2,
    PenLine,
    Search,
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
import { QuestionBankService, QuestionBankItem } from "@/services/questionBankService";
import { useSubscription } from "@/hooks/useSubscription";
import { Channel } from "@/types/channel";
import { LoadingState } from "@/components/LoadingState";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { KnowledgeBaseSelector } from "@/components/KnowledgeBaseSelector";
import { Document as AppDocument } from "@/services/documentService";
import { AIImageGeneratorModal } from "@/components/AIImageGeneratorModal";
import { Palette } from "lucide-react";

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

    // Source selection state
    const [postSource, setPostSource] = useState<"manual" | "question-bank" | "ai-generate" | "documents">("manual");
    
    // Question Bank selection state
    const [qbSearch, setQbSearch] = useState("");
    const [qbQuestions, setQbQuestions] = useState<QuestionBankItem[]>([]);
    const [isLoadingQb, setIsLoadingQb] = useState(false);
    const [selectedQbQuestionId, setSelectedQbQuestionId] = useState<string | null>(null);

    // AI Advanced Generation state
    const [aiTone, setAiTone] = useState<"professional" | "casual" | "motivational" | "fun">("professional");
    const [aiLanguage, setAiLanguage] = useState<"english" | "bengali" | "hindi" | "mix">("bengali");
    const [aiIncludeEmojis, setAiIncludeEmojis] = useState(true);
    
    // Document state
    const [selectedDoc, setSelectedDoc] = useState<AppDocument | null>(null);
    const [docPrompt, setDocPrompt] = useState("");
    const [isDocGenerating, setIsDocGenerating] = useState(false);

    // Subscription hook
    const { 
        canAccess, 
        loading: isLoadingSubscription,
        isSuperAdmin
    } = useSubscription();

    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    // Question Bank interaction
    const handleSelectQuestion = (question: QuestionBankItem) => {
        setSelectedQbQuestionId(question.id);
        let selectedContent = question.question || "";
        if (question.options && Array.isArray(question.options)) {
            const optionsList = question.options
                .map((val, idx) => `${String.fromCharCode(65 + idx)}. ${val}`)
                .join("\n");
            selectedContent += `\n\n${optionsList}`;
        }
        if (typeof question.correct_option_index === 'number') {
            const correctLetter = String.fromCharCode(65 + question.correct_option_index);
            selectedContent += `\n\nCorrect Option: ${correctLetter}`;
        }
        setContent(selectedContent);
    };



    // Load user and channels
    useEffect(() => {
        const loadUserData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserId(user.id);
                    const userChannels = await ChannelService.getUserChannels(user.id);
                    setChannels(userChannels);
                    
                    const { data: aiData } = await supabase.from('system_settings').select('setting_value').eq('setting_key', 'ai_settings').maybeSingle();
                    if (aiData?.setting_value) {
                        const settings = aiData.setting_value as any;
                        setHasApiKey(!!settings.gemini_api_key || !!settings.openai_api_key || !!settings.openrouter_api_key);
                    }
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

    // Fetch Question Bank questions
    const fetchQbQuestions = useCallback(async () => {
        if (!userId || postSource !== "question-bank") return;

        try {
            setIsLoadingQb(true);
            const { data } = await QuestionBankService.getQuestions(
                userId,
                { 
                    includePublic: true,
                    isPublicOnly: false
                },
                50,
                0,
                qbSearch
            );
            setQbQuestions(data);
        } catch (error) {
            console.error("Error loading questions:", error);
        } finally {
            setIsLoadingQb(false);
        }
    }, [userId, postSource, qbSearch]);

    useEffect(() => {
        if (postSource === "question-bank") {
            const timer = setTimeout(() => {
                fetchQbQuestions();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [fetchQbQuestions, postSource, qbSearch]);

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
            
            const systemPrompt = `You are a social media copywriter. 
            Tone: ${aiTone}
            Length: medium
            Language: ${aiLanguage}
            Include Emojis: ${aiIncludeEmojis ? 'Yes' : 'No'}
            
            Write a compelling post based on the user's prompt. Keep it concise and engaging. 
            You can use bold (*text*) and italics (_text_) sparingly. Use bullet points (*) for lists. 
            Supports Markdown-style formatting which will be converted for Telegram. 
            Do not include any title or preamble, just the post content.`;

            const { data, error } = await supabase.functions.invoke('ai-generate-text', {
                body: {
                    prompt: aiPrompt.trim(),
                    systemPrompt: systemPrompt
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
                setPostSource("manual");
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

    const handleGenerateFromDoc = async () => {
        if (!selectedDoc) {
            toast({
                title: "Document required",
                description: "Please select a document from your library",
                variant: "destructive",
            });
            return;
        }

        if (!selectedDoc.extracted_text) {
            toast({
                title: "No text found",
                description: "This document doesn't have any extracted text to work with.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsDocGenerating(true);
            
            const prompt = `Based on the following document content, ${docPrompt || "create a summary post for Telegram"}:
            
            DOCUMENT CONTENT:
            ${selectedDoc.extracted_text.substring(0, 5000)}
            `;

            const systemPrompt = `You are a social media assistant. Extract key information from the document and format it into a compelling Telegram post.
            Tone: ${aiTone}
            Language: ${aiLanguage}
            Include Emojis: ${aiIncludeEmojis ? 'Yes' : 'No'}
            
            Do not include any title or preamble, just the post content. Use Markdown for formatting.`;

            const { data, error } = await supabase.functions.invoke('ai-generate-text', {
                body: {
                    prompt: prompt,
                    systemPrompt: systemPrompt
                }
            });

            if (error) throw error;

            if (data?.text) {
                setContent(data.text);
                toast({
                    title: "Generated from document! 📄",
                    description: "AI has extracted key points from your document.",
                });
                setPostSource("manual");
            } else {
                throw new Error(data?.error || "Failed to generate content");
            }
        } catch (error) {
            console.error("Doc extraction error:", error);
            toast({
                title: "Extraction failed",
                description: error instanceof Error ? error.message : "An error occurred",
                variant: "destructive",
            });
        } finally {
            setIsDocGenerating(false);
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

    if (isLoadingChannels || isLoadingSubscription) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const hasAiWritingAccess = canAccess('create_post', 'write_with_ai');
    const hasAiGenerateAccess = canAccess('create_post', 'write_with_ai');
    const hasDocumentsAccess = canAccess('knowledge_base');
    const hasSchedulerAccess = canAccess('scheduler');

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-primary">
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
                                                    onClick={() => {
                                                        if (!hasAiWritingAccess && !isSuperAdmin) {
                                                            toast({
                                                                title: "Premium Feature",
                                                                description: "AI writing is only available on Pro plans. Please upgrade to use this feature.",
                                                                variant: "destructive",
                                                            });
                                                            return;
                                                        }
                                                        setShowAiInput(!showAiInput);
                                                    }}
                                                >
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    {showAiInput ? "Close AI Assistant" : "Write with AI"}
                                                    {!hasAiWritingAccess && !isSuperAdmin && (
                                                        <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 bg-amber-100 text-amber-700 border-amber-200">PRO</Badge>
                                                    )}
                                                </Button>
                                            </div>

                                            <Tabs 
                                                value={postSource} 
                                                onValueChange={(val) => setPostSource(val as any)}
                                                className="w-full"
                                            >
                                                <TabsList className="grid w-full grid-cols-4 mb-4">
                                                    <TabsTrigger value="manual" className="text-xs">Manual</TabsTrigger>
                                                    <TabsTrigger value="question-bank" className="text-xs">Q-Bank</TabsTrigger>
                                                    <TabsTrigger 
                                                        value="ai-generate" 
                                                        className="text-xs flex items-center gap-1"
                                                        disabled={!hasAiGenerateAccess && !isSuperAdmin}
                                                    >
                                                        AI {!hasAiGenerateAccess && !isSuperAdmin && <Badge variant="secondary" className="text-[8px] h-3 px-1">BASIC</Badge>}
                                                    </TabsTrigger>
                                                    <TabsTrigger 
                                                        value="documents" 
                                                        className="text-xs flex items-center gap-1"
                                                        disabled={!hasDocumentsAccess && !isSuperAdmin}
                                                    >
                                                        Docs {!hasDocumentsAccess && !isSuperAdmin && <Badge variant="secondary" className="text-[8px] h-3 px-1">PRO</Badge>}
                                                    </TabsTrigger>
                                                </TabsList>

                                                <TabsContent value="manual" className="space-y-4 mt-0">
                                                    {!hasAiWritingAccess && !isSuperAdmin && showAiInput && (
                                                        <Alert className="bg-amber-50 border-amber-200 text-amber-800 mb-4">
                                                            <Info className="h-4 w-4 text-amber-600" />
                                                            <AlertTitle>Upgrade Required</AlertTitle>
                                                            <AlertDescription>
                                                                Write with AI is a Pro feature. Upgrade your plan to use the AI Assistant.
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </TabsContent>

                                                <TabsContent value="question-bank" className="space-y-4 mt-0">
                                                    <div className="space-y-3">
                                                        <div className="relative">
                                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                placeholder="Search your questions..."
                                                                className="pl-9"
                                                                value={qbSearch}
                                                                onChange={(e) => setQbSearch(e.target.value)}
                                                            />
                                                        </div>
                                                        <ScrollArea className="h-[250px] border rounded-md p-2 bg-slate-50/50 dark:bg-slate-900/50">
                                                            {isLoadingQb ? (
                                                                <div className="flex items-center justify-center h-full">
                                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                                </div>
                                                            ) : qbQuestions.length === 0 ? (
                                                                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                                                                    <LayoutPanelLeft className="h-8 w-8 mb-2 opacity-20" />
                                                                    <p className="text-sm">No questions found</p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {qbQuestions.map((q) => (
                                                                        <div
                                                                            key={q.id}
                                                                            onClick={() => handleSelectQuestion(q)}
                                                                            className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 hover:bg-white dark:hover:bg-slate-950 ${
                                                                                selectedQbQuestionId === q.id 
                                                                                ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                                                                : "bg-white/50 dark:bg-slate-950/50"
                                                                            }`}
                                                                        >
                                                                            <p className="text-xs font-medium line-clamp-2">{q.question}</p>
                                                                            <div className="flex items-center gap-2 mt-2">
                                                                                <Badge variant="outline" className="text-[10px] py-0 h-4">
                                                                                    {q.topic}
                                                                                </Badge>
                                                                                {q.is_public && (
                                                                                    <Badge className="text-[10px] py-0 h-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                                                        Public
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </ScrollArea>
                                                        {selectedQbQuestionId && (
                                                            <p className="text-[10px] text-primary font-medium animate-in fade-in slide-in-from-left-1">
                                                                Question selected! It has been pre-filled in the message box below.
                                                            </p>
                                                        )}
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="ai-generate" className="space-y-4 mt-0">
                                                    <div className="p-4 border rounded-xl bg-primary/5 border-primary/20 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Tone</Label>
                                                                <Select value={aiTone} onValueChange={(val: any) => setAiTone(val)}>
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="professional">Professional</SelectItem>
                                                                        <SelectItem value="casual">Casual</SelectItem>
                                                                        <SelectItem value="motivational">Motivational</SelectItem>
                                                                        <SelectItem value="fun">Fun</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Language</Label>
                                                                <Select value={aiLanguage} onValueChange={(val: any) => setAiLanguage(val)}>
                                                                    <SelectTrigger className="h-9">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="bengali">Bengali</SelectItem>
                                                                        <SelectItem value="english">English</SelectItem>
                                                                        <SelectItem value="hindi">Hindi</SelectItem>
                                                                        <SelectItem value="mix">Mix (Bn+En)</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Prompt</Label>
                                                            <Textarea 
                                                                placeholder="What should this post be about?"
                                                                value={aiPrompt}
                                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                                className="h-20 bg-white dark:bg-slate-950"
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-between py-2">
                                                            <Label htmlFor="include-emojis" className="text-xs cursor-pointer">Include Emojis</Label>
                                                            <Switch 
                                                                id="include-emojis"
                                                                checked={aiIncludeEmojis}
                                                                onCheckedChange={setAiIncludeEmojis}
                                                            />
                                                        </div>

                                                        <Button 
                                                            className="w-full gap-2"
                                                            onClick={handleGenerateWithAi}
                                                            disabled={isAiGenerating || !aiPrompt.trim()}
                                                        >
                                                            {isAiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                            Generate Post
                                                        </Button>
                                                    </div>
                                                </TabsContent>

                                                <TabsContent value="documents" className="space-y-4 mt-0">
                                                    <div className="p-4 border rounded-xl bg-primary/5 border-primary/20 dark:bg-primary/10 dark:border-primary/30 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <FileText className="h-5 w-5 text-primary" />
                                                                <span className="font-semibold text-sm">Source Document</span>
                                                            </div>
                                                            <KnowledgeBaseSelector 
                                                                onSelect={(doc: any) => setSelectedDoc(doc)}
                                                                trigger={
                                                                    <Button variant="outline" size="sm" className="h-8 text-xs border-primary/20 bg-white hover:bg-primary/5">
                                                                        {selectedDoc ? "Change" : "Select Document"}
                                                                    </Button>
                                                                }
                                                            />
                                                        </div>

                                                        {selectedDoc ? (
                                                            <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-primary/10 flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-primary/10 rounded text-primary">
                                                                        <FileText className="h-4 w-4" />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-medium truncate max-w-[150px]">{selectedDoc.title || selectedDoc.file_name}</p>
                                                                        <p className="text-[10px] text-muted-foreground">{(selectedDoc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</p>
                                                                    </div>
                                                                </div>
                                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSelectedDoc(null)}>
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="py-8 text-center border-2 border-dashed rounded-lg border-primary/10 bg-white/50">
                                                                <p className="text-xs text-muted-foreground">No document selected</p>
                                                            </div>
                                                        )}

                                                        <div className="space-y-2">
                                                            <Label className="text-xs">Extraction Prompt (Optional)</Label>
                                                            <Input 
                                                                placeholder="E.g., 'Summarize key points for students'"
                                                                value={docPrompt}
                                                                onChange={(e) => setDocPrompt(e.target.value)}
                                                                className="h-9 bg-white dark:bg-slate-950"
                                                            />
                                                        </div>

                                                        <Button 
                                                            className="w-full gap-2 bg-primary hover:bg-primary/90"
                                                            onClick={handleGenerateFromDoc}
                                                            disabled={isDocGenerating || !selectedDoc}
                                                        >
                                                            {isDocGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                                            Extract & Generate
                                                        </Button>
                                                    </div>
                                                </TabsContent>
                                            </Tabs>

                                            {showAiInput && (
                                                <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                                    <div className="flex gap-2">
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
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setIsImageModalOpen(true);
                                                            }}
                                                        >
                                                            <Palette className="mr-1 h-3.5 w-3.5 text-primary" />
                                                            Generate AI Image
                                                        </Button>
                                                    </div>
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
                                            <Label htmlFor="schedule-toggle" className={`cursor-pointer ${!hasSchedulerAccess ? 'opacity-50' : ''}`}>
                                                Schedule for later
                                                {!hasSchedulerAccess && (
                                                    <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1 bg-amber-100 text-amber-700 border-amber-200 uppercase tracking-tight">Basic</Badge>
                                                )}
                                            </Label>
                                            <Switch
                                                id="schedule-toggle"
                                                checked={isScheduled}
                                                onCheckedChange={(checked) => {
                                                    if (!hasSchedulerAccess && checked) {
                                                        toast({
                                                            title: "Basic Feature",
                                                            description: "Auto scheduling is available on Basic and Pro plans. Free users can only post manually for now.",
                                                            variant: "destructive",
                                                        });
                                                        return;
                                                    }
                                                    setIsScheduled(checked);
                                                }}
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

                                <Card className="bg-primary/5 border border-primary/10">
                                    <CardContent className="pt-6 space-y-3">
                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 shadow-sm"
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

            <AIImageGeneratorModal 
                isOpen={isImageModalOpen}
                onClose={() => setIsImageModalOpen(false)}
                onUseImage={(url) => {
                    setImagePreviewUrl(url);
                    setSelectedFile(null); // Clear any uploaded file when using AI generated image
                }}
                hasApiKey={hasApiKey}
            />
        </DashboardLayout>
    );
}
