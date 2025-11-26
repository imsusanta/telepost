import { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { DocumentService, Document } from "@/services/documentService";
import { SubscriptionService } from "@/services/subscriptionService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";
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

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [storageUsed, setStorageUsed] = useState({ current: 0, limit: 50 });
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const loadChannels = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const userChannels = await ChannelService.getUserChannels(user.id);
      setChannels(userChannels);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: "Failed to load channels: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    }
  }, [toast]);

  const loadDocuments = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const docs = await DocumentService.getUserDocuments(user.id, selectedChannel || undefined);
      setDocuments(docs);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedChannel, toast]);

  const loadStorageInfo = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const canUpload = await SubscriptionService.canUserPerformAction(user.id, "upload_pdf");
      if (canUpload.limit && canUpload.current !== undefined) {
        setStorageUsed({ current: canUpload.current, limit: canUpload.limit });
      }
    } catch (error: unknown) {
      toast({
        title: "Warning",
        description: "Failed to load storage info",
        variant: "default",
      });
    }
  }, [toast]);

  useEffect(() => {
    loadChannels();
    loadDocuments();
    loadStorageInfo();
  }, [loadChannels, loadDocuments, loadStorageInfo]);

  useEffect(() => {
    const channelFromUrl = searchParams.get("channel");
    if (channelFromUrl) {
      setSelectedChannel(channelFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll for document processing status updates
  useEffect(() => {
    // Check if there are any documents being processed
    const hasProcessingDocs = documents.some(
      doc => doc.processing_status === "pending" || doc.processing_status === "processing"
    );

    if (!hasProcessingDocs) {
      return; // No polling needed
    }

    // Poll every 3 seconds
    const pollInterval = setInterval(() => {
      loadDocuments();
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [documents, loadDocuments]);

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
    } catch (error: unknown) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
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
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const documentIds = Array.from(selectedDocuments);
      await DocumentService.deleteMultipleDocuments(documentIds, user.id);

      toast({
        title: "Deleted",
        description: `${documentIds.length} document${documentIds.length > 1 ? 's' : ''} deleted successfully`,
      });

      setSelectedDocuments(new Set());
      setShowDeleteDialog(false);
      loadDocuments();
      loadStorageInfo();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete documents",
        variant: "destructive",
      });
    }
  };

  const toggleDocumentSelection = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDocuments();
    await loadStorageInfo();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Documents list updated",
    });
  };

  const handleGenerateQuiz = (doc: Document) => {
    if (doc.processing_status !== "completed") {
      toast({
        title: "Document Processing",
        description: "Please wait for the document to finish processing before generating a quiz",
        variant: "default",
      });
      return;
    }
    // Navigate to quiz generation with the document pre-selected
    const params = new URLSearchParams();
    params.set("document", doc.id);
    if (doc.channel_id) {
      params.set("channel", doc.channel_id);
    }
    navigate(`/generate?${params.toString()}`);
  };

  // Filter documents by search query
  const filteredDocuments = documents.filter(doc =>
    searchQuery === "" ||
    (doc.title || doc.file_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              <FileText className="w-10 h-10" />
              Document Library
            </h1>
            <p className="text-muted-foreground">
              Upload PDFs to your channel's knowledge base
              {searchQuery && ` (${filteredDocuments.length} matching)`}
            </p>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
            <div className="w-48">
              <Label htmlFor="channel-select" className="text-sm mb-2 block">
                Channel
              </Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger id="channel-select">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <div>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading || !selectedChannel || selectedChannel === "all"}
                className="hidden"
                id="pdf-upload"
              />
              <Button asChild disabled={uploading || !selectedChannel || selectedChannel === "all"} className="gap-2">
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

        {!loading && filteredDocuments.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedDocuments.size === filteredDocuments.length && filteredDocuments.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({selectedDocuments.size} selected)
              </Label>
            </div>
            {selectedDocuments.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedDocuments.size})
              </Button>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <Skeleton className="w-10 h-10 rounded" />
                      <div>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No matching documents" : "No documents yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Upload your first PDF to generate AI-powered quizzes"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className={selectedDocuments.has(doc.id) ? "border-primary" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        id={`doc-${doc.id}`}
                        checked={selectedDocuments.has(doc.id)}
                        onCheckedChange={() => toggleDocumentSelection(doc.id)}
                        className="mt-1"
                      />
                      <FileText className="w-10 h-10 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg break-words">{doc.title || doc.file_name}</CardTitle>
                        <CardDescription>
                          {formatFileSize(doc.file_size_bytes)} • {doc.page_count || "?"} pages •{" "}
                          {new Date(doc.created_at).toLocaleDateString()}
                        </CardDescription>
                        {doc.processing_status !== "completed" && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              doc.processing_status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              doc.processing_status === "processing" ? "bg-blue-100 text-blue-800" :
                              doc.processing_status === "failed" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              Status: {doc.processing_status}
                            </span>
                            {doc.processing_error && (
                              <p className="text-xs text-red-600 mt-1">{doc.processing_error}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleGenerateQuiz(doc)}
                        disabled={doc.processing_status !== "completed"}
                      >
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Documents?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedDocuments.size} document{selectedDocuments.size > 1 ? 's' : ''}?
              This action cannot be undone. The document{selectedDocuments.size > 1 ? 's' : ''} will be permanently removed
              from your storage and all associated data will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete {selectedDocuments.size} Document{selectedDocuments.size > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
