import { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Edit2,
    Check,
    X,
    Loader2,
    Layers,
    ChevronRight,
    Type
} from 'lucide-react';
import {
    ClassificationMetadataService,
    ClassificationSubject,
    ClassificationTopic
} from '@/services/classificationMetadataService';
import { isSuperAdmin } from '@/services/couponService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export function TaxonomyManagement() {
    const { toast } = useToast();
    const [subjects, setSubjects] = useState<ClassificationSubject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<ClassificationSubject | null>(null);
    const [topics, setTopics] = useState<ClassificationTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTopics, setLoadingTopics] = useState(false);
    const [isSuperUser, setIsSuperUser] = useState(false);

    // Add/Edit Subject Dialog State
    const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<ClassificationSubject | null>(null);
    const [subjectName, setSubjectName] = useState('');
    const [subjectColor, setSubjectColor] = useState('#9333ea');
    const [subjectIcon, setSubjectIcon] = useState('📜');
    const [submittingSubject, setSubmittingSubject] = useState(false);

    // Add/Edit Topic State
    const [topicName, setTopicName] = useState('');
    const [editingTopic, setEditingTopic] = useState<ClassificationTopic | null>(null);
    const [submittingTopic, setSubmittingTopic] = useState(false);

    useEffect(() => {
        loadSubjects();
        checkPermission();
    }, []);

    const checkPermission = async () => {
        const admin = await isSuperAdmin();
        setIsSuperUser(admin);
    };

    useEffect(() => {
        if (selectedSubject) {
            loadTopics(selectedSubject.id);
        } else {
            setTopics([]);
        }
    }, [selectedSubject]);

    const loadSubjects = async () => {
        try {
            setLoading(true);
            const data = await ClassificationMetadataService.getSubjects();
            setSubjects(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to load subjects',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadTopics = async (subjectId: string) => {
        try {
            setLoadingTopics(true);
            const data = await ClassificationMetadataService.getTopics(subjectId);
            setTopics(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load topics',
                variant: 'destructive',
            });
        } finally {
            setLoadingTopics(false);
        }
    };

    const handleSaveSubject = async () => {
        if (!subjectName.trim()) return;

        try {
            setSubmittingSubject(true);
            if (editingSubject) {
                await ClassificationMetadataService.updateSubject(editingSubject.id, {
                    name: subjectName,
                    color: subjectColor,
                    icon: subjectIcon
                });
                toast({ title: 'Success', description: 'Subject updated successfully' });
            } else {
                await ClassificationMetadataService.createSubject(subjectName, subjectColor, subjectIcon);
                toast({ title: 'Success', description: 'Subject created successfully' });
            }
            setSubjectDialogOpen(false);
            loadSubjects();
            resetSubjectForm();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save subject',
                variant: 'destructive',
            });
        } finally {
            setSubmittingSubject(false);
        }
    };

    const handleDeleteSubject = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure? This will delete all topics under this subject.')) return;

        try {
            await ClassificationMetadataService.deleteSubject(id);
            toast({ title: 'Success', description: 'Subject deleted' });
            if (selectedSubject?.id === id) setSelectedSubject(null);
            loadSubjects();
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete subject',
                variant: 'destructive',
            });
        }
    };

    const handleSaveTopic = async () => {
        if (!selectedSubject || !topicName.trim()) return;

        try {
            setSubmittingTopic(true);
            if (editingTopic) {
                await ClassificationMetadataService.updateTopic(editingTopic.id, topicName);
                toast({ title: 'Success', description: 'Topic updated' });
            } else {
                await ClassificationMetadataService.createTopic(selectedSubject.id, topicName);
                toast({ title: 'Success', description: 'Topic created' });
            }
            setTopicName('');
            setEditingTopic(null);
            loadTopics(selectedSubject.id);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save topic',
                variant: 'destructive',
            });
        } finally {
            setSubmittingTopic(false);
        }
    };

    const handleDeleteTopic = async (id: string) => {
        if (!confirm('Are you sure?')) return;

        try {
            await ClassificationMetadataService.deleteTopic(id);
            toast({ title: 'Success', description: 'Topic deleted' });
            loadTopics(selectedSubject!.id);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to delete topic',
                variant: 'destructive',
            });
        }
    };

    const resetSubjectForm = () => {
        setEditingSubject(null);
        setSubjectName('');
        setSubjectColor('#9333ea');
        setSubjectIcon('📜');
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Subjects Card */}
            <Card className="border-0 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Layers className="w-5 h-5 text-primary" />
                            Subjects
                        </CardTitle>
                        <CardDescription>Manage main classification subjects</CardDescription>
                    </div>
                    {isSuperUser && (
                        <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" onClick={resetSubjectForm} className="gap-1">
                                    <Plus className="w-4 h-4" /> Add
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
                                    <DialogDescription>
                                        Create a high-level subject for question classification.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="name">Subject Name</Label>
                                        <Input
                                            id="name"
                                            value={subjectName}
                                            onChange={(e) => setSubjectName(e.target.value)}
                                            placeholder="e.g. Mathematics"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="color">Color (Hex)</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    id="color"
                                                    type="color"
                                                    className="w-12 h-10 p-1"
                                                    value={subjectColor}
                                                    onChange={(e) => setSubjectColor(e.target.value)}
                                                />
                                                <Input
                                                    value={subjectColor}
                                                    onChange={(e) => setSubjectColor(e.target.value)}
                                                    placeholder="#000000"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="icon">Icon (Emoji)</Label>
                                            <Input
                                                id="icon"
                                                value={subjectIcon}
                                                onChange={(e) => setSubjectIcon(e.target.value)}
                                                placeholder="🔢"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setSubjectDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleSaveSubject} disabled={submittingSubject || !subjectName.trim()}>
                                        {submittingSubject && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingSubject ? 'Update' : 'Create'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subjects.length === 0 && (
                                <p className="text-center py-8 text-muted-foreground italic text-sm">
                                    No subjects found. Add your first subject to get started.
                                </p>
                            )}
                            {subjects.map((subject) => (
                                <div
                                    key={subject.id}
                                    onClick={() => setSelectedSubject(subject)}
                                    className={`
                                        group flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                        ${selectedSubject?.id === subject.id
                                            ? 'bg-primary/5 border-primary shadow-sm'
                                            : 'hover:bg-muted/50 border-transparent'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm"
                                            style={{ backgroundColor: `${subject.color || '#9333ea'}15`, color: subject.color || '#9333ea' }}
                                        >
                                            {subject.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-medium text-sm">{subject.name}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal opacity-70">
                                                    ID: {subject.id.slice(0, 8)}...
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    {isSuperUser && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSubject(subject);
                                                    setSubjectName(subject.name);
                                                    setSubjectColor(subject.color || '#9333ea');
                                                    setSubjectIcon(subject.icon || '📜');
                                                    setSubjectDialogOpen(true);
                                                }}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => handleDeleteSubject(e, subject.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <ChevronRight className={`w-4 h-4 text-muted-foreground ml-1 ${selectedSubject?.id === subject.id ? 'text-primary' : ''}`} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Topics Card */}
            <Card className="border-0 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Type className="w-5 h-5 text-accent" />
                        Topics
                    </CardTitle>
                    <CardDescription>
                        {selectedSubject
                            ? `Topics for "${selectedSubject.name}"`
                            : 'Select a subject to view and manage topics'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!selectedSubject ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                            <Layers className="w-12 h-12 mb-3 opacity-20" />
                            <p className="text-sm">Select a subject to manage topics</p>
                        </div>
                    ) : (
                        <>
                            {isSuperUser ? (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={editingTopic ? "Update topic name..." : "Add new topic..."}
                                        value={topicName}
                                        onChange={(e) => setTopicName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTopic()}
                                    />
                                    <Button
                                        onClick={handleSaveTopic}
                                        className="gap-1 px-4"
                                        disabled={submittingTopic || !topicName.trim()}
                                    >
                                        {submittingTopic ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : editingTopic ? (
                                            <Check className="w-4 h-4" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        {editingTopic ? 'Update' : 'Add'}
                                    </Button>
                                    {editingTopic && (
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setEditingTopic(null);
                                            setTopicName('');
                                        }}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-2">
                                    Only super admins can manage topics
                                </p>
                            )}

                            <div className="min-h-[200px]">
                                {loadingTopics ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="space-y-1.5 mt-2">
                                        {topics.length === 0 && (
                                            <p className="text-center py-10 text-muted-foreground italic text-sm">
                                                No topics found for this subject.
                                            </p>
                                        )}
                                        {topics.map((topic) => (
                                            <div
                                                key={topic.id}
                                                className="group flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-muted-foreground/10"
                                            >
                                                <span className="text-sm font-medium pl-2">{topic.name}</span>
                                                {isSuperUser && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                                                            onClick={() => {
                                                                setEditingTopic(topic);
                                                                setTopicName(topic.name);
                                                            }}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteTopic(topic.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
