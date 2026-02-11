import { useState, useEffect, useCallback } from "react";
import { FileText, Search, Sparkles, Check } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { DocumentService, Document } from "@/services/documentService";
import { ChannelService } from "@/services/channelService";
import { Channel } from "@/types/channel";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface KnowledgeBaseSelectorProps {
    onSelect: (document: Document) => void;
    trigger?: React.ReactNode;
}

export function KnowledgeBaseSelector({ onSelect, trigger }: KnowledgeBaseSelectorProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [userDocs, userChannels] = await Promise.all([
                DocumentService.getUserDocuments(user.id),
                ChannelService.getUserChannels(user.id),
            ]);

            setDocuments(userDocs);
            setChannels(userChannels);
        } catch (error) {
            console.error("Failed to load Knowledge Base data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            loadInitialData();
        }
    }, [open, loadInitialData]);

    const filteredDocuments = documents.filter((doc) => {
        const matchesSearch = (doc.title || doc.file_name)
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        const matchesChannel =
            selectedChannel === "all" || doc.channel_id === selectedChannel;
        return matchesSearch && matchesChannel;
    });

    const handleSelect = (doc: Document) => {
        onSelect(doc);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Sparkles className="w-4 h-4" />
                        Select from Library
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-4 sm:p-6 bg-background/95 backdrop-blur-sm border-primary/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
                        <FileText className="w-6 h-6 text-primary" />
                        Select from Knowledge Base
                    </DialogTitle>
                    <DialogDescription>
                        Choose a PDF from your library to generate questions
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col sm:flex-row gap-4 my-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 rounded-xl"
                        />
                    </div>
                    <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                        <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-xl">
                            <SelectValue placeholder="All Channels" />
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

                <ScrollArea className="flex-1 pr-4">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex gap-4 p-4 border rounded-xl animate-pulse">
                                    <Skeleton className="w-10 h-10 rounded-lg" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-1/3" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredDocuments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <FileText className="w-12 h-12 mb-4 opacity-20" />
                            <p>No documents found</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {filteredDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => doc.processing_status === "completed" && handleSelect(doc)}
                                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${doc.processing_status === "completed"
                                        ? "cursor-pointer hover:border-primary/50 hover:bg-primary/5"
                                        : "opacity-60 grayscale cursor-not-allowed"
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${doc.processing_status === "completed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                        }`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-lg truncate mb-1">
                                            {doc.title || doc.file_name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <Badge variant="secondary" className="font-normal">
                                                {doc.processing_status}
                                            </Badge>
                                            <span>•</span>
                                            <span>{(doc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                                            <span>•</span>
                                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {doc.processing_status === "completed" && (
                                        <Button variant="ghost" size="icon" className="text-primary self-center">
                                            <Check className="w-5 h-5" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="mt-4 pt-4 border-t flex justify-end">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
