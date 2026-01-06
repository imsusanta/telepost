import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { parseBulkQuestions, ParsedQuestion } from "@/utils/questionParser";
import { QuestionPreviewList } from "./QuestionPreviewList";
import { Upload, ClipboardPaste, BookOpen, AlertCircle, FileUp, Loader2, Sparkles } from "lucide-react";
import { ClassificationService } from "@/services/classificationService";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";

interface BulkUploadDialogProps {
    onUpload: (questions: ParsedQuestion[]) => Promise<void>;
}

export function BulkUploadDialog({ onUpload }: BulkUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [rawText, setRawText] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [autoClassify, setAutoClassify] = useState(true);
    const [classifyingProgress, setClassifyingProgress] = useState(0);
    const [isClassifying, setIsClassifying] = useState(false);
    const { toast } = useToast();

    const handleParse = () => {
        if (!rawText.trim()) {
            toast({
                title: "Empty input",
                description: "Please paste some questions first.",
                variant: "destructive"
            });
            return;
        }

        setIsParsing(true);
        try {
            const questions = parseBulkQuestions(rawText);
            if (questions.length === 0) {
                toast({
                    title: "Parsing failed",
                    description: "Could not find any questions in the expected format. Please check your text.",
                    variant: "destructive"
                });
            } else {
                setParsedQuestions(questions);
                toast({
                    title: "Parsing successful",
                    description: `Found ${questions.length} questions. You can now review and edit them below.`,
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred while parsing.",
                variant: "destructive"
            });
        } finally {
            setIsParsing(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setRawText(text);
            toast({
                title: "File loaded",
                description: "Your file content has been loaded into the input area."
            });
        };
        reader.readAsText(file);
    };

    const handleClipboardPaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setRawText(text);
                toast({
                    title: "Pasted from clipboard",
                    description: "Content successfully loaded."
                });
            }
        } catch (error) {
            toast({
                title: "Clipboard error",
                description: "Unable to read clipboard. Please paste manually.",
                variant: "destructive"
            });
        }
    };

    const handleFinalUpload = async () => {
        if (parsedQuestions.length === 0) return;

        setIsUploading(true);
        try {
            let finalQuestions = [...parsedQuestions];

            if (autoClassify) {
                setIsClassifying(true);
                const requests = parsedQuestions.map(q => ({
                    question: q.question,
                    options: q.options,
                    explanation: q.explanation || "",
                }));

                const results = await ClassificationService.classifyQuestionsBulk(
                    requests,
                    (completed, total) => {
                        setClassifyingProgress(Math.round((completed / total) * 100));
                    }
                );

                finalQuestions = parsedQuestions.map((q, i) => ({
                    ...q,
                    subject: results[i]?.subject || q.subject,
                    topic: results[i]?.topic || q.topic,
                    difficulty: results[i]?.difficulty || q.difficulty,
                }));
                setIsClassifying(false);
            }

            await onUpload(finalQuestions);
            setOpen(false);
            resetState();
            toast({
                title: "Upload complete",
                description: `Successfully added ${finalQuestions.length} questions.`,
            });
        } catch (error) {
            toast({
                title: "Upload failed",
                description: "An error occurred during upload.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
            setIsClassifying(false);
        }
    };

    const resetState = () => {
        setRawText("");
        setParsedQuestions([]);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-2 hover:bg-primary/10 transition-all font-bold group">
                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Bulk Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 border shadow-2xl">
                <DialogHeader className="pb-4 border-b">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-lg">
                            <Upload className="w-5 h-5 text-white" />
                        </div>
                        Bulk Question Upload
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        Paste your questions in the format: <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">1. Quest a) Opt1 b) Opt2 Ans: a</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-5 py-4 pr-2">
                    {/* Input Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase text-gray-500 tracking-wide">
                                Raw Question Text
                            </label>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClipboardPaste}
                                    className="h-8 text-xs font-medium gap-1.5 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-sky-600 dark:text-sky-400"
                                >
                                    <ClipboardPaste className="w-3.5 h-3.5" />
                                    Paste
                                </Button>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".txt"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs font-medium gap-1.5 hover:bg-sky-50 dark:hover:bg-sky-900/20 text-sky-600 dark:text-sky-400"
                                    >
                                        <FileUp className="w-3.5 h-3.5" />
                                        Upload .txt
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <Textarea
                            placeholder={"Paste your questions here...\n1. Indian National Congress কবে প্রতিষ্ঠিত হয়?\na) 1880\nb) 1885\nc) 1890\nd) 1895\nAns: b) 1885\nShort Notes: এটি 1885 সালে বোম্বেতে প্রতিষ্ঠিত হয়।"}
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                            className="min-h-[180px] font-medium text-gray-900 dark:text-white rounded-xl border-2 border-gray-200 dark:border-gray-700 focus:border-sky-500 bg-gray-50 dark:bg-slate-800 transition-all resize-none"
                        />

                        <Button
                            onClick={handleParse}
                            disabled={isParsing || !rawText.trim()}
                            className="w-full h-11 font-semibold bg-sky-500 hover:bg-sky-600 text-white transition-all"
                        >
                            {isParsing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardPaste className="w-4 h-4 mr-2" />}
                            Parse & Preview Questions
                        </Button>
                    </div>

                    {/* Preview Section */}
                    {parsedQuestions.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-emerald-500" />
                                    Review {parsedQuestions.length} Questions
                                </h3>
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    Parsed Output
                                </span>
                            </div>
                            <QuestionPreviewList
                                questions={parsedQuestions}
                                onUpdate={(idx, updated) => {
                                    const newQs = [...parsedQuestions];
                                    newQs[idx] = updated;
                                    setParsedQuestions(newQs);
                                }}
                                onRemove={(idx) => {
                                    setParsedQuestions(parsedQuestions.filter((_, i) => i !== idx));
                                }}
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t border-gray-200 dark:border-gray-700 gap-2">
                    <div className="flex-1 flex flex-col gap-2">
                        {isClassifying && (
                            <div className="flex flex-col gap-1 px-4">
                                <div className="flex items-center justify-between text-[10px] font-medium text-sky-600 dark:text-sky-400">
                                    <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        AI Classifying...
                                    </span>
                                    <span>{classifyingProgress}%</span>
                                </div>
                                <Progress value={classifyingProgress} className="h-1 bg-sky-100 dark:bg-sky-900/30" />
                            </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-2 mr-4">
                                <Checkbox
                                    id="auto-classify"
                                    checked={autoClassify}
                                    onCheckedChange={(checked) => setAutoClassify(!!checked)}
                                />
                                <Label htmlFor="auto-classify" className="text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-sky-500" />
                                    AI Auto-classify
                                </Label>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="font-medium text-gray-600 dark:text-gray-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleFinalUpload}
                                disabled={parsedQuestions.length === 0 || isUploading}
                                className="px-6 font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg shadow-emerald-500/20"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        {isClassifying ? 'Classifying...' : 'Uploading...'}
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        Save to Bank
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
