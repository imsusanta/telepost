import { useState, useEffect, useCallback } from "react";
import { FileText, RefreshCw, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { DocumentService, Document } from "@/services/documentService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [storageUsed, setStorageUsed] = useState({ current: 0, limit: 50 });
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { canAccess, getLimit, isSuperAdmin } = useSubscription();
  const hasAccess = canAccess('knowledge_base');
  const hasUploadAccess = canAccess('knowledge_base');

  if (!hasAccess && !loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <FileText className="w-16 h-16 text-muted-foreground opacity-20" />
          <h2 className="text-2xl font-bold">Premium Feature</h2>
          <p className="text-muted-foreground text-center max-w-md">
            The Knowledge Base is available for Basic and Pro users. Store PDFs and generate intelligent quizzes from your own documents.
          </p>
          <Button onClick={() => navigate("/dashboard/settings")}>
            Upgrade to Pro
          </Button>
        </div>
      </DashboardLayout>
    );
  }

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

      const docs = await DocumentService.getUserDocuments(user.id, (selectedChannel && selectedChannel !== "all") ? selectedChannel : undefined);
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

      const storageLimitGB = getLimit('max_pdf_storage_gb') || 0;
      
      const { data } = await (supabase as any).rpc('get_user_storage_usage', { user_id: user.id });
      setStorageUsed({ 
        current: ((data?.total_bytes as number) || 0) / (1024 * 1024 * 1024), 
        limit: storageLimitGB 
      });
    } catch (error: unknown) {
      toast({
        title: "Warning",
        description: "Failed to load storage info",
        variant: "default",
      });
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    loadChannels();
    loadStorageInfo();
  }, [loadChannels, loadStorageInfo]);

  // Load documents when filter changes
  useEffect(() => {
    loadDocuments();
  }, [selectedChannel]);

  // Handle URL params
  useEffect(() => {
    const channelFromUrl = searchParams.get("channel");
    if (channelFromUrl) {
      setSelectedChannel(channelFromUrl);
    }
  }, [searchParams]);

  // Poll for document processing status updates
  useEffect(() => {
    // Check if there are any documents being processed
    const hasProcessingDocs = documents.some(
      doc => doc.processing_status === "pending" || doc.processing_status === "processing"
    );

    if (!hasProcessingDocs) return;

    // Poll every 5 seconds (less aggressive than 3s to save resources)
    const pollInterval = setInterval(() => {
      console.log("[Documents] Polling for status updates...");
      loadDocuments();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [documents.length, loadDocuments]); // Only restart poll if count changes or manually reloaded

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



  // Filter documents by search query
  const filteredDocuments = documents.filter(doc =>
    searchQuery === "" ||
    (doc.title || doc.file_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.ai_summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Section */}
        <div className="flex justify-between items-end flex-wrap gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileText className="w-8 h-8" />
              </div>
              Document Library
            </h1>
            <p className="text-muted-foreground text-lg ml-1">
              Manage your knowledge base for AI quiz generation
            </p>
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-10 rounded-xl hover:bg-primary/5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>

            <div className="relative group">
              <Input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                disabled={uploading || !selectedChannel || selectedChannel === "all"}
                className="hidden"
                id="pdf-upload"
              />
              <Button
                asChild
                disabled={uploading || !selectedChannel || selectedChannel === "all" || (!hasUploadAccess && !isSuperAdmin)}
                className="gap-2 h-10 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <label 
                  htmlFor="pdf-upload" 
                  className={`flex items-center ${uploading || !selectedChannel || selectedChannel === "all" || (!hasUploadAccess && !isSuperAdmin) ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  onClick={(e) => {
                    if (!hasUploadAccess && !isSuperAdmin) {
                      e.preventDefault();
                      toast({
                        title: "Pro Feature",
                        description: "PDF upload is only available for Pro users.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload New PDF"}
                  {!hasUploadAccess && !isSuperAdmin && (
                    <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold">PRO</span>
                  )}
                </label>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats & Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none bg-gradient-to-br from-primary/5 via-transparent to-transparent shadow-sm border border-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">Storage Capacity</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {storageUsed.current.toFixed(2)} <span className="text-sm font-medium text-muted-foreground">/ {storageUsed.limit} GB</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2 mt-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (storageUsed.current / storageUsed.limit) * 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none bg-muted/30 shadow-none flex flex-col justify-center px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search in Library..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 border-none shadow-sm rounded-xl focus-visible:ring-primary/20"
                />
              </div>

              <div className="flex gap-2">
                <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                  <SelectTrigger className="h-11 border-none shadow-sm rounded-xl focus-visible:ring-primary/20 bg-background">
                    <SelectValue placeholder="Filter by Channel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Channels</SelectItem>
                    {channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        {channel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-2xl border-none bg-muted/20">
                <CardHeader>
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 rounded-3xl border-2 border-dashed border-muted/50 bg-muted/5">
            <div className="p-6 rounded-full bg-muted/50 text-muted-foreground mb-4">
              <FileText className="w-16 h-16" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">
              {searchQuery ? "No results found" : "Your library is empty"}
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `We couldn't find anything matching "${searchQuery}". Try another keyword.`
                : "Upload study materials or guides in PDF format to start generating intelligent quizzes."}
            </p>
            {!searchQuery && (
              <Button asChild variant="outline" className="mt-4 rounded-xl">
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload your first PDF
                </label>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <Card
                key={doc.id}
                className="group relative rounded-2xl border-none shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden bg-card hover:-translate-y-1 border border-transparent hover:border-primary/10"
              >
                {/* Status Indicator Bar */}
                {doc.processing_status !== "completed" ? (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
                    <div className="h-full bg-primary animate-pulse" style={{ width: doc.processing_status === "processing" ? "60%" : "20%" }} />
                  </div>
                ) : (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 group-hover:bg-primary transition-colors" />
                )}

                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <FileText className="w-6 h-6" />
                    </div>

                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => handleDelete(doc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {doc.title || doc.file_name}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs font-medium text-muted-foreground/80">
                      <span className="flex items-center gap-1">
                        {formatFileSize(doc.file_size_bytes)}
                      </span>
                      <span>•</span>
                      <span>{doc.page_count || "?"} pages</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {doc.ai_summary ? (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 italic">
                      "{doc.ai_summary}"
                    </p>
                  ) : doc.processing_status === "completed" ? (
                    <p className="text-sm text-muted-foreground/50 leading-relaxed italic">
                      No summary available for this document.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-primary font-medium animate-pulse">
                      <Sparkles className="w-4 h-4" />
                      AI is analyzing content...
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${doc.processing_status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                      : doc.processing_status === 'failed'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-primary/10 text-primary border border-primary/20'
                      }`}>
                      {doc.processing_status}
                    </div>

                    <div />
                  </div>

                  {doc.processing_error && (
                    <div className="p-2 rounded-lg bg-destructive/5 text-[10px] text-destructive border border-destructive/10 break-words">
                      {doc.processing_error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
