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
    ShieldCheck,
    AlertCircle,
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

export function AutoScheduleCard() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);

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

    const handleAddTopic = () => {
        if (newTopic.trim() && !topics.includes(newTopic.trim())) {
            setTopics([...topics, newTopic.trim()]);
            setNewTopic("");
        }
    };

    const handleRemoveTopic = (topic: string) => {
        setTopics(topics.filter(t => t !== topic));
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

        // Topics are now optional - empty topics trigger "Full Auto Mode" (Exam-oriented GK/History/etc)

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
                title: "Settings saved",
                description: isEnabled
                    ? `Auto-schedule enabled for ${selectedChannels.length} channel(s)`
                    : "Auto-schedule disabled",
            });
            await loadData();
        } catch (error) {
            console.error("Error saving auto-schedule settings:", error);
            toast({
                title: "Saving Error",
                description: "Failed to save settings. Please ensure you have run the database migration (adding the timezone column).",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleInitializeSystem = async () => {
        setIsInitializing(true);
        try {
            console.log("Initializing system configuration...");
            const { data: _data, error } = await supabase.functions.invoke('process-auto-schedule', {
                headers: {
                    "X-Telepost-Repair-Secret": "fix-my-config-2026"
                },
                body: { 
                    triggered_by: 'manual_initialization',
                    triggered_at: new Date().toISOString()
                }
            });

            if (error) throw error;

            toast({
                title: "✅ System Initialized",
                description: "Background workers are now configured and will run automatically every minute.",
                variant: "default",
            });
        } catch (error: any) {
            console.error("Initialization error:", error);
            toast({
                title: "❌ Initialization Failed",
                description: "Please try again or contact support if the issue persists.",
                variant: "destructive",
            });
        } finally {
            setIsInitializing(false);
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
            <Card className="clay-card border-none bg-gradient-to-br from-violet-500/5 to-purple-500/10">
                <CardContent className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="clay-card border-none bg-white/40 backdrop-blur-xl border border-white/40 shadow-2xl overflow-hidden ring-1 ring-black/5">
            <CardHeader className="pb-6 border-b border-white/40 bg-gradient-to-r from-violet-500/10 via-white/50 to-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-600 rounded-2xl shadow-lg shadow-violet-600/20">
                            <Bot className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">Auto-Scheduler</CardTitle>
                                <Badge variant="secondary" className={`text-[10px] font-black uppercase tracking-widest border-none ${isEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                                    {isEnabled ? 'Active' : 'Idle'}
                                </Badge>
                            </div>
                            <CardDescription className="text-slate-500 font-medium text-sm">
                                AI-powered quiz broadcasting
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 px-4 py-2 bg-white/60 rounded-2xl border border-white/80 shadow-sm transition-all hover:bg-white">
                            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer" htmlFor="auto-schedule-mode">
                                {isEnabled ? 'Enabled' : 'Disabled'}
                            </Label>
                            <Switch
                                id="auto-schedule-mode"
                                checked={isEnabled}
                                onCheckedChange={setIsEnabled}
                                className="data-[state=checked]:bg-violet-600"
                            />
                        </div>

                        <Button
                            variant={showSettings ? "default" : "outline"}
                            className={`h-11 px-4 gap-2 rounded-2xl shadow-sm transition-all font-bold ${showSettings
                                ? 'bg-slate-900 text-white hover:bg-black'
                                : 'bg-white border-white/80 text-slate-700 hover:text-violet-600'
                                }`}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings2 className={`w-4 h-4 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
                            <span className="hidden sm:inline">{showSettings ? 'Hide Settings' : 'Settings'}</span>
                        </Button>

                        <Button
                            variant="outline"
                            className="h-11 px-4 gap-2 rounded-2xl bg-amber-500/10 border-amber-500/20 text-amber-700 hover:bg-amber-500 hover:text-white transition-all font-bold shadow-sm"
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
                            <div className="px-8 py-4 bg-amber-50/50 border-b border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-1.5 bg-amber-500/10 rounded-lg">
                                    <Zap className="w-4 h-4 text-amber-600" />
                                </div>
                                <p className="text-xs font-bold text-amber-800">
                                    Auto-Scheduler is paused. <span className="font-medium opacity-80">Settings below will be saved but won't trigger until the system is active.</span>
                                </p>
                            </div>
                        )}

                        <div className={`transition-all duration-500 ${!isEnabled ? 'opacity-60 grayscale-[0.5] pointer-events-auto' : 'opacity-100 grayscale-0'}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 lg:divide-x border-b border-white/40">
                                {/* Section 1: Source */}
                                <div className="p-6 space-y-6 bg-white/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Settings2 className="w-4 h-4 text-violet-600" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Core Configuration</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-bold text-slate-600 ml-1">Quiz Source</Label>
                                            <Select value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                                                <SelectTrigger className="h-12 bg-white/60 border-white/80 hover:bg-white transition-all rounded-xl shadow-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-white/40 shadow-2xl backdrop-blur-xl">
                                                    <SelectItem value="question_bank">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-blue-500/10 rounded-lg"><Database className="w-4 h-4 text-blue-600" /></div>
                                                            <span className="font-bold">Question Bank</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="ai_generated">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-amber-500/10 rounded-lg"><Sparkles className="w-4 h-4 text-amber-600" /></div>
                                                            <span className="font-bold">AI Generated</span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="knowledge_base">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-1.5 bg-purple-500/10 rounded-lg"><FileText className="w-4 h-4 text-purple-600" /></div>
                                                            <span className="font-bold">Knowledge Base</span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Language Selection - only show for AI Generated and Knowledge Base */}
                                        {(sourceType === "ai_generated" || sourceType === "knowledge_base") && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-2">
                                                    <Languages className="w-3 h-3" />
                                                    Quiz Language
                                                </Label>
                                                <Select value={language} onValueChange={setLanguage}>
                                                    <SelectTrigger className="h-12 bg-white/60 border-white/80 hover:bg-white transition-all rounded-xl shadow-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-white/40 shadow-2xl backdrop-blur-xl max-h-[300px]">
                                                        {supportedLanguages.map((lang) => (
                                                            <SelectItem key={lang.value} value={lang.value}>
                                                                <span className="font-bold">{lang.label}</span>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-[10px] text-slate-400 font-medium italic text-center">
                                                    AI will generate questions in this language
                                                </p>
                                            </div>
                                        )}

                                        {/* Custom System Prompt - only show for AI Generated and Knowledge Base */}
                                        {(sourceType === "ai_generated" || sourceType === "knowledge_base") && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <Label className="text-xs font-bold text-slate-600 ml-1 flex items-center gap-2">
                                                    <Settings2 className="w-3 h-3" />
                                                    Custom Instructions (Optional)
                                                </Label>
                                                <textarea
                                                    value={customPrompt}
                                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                                    placeholder="e.g., Generate questions about Indian GK only, not Bangladesh. Focus on West Bengal state topics."
                                                    className="w-full min-h-[80px] max-h-[150px] p-3 text-sm bg-white/60 border border-white/80 hover:bg-white transition-all rounded-xl shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent placeholder:text-slate-400 placeholder:italic"
                                                />
                                                <p className="text-[10px] text-slate-400 font-medium italic text-center">
                                                    Guide the AI with specific instructions for quiz generation
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center justify-between ml-1">
                                                <Label className="text-xs font-bold text-slate-600">Questions per Post</Label>
                                                <Badge variant="secondary" className="bg-violet-600 text-white font-black px-2.5 rounded-lg border-none">
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
                                            <p className="text-[10px] text-slate-400 font-medium italic text-center">Recommended: 5 to 10 questions</p>
                                        </div>
                                    </div>
                                </div>


                                {/* Section 2: Timing */}
                                <div className="p-6 space-y-6 bg-white/20">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-violet-600" />
                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Posting Schedule</h4>
                                        </div>
                                        <Badge variant="secondary" className="text-[9px] font-black bg-violet-600 text-white border-none py-0.5 px-2">
                                            LOCAL TIME
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                                            {scheduleTimes.map((time) => (
                                                <Badge
                                                    key={time}
                                                    className="gap-2 py-2 px-3 bg-white border-white/80 text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all cursor-pointer group"
                                                    onClick={() => handleRemoveTime(time)}
                                                >
                                                    <Clock className="w-3 h-3 text-violet-500 group-hover:text-red-500" />
                                                    <span className="font-black text-sm">{formatTime12h(time)}</span>
                                                    <X className="w-3 h-3 opacity-40 group-hover:opacity-100" />
                                                </Badge>
                                            ))}
                                            {scheduleTimes.length === 0 && (
                                                <p className="text-xs text-slate-400 font-medium py-2">No times set</p>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 flex-1 bg-white/60 border-white/80 rounded-xl font-bold justify-between px-4 hover:bg-white transition-all shadow-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-violet-500" />
                                                            <span>{formatTime12h(newTime)}</span>
                                                        </div>
                                                        <Badge variant="secondary" className="text-[9px] font-black bg-slate-100 text-slate-500 border-none px-1.5">
                                                            CHANGE
                                                        </Badge>
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[calc(100vw-32px)] sm:w-[350px] max-w-[350px] p-0 rounded-3xl shadow-2xl border-white/40 backdrop-blur-3xl bg-white/95" align="start">
                                                    <div className="p-4 bg-gradient-to-br from-violet-600 to-purple-700 rounded-t-3xl text-white">
                                                        {/* Current Time Display */}
                                                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/20">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Current Time</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-lg font-black tabular-nums">{formatCurrentTime()}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-[10px] font-black bg-white/20 hover:bg-white/30 text-white rounded-lg"
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
                                                            <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
                                                                {['AM', 'PM'].map(p => {
                                                                    const currentHour = parseInt(newTime.split(':')[0]);
                                                                    const isPM = currentHour >= 12;
                                                                    const isSelected = p === (isPM ? 'PM' : 'AM');
                                                                    return (
                                                                        <Button
                                                                            key={p}
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className={`h-8 px-3 rounded-lg font-black text-xs transition-all ${isSelected ? 'bg-white text-violet-600 shadow-lg' : 'text-white hover:bg-white/20'}`}
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
                                                        <div className="relative w-[210px] h-[210px] bg-slate-50 rounded-full border border-slate-100 shadow-inner flex shrink-0">
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-violet-600 rounded-full z-10" />
                                                            {Array.from({ length: 12 }).map((_, i) => {
                                                                const h12 = i + 1;
                                                                const { x, y } = getHourPos(h12);
                                                                const [currentH24, currentM] = newTime.split(':').map(Number);
                                                                const isSelected = (currentH24 % 12 || 12) === h12;

                                                                return (
                                                                    <Button
                                                                        key={h12}
                                                                        variant="ghost"
                                                                        className={`absolute w-9 h-9 p-0 rounded-full font-black text-sm transition-all -translate-x-1/2 -translate-y-1/2 ${isSelected ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 scale-110' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'}`}
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
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Min</span>
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
                                                                                className={`w-full h-9 rounded-lg font-bold text-sm transition-all ${isSelected ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:bg-violet-50'}`}
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

                                                    <div className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
                                                        <p className="text-[10px] text-slate-400 font-bold text-center">Touch/Click numbers to set time</p>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <Button
                                                size="icon"
                                                onClick={handleAddTime}
                                                className="h-12 w-12 shrink-0 bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-600/30 rounded-xl"
                                            >
                                                <Plus className="w-5 h-5" />
                                            </Button>
                                        </div>
                                        <div className="p-3 bg-slate-100/50 rounded-xl border border-slate-200/50">
                                            <p className="text-[10px] text-slate-500 font-bold leading-tight flex items-start gap-2">
                                                <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                                                Important: System uses your timezone ({userTimezone}).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: AI Topics (Conditional) */}
                                <div className="p-6 space-y-6 bg-white/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles className="w-4 h-4 text-violet-600" />
                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Content Focus</h4>
                                    </div>

                                    {sourceType === "ai_generated" ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap gap-2 min-h-[40px]">
                                                {topics.map((topic) => (
                                                    <Badge
                                                        key={topic}
                                                        variant="secondary"
                                                        className="gap-2 py-2 px-3 bg-amber-500/10 border-amber-500/20 text-amber-700 shadow-sm hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer group"
                                                        onClick={() => handleRemoveTopic(topic)}
                                                    >
                                                        <span className="font-bold text-xs">{topic}</span>
                                                        <X className="w-3 h-3 opacity-40" />
                                                    </Badge>
                                                ))}
                                                {topics.length === 0 && (
                                                    <div className="flex flex-col items-center justify-center py-6 w-full bg-violet-50/50 rounded-2xl border border-dashed border-violet-200 animate-pulse">
                                                        <Sparkles className="w-5 h-5 text-violet-500 mb-2" />
                                                        <p className="text-[11px] font-black text-violet-600 uppercase tracking-widest">✨ Full Auto Mode Enabled</p>
                                                        <p className="text-[9px] text-slate-400 font-medium mt-1 text-center px-4 max-w-[200px]">
                                                            AI will automatically curate exam-oriented topics from GK, History, Geography & Science categories.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Pharma, Math, etc..."
                                                    value={newTopic}
                                                    onChange={(e) => setNewTopic(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleAddTopic()}
                                                    className="h-12 bg-white/60 border-white/80 rounded-xl font-medium"
                                                />
                                                <Button
                                                    size="icon"
                                                    onClick={handleAddTopic}
                                                    className="h-12 w-12 shrink-0 bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/30 rounded-xl"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-[120px] text-center px-4 border-2 border-dashed border-white/60 rounded-2xl bg-white/10">
                                            <Database className="w-6 h-6 text-slate-300 mb-2" />
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Source: Question Bank</p>
                                            <p className="text-[10px] text-slate-400">Questions will be picked randomly from your saved bank.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Full Width Footer Section: Channels */}
                            <div className="p-8 bg-gradient-to-b from-transparent to-violet-500/5">
                                <div className="flex items-center gap-2 mb-6">
                                    <Target className="w-5 h-5 text-violet-600" />
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Target Destinations</h4>
                                </div>

                                {channels.length === 0 ? (
                                    <div className="p-8 text-center bg-white/40 border border-white rounded-3xl">
                                        <p className="text-slate-500 font-bold">No channels connected yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {channels.map((channel) => (
                                            <label
                                                key={channel.id}
                                                className={`flex items-center gap-4 p-4 rounded-[1.25rem] border transition-all cursor-pointer shadow-sm group ${selectedChannels.includes(channel.id)
                                                    ? 'bg-violet-600 text-white border-violet-600 shadow-violet-600/20 translate-y-[-2px]'
                                                    : 'bg-white/60 text-slate-600 border-white/80 hover:bg-white hover:border-white'
                                                    }`}
                                            >
                                                <div className={`checkbox-wrapper p-1 rounded-lg transition-colors ${selectedChannels.includes(channel.id) ? 'bg-white/20' : 'bg-slate-100'
                                                    }`}>
                                                    <Checkbox
                                                        checked={selectedChannels.includes(channel.id)}
                                                        onCheckedChange={(checked) => handleToggleChannel(channel.id, !!checked)}
                                                        className={selectedChannels.includes(channel.id) ? 'border-white bg-white text-violet-600' : ''}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-black text-sm truncate">{channel.name}</p>
                                                    {channel.telegram_channel_id && (
                                                        <p className={`text-[10px] font-medium opacity-70 truncate ${selectedChannels.includes(channel.id) ? 'text-white' : 'text-slate-400'}`}>
                                                            {channel.telegram_channel_id}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}

                                <Separator className="my-8 bg-white/40" />

                                {/* System Initialization Section */}
                                <div className="mb-8 p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl">
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-amber-500/10 rounded-2xl">
                                                <AlertCircle className="w-6 h-6 text-amber-600" />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">System Initialization</h4>
                                                <p className="text-[11px] text-amber-700/80 font-medium leading-relaxed max-w-md">
                                                    If auto-scheduling isn't working, the background workers may need initialization. 
                                                    This securely sets up your project's configuration in the database.
                                                </p>
                                            </div>
                                        </div>
                                        <Button 
                                            variant="outline" 
                                            onClick={handleInitializeSystem}
                                            disabled={isInitializing}
                                            className="h-12 px-6 gap-2 rounded-2xl bg-white border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all font-bold shadow-sm shrink-0"
                                        >
                                            {isInitializing ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <ShieldCheck className="w-4 h-4" />
                                            )}
                                            {isInitializing ? 'Initializing...' : 'Initialize System'}
                                        </Button>
                                    </div>
                                </div>

                                <Separator className="my-8 bg-white/40" />

                                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div className="flex items-center gap-3">
                                        {selectedChannels.length > 0 && scheduleTimes.length > 0 ? (
                                            <div className={`flex items-center gap-3 px-4 py-2 rounded-full border transition-all ${isEnabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-500/10 border-slate-500/20'}`}>
                                                <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                <p className={`text-[11px] font-black uppercase tracking-wider ${isEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                    {isEnabled ? `Posting to ${selectedChannels.length} channels` : `Ready to post to ${selectedChannels.length} channels`}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3 px-4 py-2 bg-slate-100 rounded-full">
                                                <div className="w-2 h-2 bg-slate-300 rounded-full" />
                                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider tabular-nums">
                                                    Waiting for config
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto min-w-[200px] h-14 gap-3 bg-slate-900 hover:bg-black text-white rounded-[1.25rem] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] font-black uppercase tracking-widest"
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
