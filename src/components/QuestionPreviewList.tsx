import { ParsedQuestion } from "@/utils/questionParser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, CheckCircle2 } from "lucide-react";

interface QuestionPreviewListProps {
    questions: ParsedQuestion[];
    onUpdate: (index: number, updated: ParsedQuestion) => void;
    onRemove: (index: number) => void;
}

export function QuestionPreviewList({ questions, onUpdate, onRemove }: QuestionPreviewListProps) {
    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/30">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground font-medium text-center">
                    No questions parsed yet. Paste your text above and click "Parse & Preview".
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {questions.map((q, idx) => {
                const isValid = q.question.trim() !== "" && q.options.every(opt => opt.trim() !== "") && q.correct_option_index !== -1;

                return (
                    <Card key={idx} className={`relative border-2 transition-all ${isValid ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}>
                        <CardHeader className="pb-2 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                {isValid ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-destructive" />}
                                Question #{idx + 1}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => onRemove(idx)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Question Text</label>
                                <Input
                                    value={q.question}
                                    onChange={(e) => onUpdate(idx, { ...q, question: e.target.value })}
                                    className="font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {q.options.map((opt, optIdx) => (
                                    <div key={optIdx} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                                                Option {String.fromCharCode(97 + optIdx)})
                                            </label>
                                            <Button
                                                variant={q.correct_option_index === optIdx ? "default" : "outline"}
                                                size="sm"
                                                className={`h-7 px-2 text-[10px] font-black uppercase transition-all ${q.correct_option_index === optIdx ? 'bg-success hover:bg-success-foreground hover:text-success' : ''}`}
                                                onClick={() => onUpdate(idx, { ...q, correct_option_index: optIdx })}
                                            >
                                                {q.correct_option_index === optIdx ? "Correct Ans" : "Mark Correct"}
                                            </Button>
                                        </div>
                                        <Input
                                            value={opt}
                                            onChange={(e) => {
                                                const newOpts = [...q.options];
                                                newOpts[optIdx] = e.target.value;
                                                onUpdate(idx, { ...q, options: newOpts });
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
