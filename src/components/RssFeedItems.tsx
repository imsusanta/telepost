import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { RssService } from "@/services/rssService";
import { RssFeedItem } from "@/types/rss";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RssFeedItemsProps {
  feedId: string;
  onClose: () => void;
}

export const RssFeedItems = ({ feedId, onClose }: RssFeedItemsProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<RssFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, [feedId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await RssService.getFeedItems(feedId);
      setItems(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to load feed items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (itemId: string) => {
    try {
      await RssService.retryFailedItem(itemId);
      toast({
        title: "Success",
        description: "Item queued for retry",
      });
      loadItems();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to retry item",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      processing: "default",
      posted: "default",
      failed: "destructive",
      skipped: "secondary",
    };

    const colors: Record<string, string> = {
      pending: "bg-blue-100 text-blue-800",
      processing: "bg-yellow-100 text-yellow-800",
      posted: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      skipped: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className={colors[status]}>
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>RSS Feed Items</DialogTitle>
          <DialogDescription>
            View and manage items from this RSS feed
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Posted At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-md">
                      <div>
                        <p className="font-medium line-clamp-2">{item.title}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.published_date
                        ? new Date(item.published_date).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      {item.posted_at
                        ? new Date(item.posted_at).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.link && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(item.link!, "_blank")}
                            title="Open Link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === "failed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRetry(item.id)}
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
