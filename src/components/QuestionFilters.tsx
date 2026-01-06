import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    ChevronDown,
    X,
    Search,
    Tag,
    BookOpen,
    ArrowUpDown,
    Plus,
    Pencil,
    Trash2,
    Check,
} from "lucide-react";
import {
    DIFFICULTY_LEVELS,
    getSubjectColor,
    getDifficultyConfig,
} from "@/services/classificationService";
import { QuestionBankFilters } from "@/services/questionBankService";

interface SubjectCount {
    subject: string;
    count: number;
}

interface TopicCount {
    topic: string;
    count: number;
}

interface QuestionFiltersProps {
    filters: QuestionBankFilters;
    onFiltersChange: (filters: QuestionBankFilters) => void;
    subjectsWithCounts: SubjectCount[];
    topicsWithCounts: TopicCount[];
    fullSubjects?: any[];
    totalCount: number;
    filteredCount: number;
    onAddSubject?: (name: string) => void;
    onEditSubject?: (oldName: string, newName: string) => void;
    onDeleteSubject?: (name: string) => void;
    onAddTopic?: (subjectId: string, name: string) => void;
    onEditTopic?: (oldName: string, newName: string) => void;
    onDeleteTopic?: (name: string) => void;
}

type SortOption = 'latest' | 'oldest' | 'a-z' | 'difficulty';

export function QuestionFilters({
    filters,
    onFiltersChange,
    subjectsWithCounts,
    topicsWithCounts,
    fullSubjects = [],
    totalCount,
    filteredCount,
    onAddSubject,
    onEditSubject,
    onDeleteSubject,
    onAddTopic,
    onEditTopic,
    onDeleteTopic,
}: QuestionFiltersProps) {
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
    const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<SortOption>('oldest');
    const [subjectSearch, setSubjectSearch] = useState("");
    const [topicSearch, setTopicSearch] = useState("");
    const [newSubjectName, setNewSubjectName] = useState("");
    const [newTopicName, setNewTopicName] = useState("");
    const [editingSubject, setEditingSubject] = useState<string | null>(null);
    const [editSubjectName, setEditSubjectName] = useState("");
    const [editingTopic, setEditingTopic] = useState<string | null>(null);
    const [editTopicName, setEditTopicName] = useState("");

    // Filter subjects by search
    const filteredSubjects = subjectsWithCounts.filter((s) =>
        s.subject.toLowerCase().includes(subjectSearch.toLowerCase())
    );

    // Filter topics by search and selected subjects
    const filteredTopics = topicsWithCounts.filter((t) =>
        t.topic.toLowerCase().includes(topicSearch.toLowerCase())
    );

    // Handle subject toggle
    const toggleSubject = (subject: string) => {
        const newSubjects = selectedSubjects.includes(subject)
            ? selectedSubjects.filter((s) => s !== subject)
            : [...selectedSubjects, subject];
        setSelectedSubjects(newSubjects);
        updateFilters({ subjects: newSubjects });
    };

    // Handle topic toggle
    const toggleTopic = (topic: string) => {
        const newTopics = selectedTopics.includes(topic)
            ? selectedTopics.filter((t) => t !== topic)
            : [...selectedTopics, topic];
        setSelectedTopics(newTopics);
        updateFilters({ topics: newTopics });
    };

    // Handle difficulty toggle
    const toggleDifficulty = (difficulty: string) => {
        const newDifficulties = selectedDifficulties.includes(difficulty)
            ? selectedDifficulties.filter((d) => d !== difficulty)
            : [...selectedDifficulties, difficulty];
        setSelectedDifficulties(newDifficulties);
        updateFilters({ difficulties: newDifficulties });
    };

    // Update parent filters
    const updateFilters = (updates: {
        subjects?: string[];
        topics?: string[];
        difficulties?: string[];
    }) => {
        const newFilters = { ...filters };

        if (updates.subjects !== undefined) {
            newFilters.subject = updates.subjects.length === 1 ? updates.subjects[0] : undefined;
        }
        if (updates.topics !== undefined) {
            newFilters.topic = updates.topics.length === 1 ? updates.topics[0] : undefined;
        }
        if (updates.difficulties !== undefined) {
            newFilters.difficulty = updates.difficulties.length === 1 ? updates.difficulties[0] : undefined;
        }

        onFiltersChange(newFilters);
    };

    // Clear all filters
    const clearAllFilters = () => {
        setSelectedSubjects([]);
        setSelectedTopics([]);
        setSelectedDifficulties([]);
        setSortBy('latest');
        onFiltersChange({
            includePublic: filters.includePublic,
        });
    };

    // Check if any filters are active
    const hasActiveFilters =
        selectedSubjects.length > 0 ||
        selectedTopics.length > 0 ||
        selectedDifficulties.length > 0;

    return (
        <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Subject Filter */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-9 px-3 gap-2 border-2 hover:bg-primary/5"
                        >
                            <Tag className="w-4 h-4" />
                            Subject
                            {selectedSubjects.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {selectedSubjects.length}
                                </Badge>
                            )}
                            <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search subjects..."
                                    value={subjectSearch}
                                    onChange={(e) => setSubjectSearch(e.target.value)}
                                    className="pl-8 h-8"
                                />
                            </div>
                        </div>
                        <ScrollArea className="h-64">
                            <div className="p-2 space-y-1">
                                {selectedSubjects.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            setSelectedSubjects([]);
                                            updateFilters({ subjects: [] });
                                        }}
                                    >
                                        <X className="w-3 h-3 mr-2" />
                                        Clear selection
                                    </Button>
                                )}
                                {filteredSubjects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No subjects found
                                    </p>
                                ) : (
                                    filteredSubjects.map((item) => (
                                        <div
                                            key={item.subject}
                                            className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                        >
                                            {editingSubject === item.subject ? (
                                                <div className="flex items-center gap-2 w-full pr-1" onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        value={editSubjectName}
                                                        onChange={(e) => setEditSubjectName(e.target.value)}
                                                        className="h-7 text-xs flex-1"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && editSubjectName.trim()) {
                                                                onEditSubject?.(item.subject, editSubjectName.trim());
                                                                setEditingSubject(null);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingSubject(null);
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => {
                                                            if (editSubjectName.trim()) {
                                                                onEditSubject?.(item.subject, editSubjectName.trim());
                                                                setEditingSubject(null);
                                                            }
                                                        }}
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setEditingSubject(null)}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 h-full" onClick={() => toggleSubject(item.subject)}>
                                                        <Checkbox
                                                            checked={selectedSubjects.includes(item.subject)}
                                                            onCheckedChange={() => toggleSubject(item.subject)}
                                                        />
                                                        <div
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: getSubjectColor(item.subject) }}
                                                        />
                                                        <span className="flex-1 text-sm font-medium truncate">
                                                            {item.subject}
                                                        </span>
                                                        <Badge variant="secondary" className="h-5 text-xs shrink-0">
                                                            {item.count}
                                                        </Badge>
                                                    </div>

                                                    {(onEditSubject || onDeleteSubject) && (
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {onEditSubject && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingSubject(item.subject);
                                                                        setEditSubjectName(item.subject);
                                                                    }}
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            {onDeleteSubject && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(`Are you sure you want to delete subject "${item.subject}"?`)) {
                                                                            onDeleteSubject(item.subject);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                        {onAddSubject && (
                            <div className="p-3 border-t bg-muted/20">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Add new subject..."
                                        value={newSubjectName}
                                        onChange={(e) => setNewSubjectName(e.target.value)}
                                        className="h-8 text-xs font-semibold"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newSubjectName.trim()) {
                                                onAddSubject(newSubjectName.trim());
                                                setNewSubjectName("");
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        className="h-8 w-8 shrink-0 shadow-sm"
                                        disabled={!newSubjectName.trim()}
                                        onClick={() => {
                                            onAddSubject(newSubjectName.trim());
                                            setNewSubjectName("");
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>

                {/* Topic Filter */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="h-9 px-3 gap-2 border-2 hover:bg-primary/5"
                        >
                            <BookOpen className="w-4 h-4" />
                            Topic
                            {selectedTopics.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                                    {selectedTopics.length}
                                </Badge>
                            )}
                            <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                        <div className="p-3 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search topics..."
                                    value={topicSearch}
                                    onChange={(e) => setTopicSearch(e.target.value)}
                                    className="pl-8 h-8"
                                />
                            </div>
                        </div>
                        <ScrollArea className="h-64">
                            <div className="p-2 space-y-1">
                                {selectedTopics.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-xs text-muted-foreground hover:text-destructive"
                                        onClick={() => {
                                            setSelectedTopics([]);
                                            updateFilters({ topics: [] });
                                        }}
                                    >
                                        <X className="w-3 h-3 mr-2" />
                                        Clear selection
                                    </Button>
                                )}
                                {filteredTopics.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No topics found
                                    </p>
                                ) : (
                                    filteredTopics.map((item) => (
                                        <div
                                            key={item.topic}
                                            className="group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                                        >
                                            {editingTopic === item.topic ? (
                                                <div className="flex items-center gap-2 w-full pr-1" onClick={(e) => e.stopPropagation()}>
                                                    <Input
                                                        value={editTopicName}
                                                        onChange={(e) => setEditTopicName(e.target.value)}
                                                        className="h-7 text-xs flex-1"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && editTopicName.trim()) {
                                                                const subject = fullSubjects.find((s: any) => s.name === selectedSubjects[0]);
                                                                if (subject) {
                                                                    onEditTopic?.(item.topic, editTopicName.trim());
                                                                }
                                                                setEditingTopic(null);
                                                            } else if (e.key === 'Escape') {
                                                                setEditingTopic(null);
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => {
                                                            if (editTopicName.trim()) {
                                                                onEditTopic?.(item.topic, editTopicName.trim());
                                                                setEditingTopic(null);
                                                            }
                                                        }}
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                        onClick={() => setEditingTopic(null)}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 h-full" onClick={() => toggleTopic(item.topic)}>
                                                        <Checkbox
                                                            checked={selectedTopics.includes(item.topic)}
                                                            onCheckedChange={() => toggleTopic(item.topic)}
                                                        />
                                                        <span className="flex-1 text-sm font-medium truncate">
                                                            {item.topic}
                                                        </span>
                                                        <Badge variant="secondary" className="h-5 text-xs shrink-0">
                                                            {item.count}
                                                        </Badge>
                                                    </div>

                                                    {(onEditTopic || onDeleteTopic) && (
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {onEditTopic && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingTopic(item.topic);
                                                                        setEditTopicName(item.topic);
                                                                    }}
                                                                >
                                                                    <Pencil className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                            {onDeleteTopic && (
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (window.confirm(`Are you sure you want to delete topic "${item.topic}"?`)) {
                                                                            onDeleteTopic(item.topic);
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                        {onAddTopic && (
                            <div className="p-3 border-t bg-muted/20">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={selectedSubjects.length === 1 ? `Add topic to ${selectedSubjects[0]}...` : "Select one subject to add topics..."}
                                        value={newTopicName}
                                        onChange={(e) => setNewTopicName(e.target.value)}
                                        disabled={selectedSubjects.length !== 1}
                                        className="h-8 text-xs font-semibold"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newTopicName.trim() && selectedSubjects.length === 1) {
                                                const subject = fullSubjects.find((s: any) => s.name === selectedSubjects[0]);
                                                if (subject) {
                                                    onAddTopic(subject.id, newTopicName.trim());
                                                    setNewTopicName("");
                                                }
                                            }
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        className="h-8 w-8 shrink-0 shadow-sm"
                                        disabled={!newTopicName.trim() || selectedSubjects.length !== 1}
                                        onClick={() => {
                                            const subject = fullSubjects.find((s: any) => s.name === selectedSubjects[0]);
                                            if (subject) {
                                                onAddTopic(subject.id, newTopicName.trim());
                                                setNewTopicName("");
                                            }
                                        }}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                {selectedSubjects.length !== 1 && (
                                    <p className="text-[10px] text-muted-foreground mt-1 text-center italic">
                                        Select exactly one subject to enable topic creation
                                    </p>
                                )}
                            </div>
                        )}
                    </PopoverContent>
                </Popover>
                {/* Difficulty Chips */}
                <div className="flex items-center gap-1.5">
                    {DIFFICULTY_LEVELS.map((level) => {
                        const isSelected = selectedDifficulties.includes(level.id);
                        const config = getDifficultyConfig(level.id);
                        return (
                            <Button
                                key={level.id}
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                className={`h-8 px-3 text-xs font-semibold transition-all ${isSelected
                                    ? `${config.bgColor} ${config.textColor} hover:opacity-80`
                                    : "hover:bg-muted/50"
                                    }`}
                                style={
                                    isSelected
                                        ? { backgroundColor: `${config.color}20`, color: config.color }
                                        : {}
                                }
                                onClick={() => toggleDifficulty(level.id)}
                            >
                                {level.name}
                            </Button>
                        );
                    })}
                </div>


                {/* Spacer */}
                <div className="flex-1" />

                {/* Sort Dropdown */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2">
                            <ArrowUpDown className="w-4 h-4" />
                            Sort
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2" align="end">
                        {[
                            { id: 'latest' as const, label: 'Latest first' },
                            { id: 'oldest' as const, label: 'Oldest first' },
                            { id: 'a-z' as const, label: 'A-Z' },
                            { id: 'difficulty' as const, label: 'By difficulty' },
                        ].map((option) => (
                            <Button
                                key={option.id}
                                variant={sortBy === option.id ? "secondary" : "ghost"}
                                size="sm"
                                className="w-full justify-start text-sm"
                                onClick={() => setSortBy(option.id)}
                            >
                                {option.label}
                            </Button>
                        ))}
                    </PopoverContent>
                </Popover>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={clearAllFilters}
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear all
                    </Button>
                )}
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Filters:</span>

                    {selectedSubjects.map((subject) => (
                        <Badge
                            key={`subject-${subject}`}
                            variant="secondary"
                            className="h-6 gap-1 pr-1"
                            style={{
                                backgroundColor: `${getSubjectColor(subject)}15`,
                                color: getSubjectColor(subject),
                            }}
                        >
                            {subject}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => toggleSubject(subject)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </Badge>
                    ))}

                    {selectedTopics.map((topic) => (
                        <Badge key={`topic-${topic}`} variant="outline" className="h-6 gap-1 pr-1">
                            {topic}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                                onClick={() => toggleTopic(topic)}
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </Badge>
                    ))}

                    {selectedDifficulties.map((diff) => {
                        const config = getDifficultyConfig(diff);
                        return (
                            <Badge
                                key={`diff-${diff}`}
                                variant="secondary"
                                className={`h-6 gap-1 pr-1 ${config.bgColor} ${config.textColor}`}
                            >
                                {diff}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 p-0 hover:bg-transparent"
                                    onClick={() => toggleDifficulty(diff)}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </Badge>
                        );
                    })}


                    <Separator orientation="vertical" className="h-4 mx-1" />

                    <span className="text-sm text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{filteredCount}</span> of{" "}
                        <span className="font-semibold text-foreground">{totalCount}</span> questions
                    </span>
                </div>
            )}
        </div>
    );
}
