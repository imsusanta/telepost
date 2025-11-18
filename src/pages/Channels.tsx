import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Channel } from "@/types/channel";
import { ChannelService } from "@/services/channelService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Settings, FileText, MessageCircle, BarChart3 } from "lucide-react";

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [newChannel, setNewChannel] = useState({
    name: "",
    description: "",
    telegram_channel_id: "",
    telegram_bot_token: "",
  });

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userChannels = await ChannelService.getUserChannels(user.id);
      setChannels(userChannels);
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

  const handleCreateChannel = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ChannelService.createChannel(user.id, newChannel);

      toast({
        title: "Success",
        description: "Channel created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewChannel({
        name: "",
        description: "",
        telegram_channel_id: "",
        telegram_bot_token: "",
      });

      loadChannels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel? This will not delete associated documents.")) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ChannelService.deleteChannel(channelId, user.id);

      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });

      loadChannels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateSettings = async (channel: Channel, updates: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await ChannelService.updateChannel(channel.id, user.id, {
        settings: { ...channel.settings, ...updates },
      });

      toast({
        title: "Success",
        description: "Settings updated successfully",
      });

      loadChannels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading channels...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Channels</h1>
          <p className="text-muted-foreground">
            Manage your Telegram channels and their knowledge bases
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
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
                <Label htmlFor="name">Channel Name</Label>
                <Input
                  id="name"
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  placeholder="My Channel"
                />
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
                  placeholder="123456:ABC-DEF..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateChannel} disabled={!newChannel.name}>
                Create
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
                    onClick={() => handleDeleteChannel(channel.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/documents?channel=${channel.id}`)}
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
                      setIsEditDialogOpen(true);
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>
                </div>

                {channel.telegram_channel_id && (
                  <div className="text-sm text-muted-foreground">
                    <MessageCircle className="inline h-3 w-3 mr-1" />
                    {channel.telegram_channel_id}
                  </div>
                )}

                {channel.settings.auto_generate_quizzes && (
                  <div className="text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-2 rounded-md">
                    Auto-generation enabled
                    <div className="text-xs mt-1">
                      {channel.settings.default_subject && `Subject: ${channel.settings.default_subject}`}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Channel Settings Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Channel Settings: {selectedChannel?.name}</DialogTitle>
            <DialogDescription>
              Configure auto quiz generation and system prompts
            </DialogDescription>
          </DialogHeader>
          {selectedChannel && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-generate">Auto Generate Quizzes</Label>
                <Switch
                  id="auto-generate"
                  checked={selectedChannel.settings.auto_generate_quizzes}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings(selectedChannel, { auto_generate_quizzes: checked })
                  }
                />
              </div>

              <div>
                <Label htmlFor="default-subject">Default Subject</Label>
                <Input
                  id="default-subject"
                  value={selectedChannel.settings.default_subject}
                  onChange={(e) =>
                    setSelectedChannel({
                      ...selectedChannel,
                      settings: { ...selectedChannel.settings, default_subject: e.target.value },
                    })
                  }
                  placeholder="e.g., Mathematics, Science, History..."
                />
              </div>

              <div>
                <Label htmlFor="default-difficulty">Default Difficulty</Label>
                <Select
                  value={selectedChannel.settings.default_difficulty}
                  onValueChange={(value: any) =>
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
                <Label htmlFor="default-language">Default Language</Label>
                <Select
                  value={selectedChannel.settings.default_language}
                  onValueChange={(value: any) =>
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
                    <SelectItem value="bn">Bengali (বাংলা)</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi (हिन्दी)</SelectItem>
                  </SelectContent>
                </Select>
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

              <div>
                <Label htmlFor="system-prompt">System Prompt for Quiz Generation</Label>
                <Textarea
                  id="system-prompt"
                  value={selectedChannel.settings.system_prompt}
                  onChange={(e) =>
                    setSelectedChannel({
                      ...selectedChannel,
                      settings: { ...selectedChannel.settings, system_prompt: e.target.value },
                    })
                  }
                  placeholder="e.g., Generate questions focused on practical applications and real-world examples..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This prompt will be used to guide the AI when generating quizzes for this channel
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedChannel) {
                  handleUpdateSettings(selectedChannel, selectedChannel.settings);
                  setIsEditDialogOpen(false);
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
