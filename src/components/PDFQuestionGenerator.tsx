import { useState } from "react";
import { FileText, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DocumentService } from "@/services/documentService";
import { QuizService } from "@/services/quizService";
import { supabase } from "@/integrations/supabase/client";

interface PDFQuestionGeneratorProps {
  onQuestionsGenerated: (questions: any[], topic?: string, difficulty?: string, language?: string) => void;
}

export function PDFQuestionGenerator({ onQuestionsGenerated }: PDFQuestionGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("en");
  const [topic, setTopic] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast({
          title: "Invalid File",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "PDF file must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
  };

  const handleGenerate = async () => {
    if (!file) {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    if (questionCount < 1 || questionCount > 20) {
      toast({
        title: "Error",
        description: "Question count must be between 1 and 20",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      // Step 1: Upload PDF
      setIsUploading(true);
      toast({
        title: "Uploading PDF",
        description: "Please wait...",
      });

      const document = await DocumentService.uploadDocument(user.id, file, {
        title: topic || file.name,
        language,
      });

      setIsUploading(false);

      // Step 2: Wait for processing (poll for completion)
      setIsProcessing(true);
      toast({
        title: "Processing PDF",
        description: "Extracting text from document...",
      });

      const processedDoc = await waitForDocumentProcessing(document.id);

      if (!processedDoc.extracted_text || processedDoc.extracted_text.length < 50) {
        throw new Error("Could not extract enough text from PDF. The PDF might be image-based, encrypted, or empty. Please try a different PDF with selectable text.");
      }

      console.log(`Extracted ${processedDoc.extracted_text.length} characters from PDF`);

      setIsProcessing(false);

      // Step 3: Generate questions from extracted text
      setIsGenerating(true);
      toast({
        title: "Generating Questions",
        description: "Creating questions from PDF content...",
      });

      const quiz = await QuizService.generateQuiz({
        topic: topic || `Document: ${file.name}`,
        questionCount,
        difficulty,
        language,
        systemPrompt: `Generate questions based on the following document content:\n\n${processedDoc.extracted_text.substring(0, 8000)}`,
        userId: user.id,
      });

      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error("No questions generated");
      }

      // Pass generated questions to parent with metadata
      onQuestionsGenerated(quiz.questions, topic || file.name, difficulty, language);

      toast({
        title: "Success",
        description: `Generated ${quiz.questions.length} questions from PDF!`,
      });

      // Reset form
      setFile(null);
      setTopic("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate questions from PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setIsGenerating(false);
    }
  };

  const waitForDocumentProcessing = async (documentId: string, maxAttempts = 60): Promise<any> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

      const doc = await DocumentService.getDocument(documentId);

      if (doc.processing_status === "completed") {
        return doc;
      }

      if (doc.processing_status === "failed") {
        throw new Error(doc.processing_error || "Document processing failed");
      }

      // Update progress every 5 attempts (15 seconds)
      if (i > 0 && i % 5 === 0) {
        toast({
          title: "Still Processing",
          description: `Processing PDF... (${Math.round((i / maxAttempts) * 100)}% timeout)`,
        });
      }

      // Still processing, continue polling
    }

    throw new Error("Document processing timed out after 3 minutes. Please try a smaller PDF or try again later.");
  };

  const isLoading = isUploading || isProcessing || isGenerating;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          PDF Question Generation
        </CardTitle>
        <CardDescription>
          Upload a PDF document and generate questions from its content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="pdf-upload">Upload PDF *</Label>
            {!file ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isLoading}
                />
                <label
                  htmlFor="pdf-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Click to upload PDF</p>
                  <p className="text-xs text-muted-foreground">Max 10MB</p>
                </label>
              </div>
            ) : (
              <div className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!isLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    className="text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Topic/Title (Optional)</Label>
            <Input
              id="topic"
              placeholder="e.g., Biology Chapter 3"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as any)}
                disabled={isLoading}
              >
                <SelectTrigger id="difficulty">
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
              <Label htmlFor="language">Language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as any)}
                disabled={isLoading}
              >
                <SelectTrigger id="language">
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

          <Button
            onClick={handleGenerate}
            disabled={isLoading || !file}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isUploading && "Uploading PDF..."}
                {isProcessing && "Processing PDF..."}
                {isGenerating && "Generating Questions..."}
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate Questions from PDF
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
