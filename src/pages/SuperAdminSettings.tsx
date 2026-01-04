import { useState, useEffect } from 'react';
import { 
  AlertTriangle,
  Bot,
  Loader2,
  Save,
  Shield,
  Ticket,
  Users,
  Wrench,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { isSuperAdmin } from '@/services/couponService';
import {
  getAllSettings,
  updateInvitationDefaults,
  updateUserDefaults,
  updateSubscriptionDefaults,
  updateMaintenanceSettings,
  updateAISettings,
  type InvitationDefaults,
  type UserDefaults,
  type SubscriptionDefaults,
  type SystemMaintenance,
  type AISettings,
} from '@/services/systemSettingsService';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdminSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [invitationDefaults, setInvitationDefaults] = useState<InvitationDefaults>({
    default_max_uses: 10,
    default_expiry_days: 30,
    allow_unlimited: true,
    allow_custom_codes: true,
  });

  const [userDefaults, setUserDefaults] = useState<UserDefaults>({
    auto_approve_signups: true,
    default_role: 'user',
    email_verification_required: true,
  });

  const [subscriptionDefaults, setSubscriptionDefaults] = useState<SubscriptionDefaults>({
    trial_days: 7,
    grace_period_days: 3,
    auto_cancel_expired: false,
  });

  const [maintenanceSettings, setMaintenanceSettings] = useState<SystemMaintenance>({
    maintenance_mode: false,
    maintenance_message: 'System is under maintenance. Please try again later.',
  });

  const [aiSettings, setAISettings] = useState<AISettings>({
    provider: 'openrouter',
    model: 'z-ai/glm-4.5-air:free',
    temperature: 0.7,
  });

  const [testingAI, setTestingAI] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const hasAccess = await isSuperAdmin();
      if (!hasAccess) {
        navigate('/dashboard');
        return;
      }

      try {
        const data = await getAllSettings();
        setInvitationDefaults(data.invitation_defaults);
        setUserDefaults(data.user_defaults);
        setSubscriptionDefaults(data.subscription_defaults);
        setMaintenanceSettings(data.system_maintenance);
        setAISettings(data.ai_settings);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [navigate, toast]);

  const handleSaveInvitationDefaults = async () => {
    try {
      setSaving(true);
      await updateInvitationDefaults(invitationDefaults);
      toast({
        title: 'Success',
        description: 'Invitation settings saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserDefaults = async () => {
    try {
      setSaving(true);
      await updateUserDefaults(userDefaults);
      toast({
        title: 'Success',
        description: 'User settings saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSubscriptionDefaults = async () => {
    try {
      setSaving(true);
      await updateSubscriptionDefaults(subscriptionDefaults);
      toast({
        title: 'Success',
        description: 'Subscription settings saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaintenanceSettings = async () => {
    try {
      setSaving(true);
      await updateMaintenanceSettings(maintenanceSettings);
      toast({
        title: 'Success',
        description: maintenanceSettings.maintenance_mode 
          ? 'Maintenance mode enabled' 
          : 'Maintenance settings saved',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAISettings = async () => {
    try {
      setSaving(true);
      await updateAISettings(aiSettings);
      toast({
        title: 'Success',
        description: 'AI settings saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save AI settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAIConnection = async () => {
    try {
      setTestingAI(true);
      
      const { data, error } = await supabase.functions.invoke('test-ai-connection', {
        body: { 
          model: aiSettings.model,
          temperature: aiSettings.temperature
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: 'Connection Successful',
          description: `Model "${aiSettings.model}" is working. Response: ${data.response?.substring(0, 100)}...`,
        });
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to AI',
        variant: 'destructive',
      });
    } finally {
      setTestingAI(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure system-wide defaults and maintenance settings
          </p>
        </div>

        {/* Maintenance Mode Alert */}
        {maintenanceSettings.maintenance_mode && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Maintenance Mode Active</AlertTitle>
            <AlertDescription>
              The system is currently in maintenance mode. Users may not be able to access certain features.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="invitations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="invitations" className="gap-2">
              <Ticket className="w-4 h-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Subscriptions</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Bot className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Maintenance</span>
            </TabsTrigger>
          </TabsList>

          {/* Invitation Defaults */}
          <TabsContent value="invitations">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="w-5 h-5" />
                  Invitation Code Defaults
                </CardTitle>
                <CardDescription>
                  Configure default settings for new invitation codes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="default_max_uses">Default Max Uses</Label>
                    <Input
                      id="default_max_uses"
                      type="number"
                      value={invitationDefaults.default_max_uses}
                      onChange={(e) => setInvitationDefaults(prev => ({
                        ...prev,
                        default_max_uses: parseInt(e.target.value) || 10,
                      }))}
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default number of times a code can be used
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_expiry_days">Default Expiry Days</Label>
                    <Input
                      id="default_expiry_days"
                      type="number"
                      value={invitationDefaults.default_expiry_days}
                      onChange={(e) => setInvitationDefaults(prev => ({
                        ...prev,
                        default_expiry_days: parseInt(e.target.value) || 30,
                      }))}
                      min={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Default number of days until code expires
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Unlimited Uses</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow creating codes with no usage limit
                      </p>
                    </div>
                    <Switch
                      checked={invitationDefaults.allow_unlimited}
                      onCheckedChange={(checked) => setInvitationDefaults(prev => ({
                        ...prev,
                        allow_unlimited: checked,
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Allow Custom Codes</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow admins to create custom invitation codes
                      </p>
                    </div>
                    <Switch
                      checked={invitationDefaults.allow_custom_codes}
                      onCheckedChange={(checked) => setInvitationDefaults(prev => ({
                        ...prev,
                        allow_custom_codes: checked,
                      }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveInvitationDefaults} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Invitation Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Defaults */}
          <TabsContent value="users">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User Defaults
                </CardTitle>
                <CardDescription>
                  Configure default settings for new users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Role</Label>
                  <Select
                    value={userDefaults.default_role}
                    onValueChange={(v) => setUserDefaults(prev => ({
                      ...prev,
                      default_role: v as 'user' | 'admin',
                    }))}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Default role assigned to new users
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Approve Signups</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically approve new user signups
                      </p>
                    </div>
                    <Switch
                      checked={userDefaults.auto_approve_signups}
                      onCheckedChange={(checked) => setUserDefaults(prev => ({
                        ...prev,
                        auto_approve_signups: checked,
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Email Verification Required</Label>
                      <p className="text-xs text-muted-foreground">
                        Require users to verify their email address
                      </p>
                    </div>
                    <Switch
                      checked={userDefaults.email_verification_required}
                      onCheckedChange={(checked) => setUserDefaults(prev => ({
                        ...prev,
                        email_verification_required: checked,
                      }))}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveUserDefaults} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save User Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscription Defaults */}
          <TabsContent value="subscriptions">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Subscription Defaults
                </CardTitle>
                <CardDescription>
                  Configure default settings for subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trial_days">Trial Period (Days)</Label>
                    <Input
                      id="trial_days"
                      type="number"
                      value={subscriptionDefaults.trial_days}
                      onChange={(e) => setSubscriptionDefaults(prev => ({
                        ...prev,
                        trial_days: parseInt(e.target.value) || 7,
                      }))}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Free trial period for new subscriptions
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grace_period_days">Grace Period (Days)</Label>
                    <Input
                      id="grace_period_days"
                      type="number"
                      value={subscriptionDefaults.grace_period_days}
                      onChange={(e) => setSubscriptionDefaults(prev => ({
                        ...prev,
                        grace_period_days: parseInt(e.target.value) || 3,
                      }))}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      Grace period after subscription expires
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Cancel Expired</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically cancel subscriptions after grace period
                    </p>
                  </div>
                  <Switch
                    checked={subscriptionDefaults.auto_cancel_expired}
                    onCheckedChange={(checked) => setSubscriptionDefaults(prev => ({
                      ...prev,
                      auto_cancel_expired: checked,
                    }))}
                  />
                </div>

                <Button onClick={handleSaveSubscriptionDefaults} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Subscription Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Configuration */}
          <TabsContent value="ai">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  AI Configuration
                </CardTitle>
                <CardDescription>
                  Configure OpenRouter AI model for quiz generation and document processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertTitle>OpenRouter Integration</AlertTitle>
                  <AlertDescription>
                    Paste any OpenRouter model slug (e.g., <code className="bg-muted px-1 rounded">z-ai/glm-4.5-air:free</code>) to use it for AI features.
                    Find models at <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/models</a>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="ai_model">Model Name</Label>
                  <Input
                    id="ai_model"
                    value={aiSettings.model}
                    onChange={(e) => setAISettings(prev => ({
                      ...prev,
                      model: e.target.value.trim(),
                    }))}
                    placeholder="e.g., z-ai/glm-4.5-air:free"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full model slug from OpenRouter
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Temperature: {aiSettings.temperature.toFixed(2)}</Label>
                    </div>
                    <Slider
                      value={[aiSettings.temperature]}
                      onValueChange={(value) => setAISettings(prev => ({
                        ...prev,
                        temperature: value[0],
                      }))}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower values = more focused, higher values = more creative
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleTestAIConnection} 
                    disabled={testingAI || !aiSettings.model}
                    variant="outline"
                    className="gap-2"
                  >
                    {testingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Test Connection
                  </Button>
                  <Button 
                    onClick={handleSaveAISettings} 
                    disabled={saving || !aiSettings.model}
                    className="gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save AI Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  System Maintenance
                </CardTitle>
                <CardDescription>
                  Control system maintenance mode and messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                  <div>
                    <Label className="text-amber-600">Maintenance Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable to show maintenance message to all users
                    </p>
                  </div>
                  <Switch
                    checked={maintenanceSettings.maintenance_mode}
                    onCheckedChange={(checked) => setMaintenanceSettings(prev => ({
                      ...prev,
                      maintenance_mode: checked,
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maintenance_message">Maintenance Message</Label>
                  <Textarea
                    id="maintenance_message"
                    value={maintenanceSettings.maintenance_message}
                    onChange={(e) => setMaintenanceSettings(prev => ({
                      ...prev,
                      maintenance_message: e.target.value,
                    }))}
                    rows={3}
                    placeholder="Enter the message to display during maintenance..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Message shown to users when maintenance mode is active
                  </p>
                </div>

                <Button 
                  onClick={handleSaveMaintenanceSettings} 
                  disabled={saving}
                  variant={maintenanceSettings.maintenance_mode ? "destructive" : "default"}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {maintenanceSettings.maintenance_mode ? 'Enable Maintenance Mode' : 'Save Maintenance Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
