import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { parseBulkQuestions, ParsedQuestion } from "@/utils/questionParser";
import { QuestionPreviewList } from "./QuestionPreviewList";
import { Upload, ClipboardPaste, BookOpen, AlertCircle, FileUp, Loader2 } from "lucide-react";

interface BulkUploadDialogProps {
    onUpload: (questions: ParsedQuestion[]) => Promise<void>;
}

export function BulkUploadDialog({ onUpload }: BulkUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [rawText, setRawText] = useState("");
    const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
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
            await onUpload(parsedQuestions);
            setOpen(false);
            resetState();
        } catch (error) {
            // Error handled by parent
        } finally {
            setIsUploading(false);
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
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden clay-card border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black flex items-center gap-3">
                        <Upload className="w-8 h-8 text-primary" />
                        Bulk Question Upload
                    </DialogTitle>
                    <DialogDescription className="text-base font-medium">
                        Paste your questions in the format: <span className="font-bold text-foreground">1. Quest a) Opt1 b) Opt2 Ans: a</span>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-2 custom-scrollbar">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Raw Question Text</label>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleClipboardPaste} className="h-8 text-[11px] font-black uppercase gap-1 hover:bg-primary/10 transition-all">
                                    <ClipboardPaste className="w-3 h-3" /> Paste Clipboard
                                </Button>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".txt"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Button variant="ghost" size="sm" className="h-8 text-[11px] font-black uppercase gap-1 hover:bg-primary/10 transition-all">
                                        <FileUp className="w-3 h-3" /> Upload .txt
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <Textarea
                                placeholder="Paste your questions here...&#10;1. Indian National Congress কবে প্রতিষ্ঠিত হয়?&#10;a) 1880&#10;b) 1885&#10;c) 1890&#10;d) 1895&#10;Ans: b) 1885"
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                                className="min-h-[200px] font-medium text-lg rounded-2xl border-2 border-border/60 focus:border-primary/50 transition-all"
                            />
                            <div className="absolute top-4 right-4 text-[10px] font-black text-muted-foreground/30 uppercase tracking-tighter opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                                TelePost AI Parser Active
                            </div>
                        </div>

                        <Button
                            onClick={handleParse}
                            disabled={isParsing || !rawText.trim()}
                            className="w-full h-12 text-lg font-black uppercase tracking-widest glow-primary transition-all active:scale-95"
                        >
                            {isParsing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ClipboardPaste className="w-5 h-5 mr-2" />}
                            Parse & Preview Questions
                        </Button>
                    </div>

                    {parsedQuestions.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-border/40 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-success" />
                                    Review & Fix {parsedQuestions.length} Questions
                                </h3>
                                <span className="text-[11px] font-black uppercase text-muted-foreground tracking-widest bg-muted/50 px-2 py-1 rounded-md">
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

                <DialogFooter className="pt-6 border-t border-border/40">
                    <Button variant="ghost" onClick={() => setOpen(false)} className="font-bold">Cancel</Button>
                    <Button
                        onClick={handleFinalUpload}
                        disabled={parsedQuestions.length === 0 || isUploading}
                        className="px-10 h-12 font-black uppercase tracking-widest shadow-xl transition-all active:scale-95"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
                        Confirm & Save to Question Bank
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
