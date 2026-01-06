import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { QuestionBankService, QuestionBankItem } from "@/services/questionBankService";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Loader2, Save, X, CheckCircle2 } from "lucide-react";
import { PREDEFINED_SUBJECTS, ClassificationService, refreshSubjectsCache } from "@/services/classificationService";
import { ClassificationMetadataService, ClassificationSubject } from "@/services/classificationMetadataService";
import { isSuperAdmin } from "@/services/couponService";

interface EditQuestionDialogProps {
    question: QuestionBankItem | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}

export function EditQuestionDialog({ question, open, onOpenChange, onSaved }: EditQuestionDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        question: "",
        options: ["", "", "", ""],
        correct_option_index: 0,
        subject: "",
        topic: "",
        difficulty: "medium",
        language: "bn",
        explanation: "",
    });
    const [existingTopics, setExistingTopics] = useState<string[]>([]);
    const [dbSubjects, setDbSubjects] = useState<ClassificationSubject[]>([]);
    const [isSuperUser, setIsSuperUser] = useState(false);
    const { toast } = useToast();

    const loadExistingData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Check if super admin
            const superAdminStatus = await isSuperAdmin();
            setIsSuperUser(superAdminStatus);

            // Refresh cache and load subjects
            await refreshSubjectsCache();
            const subjects = await ClassificationMetadataService.getSubjects();
            setDbSubjects(subjects);

            const topics = await ClassificationService.getAllTopics(user.id);
            setExistingTopics(topics);
        } catch (error) {
            console.error("Failed to load existing topics/subjects:", error);
        }
    };

    useEffect(() => {
        if (open) loadExistingData();
    }, [open]);

    // Populate form when question changes
    useEffect(() => {
        if (question) {
            setFormData({
                question: question.question,
                options: [...question.options],
                correct_option_index: question.correct_option_index,
                subject: question.subject || "",
                topic: question.topic || "",
                difficulty: question.difficulty || "medium",
                language: question.language || "bn",
                explanation: question.explanation || "",
            });
        }
    }, [question]);

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const validateForm = (): boolean => {
        if (!formData.question.trim()) {
            toast({ title: "Validation Error", description: "Question text is required.", variant: "destructive" });
            return false;
        }
        if (formData.options.some(opt => !opt.trim())) {
            toast({ title: "Validation Error", description: "All options must be filled.", variant: "destructive" });
            return false;
        }
        return true;
    };

    const handleSave = async () => {
        if (!question || !validateForm()) return;

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
                return;
            }

            await QuestionBankService.updateQuestion(question.id, user.id, {
                question: formData.question,
                options: formData.options,
                correct_option_index: formData.correct_option_index,
                subject: formData.subject,
                topic: formData.topic,
                difficulty: formData.difficulty,
                language: formData.language,
                explanation: formData.explanation || undefined,
            });

            toast({
                title: "Question Updated",
                description: "Your changes have been saved successfully.",
            });
            onSaved();
            onOpenChange(false);
        } catch (error: unknown) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update question.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const optionLetters = ["a", "b", "c", "d"];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 border shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black flex items-center gap-3 text-gray-900 dark:text-white">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                            <Pencil className="w-5 h-5 text-white" />
                        </div>
                        Edit Question
                    </DialogTitle>
                    <DialogDescription className="text-base font-medium text-gray-600 dark:text-gray-300">
                        Modify the question details below and save your changes.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2 custom-scrollbar">
                    {/* Question Text */}
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-500 tracking-widest">
                            Question Text <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            value={formData.question}
                            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                            placeholder="Enter the question..."
                            className="min-h-[100px] font-medium text-lg text-gray-900 dark:text-white rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-emerald-500 bg-white dark:bg-slate-800 transition-all resize-none"
                        />
                    </div>

                    {/* Options Grid */}
                    <div className="space-y-3">
                        <label className="text-xs font-black uppercase text-gray-500 tracking-widest">
                            Options <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.options.map((opt, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                            Option {optionLetters[idx]})
                                        </span>
                                        <Button
                                            type="button"
                                            variant={formData.correct_option_index === idx ? "default" : "outline"}
                                            size="sm"
                                            className={`h-7 px-3 text-[10px] font-black uppercase transition-all ${formData.correct_option_index === idx
                                                ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                                                : "border-gray-300 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-500"
                                                }`}
                                            onClick={() => setFormData({ ...formData, correct_option_index: idx })}
                                        >
                                            {formData.correct_option_index === idx ? (
                                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Correct</>
                                            ) : (
                                                "Set Correct"
                                            )}
                                        </Button>
                                    </div>
                                    <Input
                                        value={opt}
                                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        placeholder={`Enter option ${optionLetters[idx]}...`}
                                        className={`font-medium text-gray-900 dark:text-white rounded-xl border-2 transition-all bg-white dark:bg-slate-800 ${formData.correct_option_index === idx
                                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                                            : "border-gray-300 dark:border-gray-600"
                                            }`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Subject</label>
                            <div className="flex gap-2">
                                <Select
                                    value={formData.subject}
                                    onValueChange={(value) => setFormData({ ...formData, subject: value })}
                                >
                                    <SelectTrigger className="font-medium rounded-xl border-2 border-border/60 flex-1">
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent className="clay-card border-none max-h-[300px]">
                                        {/* DB Subjects */}
                                        {dbSubjects.map((s) => (
                                            <SelectItem key={s.id} value={s.name} className="font-medium rounded-lg">
                                                {s.icon} {s.name}
                                            </SelectItem>
                                        ))}

                                        {/* Fallback to Predefined if DB is empty or doesn't contain them */}
                                        {dbSubjects.length === 0 && PREDEFINED_SUBJECTS.map((s) => (
                                            <SelectItem key={s.id} value={s.name} className="font-medium rounded-lg">
                                                {s.icon} {s.name}
                                            </SelectItem>
                                        ))}

                                        {/* AI Suggested / Manual (if user is super admin) */}
                                        {formData.subject && !dbSubjects.some(s => s.name === formData.subject) && !PREDEFINED_SUBJECTS.some(s => s.name === formData.subject) && (
                                            <SelectItem value={formData.subject} className="font-medium rounded-lg">
                                                ✨ {formData.subject}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {isSuperUser && (
                                    <Input
                                        placeholder="New..."
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="w-1/3 font-medium rounded-xl border-2 border-border/60"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Topic</label>
                            <Input
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                placeholder="e.g., Algebra, WWII..."
                                list="edit-existing-topics"
                                className="font-medium rounded-xl border-2 border-border/60"
                            />
                            <datalist id="edit-existing-topics">
                                {existingTopics.map(t => (
                                    <option key={t} value={t} />
                                ))}
                            </datalist>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Difficulty</label>
                            <Select
                                value={formData.difficulty}
                                onValueChange={(value) => setFormData({ ...formData, difficulty: value })}
                            >
                                <SelectTrigger className="font-medium rounded-xl border-2 border-border/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Language</label>
                            <Select
                                value={formData.language}
                                onValueChange={(value) => setFormData({ ...formData, language: value })}
                            >
                                <SelectTrigger className="font-medium rounded-xl border-2 border-border/60">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bn">Bengali</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                    <SelectItem value="hi">Hindi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800">
                        <label className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">
                            Short Notes / Explanation (Optional)
                        </label>
                        <Textarea
                            value={formData.explanation}
                            onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                            placeholder="Add notes or explanation for this question..."
                            className="min-h-[80px] font-medium text-gray-900 dark:text-white rounded-xl border-2 border-emerald-300 dark:border-emerald-700 focus:border-emerald-500 bg-white dark:bg-slate-800 transition-all resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t border-border/40 gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                        className="font-bold gap-2"
                    >
                        <X className="w-4 h-4" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 gap-2"
                    >
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save Changes</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
