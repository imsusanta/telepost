import { useState, useEffect } from "react";
import { 
  Plus, Edit2, Trash2, Check,
  CreditCard, Users, Shield,
  TrendingUp, BarChart3, Activity,
  Loader2, Zap
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  getSubscriptionPlans, 
  getSubscriptionStats,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  createSubscriptionPlan
} from '@/services/superAdminService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const PlanFormContent = ({ plan, setPlan }: any) => {
  if (!plan) return null;

  const updateField = (field: string, value: any) => {
    setPlan({ ...plan, [field]: value });
  };

  return (
    <Tabs defaultValue="general" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="limits">Limits</TabsTrigger>
        <TabsTrigger value="features">Features</TabsTrigger>
      </TabsList>

      <ScrollArea className="h-[350px] pr-4">
        <TabsContent value="general" className="space-y-4 mt-0">
          <div className="space-y-2">
            <Label htmlFor="name">Internal Name (Unique)</Label>
            <Input 
              id="name" 
              value={plan.name || ''} 
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. starter, pro, agency"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input 
              id="display_name" 
              value={plan.display_name || ''} 
              onChange={(e) => updateField('display_name', e.target.value)}
              placeholder="e.g. Professional Plan"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price (INR)</Label>
              <Input 
                id="price" 
                type="number"
                value={plan.price || 0} 
                onChange={(e) => updateField('price', parseFloat(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearly_price">Yearly Price (INR)</Label>
              <Input 
                id="yearly_price" 
                type="number"
                value={(plan as any).yearly_price || 0} 
                onChange={(e) => updateField('yearly_price', parseFloat(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billing_period">Billing Period</Label>
              <Select 
                value={plan.billing_period || 'monthly'} 
                onValueChange={(val) => updateField('billing_period', val)}
              >
                <SelectTrigger id="billing_period">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Active Status</Label>
              <p className="text-xs text-muted-foreground">Whether this plan is available for new users</p>
            </div>
            <Switch 
              checked={plan.is_active !== false} 
              onCheckedChange={(val) => updateField('is_active', val)}
            />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Highlight Plan</Label>
              <p className="text-xs text-muted-foreground">Mark as "Most Popular" in UI</p>
            </div>
            <Switch 
              checked={plan.is_popular || false} 
              onCheckedChange={(val) => updateField('is_popular', val)}
            />
          </div>
        </TabsContent>

        <TabsContent value="limits" className="space-y-4 mt-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_channels">Telegram Channels</Label>
              <Input 
                id="max_channels" 
                type="number"
                value={plan.max_telegram_channels || 0} 
                onChange={(e) => updateField('max_telegram_channels', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_pdf">PDF Storage (GB)</Label>
              <Input 
                id="max_pdf" 
                type="number"
                value={plan.max_pdf_storage_gb || 0} 
                onChange={(e) => updateField('max_pdf_storage_gb', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_quizzes">Quizzes per Month</Label>
              <Input 
                id="max_quizzes" 
                type="number"
                placeholder="Empty for unlimited"
                value={plan.max_quizzes_per_month === null ? '' : plan.max_quizzes_per_month} 
                onChange={(e) => updateField('max_quizzes_per_month', e.target.value === '' ? null : parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_batch">Max Batch Size</Label>
              <Input 
                id="max_batch" 
                type="number"
                value={plan.max_batch_quiz_generation || 0} 
                onChange={(e) => updateField('max_batch_quiz_generation', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="max_questions">Question Bank Size</Label>
              <Input 
                id="max_questions" 
                type="number"
                value={plan.max_question_bank_size || 0} 
                onChange={(e) => updateField('max_question_bank_size', parseInt(e.target.value))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-3 mt-0">
          <div className="grid gap-3">
            {/* Create Quiz */}
            <div className="border rounded-lg p-3 space-y-2">
              <ToggleOption 
                label="Create Quiz" 
                checked={plan.features?.create_quiz?.enabled} 
                onChange={(v: boolean) => {
                  const f = { ...plan.features };
                  f.create_quiz = { ...(f.create_quiz || {}), enabled: v };
                  updateField('features', f);
                }} 
              />
              {plan.features?.create_quiz?.enabled && (
                <div className="ml-4 space-y-1 border-l-2 border-muted pl-3">
                  <ToggleOption label="AI Generated" checked={plan.features?.create_quiz?.ai_generated} onChange={(v: boolean) => { const f = { ...plan.features }; f.create_quiz = { ...f.create_quiz, ai_generated: v }; updateField('features', f); }} />
                  <ToggleOption label="Manual Input" checked={plan.features?.create_quiz?.manual_input} onChange={(v: boolean) => { const f = { ...plan.features }; f.create_quiz = { ...f.create_quiz, manual_input: v }; updateField('features', f); }} />
                  <ToggleOption label="Question Bank" checked={plan.features?.create_quiz?.question_bank} onChange={(v: boolean) => { const f = { ...plan.features }; f.create_quiz = { ...f.create_quiz, question_bank: v }; updateField('features', f); }} />
                  <ToggleOption label="Documents" checked={plan.features?.create_quiz?.documents} onChange={(v: boolean) => { const f = { ...plan.features }; f.create_quiz = { ...f.create_quiz, documents: v }; updateField('features', f); }} />
                </div>
              )}
            </div>

            {/* Create Post */}
            <div className="border rounded-lg p-3 space-y-2">
              <ToggleOption 
                label="Create Post" 
                checked={plan.features?.create_post?.enabled} 
                onChange={(v: boolean) => {
                  const f = { ...plan.features };
                  f.create_post = { ...(f.create_post || {}), enabled: v };
                  updateField('features', f);
                }} 
              />
              {plan.features?.create_post?.enabled && (
                <div className="ml-4 space-y-1 border-l-2 border-muted pl-3">
                  <ToggleOption label="Write with AI" checked={plan.features?.create_post?.write_with_ai} onChange={(v: boolean) => { const f = { ...plan.features }; f.create_post = { ...f.create_post, write_with_ai: v }; updateField('features', f); }} />
                </div>
              )}
            </div>

            {/* Simple features */}
            <div className="border rounded-lg p-3 space-y-2">
              <ToggleOption label="Channels" checked={plan.features?.channels} onChange={(v: boolean) => { const f = { ...plan.features }; f.channels = v; updateField('features', f); }} />
              <ToggleOption label="Stories" checked={plan.features?.stories} onChange={(v: boolean) => { const f = { ...plan.features }; f.stories = v; updateField('features', f); }} />
            </div>

            {/* Question Bank */}
            <div className="border rounded-lg p-3 space-y-2">
              <ToggleOption 
                label="Question Bank" 
                checked={plan.features?.question_bank?.enabled} 
                onChange={(v: boolean) => {
                  const f = { ...plan.features };
                  f.question_bank = { ...(f.question_bank || {}), enabled: v };
                  updateField('features', f);
                }} 
              />
              {plan.features?.question_bank?.enabled && (
                <div className="ml-4 space-y-1 border-l-2 border-muted pl-3">
                  <ToggleOption label="My Questions" checked={plan.features?.question_bank?.my_questions} onChange={(v: boolean) => { const f = { ...plan.features }; f.question_bank = { ...f.question_bank, my_questions: v }; updateField('features', f); }} />
                  <ToggleOption label="AI Generate" checked={plan.features?.question_bank?.ai_generate} onChange={(v: boolean) => { const f = { ...plan.features }; f.question_bank = { ...f.question_bank, ai_generate: v }; updateField('features', f); }} />
                  <ToggleOption label="PDF Generate" checked={plan.features?.question_bank?.pdf_generate} onChange={(v: boolean) => { const f = { ...plan.features }; f.question_bank = { ...f.question_bank, pdf_generate: v }; updateField('features', f); }} />
                </div>
              )}
            </div>

            {/* Knowledge Base & Scheduler */}
            <div className="border rounded-lg p-3 space-y-2">
              <ToggleOption label="Knowledge Base" checked={plan.features?.knowledge_base} onChange={(v: boolean) => { const f = { ...plan.features }; f.knowledge_base = v; updateField('features', f); }} />
              <ToggleOption label="Scheduler" checked={plan.features?.scheduler} onChange={(v: boolean) => { const f = { ...plan.features }; f.scheduler = v; updateField('features', f); }} />
            </div>
          </div>
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
};

const ToggleOption = ({ label, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-2 rounded hover:bg-slate-50 transition-colors">
    <span className="text-sm font-medium">{label}</span>
    <Switch checked={checked || false} onCheckedChange={onChange} />
  </div>
);

const SuperAdminSubscriptions = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [newPlan, setNewPlan] = useState<any>({
    name: '',
    display_name: '',
    price: 0,
    billing_period: 'monthly',
    max_telegram_channels: 1,
    max_pdf_storage_gb: 0,
    max_quizzes_per_month: 50,
    max_batch_quiz_generation: 1,
    max_question_bank_size: 500,
    features: {
      create_quiz: { enabled: true, ai_generated: false, manual_input: true, question_bank: true, documents: false },
      create_post: { enabled: true, write_with_ai: false },
      channels: true,
      stories: true,
      question_bank: { enabled: true, my_questions: true, ai_generate: false, pdf_generate: false },
      knowledge_base: false,
      scheduler: false,
    },
    is_active: true,
    is_popular: false,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansData, statsData] = await Promise.all([
        getSubscriptionPlans(),
        getSubscriptionStats()
      ]);
      setPlans(plansData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdatePlan = async () => {
    if (!editingPlan) return;
    
    try {
      setIsUpdating(true);
      const { id, created_at, updated_at, ...updateData } = editingPlan;
      // Remove any undefined values to avoid Supabase errors
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([_, v]) => v !== undefined)
      );
      await updateSubscriptionPlan(id, cleanData);
      
      toast({
        title: "Success",
        description: `Plan "${editingPlan.display_name || editingPlan.name}" updated successfully.`,
      });
      
      setEditingPlan(null);
      fetchData();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not update the plan settings.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.display_name) {
      toast({
        title: "Validation Error",
        description: "Please provide both Internal Name and Display Name.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsUpdating(true);
      await createSubscriptionPlan(newPlan);
      
      toast({
        title: "Success",
        description: `Plan "${newPlan.display_name}" created successfully.`,
      });
      
      setIsCreateDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Could not create the plan.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!window.confirm("Are you sure you want to delete this plan? This action cannot be undone.")) {
      return;
    }
    try {
      await deleteSubscriptionPlan(planId);
      toast({
        title: "Success",
        description: "Plan deleted successfully.",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: "Could not delete the plan.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-32 rounded-3xl" />))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-96 rounded-3xl" />))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              <Shield className="w-12 h-12 text-primary p-2 bg-primary/10 rounded-2xl" />
              Subscriptions
            </h1>
            <p className="text-muted-foreground font-medium">
              Manage pricing tiers, feature accessibility, and monitor platform growth.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="hidden sm:flex text-sm px-4 py-2 rounded-full border-primary/20 bg-primary/5 text-primary font-bold">
              <Activity className="w-4 h-4 mr-2" />
              System Status: Operational
            </Badge>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-12 px-6 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                  <Plus className="w-5 h-5 mr-2" />
                  New Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-8 pb-0">
                  <DialogTitle className="text-2xl font-black">Create Pricing Tiers</DialogTitle>
                  <DialogDescription className="font-medium">Define a new subscription model for your users.</DialogDescription>
                </DialogHeader>
                <div className="p-8 pt-6">
                  <PlanFormContent plan={newPlan} setPlan={setNewPlan} />
                </div>
                <DialogFooter className="p-8 pt-2 bg-slate-50 gap-3">
                  <Button variant="outline" className="rounded-xl font-bold h-11" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20" onClick={handleCreatePlan} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Deploy Plan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatCard 
            title="Revenue" 
            value={`₹${stats?.totalRevenue || 0}`} 
            icon={CreditCard} 
            color="text-blue-600" 
            bg="bg-blue-50" 
            description="Total lifetime revenue"
          />
          <StatCard 
            title="Customers" 
            value={stats?.activeSubscriptions || 0} 
            icon={Users} 
            color="text-emerald-600" 
            bg="bg-emerald-50" 
            description="Active paid subscribers"
          />
          <StatCard 
            title="Conversion" 
            value={`${stats?.totalUsers ? Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) : 0}%`} 
            icon={TrendingUp} 
            color="text-amber-600" 
            bg="bg-amber-50" 
            description="Free to paid conversion"
          />
          <StatCard 
            title="Total Users" 
            value={stats?.totalUsers || 0} 
            icon={BarChart3} 
            color="text-primary" 
            bg="bg-primary/5" 
            description="Total registered audience"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Zap className="w-8 h-8 text-primary" />
              Active Pricing Architectures
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted-foreground mr-2">Quick Filter:</span>
              <Badge variant="outline" className="rounded-full cursor-pointer hover:bg-slate-50">All</Badge>
              <Badge variant="outline" className="rounded-full cursor-pointer hover:bg-slate-50">Active Only</Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden group hover:shadow-2xl transition-all duration-500 border-none rounded-[2.5rem] shadow-lg ring-1 ${
                  plan.is_popular ? 'ring-primary/40' : 'ring-slate-100'
                }`}
              >
                {plan.is_popular && (
                  <div className="absolute top-6 -right-12 rotate-45 bg-gradient-to-r from-primary to-accent py-1.5 px-12 shadow-lg z-10">
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Premium Choice</span>
                  </div>
                )}
                
                <CardHeader className="p-8 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-tighter bg-slate-50 border-slate-200 text-slate-500">
                      ID: {plan.id.split('-')[0]}
                    </Badge>
                    {!plan.is_active && (
                       <Badge variant="destructive" className="rounded-xl font-bold">Draft / Inactive</Badge>
                    )}
                  </div>
                  <CardTitle className="text-3xl font-black text-slate-800 group-hover:text-primary transition-colors">
                    {plan.display_name || plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black tracking-tighter text-slate-900">₹{plan.price}</span>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        {plan.name === 'free' ? '/ 7 days' : plan.billing_period === 'yearly' ? '/ year' : '/ month'}
                      </span>
                    </div>
                    {plan.name === 'free' && (
                      <Badge className="mt-2 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        7-day free trial for new users
                      </Badge>
                    )}
                    {(plan as any).yearly_price > 0 && (
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-lg font-bold text-primary">₹{(plan as any).yearly_price}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">/ year</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                          Save ₹{plan.price * 12 - (plan as any).yearly_price}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-8 pt-4 space-y-6">
                    <div className="space-y-3">
                    <FeatureItem label={`${plan.max_telegram_channels} ${plan.max_telegram_channels === 1 ? 'Telegram Channel' : 'Channels Access'}`} active={true} />
                    <FeatureItem label={plan.max_pdf_storage_gb > 0 ? `${plan.max_pdf_storage_gb}GB Storage` : 'No Storage'} active={true} />
                    <FeatureItem label={plan.max_quizzes_per_month === null || plan.max_quizzes_per_month >= 1000000 ? 'Unlimited Quizzes' : `${plan.max_quizzes_per_month >= 1000 ? `${(plan.max_quizzes_per_month / 1000).toFixed(0)}k` : plan.max_quizzes_per_month} Quizzes`} active={true} />
                    <FeatureItem label={plan.max_question_bank_size >= 1000000 ? 'Unlimited Questions Capacity' : `${plan.max_question_bank_size >= 1000 ? `${(plan.max_question_bank_size / 1000).toFixed(0)}k` : plan.max_question_bank_size} Questions Capacity`} active={true} />
                    <FeatureItem label="Create Post" active={plan.features?.create_post?.enabled} />
                    {plan.features?.create_post?.enabled && (
                      <FeatureItem label="AI Writing Assistant" active={plan.features?.create_post?.write_with_ai} isSubItem />
                    )}
                    <FeatureItem label="Question Bank" active={plan.features?.question_bank?.enabled} />
                    {plan.features?.question_bank?.enabled && (
                      <FeatureItem label="AI Q-Bank Tools" active={plan.features?.question_bank?.ai_generate} isSubItem />
                    )}
                    <FeatureItem label="Telegram Stories" active={plan.features?.stories} />
                    <FeatureItem label="Knowledge Base" active={plan.features?.knowledge_base} />
                    <FeatureItem label="Auto Scheduling" active={plan.features?.scheduler} />
                  </div>

                  <div className="pt-6 flex gap-3">
                    <Dialog 
                      open={editingPlan?.id === plan.id} 
                      onOpenChange={(open) => !open && setEditingPlan(null)}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          className="flex-1 rounded-2xl font-bold h-12 bg-slate-900 hover:bg-slate-800 text-white"
                          onClick={() => setEditingPlan(plan)}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Update
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[550px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-8 pb-0">
                          <DialogTitle className="text-2xl font-black">Configure Architecture</DialogTitle>
                          <DialogDescription className="font-medium text-slate-500">Modifying parameters for {plan.display_name || plan.name}</DialogDescription>
                        </DialogHeader>
                        <div className="p-8 pt-6">
                          <PlanFormContent plan={editingPlan} setPlan={setEditingPlan} />
                        </div>
                        <DialogFooter className="p-8 pt-2 bg-slate-50 gap-3">
                          <Button variant="outline" className="rounded-xl font-bold h-11 px-6" onClick={() => setEditingPlan(null)}>Cancel</Button>
                          <Button className="rounded-xl font-bold h-11 px-8 shadow-lg shadow-primary/20" onClick={handleUpdatePlan} disabled={isUpdating}>
                            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Sync Changes
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      variant="outline"
                      size="icon"
                      className="rounded-2xl h-12 w-12 border-2 hover:bg-destructive/5 hover:border-destructive/20 hover:text-destructive transition-all"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg, description }: any) => (
  <Card className="rounded-[2rem] border-none shadow-sm ring-1 ring-slate-100 bg-white hover:shadow-xl transition-all duration-300">
    <CardContent className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-2xl ${bg} ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
          <span className="text-2xl font-black tracking-tighter text-slate-800">{value}</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-slate-500 leading-tight">{description}</p>
    </CardContent>
  </Card>
);

const FeatureItem = ({ label, active, isSubItem }: any) => (
  <div className={`flex items-center gap-3 text-xs font-bold ${active ? 'text-emerald-600' : 'text-slate-300'} ${isSubItem ? 'ml-6 opacity-80' : ''}`}>
    <div className={`p-1 rounded-full ${active ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <Check className={`w-3 h-3 ${active ? 'text-emerald-600' : 'text-slate-300'}`} />
    </div>
    <span className={active ? '' : 'line-through opacity-50'}>{label}</span>
  </div>
);

export default SuperAdminSubscriptions;
