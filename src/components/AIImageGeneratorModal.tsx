import { useState } from "react";
import {
    Palette,
    Loader2,
    RefreshCw,
    Check,
    Download,
    BookOpen,
    Target,
    Lightbulb,
    PartyPopper,
    BarChart3,
    Sparkles,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AIService, ImageGenerationOptions } from "@/services/aiService";
import { useNavigate } from "react-router-dom";

interface AIImageGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUseImage: (imageUrl: string) => void;
    hasApiKey: boolean;
}

const quickPresets = [
    { icon: BookOpen, label: "Study Theme", prompt: "Educational study theme with books, notebook, and warm lighting" },
    { icon: Target, label: "Quiz Banner", prompt: "Exciting quiz competition banner with trophy and confetti" },
    { icon: Lightbulb, label: "Tip Card", prompt: "Clean tip card design with lightbulb icon and gradient background" },
    { icon: PartyPopper, label: "Celebration", prompt: "Celebration banner with balloons and congratulations theme" },
    { icon: BarChart3, label: "Infographic", prompt: "Modern infographic style with charts and statistics" },
    { icon: Sparkles, label: "Motivational", prompt: "Inspirational sunrise scene with motivational energy" },
];

export function AIImageGeneratorModal({
    isOpen,
    onClose,
    onUseImage,
    hasApiKey,
}: AIImageGeneratorModalProps) {
    const { toast } = useToast();
    const navigate = useNavigate();

    // Form state
    const [prompt, setPrompt] = useState("");
    const [style, setStyle] = useState<ImageGenerationOptions["style"]>("realistic");
    const [aspectRatio, setAspectRatio] = useState<ImageGenerationOptions["aspectRatio"]>("1:1");
    const [colorScheme, setColorScheme] = useState<ImageGenerationOptions["colorScheme"]>("vibrant");

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [enhancedPrompt, setEnhancedPrompt] = useState("");
    const [generationTime, setGenerationTime] = useState(0);
    const [showPreview, setShowPreview] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: "Description required",
                description: "Please describe the image you want to generate",
                variant: "destructive",
            });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await AIService.generateImage({
                prompt: prompt.trim(),
                style,
                aspectRatio,
                colorScheme,
            });

            if (result.imageUrl) {
                setGeneratedImageUrl(result.imageUrl);
            }
            setEnhancedPrompt(result.enhancedPrompt || "");
            setGenerationTime(result.generationTimeMs);
            setShowPreview(true);

            // Show note about image generation
            toast({
                title: "Prompt Enhanced! 🎨",
                description: "Your image prompt has been optimized. Use it with any image generator.",
            });
        } catch (error) {
            toast({
                title: "Generation failed",
                description: error instanceof Error ? error.message : "Failed to generate image",
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

    const handleUseImage = () => {
        if (generatedImageUrl) {
            onUseImage(generatedImageUrl);
        }
        handleReset();
        onClose();
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(enhancedPrompt);
        toast({
            title: "Copied!",
            description: "Enhanced prompt copied to clipboard",
        });
    };

    const handleReset = () => {
        setPrompt("");
        setGeneratedImageUrl(null);
        setEnhancedPrompt("");
        setShowPreview(false);
        setGenerationTime(0);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handlePresetClick = (presetPrompt: string) => {
        setPrompt(presetPrompt);
    };

    if (!hasApiKey) {
        return (
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Palette className="h-5 w-5 text-primary" />
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
                            <Palette className="h-5 w-5 text-primary" />
                            Your Enhanced Image Prompt
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Generated Image Preview */}
                        {generatedImageUrl ? (
                            <div className="bg-muted/50 rounded-lg p-4 border">
                                <img
                                    src={generatedImageUrl}
                                    alt="Generated"
                                    className="w-full rounded-md"
                                />
                            </div>
                        ) : (
                            <div className="bg-muted/50 rounded-lg p-6 border text-center">
                                <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <p className="text-sm text-muted-foreground mb-4">
                                    Your enhanced prompt is ready! Copy it and use with any image generation service like:
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center mb-4">
                                    <Badge variant="outline">DALL-E</Badge>
                                    <Badge variant="outline">Midjourney</Badge>
                                    <Badge variant="outline">Stable Diffusion</Badge>
                                    <Badge variant="outline">Leonardo AI</Badge>
                                </div>
                            </div>
                        )}

                        {/* Enhanced Prompt */}
                        {enhancedPrompt && (
                            <div className="space-y-2">
                                <Label>Enhanced Prompt:</Label>
                                <div className="bg-muted/50 rounded-lg p-4 border">
                                    <p className="text-sm whitespace-pre-wrap">{enhancedPrompt}</p>
                                </div>
                            </div>
                        )}

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
                            {enhancedPrompt && (
                                <Button variant="outline" onClick={handleCopyPrompt}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Copy Prompt
                                </Button>
                            )}
                            {generatedImageUrl && (
                                <Button
                                    className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                                    onClick={handleUseImage}
                                >
                                    <Check className="mr-2 h-4 w-4" />
                                    Use This Image
                                </Button>
                            )}
                        </div>

                        {/* Generation Info */}
                        <p className="text-xs text-muted-foreground text-center">
                            Generation time: {(generationTime / 1000).toFixed(1)}s
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
                        <Palette className="h-5 w-5 text-primary" />
                        Generate Image with AI
                    </DialogTitle>
                    <DialogDescription>
                        Describe the image you want to generate and customize the style
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <Label htmlFor="image-prompt">Describe the image you want to generate *</Label>
                        <Textarea
                            id="image-prompt"
                            placeholder='E.g., "Motivational poster with books and sunrise", "Quiz competition banner with trophy"'
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Style Selection */}
                    <div className="space-y-2">
                        <Label>Style</Label>
                        <RadioGroup
                            value={style}
                            onValueChange={(v) => setStyle(v as ImageGenerationOptions["style"])}
                            className="flex flex-wrap gap-4"
                        >
                            {["realistic", "cartoon", "minimalist", "artistic"].map((s) => (
                                <div key={s} className="flex items-center space-x-2">
                                    <RadioGroupItem value={s} id={`style-${s}`} />
                                    <Label htmlFor={`style-${s}`} className="capitalize cursor-pointer">
                                        {s}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Aspect Ratio Selection */}
                    <div className="space-y-2">
                        <Label>Aspect Ratio</Label>
                        <RadioGroup
                            value={aspectRatio}
                            onValueChange={(v) => setAspectRatio(v as ImageGenerationOptions["aspectRatio"])}
                            className="flex flex-wrap gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="1:1" id="ratio-square" />
                                <Label htmlFor="ratio-square" className="cursor-pointer">Square (1:1)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="16:9" id="ratio-landscape" />
                                <Label htmlFor="ratio-landscape" className="cursor-pointer">Landscape (16:9)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="9:16" id="ratio-portrait" />
                                <Label htmlFor="ratio-portrait" className="cursor-pointer">Portrait (9:16)</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Color Scheme Selection */}
                    <div className="space-y-2">
                        <Label>Color Scheme</Label>
                        <RadioGroup
                            value={colorScheme}
                            onValueChange={(v) => setColorScheme(v as ImageGenerationOptions["colorScheme"])}
                            className="flex flex-wrap gap-4"
                        >
                            {["vibrant", "pastel", "dark", "auto"].map((c) => (
                                <div key={c} className="flex items-center space-x-2">
                                    <RadioGroupItem value={c} id={`color-${c}`} />
                                    <Label htmlFor={`color-${c}`} className="capitalize cursor-pointer">
                                        {c}
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Quick Presets */}
                    <div className="space-y-2">
                        <Label>Quick Presets</Label>
                        <div className="flex flex-wrap gap-2">
                            {quickPresets.map((preset) => (
                                <Badge
                                    key={preset.label}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary/10 transition-colors py-2 px-3"
                                    onClick={() => handlePresetClick(preset.prompt)}
                                >
                                    <preset.icon className="h-3 w-3 mr-1" />
                                    {preset.label}
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
                                <Palette className="mr-2 h-4 w-4" />
                                Generate Image
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
