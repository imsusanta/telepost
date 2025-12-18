import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  Search, 
  Video, 
  Calendar, 
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Play,
  Users
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/integrations/supabase/types";

type LiveClass = Tables<"live_classes">;

export default function LiveClasses() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newClass, setNewClass] = useState({
    title: "",
    description: "",
    platform: "youtube",
    meeting_url: "",
    scheduled_at: "",
    duration_minutes: 60,
    status: "scheduled"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("live_classes")
        .select("*")
        .eq("created_by", user.id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      toast({
        title: "Error",
        description: "Failed to load live classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("live_classes")
        .insert({
          ...newClass,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Live class scheduled successfully",
      });

      setIsCreateDialogOpen(false);
      setNewClass({
        title: "",
        description: "",
        platform: "youtube",
        meeting_url: "",
        scheduled_at: "",
        duration_minutes: 60,
        status: "scheduled"
      });
      loadClasses();
    } catch (error) {
      console.error("Error creating class:", error);
      toast({
        title: "Error",
        description: "Failed to create live class",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    try {
      const { error } = await supabase
        .from("live_classes")
        .delete()
        .eq("id", classId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Live class deleted successfully",
      });
      loadClasses();
    } catch (error) {
      console.error("Error deleting class:", error);
      toast({
        title: "Error",
        description: "Failed to delete live class",
        variant: "destructive",
      });
    }
  };

  const filteredClasses = classes.filter(cls =>
    cls.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingClasses = filteredClasses.filter(cls => 
    cls.status === "scheduled" && new Date(cls.scheduled_at) > new Date()
  );
  const pastClasses = filteredClasses.filter(cls => 
    cls.status === "completed" || new Date(cls.scheduled_at) <= new Date()
  );

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "live": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getPlatformIcon = (platform: string | null) => {
    switch (platform) {
      case "youtube": return "🎬";
      case "zoom": return "📹";
      case "meet": return "📞";
      default: return "🎥";
    }
  };

  const ClassCard = ({ cls }: { cls: LiveClass }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-violet-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getPlatformIcon(cls.platform)}</span>
              <CardTitle className="text-lg line-clamp-1">{cls.title}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getStatusColor(cls.status)}>
                {cls.status === "live" && <span className="animate-pulse mr-1">●</span>}
                {cls.status || "scheduled"}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">{cls.platform}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {cls.meeting_url && (
                <DropdownMenuItem onClick={() => window.open(cls.meeting_url!, "_blank")}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDeleteClass(cls.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cls.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {cls.description}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{new Date(cls.scheduled_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{new Date(cls.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Video className="w-4 h-4" />
            <span>{cls.duration_minutes || 60} min</span>
          </div>
          {cls.attendee_count !== null && cls.attendee_count > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{cls.attendee_count} attendees</span>
            </div>
          )}
        </div>
        {cls.meeting_url && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.open(cls.meeting_url!, "_blank")}
          >
            <Play className="w-4 h-4 mr-2" />
            Join Class
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
              Live Classes
            </h1>
            <p className="text-muted-foreground mt-1">
              Schedule and manage live classes
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Class
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upcoming" className="space-y-6">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingClasses.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              Past ({pastClasses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-2">
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : upcomingClasses.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No upcoming classes</h3>
                <p className="text-muted-foreground mb-4">
                  Schedule your first live class
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Class
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingClasses.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {pastClasses.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No past classes</h3>
                <p className="text-muted-foreground">
                  Completed classes will appear here
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastClasses.map((cls) => (
                  <ClassCard key={cls.id} cls={cls} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Class Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule Live Class</DialogTitle>
              <DialogDescription>
                Set up a new live class session
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Class Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Physics Chapter 5 - Motion"
                  value={newClass.title}
                  onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the class..."
                  value={newClass.description}
                  onChange={(e) => setNewClass({ ...newClass, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={newClass.platform}
                    onValueChange={(value) => setNewClass({ ...newClass, platform: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="youtube">YouTube Live</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="meet">Google Meet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newClass.duration_minutes}
                    onChange={(e) => setNewClass({ ...newClass, duration_minutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meeting_url">Meeting URL</Label>
                <Input
                  id="meeting_url"
                  placeholder="https://..."
                  value={newClass.meeting_url}
                  onChange={(e) => setNewClass({ ...newClass, meeting_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_at">Scheduled Time *</Label>
                <Input
                  id="scheduled_at"
                  type="datetime-local"
                  value={newClass.scheduled_at}
                  onChange={(e) => setNewClass({ ...newClass, scheduled_at: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateClass}
                disabled={!newClass.title || !newClass.scheduled_at}
                className="bg-gradient-to-r from-violet-500 to-purple-500"
              >
                Schedule Class
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
