import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TestService, Test } from "@/services/testService";
import { 
  Plus, 
  Search, 
  FileQuestion, 
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Send,
  BarChart3,
  Users,
  CheckCircle2,
  Target
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTest, setNewTest] = useState({
    title: "",
    description: "",
    instructions: "",
    test_type: "mcq",
    difficulty: "medium",
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 40,
    negative_marking: false,
    negative_marks_per_question: 0,
    shuffle_questions: true,
    shuffle_options: true,
    show_result_immediately: true,
    show_correct_answers: true,
    max_attempts: 1,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const data = await TestService.getTests();
      setTests(data);
    } catch (error) {
      console.error("Error loading tests:", error);
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    try {
      await TestService.createTest(newTest);
      toast({
        title: "Success",
        description: "Test created successfully",
      });
      setIsCreateDialogOpen(false);
      setNewTest({
        title: "",
        description: "",
        instructions: "",
        test_type: "mcq",
        difficulty: "medium",
        duration_minutes: 60,
        total_marks: 100,
        passing_marks: 40,
        negative_marking: false,
        negative_marks_per_question: 0,
        shuffle_questions: true,
        shuffle_options: true,
        show_result_immediately: true,
        show_correct_answers: true,
        max_attempts: 1,
      });
      loadTests();
    } catch (error) {
      console.error("Error creating test:", error);
      toast({
        title: "Error",
        description: "Failed to create test",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTest = async (testId: string) => {
    try {
      await TestService.deleteTest(testId);
      toast({
        title: "Success",
        description: "Test deleted successfully",
      });
      loadTests();
    } catch (error) {
      console.error("Error deleting test:", error);
      toast({
        title: "Error",
        description: "Failed to delete test",
        variant: "destructive",
      });
    }
  };

  const handlePublishTest = async (testId: string) => {
    try {
      await TestService.publishTest(testId);
      toast({
        title: "Success",
        description: "Test published successfully",
      });
      loadTests();
    } catch (error) {
      console.error("Error publishing test:", error);
      toast({
        title: "Error",
        description: "Failed to publish test",
        variant: "destructive",
      });
    }
  };

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const draftTests = filteredTests.filter(t => t.status === "draft");
  const activeTests = filteredTests.filter(t => t.status === "active" || t.is_published);
  const completedTests = filteredTests.filter(t => t.status === "completed" || t.status === "archived");

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "draft": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "archived": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/10 text-green-500";
      case "medium": return "bg-yellow-500/10 text-yellow-500";
      case "hard": return "bg-red-500/10 text-red-500";
      default: return "bg-gray-500/10 text-gray-500";
    }
  };

  const TestCard = ({ test }: { test: Test }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg line-clamp-1">{test.title}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={getStatusColor(test.status)}>
                {test.status || "draft"}
              </Badge>
              <Badge variant="outline" className={getDifficultyColor(test.difficulty)}>
                {test.difficulty || "medium"}
              </Badge>
              <Badge variant="outline" className="bg-muted">
                {test.test_type?.toUpperCase() || "MCQ"}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/dashboard/tests/${test.id}`}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Test
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to={`/dashboard/tests/${test.id}/analytics`}>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Analytics
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {!test.is_published && (
                <DropdownMenuItem onClick={() => handlePublishTest(test.id)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}
              {test.is_telegram_enabled && (
                <DropdownMenuItem>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Telegram
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => handleDeleteTest(test.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {test.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {test.description}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{test.duration_minutes || 60} min</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="w-4 h-4" />
            <span>{test.total_marks || 100} marks</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="w-4 h-4" />
            <span>Pass: {test.passing_marks || 40}%</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{test.max_attempts || 1} attempt(s)</span>
          </div>
        </div>
        {test.negative_marking && (
          <div className="text-xs text-orange-500 bg-orange-500/10 px-2 py-1 rounded">
            Negative marking: -{test.negative_marks_per_question} per wrong answer
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Tests & Exams
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage tests with auto-evaluation
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              All ({filteredTests.length})
            </TabsTrigger>
            <TabsTrigger value="draft">
              Drafts ({draftTests.length})
            </TabsTrigger>
            <TabsTrigger value="active">
              Active ({activeTests.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedTests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="space-y-2">
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-20 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredTests.length === 0 ? (
              <Card className="p-12 text-center">
                <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tests yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first test to start evaluating students
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="draft">
            {draftTests.length === 0 ? (
              <Card className="p-12 text-center">
                <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No draft tests</h3>
                <p className="text-muted-foreground">Create a new test to get started</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {draftTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active">
            {activeTests.length === 0 ? (
              <Card className="p-12 text-center">
                <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active tests</h3>
                <p className="text-muted-foreground">Publish a test to make it active</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {completedTests.length === 0 ? (
              <Card className="p-12 text-center">
                <FileQuestion className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No completed tests</h3>
                <p className="text-muted-foreground">Completed tests will appear here</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Test Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Test</DialogTitle>
              <DialogDescription>
                Set up a new test or exam for your students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Test Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Physics Mid-Term Exam"
                  value={newTest.title}
                  onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the test..."
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions for Students</Label>
                <Textarea
                  id="instructions"
                  placeholder="Read all questions carefully before answering..."
                  value={newTest.instructions}
                  onChange={(e) => setNewTest({ ...newTest, instructions: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test_type">Test Type</Label>
                  <Select
                    value={newTest.test_type}
                    onValueChange={(value) => setNewTest({ ...newTest, test_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">MCQ Only</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                      <SelectItem value="subjective">Subjective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={newTest.difficulty}
                    onValueChange={(value) => setNewTest({ ...newTest, difficulty: value })}
                  >
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
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newTest.duration_minutes}
                    onChange={(e) => setNewTest({ ...newTest, duration_minutes: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input
                    id="total_marks"
                    type="number"
                    value={newTest.total_marks}
                    onChange={(e) => setNewTest({ ...newTest, total_marks: parseInt(e.target.value) || 100 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passing_marks">Passing %</Label>
                  <Input
                    id="passing_marks"
                    type="number"
                    value={newTest.passing_marks}
                    onChange={(e) => setNewTest({ ...newTest, passing_marks: parseInt(e.target.value) || 40 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_attempts">Max Attempts</Label>
                <Input
                  id="max_attempts"
                  type="number"
                  min={1}
                  value={newTest.max_attempts}
                  onChange={(e) => setNewTest({ ...newTest, max_attempts: parseInt(e.target.value) || 1 })}
                />
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium">Test Settings</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="negative_marking">Negative Marking</Label>
                  <Switch
                    id="negative_marking"
                    checked={newTest.negative_marking}
                    onCheckedChange={(checked) => setNewTest({ ...newTest, negative_marking: checked })}
                  />
                </div>
                {newTest.negative_marking && (
                  <div className="space-y-2">
                    <Label htmlFor="negative_marks">Negative Marks per Wrong Answer</Label>
                    <Input
                      id="negative_marks"
                      type="number"
                      step="0.25"
                      value={newTest.negative_marks_per_question}
                      onChange={(e) => setNewTest({ ...newTest, negative_marks_per_question: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffle_questions">Shuffle Questions</Label>
                  <Switch
                    id="shuffle_questions"
                    checked={newTest.shuffle_questions}
                    onCheckedChange={(checked) => setNewTest({ ...newTest, shuffle_questions: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="shuffle_options">Shuffle Options</Label>
                  <Switch
                    id="shuffle_options"
                    checked={newTest.shuffle_options}
                    onCheckedChange={(checked) => setNewTest({ ...newTest, shuffle_options: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_result_immediately">Show Result Immediately</Label>
                  <Switch
                    id="show_result_immediately"
                    checked={newTest.show_result_immediately}
                    onCheckedChange={(checked) => setNewTest({ ...newTest, show_result_immediately: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="show_correct_answers">Show Correct Answers</Label>
                  <Switch
                    id="show_correct_answers"
                    checked={newTest.show_correct_answers}
                    onCheckedChange={(checked) => setNewTest({ ...newTest, show_correct_answers: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTest}
                disabled={!newTest.title}
                className="bg-gradient-to-r from-indigo-500 to-purple-500"
              >
                Create Test
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
