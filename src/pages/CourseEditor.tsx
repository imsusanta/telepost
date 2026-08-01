import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CourseService, Course, Chapter, Lesson } from "@/services/courseService";
import { 
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  Video,
  FileText,
  HelpCircle,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  BarChart3
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const CONTENT_TYPES = [
  { value: "video", label: "Video", icon: Video },
  { value: "document", label: "Document", icon: FileText },
  { value: "quiz", label: "Quiz", icon: HelpCircle },
  { value: "live_class", label: "Live Class", icon: PlayCircle },
];

export default function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("curriculum");
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);

  // Dialogs
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [showLessonDialog, setShowLessonDialog] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson | null; chapterId: string } | null>(null);

  // Form states
  const [chapterForm, setChapterForm] = useState({ title: "", description: "", is_free: false });
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content_type: "video",
    video_url: "",
    is_free: false,
  });

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    
    try {
      setIsLoading(true);
      const [courseData, chaptersData] = await Promise.all([
        CourseService.getCourseById(courseId),
        CourseService.getChaptersWithLessons(courseId),
      ]);
      
      if (!courseData) {
        toast({
          title: "Error",
          description: "Course not found",
          variant: "destructive",
        });
        navigate("/dashboard/courses");
        return;
      }

      setCourse(courseData);
      setChapters(chaptersData);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load course",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!course) return;

    try {
      setIsSaving(true);
      await CourseService.updateCourse(course.id, course);
      toast({
        title: "Success",
        description: "Course saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save course",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!course) return;

    try {
      const updated = await CourseService.publishCourse(course.id, !course.is_published);
      setCourse(updated);
      toast({
        title: "Success",
        description: `Course ${updated.is_published ? 'published' : 'unpublished'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update course",
        variant: "destructive",
      });
    }
  };

  // Chapter handlers
  const handleSaveChapter = async () => {
    if (!courseId || !chapterForm.title.trim()) return;

    try {
      if (editingChapter) {
        const updated = await CourseService.updateChapter(editingChapter.id, chapterForm);
        setChapters(chapters.map(c => c.id === editingChapter.id ? { ...updated, lessons: c.lessons } : c));
      } else {
        const newChapter = await CourseService.createChapter({
          ...chapterForm,
          course_id: courseId,
          order_index: chapters.length,
        });
        setChapters([...chapters, { ...newChapter, lessons: [] }]);
      }
      
      setShowChapterDialog(false);
      setChapterForm({ title: "", description: "", is_free: false });
      setEditingChapter(null);
      toast({ title: "Success", description: "Chapter saved" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save chapter",
        variant: "destructive",
      });
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm("Delete this chapter and all its lessons?")) return;

    try {
      await CourseService.deleteChapter(chapterId);
      setChapters(chapters.filter(c => c.id !== chapterId));
      toast({ title: "Success", description: "Chapter deleted" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete chapter",
        variant: "destructive",
      });
    }
  };

  // Lesson handlers
  const handleSaveLesson = async () => {
    if (!editingLesson?.chapterId || !lessonForm.title.trim()) return;

    try {
      if (editingLesson.lesson) {
        const updated = await CourseService.updateLesson(editingLesson.lesson.id, lessonForm);
        setChapters(chapters.map(c => {
          if (c.id === editingLesson.chapterId) {
            return {
              ...c,
              lessons: c.lessons?.map(l => l.id === editingLesson.lesson!.id ? updated : l),
            };
          }
          return c;
        }));
      } else {
        const chapter = chapters.find(c => c.id === editingLesson.chapterId);
        const newLesson = await CourseService.createLesson({
          ...lessonForm,
          chapter_id: editingLesson.chapterId,
          order_index: chapter?.lessons?.length || 0,
        });
        setChapters(chapters.map(c => {
          if (c.id === editingLesson.chapterId) {
            return { ...c, lessons: [...(c.lessons || []), newLesson] };
          }
          return c;
        }));
      }
      
      setShowLessonDialog(false);
      setLessonForm({ title: "", description: "", content_type: "video", video_url: "", is_free: false });
      setEditingLesson(null);
      toast({ title: "Success", description: "Lesson saved" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save lesson",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = async (chapterId: string, lessonId: string) => {
    if (!confirm("Delete this lesson?")) return;

    try {
      await CourseService.deleteLesson(lessonId);
      setChapters(chapters.map(c => {
        if (c.id === chapterId) {
          return { ...c, lessons: c.lessons?.filter(l => l.id !== lessonId) };
        }
        return c;
      }));
      toast({ title: "Success", description: "Lesson deleted" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete lesson",
        variant: "destructive",
      });
    }
  };

  const openChapterDialog = (chapter?: Chapter) => {
    if (chapter) {
      setEditingChapter(chapter);
      setChapterForm({
        title: chapter.title,
        description: chapter.description || "",
        is_free: chapter.is_free,
      });
    } else {
      setEditingChapter(null);
      setChapterForm({ title: "", description: "", is_free: false });
    }
    setShowChapterDialog(true);
  };

  const openLessonDialog = (chapterId: string, lesson?: Lesson) => {
    if (lesson) {
      setEditingLesson({ lesson, chapterId });
      setLessonForm({
        title: lesson.title,
        description: lesson.description || "",
        content_type: lesson.content_type,
        video_url: lesson.video_url || "",
        is_free: lesson.is_free,
      });
    } else {
      setEditingLesson({ lesson: null, chapterId });
      setLessonForm({ title: "", description: "", content_type: "video", video_url: "", is_free: false });
    }
    setShowLessonDialog(true);
  };

  const getContentIcon = (type: string) => {
    const content = CONTENT_TYPES.find(c => c.value === type);
    return content?.icon || FileText;
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => 
      prev.includes(chapterId) 
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  if (isLoading || !course) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const totalLessons = chapters.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard/courses")}
              className="clay-button"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{course.title}</h1>
                <Badge variant={course.is_published ? "default" : "secondary"}>
                  {course.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {chapters.length} chapters • {totalLessons} lessons
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleTogglePublish}
              className="clay-button gap-2"
            >
              {course.is_published ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Publish
                </>
              )}
            </Button>
            <Button onClick={handleSaveCourse} disabled={isSaving} className="clay-button gap-2">
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="clay-card">
            <TabsTrigger value="curriculum" className="gap-2">
              <FileText className="w-4 h-4" />
              Curriculum
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <Users className="w-4 h-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Course Curriculum</h2>
              <Button onClick={() => openChapterDialog()} className="clay-button gap-2">
                <Plus className="w-4 h-4" />
                Add Chapter
              </Button>
            </div>

            {chapters.length === 0 ? (
              <Card className="clay-card">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FileText className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No chapters yet</h3>
                  <p className="text-muted-foreground mb-6">Start building your course curriculum</p>
                  <Button onClick={() => openChapterDialog()} className="clay-button gap-2">
                    <Plus className="w-4 h-4" />
                    Add First Chapter
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter, chapterIndex) => (
                  <Card key={chapter.id} className="clay-card overflow-hidden">
                    <Collapsible
                      open={expandedChapters.includes(chapter.id)}
                      onOpenChange={() => toggleChapter(chapter.id)}
                    >
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                Chapter {chapterIndex + 1}
                              </span>
                              {chapter.is_free && (
                                <Badge variant="outline" className="text-xs">Free</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold">{chapter.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {chapter.lessons?.length || 0} lessons
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openChapterDialog(chapter);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChapter(chapter.id);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            {expandedChapters.includes(chapter.id) ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t border-border/50 bg-muted/30 p-4 space-y-2">
                          {chapter.lessons?.map((lesson, lessonIndex) => {
                            const Icon = getContentIcon(lesson.content_type);
                            return (
                              <div
                                key={lesson.id}
                                className="flex items-center gap-3 p-3 bg-background rounded-xl clay-card-hover group"
                              >
                                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <Icon className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                      {chapterIndex + 1}.{lessonIndex + 1}
                                    </span>
                                    {lesson.is_free && (
                                      <Badge variant="outline" className="text-xs">Free</Badge>
                                    )}
                                  </div>
                                  <p className="font-medium truncate">{lesson.title}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openLessonDialog(chapter.id, lesson)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteLesson(chapter.id, lesson.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          <Button
                            variant="ghost"
                            onClick={() => openLessonDialog(chapter.id)}
                            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-4 h-4" />
                            Add Lesson
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="clay-card">
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
                <CardDescription>Basic details about your course</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={course.title}
                    onChange={(e) => setCourse({ ...course, title: e.target.value })}
                    className="clay-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={course.description || ""}
                    onChange={(e) => setCourse({ ...course, description: e.target.value })}
                    className="clay-input min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={course.category}
                    onValueChange={(value) => setCourse({ ...course, category: value })}
                  >
                    <SelectTrigger className="clay-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["general", "programming", "design", "business", "marketing", "science", "mathematics"].map((cat) => (
                        <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={course.price}
                      onChange={(e) => setCourse({ ...course, price: Number(e.target.value) })}
                      className="clay-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={course.duration_hours}
                      onChange={(e) => setCourse({ ...course, duration_hours: Number(e.target.value) })}
                      className="clay-input"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="clay-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Users className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Student Management</h3>
                <p className="text-muted-foreground">View and manage enrolled students here</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="clay-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <BarChart3 className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Course Analytics</h3>
                <p className="text-muted-foreground">Track your course performance and student progress</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Chapter Dialog */}
        <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
          <DialogContent className="clay-card">
            <DialogHeader>
              <DialogTitle>{editingChapter ? "Edit Chapter" : "Add Chapter"}</DialogTitle>
              <DialogDescription>
                {editingChapter ? "Update chapter details" : "Create a new chapter for your course"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Introduction to the Course"
                  value={chapterForm.title}
                  onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this chapter"
                  value={chapterForm.description}
                  onChange={(e) => setChapterForm({ ...chapterForm, description: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Free Preview</Label>
                <Switch
                  checked={chapterForm.is_free}
                  onCheckedChange={(checked) => setChapterForm({ ...chapterForm, is_free: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChapterDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveChapter} className="clay-button">
                {editingChapter ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lesson Dialog */}
        <Dialog open={showLessonDialog} onOpenChange={setShowLessonDialog}>
          <DialogContent className="clay-card">
            <DialogHeader>
              <DialogTitle>{editingLesson?.lesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
              <DialogDescription>
                {editingLesson?.lesson ? "Update lesson details" : "Add a new lesson to this chapter"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Getting Started with React"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What students will learn"
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                  className="clay-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={lessonForm.content_type}
                  onValueChange={(value) => setLessonForm({ ...lessonForm, content_type: value })}
                >
                  <SelectTrigger className="clay-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {lessonForm.content_type === "video" && (
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input
                    placeholder="YouTube or video URL"
                    value={lessonForm.video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                    className="clay-input"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label>Free Preview</Label>
                <Switch
                  checked={lessonForm.is_free}
                  onCheckedChange={(checked) => setLessonForm({ ...lessonForm, is_free: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLessonDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveLesson} className="clay-button">
                {editingLesson?.lesson ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
