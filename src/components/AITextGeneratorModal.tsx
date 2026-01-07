import { useState } from "react";
import {
    Sparkles,
    Loader2,
    RefreshCw,
    Check,
    Edit,
    BookOpen,
    Target,
    Heart,
    PartyPopper,
    Megaphone,
    HelpCircle,
    Settings,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AIService, TextGenerationOptions } from "@/services/aiService";
import { useNavigate } from "react-router-dom";

interface AITextGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUseText: (text: string) => void;
    hasApiKey: boolean;
}

const quickTemplates = [
    { icon: BookOpen, label: "Study Tips", prompt: "Share helpful study tips and techniques for students" },
    { icon: Target, label: "Quiz Alert", prompt: "Announce an upcoming quiz competition" },
    { icon: Heart, label: "Motivation", prompt: "Motivational message for students working hard" },
    { icon: PartyPopper, label: "Celebration", prompt: "Celebrate student achievements and success" },
    { icon: Megaphone, label: "Announcement", prompt: "Important announcement for all students" },
    { icon: HelpCircle, label: "Question", prompt: "Ask an engaging question to boost interaction" },
];

export function AITextGeneratorModal({
    isOpen,
    onClose,
    onUseText,
    hasApiKey,
}: AITextGeneratorModalProps) {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Form state
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState<TextGenerationOptions["tone"]>("motivational");
    const [length, setLength] = useState<TextGenerationOptions["length"]>("medium");
    const [language, setLanguage] = useState<TextGenerationOptions["language"]>("english");
    const [includeEmojis, setIncludeEmojis] = useState(true);
    const [includeCTA, setIncludeCTA] = useState(true);
    const [includeHashtags, setIncludeHashtags] = useState(false);
    const [includeQuote, setIncludeQuote] = useState(false);

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedText, setGeneratedText] = useState("");
    const [tokensUsed, setTokensUsed] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState("");

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: "Topic required",
                description: "Please describe what the post should be about",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await AIService.generateText({
                prompt: prompt.trim(),
                tone,
                length,
                language,
                includeEmojis,
                includeHashtags,
                includeCTA,
                includeQuote,
            });

            setGeneratedText(result.text);
            setEditedText(result.text);
            setTokensUsed(result.tokensUsed);
            setShowPreview(true);
        } catch (error) {
            toast({
                title: "Generation failed",
                description: error instanceof Error ? error.message : "Failed to generate text",
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRegenerate = () => {
        setShowPreview(false);
        handleGenerate();
    };

    const handleUseText = () => {
        onUseText(isEditing ? editedText : generatedText);
        handleReset();
        onClose();
    };

    const handleReset = () => {
        setPrompt("");
        setGeneratedText("");
        setEditedText("");
        setShowPreview(false);
        setIsEditing(false);
        setTokensUsed(0);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleTemplateClick = (templatePrompt: string) => {
        setPrompt(templatePrompt);
    };

    if (!hasApiKey) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            API Key Required
                        </DialogTitle>
                        <DialogDescription>
                            Please configure your Gemini API key in Settings to use AI features.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button onClick={() => navigate("/dashboard/settings")} className="flex-1">
                            <Settings className="mr-2 h-4 w-4" />
                            Go to Settings
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (showPreview) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            Your Generated Post
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Generated Text Preview */}
                        <div className="bg-muted/50 rounded-lg p-4 border">
                            {isEditing ? (
                                <Textarea
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    rows={8}
                                    className="resize-none"
                                />
                            ) : (
                                <p className="whitespace-pre-wrap text-sm">{generatedText}</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}>
                                {isGenerating ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                )}
                                Regenerate
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (isEditing) {
                                        setIsEditing(false);
                                    } else {
                                        setEditedText(generatedText);
                                        setIsEditing(true);
                                    }
                                }}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                {isEditing ? "Done Editing" : "Edit"}
                            </Button>
                            <Button
                                className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                                onClick={handleUseText}
                            >
                                <Check className="mr-2 h-4 w-4" />
                                Use This Post
                            </Button>
                        </div>

                        {/* Token Usage */}
                        <p className="text-xs text-muted-foreground text-center">
                            API Usage: 1 request • ~{tokensUsed} tokens
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generate Post with AI
                    </DialogTitle>
                    <DialogDescription>
                        Describe what your post should be about and customize the output
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <Label htmlFor="prompt">What should the post be about? *</Label>
                        <Textarea
                            id="prompt"
                            placeholder='E.g., "Daily motivation for students preparing for exams" or "Quiz announcement for tomorrow"'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Tone Selection */}
                    <div className="space-y-2">
                        <Label>Tone</Label>
                        <RadioGroup
                            value={tone}
                            onValueChange={(v) => setTone(v as TextGenerationOptions["tone"])}
                            className="flex flex-wrap gap-4"
                        >
                            {["professional", "casual", "motivational", "fun"].map((t) => (
                                <div key={t} className="flex items-center space-x-2">
                                    <RadioGroupItem value={t} id={`tone-${t}`} />
                                    <Label htmlFor={`tone-${t}`} className="capitalize cursor-pointer">
                                        {t}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Length Selection */}
                    <div className="space-y-2">
                        <Label>Length</Label>
                        <RadioGroup
                            value={length}
                            onValueChange={(v) => setLength(v as TextGenerationOptions["length"])}
                            className="flex flex-wrap gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="short" id="length-short" />
                                <Label htmlFor="length-short" className="cursor-pointer">Short (2-3 lines)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="medium" id="length-medium" />
                                <Label htmlFor="length-medium" className="cursor-pointer">Medium (4-6 lines)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="long" id="length-long" />
                                <Label htmlFor="length-long" className="cursor-pointer">Long (7+ lines)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Language Selection */}
                    <div className="space-y-2">
                        <Label>Language</Label>
                        <RadioGroup
                            value={language}
                            onValueChange={(v) => setLanguage(v as TextGenerationOptions["language"])}
                            className="flex flex-wrap gap-4"
                        >
                            {[
                                { value: "english", label: "English" },
                                { value: "bengali", label: "Bengali" },
                                { value: "hindi", label: "Hindi" },
                                { value: "mix", label: "Mix (Hinglish)" },
                            ].map((l) => (
                                <div key={l.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={l.value} id={`lang-${l.value}`} />
                                    <Label htmlFor={`lang-${l.value}`} className="cursor-pointer">{l.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <Label>Options</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="emojis"
                                    checked={includeEmojis}
                                    onCheckedChange={(v) => setIncludeEmojis(!!v)}
                                />
                                <Label htmlFor="emojis" className="cursor-pointer">Include emojis</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="cta"
                                    checked={includeCTA}
                                    onCheckedChange={(v) => setIncludeCTA(!!v)}
                                />
                                <Label htmlFor="cta" className="cursor-pointer">Include call-to-action</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="hashtags"
                                    checked={includeHashtags}
                                    onCheckedChange={(v) => setIncludeHashtags(!!v)}
                                />
                                <Label htmlFor="hashtags" className="cursor-pointer">Include hashtags</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="quote"
                                    checked={includeQuote}
                                    onCheckedChange={(v) => setIncludeQuote(!!v)}
                                />
                                <Label htmlFor="quote" className="cursor-pointer">Add motivational quote</Label>
                            </div>
                        </div>
                    </div>

                    {/* Quick Templates */}
                    <div className="space-y-2">
                        <Label>Quick Templates</Label>
                        <div className="flex flex-wrap gap-2">
                            {quickTemplates.map((template) => (
                                <Badge
                                    key={template.label}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary/10 transition-colors py-2 px-3"
                                    onClick={() => handleTemplateClick(template.prompt)}
                                >
                                    <template.icon className="h-3 w-3 mr-1" />
                                    {template.label}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt.trim()}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Post
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
