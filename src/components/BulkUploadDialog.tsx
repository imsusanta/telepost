import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { parseBulkQuestions, ParsedQuestion } from "@/utils/questionParser";
import { QuestionPreviewList } from "./QuestionPreviewList";
import { Upload, ClipboardPaste, BookOpen, AlertCircle, FileUp, Loader2, Database, Layers } from "lucide-react";
import {

    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface BulkUploadDialogProps {
    onUpload: (questions: ParsedQuestion[]) => Promise<void>;
    fullSubjects?: any[];
    fullTopics?: any[];
}

export function BulkUploadDialog({ onUpload, fullSubjects = [], fullTopics = [] }: BulkUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [rawText, setRawText] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Taxonomy Selection - default to GK
    const [selectedSubject, setSelectedSubject] = useState<string>("GK");
    const [selectedTopic, setSelectedTopic] = useState<string>("__NONE__");

    const { toast } = useToast();

    // Set default subject when subjects are loaded (prefer GK)
    useEffect(() => {
        if (fullSubjects.length > 0 && !selectedSubject) {
            const gkSubject = fullSubjects.find(s => s.name.toLowerCase() === 'gk');
            setSelectedSubject(gkSubject ? gkSubject.name : fullSubjects[0].name);
        }
    }, [fullSubjects, selectedSubject]);


    // Reset topic when subject changes
    useEffect(() => {
        setSelectedTopic("__NONE__");
    }, [selectedSubject]);

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

            // Apply Subject/Topic selection
            finalQuestions = finalQuestions.map(q => ({
                ...q,
                subject: selectedSubject || q.subject || (fullSubjects.length > 0 ? fullSubjects[0].name : "GK"),
                topic: (selectedTopic && selectedTopic !== "__NONE__") ? selectedTopic : (q.topic || ""),
            }));

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
        }
    };

    const resetState = () => {
        setRawText("");
        setParsedQuestions([]);
        if (fullSubjects.length > 0) {
            setSelectedSubject(fullSubjects[0].name);
        } else {
            setSelectedSubject("");
        }
        setSelectedTopic("__NONE__");
    };

    return (
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetState(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-2 hover:bg-primary/10 transition-all font-bold group border-sky-500/20 text-sky-600 dark:text-sky-400">
                    <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Bulk Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl p-0 rounded-2xl">
                {/* Compact Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Upload className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-white">
                                    Bulk Upload
                                </DialogTitle>
                                <DialogDescription className="text-emerald-100/80 text-sm">
                                    Import questions from text
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Inline Subject & Topic Selection */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border">

                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Subject:</span>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="h-9 w-[140px] bg-white dark:bg-slate-800 border rounded-lg text-sm">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fullSubjects.length === 0 ? (
                                        <SelectItem value="GK">GK</SelectItem>
                                    ) : (
                                        fullSubjects.map(s => (
                                            <SelectItem key={s.id} value={s.name}>
                                                {s.icon && <span className="mr-1">{s.icon}</span>}
                                                {s.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Topic:</span>
                            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                                <SelectTrigger className="h-9 w-[140px] bg-white dark:bg-slate-800 border rounded-lg text-sm">
                                    <SelectValue placeholder="Optional" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__NONE__">No Topic</SelectItem>
                                    {selectedSubject && fullTopics
                                        .filter(t => {
                                            const subject = fullSubjects.find(s => s.name === selectedSubject);
                                            return subject && t.subject_id === subject.id;
                                        })
                                        .map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1" />

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClipboardPaste}
                                className="h-8 text-xs font-medium gap-1.5 text-slate-600 hover:text-emerald-600"
                            >
                                <ClipboardPaste className="w-3.5 h-3.5" />
                                Paste
                            </Button>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-xs font-medium gap-1.5 text-slate-600 hover:text-emerald-600"
                                >
                                    <FileUp className="w-3.5 h-3.5" />
                                    File
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Input Section */}
                    <div className="space-y-3">

                        <div className="relative group">
                            <Textarea
                                placeholder={"Paste your questions here...\n\nExample Format:\n1. Indian National Congress কবে প্রতিষ্ঠিত হয়?\na) 1880\nb) 1885\nc) 1890\nd) 1895\nAns: b) 1885\nShort Notes: এটি 1885 সালে বোম্বেতে প্রতিষ্ঠিত হয়।"}
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="min-h-[250px] p-6 text-base font-medium rounded-2xl border-2 border-slate-200 dark:border-slate-700/50 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 bg-slate-50/50 dark:bg-slate-800/80 transition-all resize-none shadow-inner"
                            />
                            {!rawText && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center opacity-30 group-focus-within:opacity-0 transition-opacity">
                                    <ClipboardPaste className="w-12 h-12 mb-2" />
                                    <p className="text-sm font-bold">Paste questions to get started</p>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleParse}
                            disabled={isParsing || !rawText.trim()}
                            className="w-full h-12 text-lg font-black bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white transition-all shadow-xl shadow-sky-500/20 rounded-xl gap-3"
                        >
                            {isParsing ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}

                            Parse & Review Batch
                        </Button>
                    </div>

                    {/* Preview Section */}
                    {parsedQuestions.length > 0 && (
                        <div className="space-y-6 pt-10 border-t-2 border-dashed border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                        <AlertCircle className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800 dark:text-white">
                                            Ready for Preview
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400">Found {parsedQuestions.length} questions correctly formatted</p>
                                    </div>
                                </div>
                                <Button
                                    variant="link"
                                    className="text-slate-400 hover:text-red-500 font-bold"
                                    onClick={() => setParsedQuestions([])}
                                >
                                    Clear All
                                </Button>
                            </div>

                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
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
                        </div>
                    )}
                </div>

                <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                className="h-12 px-6 font-bold text-slate-500 border-none hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                            >
                                Cancel Upload
                            </Button>
                            <Button
                                onClick={handleFinalUpload}
                                disabled={parsedQuestions.length === 0 || isUploading}
                                className="h-12 px-10 text-base font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-xl shadow-emerald-500/20 rounded-xl gap-3"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Uploading Batch...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-5 h-5" />
                                        Finish & Save to Bank
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
