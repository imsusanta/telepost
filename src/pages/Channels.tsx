import { useState, useEffect, useCallback } from "react";
import { AlertCircle, BookOpen, FileText, Loader2, MessageCircle, Plus, Settings, Sparkles, Trash2, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Channel } from "@/types/channel";
import { ChannelService } from "@/services/channelService";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { systemPromptTemplates, getSystemPromptTemplate, generateChannelSystemPrompt } from "@/utils/systemPromptTemplates";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [channelStats, setChannelStats] = useState<Record<string, { documentCount: number; quizCount: number }>>({});
  const [generatingChannelId, setGeneratingChannelId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [limits, setLimits] = useState<{ max_telegram_channels: number }>({ max_telegram_channels: 1 });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [newChannel, setNewChannel] = useState({
    name: "",
    description: "",
    telegram_channel_id: "",
    telegram_bot_token: "",
  });

  const loadChannels = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userChannels = await ChannelService.getUserChannels(user.id);
      setChannels(userChannels);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load channels";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadChannels();
    fetchLimits();
  }, [loadChannels]);

  const fetchLimits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log("Checking super admin status for user:", user.id);

      // Check if user is Super Admin
      const superAdminStatus = await ChannelService.checkIsSuperAdmin(user.id);
      console.log("Super admin status result:", superAdminStatus);
      setIsSuperAdmin(superAdminStatus);

      if (!superAdminStatus) {
        const userLimits = await ChannelService.getSubscriptionLimits(user.id);
        console.log("User limits:", userLimits);
        setLimits(userLimits);
      } else {
        console.log("User is Super Admin - no limits applied");
      }
    } catch (error) {
      console.error("Error fetching limits:", error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannel.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ChannelService.createChannel(user.id, newChannel);

      toast({
        title: "Success",
        description: "Channel created successfully",
      });

      setIsCreateDialogOpen(false);
      resetCreateForm();

      loadChannels();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create channel",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewChannel({
      name: "",
      description: "",
      telegram_channel_id: "",
      telegram_bot_token: "",
    });
    setConnectionTestResult(null);
  };

  const handleTestConnection = async () => {
    const trimmedChatId = newChannel.telegram_channel_id.trim();
    const trimmedBotToken = newChannel.telegram_bot_token.trim();

    if (!trimmedChatId) {
      toast({
        title: "Missing chat ID",
        description: "Please enter the Telegram channel/chat ID to test connection",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const result = await ChannelService.testTelegramConnection(
        trimmedChatId,
        undefined,
        trimmedBotToken
      );
      setConnectionTestResult(result);

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Test failed";
      const errorResult = { success: false, message: errorMessage };
      setConnectionTestResult(errorResult);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleTestConnectionForEdit = async () => {
    if (!selectedChannel) return;

    const trimmedChatId = selectedChannel.telegram_channel_id?.trim();
    const trimmedBotToken = selectedChannel.telegram_bot_token?.trim();

    if (!trimmedChatId) {
      toast({
        title: "Missing chat ID",
        description: "Please enter the Telegram channel/chat ID to test connection",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);

    try {
      const result = await ChannelService.testTelegramConnection(
        trimmedChatId,
        selectedChannel.id,
        trimmedBotToken || undefined
      );

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Connection test failed",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return;

    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ChannelService.deleteChannel(channelToDelete, user.id);

      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setChannelToDelete(null);
      loadChannels();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete channel",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateSettings = async (channel: Channel) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ChannelService.updateChannel(channel.id, user.id, {
        name: channel.name.trim(),
        description: channel.description?.trim() || "",
        telegram_channel_id: channel.telegram_channel_id?.trim() || undefined,
        telegram_bot_token: channel.telegram_bot_token?.trim() || undefined,
        settings: channel.settings,
      });

      toast({
        title: "Success",
        description: "Settings updated successfully",
      });

      loadChannels();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    }
  };

  const loadChannelStats = useCallback(async (channelId: string, userId: string) => {
    try {
      const stats = await ChannelService.getChannelStats(channelId, userId);
      setChannelStats(prev => ({
        ...prev,
        [channelId]: {
          documentCount: stats.documentCount,
          quizCount: stats.quizCount,
        },
      }));
    } catch {
      // Silently fail for individual channel stats
    }
  }, []);

  const handleManualGeneration = async (channel: Channel) => {
    console.log("handleManualGeneration called for channel:", channel.id, channel.name);
    console.log("Channel settings:", channel.settings);
    console.log("telegram_channel_id:", channel.telegram_channel_id);

    if (!channel.telegram_channel_id) {
      toast({
        title: "Error",
        description: "Please configure Telegram credentials first",
        variant: "destructive",
      });
      return;
    }

    if (!channel.settings.default_subject) {
      console.log("No default_subject set for channel");
      toast({
        title: "Error",
        description: "Please set a default subject for quiz generation",
        variant: "destructive",
      });
      return;
    }

    setGeneratingChannelId(channel.id);
    try {
      console.log("Calling ChannelService.triggerAutoGeneration...");
      const result = await ChannelService.triggerAutoGeneration(channel.id, true);
      console.log("triggerAutoGeneration result:", result);

      if (!result.success) {
        throw new Error(result.message || "Failed to generate quiz");
      }

      toast({
        title: "Success",
        description: `Quiz generated and sent to ${channel.name}`,
      });

      loadChannels();
    } catch (error: unknown) {
      console.error("Quiz generation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingChannelId(null);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    if (!selectedChannel || !templateId) return;

    const template = getSystemPromptTemplate(templateId);
    if (!template) return;

    // Generate a customized prompt based on the template and channel settings
    const customPrompt = generateChannelSystemPrompt(
      selectedChannel.settings.default_subject || template.subject,
      selectedChannel.settings.default_language,
      "",
      templateId
    );

    setSelectedChannel({
      ...selectedChannel,
      settings: {
        ...selectedChannel.settings,
        system_prompt: customPrompt,
        default_subject: selectedChannel.settings.default_subject || (template.id !== 'general' && template.id !== 'custom' ? template.subject : selectedChannel.settings.default_subject),
      },
    });

    setSelectedTemplate(templateId);

    toast({
      title: "Template Applied",
      description: `Applied "${template.name}" template. You can customize the prompt further.`,
    });
  };

  // Load stats for all channels in parallel
  useEffect(() => {
    const loadAllStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await Promise.all(
        channels.map(channel => loadChannelStats(channel.id, user.id))
      );
    };

    if (channels.length > 0) {
      loadAllStats();
    }
  }, [channels, loadChannelStats]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Channels</h1>
            <p className="text-muted-foreground">
              {isSuperAdmin ? "Manage your Telegram channels" : `Manage your Telegram channels (${channels.length}/${limits.max_telegram_channels} used)`}
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={!isSuperAdmin && channels.length >= limits.max_telegram_channels}>
                <Plus className="mr-2 h-4 w-4" />
                {!isSuperAdmin && channels.length >= limits.max_telegram_channels ? "Limit Reached" : "Create Channel"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
                <DialogDescription>
                  Add a new Telegram channel with its own knowledge base
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Channel Name *</Label>
                  <Input
                    id="name"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                    placeholder="My Channel"
                  />
                  {!newChannel.name.trim() && newChannel.name !== "" && (
                    <p className="text-xs text-destructive mt-1">Channel name is required</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newChannel.description}
                    onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                    placeholder="Channel description..."
                  />
                </div>
                <div>
                  <Label htmlFor="telegram_channel_id">Telegram Channel ID (Optional)</Label>
                  <Input
                    id="telegram_channel_id"
                    value={newChannel.telegram_channel_id}
                    onChange={(e) => setNewChannel({ ...newChannel, telegram_channel_id: e.target.value })}
                    placeholder="@mychannel or -1001234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="telegram_bot_token">Telegram Bot Token (Optional)</Label>
                  <Input
                    id="telegram_bot_token"
                    type="password"
                    value={newChannel.telegram_bot_token}
                    onChange={(e) => setNewChannel({ ...newChannel, telegram_bot_token: e.target.value })}
                    placeholder="Enter bot token from @BotFather"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required to post to this channel. You can also set a global token in Settings.
                  </p>
                </div>
                {newChannel.telegram_channel_id && (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !newChannel.telegram_channel_id}
                      className="w-full"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {isTestingConnection ? "Testing..." : "Test Connection"}
                    </Button>
                    {connectionTestResult && (
                      <Alert variant={connectionTestResult.success ? "default" : "destructive"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {connectionTestResult.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetCreateForm();
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateChannel} disabled={!newChannel.name.trim() || isCreating}>
                  {isCreating ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {channels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No channels yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Channel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{channel.name}</CardTitle>
                      <CardDescription>{channel.description || "No description"}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setChannelToDelete(channel.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  {channelStats[channel.id] && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {channelStats[channel.id].documentCount} docs
                      </div>
                      <div className="flex items-center">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {channelStats[channel.id].quizCount} quizzes
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/dashboard/documents?channel=${channel.id}`)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Documents
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedChannel(channel);
                        setSelectedTemplate("");
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                  </div>

                  {/* Generate Now Button */}
                  {channel.settings.auto_generate_quizzes && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => handleManualGeneration(channel)}
                      disabled={generatingChannelId === channel.id}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      {generatingChannelId === channel.id ? "Generating..." : "Generate Quiz Now"}
                    </Button>
                  )}

                  {channel.telegram_channel_id && (
                    <div className="text-sm text-muted-foreground">
                      <MessageCircle className="inline h-3 w-3 mr-1" />
                      {channel.telegram_channel_id}
                    </div>
                  )}

                  {channel.settings.auto_generate_quizzes && (
                    <div className="text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-2 rounded-md">
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Auto-generation enabled
                      </div>
                      <div className="text-xs mt-1 space-y-0.5">
                        {channel.settings.default_subject && (
                          <div>Subject: {channel.settings.default_subject}</div>
                        )}
                        <div>Frequency: {channel.settings.generation_frequency}</div>
                        <div>Questions: {channel.settings.questions_per_quiz}</div>
                      </div>
                    </div>
                  )}

                  {/* Warning if missing configuration */}
                  {channel.settings.auto_generate_quizzes && !channel.telegram_channel_id && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Missing Telegram channel ID
                      </AlertDescription>
                    </Alert>
                  )}

                  {channel.settings.auto_generate_quizzes && !channel.settings.system_prompt && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        No system prompt configured. Add one in Settings for better quiz quality.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Channel Settings Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Channel: {selectedChannel?.name}</DialogTitle>
              <DialogDescription>
                Update channel details and configure auto quiz generation settings
              </DialogDescription>
            </DialogHeader>
            {selectedChannel && (
              <div className="space-y-6">
                {/* Channel Information */}
                <div className="space-y-4">
                  <h3 className="font-medium">Channel Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="edit-name">Channel Name *</Label>
                      <Input
                        id="edit-name"
                        value={selectedChannel.name}
                        onChange={(e) =>
                          setSelectedChannel({
                            ...selectedChannel,
                            name: e.target.value,
                          })
                        }
                        placeholder="My Channel"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-description">Description (Optional)</Label>
                      <Textarea
                        id="edit-description"
                        value={selectedChannel.description || ""}
                        onChange={(e) =>
                          setSelectedChannel({
                            ...selectedChannel,
                            description: e.target.value,
                          })
                        }
                        placeholder="Channel description..."
                      />
                    </div>
                  </div>
                </div>

                {/* Setup Instructions */}
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Quick Setup Instructions:</p>
                    <ol className="text-xs text-blue-700 dark:text-blue-400 list-decimal ml-4 space-y-1">
                      <li>Add your bot to your channel as an <strong>Administrator</strong>.</li>
                      <li>Ensure it has <strong>"Post Messages"</strong> permission.</li>
                      <li>Copy the Channel ID (e.g., <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">-100...</code>).</li>
                      <li>Enter the token from <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">@BotFather</code> below.</li>
                    </ol>
                  </div>
                </Alert>

                {/* Telegram Configuration */}
                <div className="space-y-4">
                  <h3 className="font-medium">Telegram Configuration</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="edit-telegram-channel-id">Telegram Channel ID</Label>
                      <Input
                        id="edit-telegram-channel-id"
                        value={selectedChannel.telegram_channel_id || ""}
                        onChange={(e) =>
                          setSelectedChannel({
                            ...selectedChannel,
                            telegram_channel_id: e.target.value,
                          })
                        }
                        placeholder="@mychannel or -1001234567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-telegram-bot-token">Telegram Bot Token</Label>
                      <Input
                        id="edit-telegram-bot-token"
                        type="password"
                        value={selectedChannel.telegram_bot_token || ""}
                        onChange={(e) =>
                          setSelectedChannel({
                            ...selectedChannel,
                            telegram_bot_token: e.target.value,
                          })
                        }
                        placeholder="Enter bot token"
                      />
                    </div>
                    {selectedChannel.telegram_channel_id && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTestConnectionForEdit}
                        disabled={isTestingConnection || !selectedChannel.telegram_channel_id}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {isTestingConnection ? "Testing..." : "Test Connection"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Auto Generation Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <Label htmlFor="auto-generate" className="text-base font-medium">Auto Generate Quizzes</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate and send quizzes based on this channel's knowledge base
                    </p>
                  </div>
                  <Switch
                    id="auto-generate"
                    checked={selectedChannel.settings.auto_generate_quizzes}
                    onCheckedChange={(checked) =>
                      setSelectedChannel({
                        ...selectedChannel,
                        settings: { ...selectedChannel.settings, auto_generate_quizzes: checked },
                      })
                    }
                  />
                </div>

                {/* Basic Settings */}
                <div className="space-y-4">
                  <h3 className="font-medium">Quiz Configuration</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="default-subject">Subject/Topic</Label>
                      <Input
                        id="default-subject"
                        value={selectedChannel.settings.default_subject}
                        onChange={(e) =>
                          setSelectedChannel({
                            ...selectedChannel,
                            settings: { ...selectedChannel.settings, default_subject: e.target.value },
                          })
                        }
                        placeholder="e.g., Mathematics, Science..."
                      />
                    </div>

                    <div>
                      <Label htmlFor="questions-per-quiz">Questions Per Quiz</Label>
                      <Input
                        id="questions-per-quiz"
                        type="number"
                        min="1"
                        max="50"
                        value={selectedChannel.settings.questions_per_quiz}
                        onChange={(e) =>
                          setSelectedChannel({
                            ...selectedChannel,
                            settings: {
                              ...selectedChannel.settings,
                              questions_per_quiz: parseInt(e.target.value) || 10,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="default-difficulty">Difficulty</Label>
                      <Select
                        value={selectedChannel.settings.default_difficulty}
                        onValueChange={(value: "easy" | "medium" | "hard") =>
                          setSelectedChannel({
                            ...selectedChannel,
                            settings: { ...selectedChannel.settings, default_difficulty: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="default-language">Language</Label>
                      <Select
                        value={selectedChannel.settings.default_language}
                        onValueChange={(value: "bn" | "en" | "hi") =>
                          setSelectedChannel({
                            ...selectedChannel,
                            settings: { ...selectedChannel.settings, default_language: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bn">Bengali</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="generation-frequency">Frequency</Label>
                      <Select
                        value={selectedChannel.settings.generation_frequency}
                        onValueChange={(value: "daily" | "weekly" | "bi-weekly" | "monthly" | "manual") =>
                          setSelectedChannel({
                            ...selectedChannel,
                            settings: { ...selectedChannel.settings, generation_frequency: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="manual">Manual only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* System Prompt Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">AI System Prompt</h3>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="template-select" className="text-sm">Template:</Label>
                      <Select
                        value={selectedTemplate}
                        onValueChange={(value) => handleApplyTemplate(value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Choose template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {systemPromptTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      The system prompt tells the AI how to generate quiz questions for this specific channel.
                      It ensures questions are created only from this channel's knowledge base and follow the appropriate format.
                    </AlertDescription>
                  </Alert>

                  <Textarea
                    id="system-prompt"
                    value={selectedChannel.settings.system_prompt}
                    onChange={(e) =>
                      setSelectedChannel({
                        ...selectedChannel,
                        settings: { ...selectedChannel.settings, system_prompt: e.target.value },
                      })
                    }
                    placeholder="Enter custom instructions for the AI quiz generator...

Example: Generate questions focused on practical applications and real-world examples. Include questions that test both recall and understanding. Make explanations educational and clear."
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt guides the AI when generating quizzes. It will use ONLY documents uploaded to this channel.
                  </p>
                </div>

                {/* Knowledge Base Info */}
                {channelStats[selectedChannel.id] && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Channel Knowledge Base</h3>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Documents:</span>{" "}
                        <span className="font-medium">{channelStats[selectedChannel.id].documentCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quizzes Generated:</span>{" "}
                        <span className="font-medium">{channelStats[selectedChannel.id].quizCount}</span>
                      </div>
                    </div>
                    {channelStats[selectedChannel.id].documentCount === 0 && (
                      <p className="text-xs text-amber-600 mt-2">
                        No documents uploaded yet. Upload PDFs to build the knowledge base for better quiz generation.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedChannel) {
                    handleUpdateSettings(selectedChannel);
                    setIsEditDialogOpen(false);
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Deletion Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the channel.
                Associated documents and quizzes will remain but will no longer be linked to this channel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteChannel();
                }}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Channel"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
