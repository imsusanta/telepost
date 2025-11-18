import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DocumentService, Document } from "@/services/documentService";
import {
  FileText,
  Upload,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface DocumentsSectionProps {
  channelId?: string;
  selectedDocumentId?: string;
  onDocumentSelect?: (documentId: string) => void;
  compact?: boolean;
}

export const DocumentsSection = ({
  channelId,
  selectedDocumentId,
  onDocumentSelect,
  compact = true,
}: DocumentsSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
  }, [user, channelId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await DocumentService.getUserDocuments(user!.id);

      // Filter by channel if provided
      const filteredDocs = channelId
        ? docs.filter((doc) => doc.channel_id === channelId)
        : docs;

      setDocuments(filteredDocs);
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

    setUploading(true);
    try {
      await DocumentService.uploadDocument(user!.id, file, {
        title: file.name,
        language: "bn",
        channel_id: channelId,
      });

      toast({
        title: "Upload Successful",
        description: "Your document is being processed",
      });

      loadDocuments();
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
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await DocumentService.deleteDocument(documentId, user!.id);
      toast({
        title: "Deleted",
        description: "Document deleted successfully",
      });
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Documents</h4>
          <p className="text-xs text-muted-foreground">
            Upload PDFs to generate quizzes from
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => document.getElementById("document-upload")?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </>
          )}
        </Button>
        <input
          id="document-upload"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {documents.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No documents yet. Upload a PDF to get started.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedDocumentId === doc.id
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent"
              }`}
              onClick={() => onDocumentSelect?.(doc.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-medium truncate">
                        {doc.title || doc.file_name}
                      </h5>
                      {selectedDocumentId === doc.id && (
                        <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {getStatusIcon(doc.processing_status)}
                        <span className="ml-1 capitalize">{doc.processing_status}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(doc.file_size_bytes)}
                      </span>
                      {doc.page_count && (
                        <span className="text-xs text-muted-foreground">
                          {doc.page_count} pages
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                  className="flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
