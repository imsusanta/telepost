import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Search, Loader2, Plus, BookOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { KnowledgeBaseTopic } from "@/types/knowledgeBase";
import { KnowledgeBaseService } from "@/services/knowledgeBaseService";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface KnowledgeBaseTopicSelectorProps {
  selectedTopicId?: string | null;
  onTopicSelect: (topic: KnowledgeBaseTopic | null) => void;
  channelId?: string;
  className?: string;
  placeholder?: string;
}

export function KnowledgeBaseTopicSelector({ selectedTopicId, onTopicSelect, channelId, className, placeholder = "Select a topic..." }: KnowledgeBaseTopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<KnowledgeBaseTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadTopics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await KnowledgeBaseService.getTopics({ channelId });
      setTopics(data);
    } catch (error) {
      console.error("Failed to load topics:", error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (open && topics.length === 0) {
      loadTopics();
    }
  }, [open, loadTopics, topics.length]);

  const selectedTopic = topics.find((t) => t.id === selectedTopicId);
  
  const filteredTopics = topics.filter(t => 
    t.topic_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-12", className)}
        >
          {selectedTopic ? (
            <div className="flex items-center gap-2 truncate">
              <BookOpen className="w-4 h-4 text-primary shrink-0" />
              <span className="truncate">{selectedTopic.topic_name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          
          <div className="flex items-center gap-1">
             {selectedTopic && (
               <div 
                 role="button" 
                 tabIndex={0} 
                 className="p-1 hover:bg-muted rounded-full mr-1 shrink-0"
                 onClick={(e) => {
                   e.stopPropagation();
                   onTopicSelect(null);
                 }}
               >
                 <X className="w-3 h-3 opacity-50" />
               </div>
             )}
             <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList>
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading topics...
              </div>
            ) : filteredTopics.length === 0 ? (
              <CommandEmpty>No topics found.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredTopics.map((topic) => (
                  <CommandItem
                    key={topic.id}
                    value={topic.id}
                    onSelect={() => {
                      onTopicSelect(topic.id === selectedTopicId ? null : topic);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{topic.topic_name}</span>
                      {selectedTopicId === topic.id && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {topic.subject && (
                        <Badge variant="secondary" className="text-[10px]">{topic.subject}</Badge>
                      )}
                      {topic.language && (
                        <Badge variant="outline" className="text-[10px]">{topic.language}</Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full justify-start text-sm" asChild>
              <Link to="/dashboard/knowledge-base">
                <Plus className="w-4 h-4 mr-2" />
                Manage Topics
              </Link>
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
