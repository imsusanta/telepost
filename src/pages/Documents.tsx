import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Trash2, Download, Sparkles } from "lucide-react";
import { DocumentService, Document } from "@/services/documentService";
import { SubscriptionService } from "@/services/subscriptionService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [storageUsed, setStorageUsed] = useState({ current: 0, limit: 50 });
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadChannels();
    loadDocuments();
    loadStorageInfo();
  }, []);

  useEffect(() => {
    const channelFromUrl = searchParams.get("channel");
    if (channelFromUrl) {
      setSelectedChannel(channelFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    loadDocuments();
  }, [selectedChannel]);

  const loadChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userChannels = await ChannelService.getUserChannels(user.id);
      setChannels(userChannels);
    } catch (error: any) {
      console.error("Failed to load channels:", error);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const docs = await DocumentService.getUserDocuments(user.id, selectedChannel || undefined);
      setDocuments(docs);
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

  const loadStorageInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const canUpload = await SubscriptionService.canUserPerformAction(user.id, "upload_pdf");
      if (canUpload.limit && canUpload.current !== undefined) {
        setStorageUsed({ current: canUpload.current, limit: canUpload.limit });
      }
    } catch (error) {
      console.error("Failed to load storage info:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid File",
        description: "Only PDF files are supported",
        variant: "destructive",
      });
      return;
    }

    if (!selectedChannel) {
      toast({
        title: "Channel Required",
        description: "Please select a channel before uploading",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await DocumentService.uploadDocument(user.id, file, {
        title: file.name,
        language: "bn",
        channelId: selectedChannel,
      });

      toast({
        title: "Upload Successful",
        description: "Your document is being processed and added to the channel's knowledge base",
      });

      loadDocuments();
      loadStorageInfo();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await DocumentService.deleteDocument(documentId, user.id);

      toast({
        title: "Deleted",
        description: "Document deleted successfully",
      });

      loadDocuments();
      loadStorageInfo();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Document Library</h1>
            <p className="text-muted-foreground">Upload PDFs to your channel's knowledge base</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-64">
              <Label htmlFor="channel-select" className="text-sm mb-2 block">
                Channel
              </Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger id="channel-select">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-6">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading || !selectedChannel}
                className="hidden"
                id="pdf-upload"
              />
              <Button asChild disabled={uploading || !selectedChannel} className="gap-2">
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload PDF"}
                </label>
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage Usage</CardTitle>
            <CardDescription>
              {storageUsed.current.toFixed(2)} GB / {storageUsed.limit} GB used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-muted rounded-full h-4">
              <div
                className="bg-primary h-4 rounded-full transition-all"
                style={{ width: `${(storageUsed.current / storageUsed.limit) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">Loading documents...</div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first PDF to generate AI-powered quizzes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <FileText className="w-10 h-10 text-primary" />
                      <div>
                        <CardTitle className="text-lg">{doc.title || doc.file_name}</CardTitle>
                        <CardDescription>
                          {formatFileSize(doc.file_size_bytes)} • {doc.page_count || "?"} pages •{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        Generate Quiz
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {doc.processing_status !== "completed" && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Status: {doc.processing_status}
                      {doc.processing_error && ` - ${doc.processing_error}`}
                    </div>
                  </CardContent>
                )}
                {doc.ai_summary && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{doc.ai_summary}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
