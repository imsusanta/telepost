// AutoScheduleCard component updated for auto-scheduling feature
import { useState, useEffect } from "react";
import {
    Bot,
    Clock,
    Plus,
    X,
    Sparkles,
    Database,
    Save,
    Loader2,
    Settings2,
    Target,
    Zap,
    Languages,
    FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { autoScheduleService, type SourceType } from "@/services/autoScheduleService";
import { ChannelService } from "@/services/channelService";
import { supabase } from "@/integrations/supabase/client";
import type { Channel } from "@/types/channel";
import type { User } from "@supabase/supabase-js";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const PRESET_TOPICS = [
    "সিন্ধু সভ্যতার বন্দর (লোথাল)",
    "ডান্ডি অভিযান",
    "মাজুলী দ্বীপ",
    "মাইটোকন্ড্রিয়া",
    "GST",
    "খসড়া কমিটি",
    "ISRO",
    "সিপাহী বিদ্রোহ",
    "চিল্কা হ্রদ"
];

export function AutoScheduleCard() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);

    // Global settings
    const [sourceType, setSourceType] = useState<SourceType>("question_bank");
    const [questionsPerPost, setQuestionsPerPost] = useState(5);
    const [scheduleTimes, setScheduleTimes] = useState<string[]>(["09:00", "15:00"]);
    const [topics, setTopics] = useState<string[]>([]);
    const [language, setLanguage] = useState<string>("English");
    const [customPrompt, setCustomPrompt] = useState<string>("");
    const [userTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const [newTime, setNewTime] = useState("12:00");
    const [newTopic, setNewTopic] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live clock update
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Format current time for display
    const formatCurrentTime = () => {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const seconds = currentTime.getSeconds();
        const period = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        return `${h12}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${period}`;
    };

    // Get current time as 24h format for "Set Now" button
    const getCurrentTimeAs24h = () => {
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    // Supported languages for quiz generation
    const supportedLanguages = [
        { value: "English", label: "English" },
        { value: "Bengali", label: "বাংলা (Bengali)" },
        { value: "Hindi", label: "हिन्दी (Hindi)" },
        { value: "Tamil", label: "தமிழ் (Tamil)" },
        { value: "Telugu", label: "తెలుగు (Telugu)" },
        { value: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
        { value: "Malayalam", label: "മലയാളം (Malayalam)" },
        { value: "Marathi", label: "मराठी (Marathi)" },
        { value: "Gujarati", label: "ગુજરાતી (Gujarati)" },
        { value: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
        { value: "Odia", label: "ଓଡ଼ିଆ (Odia)" },
        { value: "Assamese", label: "অসমীয়া (Assamese)" },
    ];

    // Helper for 12h format display
    const formatTime12h = (time24h: string) => {
        if (!time24h) return "12:00 PM";
        const [hour, minute] = time24h.split(':').map(Number);
        const period = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    // Clock positioning helper
    const getHourPos = (hour: number) => {
        const radius = 80;
        const angle = (hour * 30 - 90) * (Math.PI / 180);
        const x = radius * Math.cos(angle) + 105;
        const y = radius * Math.sin(angle) + 105;
        return { x, y };
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    const loadData = async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const userChannels = await ChannelService.getUserChannels(user.id);
            setChannels(userChannels);

            const allSettings = await autoScheduleService.getSettings(user.id);
            const enabledSettings = allSettings.filter(s => s.enabled);

            if (enabledSettings.length > 0) {
                setIsEnabled(true);
                setSelectedChannels(enabledSettings.map(s => s.channel_id));
                const firstEnabled = enabledSettings[0];
                setSourceType(firstEnabled.source_type);
                setQuestionsPerPost(firstEnabled.questions_per_post);
                setScheduleTimes(firstEnabled.schedule_times.length > 0 ? firstEnabled.schedule_times : ["09:00", "15:00"]);
                setTopics(firstEnabled.topics || []);
                setLanguage(firstEnabled.language || "English");
                setCustomPrompt(firstEnabled.custom_prompt || "");
            }
        } catch (error) {
            console.error("Error loading auto-schedule data:", error);
            toast({
                title: "Error",
                description: "Failed to load auto-schedule settings",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleChannel = (channelId: string, checked: boolean) => {
        if (checked) {
            setSelectedChannels(prev => [...prev, channelId]);
        } else {
            setSelectedChannels(prev => prev.filter(id => id !== channelId));
        }
    };

    const handleAddTime = () => {
        if (newTime && !scheduleTimes.includes(newTime)) {
            setScheduleTimes([...scheduleTimes, newTime].sort());
        }
    };

    const handleRemoveTime = (time: string) => {
        setScheduleTimes(scheduleTimes.filter(t => t !== time));
    };

    const MAX_TOPIC_LENGTH = 30;

    const handleAddTopic = (topicToAdd?: string) => {
        const rawTopic = topicToAdd !== undefined ? topicToAdd : newTopic;
        let trimmed = rawTopic.trim();
        if (!trimmed) return;

        if (trimmed.length > MAX_TOPIC_LENGTH) {
            trimmed = trimmed.substring(0, MAX_TOPIC_LENGTH);
            toast({
                title: "Topic Name Length Limited",
                description: `Topic name limited to max ${MAX_TOPIC_LENGTH} characters.`,
            });
        }

        if (topics.includes(trimmed)) {
            toast({
                title: "Topic Exists",
                description: "This topic has already been added.",
            });
            return;
        }

        setTopics([...topics, trimmed]);
        setNewTopic("");
    };

    const handleRemoveTopic = (topicToRemove: string) => {
        setTopics(topics.filter(t => t !== topicToRemove));
    };

    const handleClearAllTopics = () => {
        setTopics([]);
    };

    const handleSave = async () => {
        if (!user?.id) return;

        if (isEnabled && selectedChannels.length === 0) {
            toast({
                title: "No channels selected",
                description: "Please select at least one channel for auto-scheduling",
                variant: "destructive",
            });
            return;
        }

        if (isEnabled && scheduleTimes.length === 0) {
            toast({
                title: "No schedule times",
                description: "Please add at least one schedule time",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            for (const channel of channels) {
                const isSelected = selectedChannels.includes(channel.id);
                await autoScheduleService.upsertSettings(user.id, {
                    channel_id: channel.id,
                    enabled: isEnabled && isSelected,
                    source_type: sourceType,
                    questions_per_post: questionsPerPost,
                    topics: topics,
                    schedule_times: scheduleTimes,
                    timezone: userTimezone,
                    language: language,
                    custom_prompt: customPrompt,
                });
            }

            toast({
                title: "Settings Saved Successfully",
                description: isEnabled
                    ? `Auto-scheduler active for ${selectedChannels.length} channel(s) at ${scheduleTimes.length} time slot(s).`
                    : "Auto-schedule settings saved (paused).",
            });

            // Immediate schedule check trigger
            if (isEnabled) {
                console.log("[AutoScheduleCard] Triggering immediate schedule check post-save...");
                await supabase.functions.invoke('process-auto-schedule', {
                    body: { triggered_by: 'settings_save_check' }
                });
            }

            await loadData();
        } catch (error: any) {
            console.error("Error saving auto-schedule settings:", error);
            toast({
                title: "Saving Error",
                description: error?.message || "Failed to save settings. Please check your database connection.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const handleBroadcastNow = async () => {
        if (!user?.id) {
            console.error("[Broadcast Now] No user ID");
            return;
        }

        if (selectedChannels.length === 0) {
            toast({
                title: "No channels selected",
                description: "Please select at least one channel to broadcast.",
                variant: "destructive",
            });
            return;
        }

        setIsBroadcasting(true);
        try {
            // Step 1: Create real pending posts (force=true, NO previewOnly)
            console.log("[Broadcast Now] Creating quiz posts for user:", user.id);
            const { data, error } = await supabase.functions.invoke("process-auto-schedule", {
                body: {
                    force: true,
                    userId: user.id,
                },
            });

            console.log("[Broadcast Now] Response:", JSON.stringify(data), "Error:", error);

            if (error) {
                console.error("[Broadcast Now] Edge function error:", error);
                throw new Error(error.message || "Edge function failed");
            }

            const createdResults = data?.results || [];
            const createdCount = createdResults.filter((r: any) => r.success && !r.skipped).length;
            const skippedCount = createdResults.filter((r: any) => r.skipped).length;

            console.log("[Broadcast Now] Created:", createdCount, "Skipped:", skippedCount);

            if (createdCount === 0) {
                const failedResults = createdResults.filter((r: any) => !r.success && r.error);
                const backendError = failedResults.length > 0 ? failedResults[0].error : '';
                const reason = skippedCount > 0 
                    ? `All ${skippedCount} post(s) were skipped (already exist for this time slot).`
                    : backendError 
                        ? `Error: ${backendError}`
                        : "No quizzes were generated. Check your topics and AI settings.";
                toast({
                    title: "⚠️ No New Posts Created",
                    description: reason,
                    variant: "destructive",
                });
                return;
            }

            toast({
                title: "📝 Quiz Posts Created",
                description: `Created ${createdCount} pending post(s). Sending to Telegram now...`,
            });

            // Step 2: Immediately trigger the post sender to deliver them
            console.log("[Broadcast Now] Triggering post delivery...");
            const { data: sendData, error: sendError } = await supabase.functions.invoke("process-scheduled-posts", {
                body: { triggered_by: "broadcast-now" },
            });

            console.log("[Broadcast Now] Send response:", JSON.stringify(sendData), "Error:", sendError);

            if (sendError) {
                console.error("[Broadcast Now] Send error:", sendError);
                toast({
                    title: "⚠️ Posts Created But Send Failed",
                    description: "Posts were scheduled. They will be sent automatically within 30 seconds.",
                    variant: "destructive",
                });
                return;
            }

            const sentCount = sendData?.sent || 0;
            toast({
                title: "✅ Broadcast Complete",
                description: `Successfully sent ${sentCount} quiz(zes) to Telegram!`,
            });
        } catch (error: any) {
            console.error("[Broadcast Now] Error:", error);
            toast({
                title: "Broadcast Failed",
                description: error.message || "Failed to create and send quiz posts.",
                variant: "destructive",
            });
        } finally {
            setIsBroadcasting(false);
        }
    };

    if (isLoading) {
        return (
            <Card className="border border-border/50 bg-card/60 backdrop-blur-xl">
                <CardContent className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-border/50 bg-card/80 backdrop-blur-xl shadow-xl overflow-hidden ring-1 ring-border/20">
            <CardHeader className="pb-6 border-b border-border/50 bg-gradient-to-r from-primary/10 via-card/50 to-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary rounded-2xl shadow-lg shadow-primary/20 text-primary-foreground">
                            <Bot className="w-7 h-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl font-black text-foreground tracking-tight">Auto-Scheduler</CardTitle>
                                <Badge variant="secondary" className={`text-[10px] font-black uppercase tracking-widest border-none ${isEnabled ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                                    {isEnabled ? 'Active' : 'Idle'}
                                </Badge>
                            </div>
                            <CardDescription className="text-muted-foreground font-medium text-sm">
                                AI-powered quiz broadcasting
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 px-4 py-2 bg-muted/60 rounded-2xl border border-border/50 shadow-sm transition-all hover:bg-muted">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground cursor-pointer" htmlFor="auto-schedule-mode">
                                {isEnabled ? 'Enabled' : 'Disabled'}
                            </Label>
                            <Switch
                                id="auto-schedule-mode"
                                checked={isEnabled}
                                onCheckedChange={setIsEnabled}
                                className="data-[state=checked]:bg-primary"
                            />
                        </div>

                        <Button
                            variant={showSettings ? "default" : "outline"}
                            className={`h-11 px-4 gap-2 rounded-2xl shadow-sm transition-all font-bold ${showSettings
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'bg-background border-border/60 text-foreground hover:bg-accent'
                                }`}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings2 className={`w-4 h-4 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
                            <span className="hidden sm:inline">{showSettings ? 'Hide Settings' : 'Settings'}</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-11 px-4 gap-2 rounded-2xl bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all font-bold shadow-sm"
                            onClick={handleBroadcastNow}
                            disabled={isBroadcasting}
                        >
                            {isBroadcasting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4" />
                            )}
                            <span className="hidden sm:inline">{isBroadcasting ? 'Broadcasting...' : 'Broadcast Now'}</span>
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0" id="scheduler-settings-anchor">
                {showSettings && (
                    <div className="">
                        {!isEnabled && (
                            <div className="px-8 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                    <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                                    Auto-Scheduler is paused. <span className="font-medium opacity-80">Settings below will be saved but won't trigger until the system is active.</span>
                                </p>
                            </div>
                        )}

                        <div className={`transition-all duration-500 ${!isEnabled ? 'opacity-60 grayscale-[0.5] pointer-events-auto' : 'opacity-100 grayscale-0'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 lg:divide-x divide-border/40 border-b border-border/40">
                                {/* Section 1: Source */}
                                <div className="p-6 space-y-6 bg-card/40">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Settings2 className="w-4 h-4 text-primary" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Core Configuration</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-foreground ml-1">Quiz Source</Label>
                                            <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                                                <SelectTrigger className="h-12 bg-background/80 border-border/60 hover:bg-background text-foreground transition-all rounded-xl shadow-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/60 shadow-2xl backdrop-blur-xl bg-card text-foreground">
                                                    <SelectItem value="question_bank">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-blue-500/10 rounded-lg"><Database className="w-4 h-4 text-blue-500" /></div>
                                                            <span className="font-bold">Question Bank</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="ai_generated">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-amber-500/10 rounded-lg"><Sparkles className="w-4 h-4 text-amber-500" /></div>
                                                            <span className="font-bold">AI Generated</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="knowledge_base">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-purple-500/10 rounded-lg"><FileText className="w-4 h-4 text-purple-500" /></div>
                                                            <span className="font-bold">Knowledge Base</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Language Selection - only show for AI Generated and Knowledge Base */}
                                        {(sourceType === "ai_generated" || sourceType === "knowledge_base") && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-xs font-bold text-foreground ml-1 flex items-center gap-2">
                                                    <Languages className="w-3 h-3 text-primary" />
                                                    Quiz Language
                                                </Label>
                                                <Select value={language} onValueChange={setLanguage}>
                                                    <SelectTrigger className="h-12 bg-background/80 border-border/60 hover:bg-background text-foreground transition-all rounded-xl shadow-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-border/60 shadow-2xl backdrop-blur-xl bg-card text-foreground max-h-[300px]">
                                                        {supportedLanguages.map((lang) => (
                                                            <SelectItem key={lang.value} value={lang.value}>
                                                                <span className="font-bold">{lang.label}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-muted-foreground font-medium italic text-center">
                                                    AI will generate questions in this language
                                                </p>
                                            </div>
                                        )}

                                        {/* Custom System Prompt - only show for AI Generated and Knowledge Base */}
                                        {(sourceType === "ai_generated" || sourceType === "knowledge_base") && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-xs font-bold text-foreground ml-1 flex items-center gap-2">
                                                    <Settings2 className="w-3 h-3 text-primary" />
                                                    Custom Instructions (Optional)
                                                </Label>
                                                <textarea
                                                    value={customPrompt}
                                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                                    placeholder="e.g., Generate questions about Indian GK only, not Bangladesh. Focus on West Bengal state topics."
                                                    className="w-full min-h-[80px] max-h-[150px] p-3 text-sm bg-background/80 border border-border/60 text-foreground hover:bg-background transition-all rounded-xl shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent placeholder:text-muted-foreground placeholder:italic"
                                                />
                                                <p className="text-[10px] text-muted-foreground font-medium italic text-center">
                                                    Guide the AI with specific instructions for quiz generation
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <Label className="text-xs font-bold text-foreground">Questions per Post</Label>
                                                <Badge variant="secondary" className="bg-primary text-primary-foreground font-black px-2.5 rounded-lg border-none">
                                                    {questionsPerPost}
                                                </Badge>
                                            </div>
                                            <Slider
                                                value={[questionsPerPost]}
                                                onValueChange={(v) => setQuestionsPerPost(v[0])}
                                                min={1}
                                                max={20}
                                                step={1}
                                                className="py-1 cursor-pointer"
                                            />
                                            <p className="text-[10px] text-muted-foreground font-medium italic text-center">Recommended: 5 to 10 questions</p>
                                        </div>
                                    </div>
                                </div>


                                {/* Section 2: Timing */}
                                <div className="p-6 space-y-6 bg-card/20">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Posting Schedule</h4>
                                        </div>
                                        <Badge variant="secondary" className="text-[9px] font-black bg-primary text-primary-foreground border-none py-0.5 px-2">
                                            LOCAL TIME
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                                            {scheduleTimes.map((time) => (
                                                <Badge
                                                    key={time}
                                                    className="gap-2 py-2 px-3 bg-background border-border/60 text-foreground shadow-sm hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all cursor-pointer group"
                                                    onClick={() => handleRemoveTime(time)}
                                                >
                                                    <Clock className="w-3 h-3 text-primary group-hover:text-destructive" />
                                                    <span className="font-black text-sm">{formatTime12h(time)}</span>
                                                    <X className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                                                </Badge>
                                            ))}
                                            {scheduleTimes.length === 0 && (
                                                <p className="text-xs text-muted-foreground font-medium py-2">No times set</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 flex-1 bg-background/80 border-border/60 rounded-xl font-bold justify-between px-4 hover:bg-accent text-foreground transition-all shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-primary" />
                                                            <span>{formatTime12h(newTime)}</span>
                                                        </div>
                                                        <Badge variant="secondary" className="text-[9px] font-black bg-muted text-muted-foreground border-none px-1.5">
                                                            CHANGE
                                                        </Badge>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[calc(100vw-32px)] sm:w-[350px] max-w-[350px] p-0 rounded-3xl shadow-2xl border-border/60 backdrop-blur-3xl bg-card text-foreground" align="start">
                                                    <div className="p-4 bg-gradient-to-br from-primary to-primary/80 rounded-t-3xl text-primary-foreground">
                                                        {/* Current Time Display */}
                                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-primary-foreground/20">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Current Time</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-black tabular-nums">{formatCurrentTime()}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-[10px] font-black bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground rounded-lg"
                                                                    onClick={() => setNewTime(getCurrentTimeAs24h())}
                                                                >
                                                                    Set Now
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Selected Time</span>
                                                                <span className="text-3xl font-black tabular-nums">{formatTime12h(newTime)}</span>
                                                            </div>
                                                            <div className="flex gap-1 bg-primary-foreground/10 p-1 rounded-xl">
                                                                {['AM', 'PM'].map(p => {
                                                                    const currentHour = parseInt(newTime.split(':')[0]);
                                                                    const isPM = currentHour >= 12;
                                                                    const isSelected = p === (isPM ? 'PM' : 'AM');
                                                                    return (
                                                                        <Button
                                                                            key={p}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className={`h-8 px-3 rounded-lg font-black text-xs transition-all ${isSelected ? 'bg-primary-foreground text-primary shadow-lg' : 'text-primary-foreground hover:bg-primary-foreground/20'}`}
                                                                            onClick={() => {
                                                                                const [h, m] = newTime.split(':').map(Number);
                                                                                let newH = h;
                                                                                if (p === 'AM' && h >= 12) newH -= 12;
                                                                                if (p === 'PM' && h < 12) newH += 12;
                                                                                setNewTime(`${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                                                                            }}
                                                                        >
                                                                            {p}
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>


                                                    <div className="flex p-4 gap-4">
                                                        {/* Hour Dial */}
                                                        <div className="relative w-[210px] h-[210px] bg-muted/40 rounded-full border border-border/40 shadow-inner flex shrink-0">
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full z-10" />
                                                            {Array.from({ length: 12 }).map((_, i) => {
                                                                const h12 = i + 1;
                                                                const { x, y } = getHourPos(h12);
                                                                const [currentH24, currentM] = newTime.split(':').map(Number);
                                                                const isSelected = (currentH24 % 12 || 12) === h12;

                                                                return (
                                                                    <Button
                                                                        key={h12}
                                                                        variant="ghost"
                                                                        className={`absolute w-9 h-9 p-0 rounded-full font-black text-sm transition-all -translate-x-1/2 -translate-y-1/2 ${isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                                                                        style={{ left: `${x}px`, top: `${y}px` }}
                                                                        onClick={() => {
                                                                            const isPM = currentH24 >= 12;
                                                                            let newH24 = h12 % 12;
                                                                            if (isPM) newH24 += 12;
                                                                            setNewTime(`${newH24.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
                                                                        }}
                                                                    >
                                                                        {h12}
                                                                    </Button>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Minute Scroll Area */}
                                                        <div className="flex flex-col flex-1">
                                                            <div className="text-center mb-2">
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Min</span>
                                                            </div>
                                                            <ScrollArea className="h-[210px] w-full pr-2">
                                                                <div className="space-y-1">
                                                                    {Array.from({ length: 60 }).map((_, i) => {
                                                                        const min = i.toString().padStart(2, '0');
                                                                        const isSelected = newTime.endsWith(':' + min);
                                                                        return (
                                                                            <Button
                                                                                key={min}
                                                                                variant={isSelected ? "default" : "ghost"}
                                                                                className={`w-full h-9 rounded-lg font-bold text-sm transition-all ${isSelected ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-primary/10'}`}
                                                                                onClick={() => {
                                                                                    const hour = newTime.split(':')[0] || "12";
                                                                                    setNewTime(`${hour}:${min}`);
                                                                                }}
                                                                            >
                                                                                {min}
                                                                            </Button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </ScrollArea>
                                                        </div>
                                                    </div>

                                                    <div className="p-3 border-t border-border/40 bg-muted/30 rounded-b-3xl">
                                                        <p className="text-[10px] text-muted-foreground font-bold text-center">Touch/Click numbers to set time</p>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Button
                                                size="icon"
                                                onClick={handleAddTime}
                                                className="h-12 w-12 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-xl"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                        <div className="p-3 bg-muted/40 rounded-xl border border-border/40">
                                            <p className="text-[10px] text-muted-foreground font-bold leading-tight flex items-start gap-2">
                                                <Clock className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                                                Important: System uses your timezone ({userTimezone}).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: AI Topics (Conditional) */}
                                <div className="p-6 space-y-6 bg-card/40 border-l border-border/40">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Content Focus</h4>
                                        </div>
                                        {(sourceType === "ai_generated" || sourceType === "knowledge_base") && topics.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleClearAllTopics();
                                                }}
                                                className="h-7 text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg font-bold transition-colors cursor-pointer"
                                            >
                                                Clear All
                                            </Button>
                                        )}
                                    </div>

                                    {(sourceType === "ai_generated" || sourceType === "knowledge_base") ? (
                                        <div className="space-y-4">
                                            {/* Input Row */}
                                            <div className="flex gap-2 relative">
                                                <div className="relative flex-1">
                                                    <Input
                                                        placeholder="Add topic (e.g. History, Math)..."
                                                        value={newTopic}
                                                        maxLength={MAX_TOPIC_LENGTH}
                                                        onChange={(e) => setNewTopic(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                handleAddTopic();
                                                            }
                                                        }}
                                                        className="h-12 pr-14 bg-background/80 border-border/60 rounded-xl font-medium text-foreground text-sm focus-visible:ring-amber-500/30"
                                                    />
                                                    <span className="absolute right-3 top-3.5 text-[10px] font-bold text-muted-foreground/60 select-none">
                                                        {newTopic.length}/{MAX_TOPIC_LENGTH}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleAddTopic();
                                                    }}
                                                    disabled={!newTopic.trim()}
                                                    className="h-12 w-12 shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white shadow-md shadow-amber-500/20 rounded-xl transition-all cursor-pointer"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </Button>
                                            </div>

                                            {/* Added Topics List */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground px-1">
                                                    <span>Selected Topics ({topics.length})</span>
                                                    <span className="text-[10px] opacity-70">Max 30 chars per topic</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2 min-h-[48px] p-3 bg-muted/20 border border-border/30 rounded-2xl">
                                                    {topics.map((topic) => (
                                                        <div
                                                            key={topic}
                                                            className="inline-flex items-center gap-2 py-1.5 pl-3 pr-1.5 bg-card border border-amber-500/30 text-foreground rounded-xl shadow-sm hover:border-amber-500/60 transition-all group max-w-[220px]"
                                                        >
                                                            <span className="font-bold text-xs truncate max-w-[160px]" title={topic}>{topic}</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleRemoveTopic(topic);
                                                                }}
                                                                title="Delete topic"
                                                                className="p-1 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    {topics.length === 0 && (
                                                        <div className="flex flex-col items-center justify-center py-4 w-full text-center">
                                                            <div className="p-2 bg-amber-500/10 rounded-xl mb-2">
                                                                <Sparkles className="w-4 h-4 text-amber-500" />
                                                            </div>
                                                            <p className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">✨ Full Auto Mode Active</p>
                                                            <p className="text-[10px] text-muted-foreground font-medium mt-1 max-w-[240px]">
                                                                {sourceType === "knowledge_base"
                                                                    ? "AI will generate questions automatically from all uploaded Knowledge Base documents."
                                                                    : "No topics added. AI will automatically select exam-oriented topics from General Knowledge, History, Science, etc."}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quick Presets */}
                                            {topics.length < 6 && (
                                                <div className="pt-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2 px-1">Quick Presets</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {PRESET_TOPICS.filter(p => !topics.includes(p)).map((preset) => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleAddTopic(preset);
                                                                }}
                                                                className="text-[11px] font-semibold px-2.5 py-1 bg-background hover:bg-amber-500/10 border border-border/60 hover:border-amber-500/40 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 rounded-lg transition-all cursor-pointer"
                                                            >
                                                                + {preset}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 text-center border border-border/60 rounded-2xl bg-muted/20 space-y-2">
                                            <div className="p-3 bg-muted rounded-2xl text-muted-foreground">
                                                <Database className="w-6 h-6" />
                                            </div>
                                            <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Source: Question Bank</p>
                                            <p className="text-[11px] text-muted-foreground font-medium max-w-[260px] leading-relaxed">
                                                Questions will be picked randomly from your saved Question Bank.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full Width Footer Section: Channels */}
                            <div className="p-8 bg-gradient-to-b from-transparent to-primary/5">
                                <div className="flex items-center gap-2 mb-6">
                                    <Target className="w-5 h-5 text-primary" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Target Destinations</h4>
                                </div>

                                {channels.length === 0 ? (
                                    <div className="p-8 text-center bg-card/60 border border-border/50 rounded-3xl">
                                        <p className="text-muted-foreground font-bold">No channels connected yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {channels.map((channel) => (
                                            <label
                                                key={channel.id}
                                                className={`flex items-center gap-4 p-4 rounded-[1.25rem] border transition-all cursor-pointer shadow-sm group ${selectedChannels.includes(channel.id)
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-primary/20 translate-y-[-2px]'
                                                    : 'bg-card/60 text-foreground border-border/60 hover:bg-card hover:border-border'
                                                    }`}
                                            >
                                                <div className={`checkbox-wrapper p-1 rounded-lg transition-colors ${selectedChannels.includes(channel.id) ? 'bg-primary-foreground/20' : 'bg-muted'
                                                    }`}>
                                                    <Checkbox
                                                        checked={selectedChannels.includes(channel.id)}
                                                        onCheckedChange={(checked) => handleToggleChannel(channel.id, !!checked)}
                                                        className={selectedChannels.includes(channel.id) ? 'border-primary-foreground bg-primary-foreground text-primary' : ''}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm truncate">{channel.name}</p>
                                                    {channel.telegram_channel_id && (
                                                        <p className={`text-[10px] font-medium opacity-70 truncate ${selectedChannels.includes(channel.id) ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                                                            {channel.telegram_channel_id}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <Separator className="my-8 bg-border/40" />

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-3">
                                        {selectedChannels.length > 0 && scheduleTimes.length > 0 ? (
                                            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${isEnabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-muted/60 border-border/50'}`}>
                                                <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                                                <p className={`text-[11px] font-black uppercase tracking-wider ${isEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {isEnabled ? `Posting to ${selectedChannels.length} channels` : `Ready to post to ${selectedChannels.length} channels`}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-full">
                                                <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                                                <p className="text-[11px] font-black text-muted-foreground uppercase tracking-wider tabular-nums">
                                                    Waiting for config
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto min-w-[200px] h-14 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[1.25rem] shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save All Settings
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
