import { useState } from "react";
import { FileText, Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DocumentService, Document } from "@/services/documentService";
import { QuizService } from "@/services/quizService";
import { supabase } from "@/integrations/supabase/client";
import { TempQuestionStorageService } from "@/services/tempQuestionStorage";
import { KnowledgeBaseSelector } from "./KnowledgeBaseSelector";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Question {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

interface PDFQuestionGeneratorProps {
  onQuestionsGenerated: (questions: Question[], topic?: string, difficulty?: string, language?: string) => void;
  currentCount?: number;
}

export function PDFQuestionGenerator({ onQuestionsGenerated, currentCount = 0 }: PDFQuestionGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedLibraryDoc, setSelectedLibraryDoc] = useState<Document | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [language, setLanguage] = useState<"bn" | "en" | "hi">("en");
  const [topic, setTopic] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { getLimit, isSuperAdmin } = useSubscription();
  const maxLimit = getLimit('max_question_bank_size');
  const isLimitReached = maxLimit !== null && currentCount >= maxLimit;

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
      setSelectedLibraryDoc(null);
      if (!topic) setTopic(selectedFile.name.replace(".pdf", ""));
    }
  };

  const handleLibraryDocSelect = (doc: Document) => {
    setSelectedLibraryDoc(doc);
    setFile(null);
    setTopic(doc.title || doc.file_name.replace(".pdf", ""));
  };

  const handleRemoveSelection = () => {
    setFile(null);
    setSelectedLibraryDoc(null);
  };

  const handleGenerate = async () => {
    if (!file && !selectedLibraryDoc) {
      toast({
        title: "Error",
        description: "Please upload a PDF file or select one from your library",
        variant: "destructive",
      });
      return;
    }

    if (questionCount < 1 || questionCount > 50) {
      toast({
        title: "Error",
        description: "Question count must be between 1 and 50",
        variant: "destructive",
      });
      return;
    }

    if (isLimitReached && !isSuperAdmin) {
      toast({
        title: "Limit Reached",
        description: `Your plan allows up to ${maxLimit} questions in the bank. Please upgrade to generate more.`,
        variant: "destructive",
      });
      return;
    }

    if (maxLimit !== null && !isSuperAdmin && currentCount + questionCount > maxLimit) {
      toast({
        title: "Limit Exceeded",
        description: `Generating ${questionCount} questions would exceed your limit of ${maxLimit}. You can add ${maxLimit - currentCount} more.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in");
      }

      let processedDoc: Document;

      if (file) {
        // Step 1: Upload PDF
        setIsUploading(true);
        toast({
          title: "Uploading PDF",
          description: "Please wait...",
        });

        const uploadedDoc = await DocumentService.uploadDocument(user.id, file, {
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

        processedDoc = await waitForDocumentProcessing(uploadedDoc.id);
      } else {
        // Use existing library document
        processedDoc = selectedLibraryDoc!;

        if (processedDoc.processing_status !== "completed") {
          setIsProcessing(true);
          toast({
            title: "Processing Document",
            description: "Existing document is still processing...",
          });
          processedDoc = await waitForDocumentProcessing(processedDoc.id);
        }
      }

      if (!processedDoc.extracted_text) {
        throw new Error("Could not extract text from PDF. The PDF might be empty or corrupted.");
      }

      // Check if the extracted text indicates an error
      if (processedDoc.extracted_text.startsWith("Error:") ||
        processedDoc.extracted_text.startsWith("No text could be extracted")) {
        throw new Error(processedDoc.extracted_text);
      }

      // Check if we have meaningful text (at least 50 characters)
      if (processedDoc.extracted_text.trim().length < 50) {
        throw new Error("The PDF does not contain enough text to generate questions. Please upload a PDF with more content.");
      }

      setIsProcessing(false);

      // Step 3: Generate questions from extracted text
      setIsGenerating(true);
      toast({
        title: "Generating Questions",
        description: "Creating questions from PDF content...",
      });

      console.log(`Generating questions from PDF with ${processedDoc.extracted_text.length} characters of text`);

      // Limit extracted text to 8000 characters for better API performance
      const textForGeneration = processedDoc.extracted_text.substring(0, 8000);
      const documentName = topic || (selectedLibraryDoc ? (selectedLibraryDoc.title || selectedLibraryDoc.file_name) : file?.name || "Document");

      const quiz = await QuizService.generateQuizFromDocument({
        documentText: textForGeneration,
        topic: documentName,
        questionCount,
        language,
      });

      if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        throw new Error("No questions generated");
      }

      // Store questions temporarily
      TempQuestionStorageService.addQuestions(quiz.questions, {
        topic: documentName,
        language,
        source_type: 'pdf_generator',
      });

      // Pass generated questions to parent with metadata
      onQuestionsGenerated(quiz.questions, documentName, undefined, language);

      toast({
        title: "Success",
        description: `Generated ${quiz.questions.length} questions from PDF! View them in the "AI Generated" tab.`,
      });

      // Reset form
      setFile(null);
      setTopic("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate questions from PDF",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setIsGenerating(false);
    }
  };

  const waitForDocumentProcessing = async (documentId: string, maxAttempts = 30): Promise<Document> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const doc = await DocumentService.getDocument(documentId);

      if (doc.processing_status === "completed") {
        return doc;
      }

      if (doc.processing_status === "failed") {
        throw new Error(doc.processing_error || "Document processing failed");
      }

      // Still processing, continue polling
    }

    throw new Error("Document processing timed out");
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
        {isLimitReached && !isSuperAdmin && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limit Reached</AlertTitle>
            <AlertDescription>
              You have {currentCount} questions. Your {maxLimit}-question limit is reached.
              Please upgrade your plan to generate more.
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pdf-upload">Upload PDF or Select from Library *</Label>
              {!isLoading && (
                <KnowledgeBaseSelector onSelect={handleLibraryDocSelect} />
              )}
            </div>
            {!file && !selectedLibraryDoc ? (
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
              <div className="border rounded-lg p-4 flex items-center justify-between bg-primary/5 border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
                      {selectedLibraryDoc ? (selectedLibraryDoc.title || selectedLibraryDoc.file_name) : file?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedLibraryDoc ? (
                        <>Library Document • {(selectedLibraryDoc.file_size_bytes / 1024 / 1024).toFixed(2)} MB</>
                      ) : (
                        <>Local File • {(file!.size / 1024 / 1024).toFixed(2)} MB</>
                      )}
                    </p>
                  </div>
                </div>
                {!isLoading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveSelection}
                    className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Helper Banner */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
              <span>🎯</span>
              <span>Government Exam Standard</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Every quiz is automatically generated following the standard and style of competitive government examinations. No manual difficulty selection is required.
            </p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min={1}
                max={50}
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 5)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage(v as "bn" | "en" | "hi")}
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
            disabled={isLoading || (!file && !selectedLibraryDoc) || (isLimitReached && !isSuperAdmin)}
            className="w-full gap-2 h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
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
