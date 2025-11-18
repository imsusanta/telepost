import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChannelService, TelegramChannel } from "@/services/channelService";
import {
  Send,
  Plus,
  Edit,
  Trash2,
  Star,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ChannelManagerProps {
  selectedChannelId?: string;
  onChannelSelect?: (channelId: string) => void;
  compact?: boolean;
}

export const ChannelManager = ({
  selectedChannelId,
  onChannelSelect,
  compact = false,
}: ChannelManagerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<TelegramChannel | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    channel_name: "",
    telegram_bot_token: "",
    telegram_channel_id: "",
    description: "",
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      loadChannels();
    }
  }, [user]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await ChannelService.getActiveChannels(user!.id);
      setChannels(data);

      // Auto-select default channel if none selected
      if (!selectedChannelId && data.length > 0) {
        const defaultChannel = data.find((c) => c.is_default) || data[0];
        onChannelSelect?.(defaultChannel.id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (channel?: TelegramChannel) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        channel_name: channel.channel_name,
        telegram_bot_token: channel.telegram_bot_token,
        telegram_channel_id: channel.telegram_channel_id,
        description: channel.description || "",
        is_default: channel.is_default,
      });
    } else {
      setEditingChannel(null);
      setFormData({
        channel_name: "",
        telegram_bot_token: "",
        telegram_channel_id: "",
        description: "",
        is_default: channels.length === 0, // First channel is default
      });
    }
    setDialogOpen(true);
  };

  const handleSaveChannel = async () => {
    try {
      if (editingChannel) {
        await ChannelService.updateChannel(editingChannel.id, formData);
        toast({
          title: "Success",
          description: "Channel updated successfully",
        });
      } else {
        // Check if user can add more channels
        const { canAdd, current, limit } = await ChannelService.canAddChannel(user!.id);
        if (!canAdd) {
          toast({
            title: "Limit Reached",
            description: `You can only have ${limit} channel(s) on your current plan. (Current: ${current})`,
            variant: "destructive",
          });
          return;
        }

        await ChannelService.createChannel(user!.id, formData);
        toast({
          title: "Success",
          description: "Channel created successfully",
        });
      }

      setDialogOpen(false);
      loadChannels();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save channel",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm("Are you sure you want to delete this channel?")) return;

    try {
      await ChannelService.deleteChannel(channelId);
      toast({
        title: "Success",
        description: "Channel deleted successfully",
      });
      loadChannels();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete channel",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (channelId: string) => {
    try {
      await ChannelService.setDefaultChannel(user!.id, channelId);
      toast({
        title: "Success",
        description: "Default channel updated",
      });
      loadChannels();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set default channel",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (compact) {
    // Compact mode: Just a channel selector
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Telegram Channel</Label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingChannel ? "Edit Channel" : "Add New Channel"}
                </DialogTitle>
                <DialogDescription>
                  Configure your Telegram channel for quiz delivery
                </DialogDescription>
              </DialogHeader>
              <ChannelForm
                formData={formData}
                setFormData={setFormData}
                isEditing={!!editingChannel}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveChannel}>
                  {editingChannel ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {channels.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No channels configured. Add one to get started.
          </div>
        ) : (
          <Select value={selectedChannelId} onValueChange={onChannelSelect}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select a channel" />
            </SelectTrigger>
            <SelectContent>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    <span>{channel.channel_name}</span>
                    {channel.is_default && (
                      <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  // Full mode: Channel cards with management
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Your Channels</h3>
          <p className="text-sm text-muted-foreground">
            Manage your Telegram channels and quiz delivery
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingChannel ? "Edit Channel" : "Add New Channel"}
              </DialogTitle>
              <DialogDescription>
                Configure your Telegram channel for quiz delivery
              </DialogDescription>
            </DialogHeader>
            <ChannelForm
              formData={formData}
              setFormData={setFormData}
              isEditing={!!editingChannel}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChannel}>
                {editingChannel ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Send className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">No Channels Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first Telegram channel to start sending quizzes
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {channels.map((channel) => (
            <Card
              key={channel.id}
              className={`p-4 cursor-pointer transition-all ${
                selectedChannelId === channel.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent"
              }`}
              onClick={() => onChannelSelect?.(channel.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate">
                        {channel.channel_name}
                      </h4>
                      {channel.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                          Default
                        </Badge>
                      )}
                      {selectedChannelId === channel.id && (
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {channel.telegram_channel_id}
                    </p>
                    {channel.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {channel.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{channel.total_quizzes_sent} quizzes sent</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!channel.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(channel.id);
                      }}
                      title="Set as default"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(channel);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChannel(channel.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

interface ChannelFormProps {
  formData: {
    channel_name: string;
    telegram_bot_token: string;
    telegram_channel_id: string;
    description: string;
    is_default: boolean;
  };
  setFormData: React.Dispatch<React.SetStateAction<typeof formData>>;
  isEditing: boolean;
}

const ChannelForm = ({ formData, setFormData, isEditing }: ChannelFormProps) => {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="channel_name">Channel Name</Label>
        <Input
          id="channel_name"
          placeholder="e.g., My Quiz Channel"
          value={formData.channel_name}
          onChange={(e) =>
            setFormData({ ...formData, channel_name: e.target.value })
          }
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="telegram_bot_token">Bot Token</Label>
        <Input
          id="telegram_bot_token"
          type="password"
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          value={formData.telegram_bot_token}
          onChange={(e) =>
            setFormData({ ...formData, telegram_bot_token: e.target.value })
          }
          required
        />
        <p className="text-xs text-muted-foreground">
          Get your bot token from @BotFather on Telegram
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="telegram_channel_id">Channel ID</Label>
        <Input
          id="telegram_channel_id"
          placeholder="@channel_username or -1001234567890"
          value={formData.telegram_channel_id}
          onChange={(e) =>
            setFormData({ ...formData, telegram_channel_id: e.target.value })
          }
          required
        />
        <p className="text-xs text-muted-foreground">
          Channel username or chat ID
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Input
          id="description"
          placeholder="Brief description of this channel"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) =>
            setFormData({ ...formData, is_default: e.target.checked })
          }
          className="w-4 h-4"
        />
        <Label htmlFor="is_default" className="cursor-pointer">
          Set as default channel
        </Label>
      </div>
    </div>
  );
};
