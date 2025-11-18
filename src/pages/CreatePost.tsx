import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PostService } from "@/services/postService";
import { QuizService } from "@/services/quizService";
import { AccessibleChannel, PostType } from "@/types/post";
import { FileText, Image, BarChart3, FileIcon, Megaphone, HelpCircle, Calendar, Send } from "lucide-react";
import { Quiz, QuizConfig } from "@/types/quiz";

export default function CreatePost() {
  const [postType, setPostType] = useState<PostType>("text");
  const [channels, setChannels] = useState<AccessibleChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form states for different post types
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [allowsMultiple, setAllowsMultiple] = useState(false);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  // Quiz states
  const [quizTopic, setQuizTopic] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);

  useEffect(() => {
    loadUserAndChannels();
  }, []);

  const loadUserAndChannels = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);

    try {
      const accessibleChannels = await PostService.getAccessibleChannels(user.id);
      setChannels(accessibleChannels);

      if (accessibleChannels.length > 0) {
        setSelectedChannel(accessibleChannels[0].channel_id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizTopic) {
      toast({
        title: "Error",
        description: "Please enter a quiz topic",
        variant: "destructive",
      });
      return;
    }

    setGeneratingQuiz(true);
    try {
      const config: QuizConfig = {
        topic: quizTopic,
        questionCount,
        difficulty: quizDifficulty,
        channelId: selectedChannel,
      };

      const quiz = await QuizService.generateQuiz(config);
      setGeneratedQuiz(quiz);

      toast({
        title: "Success",
        description: "Quiz generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedChannel) {
      toast({
        title: "Error",
        description: "Please select a channel",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const scheduleDate = scheduledTime ? new Date(scheduledTime) : undefined;

      switch (postType) {
        case "text":
          if (!content) throw new Error("Content is required");
          await PostService.createTextPost(userId, {
            channel_id: selectedChannel,
            title,
            content,
            scheduled_time: scheduleDate,
          });
          break;

        case "image":
          if (!imageFile) throw new Error("Image file is required");
          await PostService.createImagePost(userId, {
            channel_id: selectedChannel,
            title,
            caption: content,
            image_file: imageFile,
            scheduled_time: scheduleDate,
          });
          break;

        case "poll":
          if (!pollQuestion || pollOptions.filter(o => o.trim()).length < 2) {
            throw new Error("Poll question and at least 2 options are required");
          }
          await PostService.createPollPost(userId, {
            channel_id: selectedChannel,
            question: pollQuestion,
            options: pollOptions.filter(o => o.trim()),
            is_anonymous: isAnonymous,
            allows_multiple_answers: allowsMultiple,
            scheduled_time: scheduleDate,
          });
          break;

        case "pdf":
          if (!pdfFile) throw new Error("PDF file is required");
          await PostService.createPDFPost(userId, {
            channel_id: selectedChannel,
            title,
            caption: content,
            pdf_file: pdfFile,
            scheduled_time: scheduleDate,
          });
          break;

        case "promotional":
          if (!content) throw new Error("Content is required");
          await PostService.createPromotionalPost(userId, {
            channel_id: selectedChannel,
            title,
            content,
            button_text: buttonText,
            button_url: buttonUrl,
            scheduled_time: scheduleDate,
          });
          break;

        case "quiz":
          if (!generatedQuiz) throw new Error("Please generate a quiz first");
          await PostService.createQuizPost(userId, {
            channel_id: selectedChannel,
            quiz_data: generatedQuiz,
            scheduled_time: scheduleDate,
          });
          break;
      }

      toast({
        title: "Success",
        description: scheduledTime
          ? "Post scheduled successfully!"
          : "Post created successfully!",
      });

      navigate("/posts");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-4xl font-bold">Create Post</h1>
          <p className="text-muted-foreground">
            Create and schedule posts for your Telegram channels
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Post Details</CardTitle>
            <CardDescription>Choose a post type and fill in the details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label>Select Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.channel_id} value={channel.channel_id}>
                      {channel.channel_name} ({channel.access_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Post Type Tabs */}
            <Tabs value={postType} onValueChange={(v) => setPostType(v as PostType)}>
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="text" className="flex flex-col gap-1">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Text</span>
                </TabsTrigger>
                <TabsTrigger value="image" className="flex flex-col gap-1">
                  <Image className="w-4 h-4" />
                  <span className="text-xs">Image</span>
                </TabsTrigger>
                <TabsTrigger value="poll" className="flex flex-col gap-1">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs">Poll</span>
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex flex-col gap-1">
                  <FileIcon className="w-4 h-4" />
                  <span className="text-xs">PDF</span>
                </TabsTrigger>
                <TabsTrigger value="promotional" className="flex flex-col gap-1">
                  <Megaphone className="w-4 h-4" />
                  <span className="text-xs">Promo</span>
                </TabsTrigger>
                <TabsTrigger value="quiz" className="flex flex-col gap-1">
                  <HelpCircle className="w-4 h-4" />
                  <span className="text-xs">Quiz</span>
                </TabsTrigger>
              </TabsList>

              {/* Text Post */}
              <TabsContent value="text" className="space-y-4">
                <div className="space-y-2">
                  <Label>Title (Optional)</Label>
                  <Input
                    placeholder="Post title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write your post content here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={8}
                  />
                </div>
              </TabsContent>

              {/* Image Post */}
              <TabsContent value="image" className="space-y-4">
                <div className="space-y-2">
                  <Label>Title (Optional)</Label>
                  <Input
                    placeholder="Post title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Image</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caption (Optional)</Label>
                  <Textarea
                    placeholder="Image caption..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Poll Post */}
              <TabsContent value="poll" className="space-y-4">
                <div className="space-y-2">
                  <Label>Poll Question</Label>
                  <Input
                    placeholder="What's your question?"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Options</Label>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updatePollOption(index, e.target.value)}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removePollOption(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" onClick={addPollOption}>
                    Add Option
                  </Button>
                </div>
              </TabsContent>

              {/* PDF Post */}
              <TabsContent value="pdf" className="space-y-4">
                <div className="space-y-2">
                  <Label>Title (Optional)</Label>
                  <Input
                    placeholder="Document title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PDF Document</Label>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Caption (Optional)</Label>
                  <Textarea
                    placeholder="Document description..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                  />
                </div>
              </TabsContent>

              {/* Promotional Post */}
              <TabsContent value="promotional" className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Promotional title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Write your promotional content..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Button Text (Optional)</Label>
                    <Input
                      placeholder="Learn More"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Button URL (Optional)</Label>
                    <Input
                      placeholder="https://example.com"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Quiz Post */}
              <TabsContent value="quiz" className="space-y-4">
                <div className="space-y-2">
                  <Label>Quiz Topic</Label>
                  <Input
                    placeholder="e.g., World History"
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={quizDifficulty} onValueChange={(v: any) => setQuizDifficulty(v)}>
                      <SelectTrigger>
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
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={questionCount}
                      onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz || !quizTopic}
                  className="w-full"
                >
                  {generatingQuiz ? "Generating..." : "Generate Quiz"}
                </Button>
                {generatedQuiz && (
                  <Card className="bg-green-50 dark:bg-green-900/20">
                    <CardContent className="pt-6">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        ✓ Quiz generated with {generatedQuiz.questions.length} questions
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Schedule Time */}
            <div className="space-y-2">
              <Label>Schedule Time (Optional)</Label>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to save as draft. You can publish it later.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={loading || !selectedChannel}
                className="flex-1"
              >
                {loading ? (
                  "Creating..."
                ) : scheduledTime ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Post
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Draft
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => navigate("/posts")}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
