import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Settings } from "lucide-react";
import { TemplateService, type UserTemplate, type CreateTemplateRequest } from "@/services/templateService";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { systemPromptTemplates } from "@/utils/systemPromptTemplates";

interface TemplateManagementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTemplateSelect?: (templateId: string) => void;
}

export function TemplateManagementDialog({
    open,
    onOpenChange,
    onTemplateSelect,
}: TemplateManagementDialogProps) {
    const [templates, setTemplates] = useState<UserTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<UserTemplate | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateTemplateRequest>({
        name: "",
        subject: "",
        description: "",
        prompt: "",
    });

    // Load templates and admin status when dialog opens
    useEffect(() => {
        if (open) {
            loadTemplates();
            checkAdminStatus();
        }
    }, [open]);

    const checkAdminStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await (supabase as any)
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            setIsSuperAdmin(profile?.role === 'super_admin');
        } catch (error) {
            console.error("Error checking admin status:", error);
        }
    };

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let data = await TemplateService.getTemplates(user.id);

            // If no templates in database, use hardcoded templates as fallback
            if (data.length === 0) {
                data = systemPromptTemplates.map(t => ({
                    id: t.id,
                    user_id: null,
                    name: t.name,
                    subject: t.subject,
                    description: t.description,
                    prompt: t.prompt,
                    is_default: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }));
            }
            setTemplates(data);
        } catch (error) {
            console.error("Error loading templates:", error);
            // Use hardcoded templates as fallback on error
            const fallback = systemPromptTemplates.map(t => ({
                id: t.id,
                user_id: null,
                name: t.name,
                subject: t.subject,
                description: t.description,
                prompt: t.prompt,
                is_default: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }));
            setTemplates(fallback);
        } finally {
            setIsLoading(false);
        }
    };

    const openEditor = (template?: UserTemplate) => {
        if (template) {
            setEditingTemplate(template);
            setFormData({
                name: template.name,
                subject: template.subject,
                description: template.description || "",
                prompt: template.prompt,
            });
        } else {
            setEditingTemplate(null);
            setFormData({
                name: "",
                subject: "",
                description: "",
                prompt: `You are a quiz generator for [YOUR SUBJECT].

GUIDELINES:
- Create questions that accurately test knowledge of the subject
- Ensure all information is correct and relevant
- Include a variety of question types
- Make explanations helpful and educational
- Follow Government Competitive Exam Standard MCQs

QUESTION TYPES:
- [Define your question types]

IMPORTANT:
- [Add your specific requirements]`,
            });
        }
        setIsEditorOpen(true);
    };

    const closeEditor = () => {
        setIsEditorOpen(false);
        setEditingTemplate(null);
        setFormData({ name: "", subject: "", description: "", prompt: "" });
    };

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.subject.trim() || !formData.prompt.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Check if name is taken (excluding current template if updating a custom one)
            const isNameTaken = await TemplateService.isTemplateNameTaken(
                user.id,
                formData.name,
                editingTemplate && !editingTemplate.is_default ? editingTemplate.id : undefined
            );

            if (isNameTaken) {
                toast.error("A template with this name already exists");
                setIsSaving(false);
                return;
            }

            if (editingTemplate && !editingTemplate.is_default) {
                // Update existing custom template
                await TemplateService.updateTemplate(editingTemplate.id, formData);
                toast.success("Template updated successfully");
            } else {
                // Create new template (either brand new or "editing" a default)
                await TemplateService.createTemplate(user.id, formData);
                toast.success(editingTemplate?.is_default ? "Template saved as a new custom template" : "Template created successfully");
            }

            closeEditor();
            loadTemplates();
        } catch (error: any) {
            console.error("Error saving template:", error);
            const message = error.message || "Failed to save template";
            toast.error(`Failed to save template: ${message}`);

            if (message.includes("relation \"user_templates\" does not exist") ||
                message.includes("Could not find the table") ||
                error.code === 'PGRST205') {
                toast.error("Database table missing. Please run the migration script in Supabase SQL Editor.", {
                    duration: 10000,
                });
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;

        if (templateToDelete.is_default && !isSuperAdmin) {
            toast.error("You cannot delete default templates.");
            setDeleteConfirmOpen(false);
            return;
        }

        try {
            await TemplateService.deleteTemplate(templateToDelete.id);
            toast.success("Template deleted successfully");
            setDeleteConfirmOpen(false);
            setTemplateToDelete(null);
            loadTemplates();
        } catch (error: any) {
            console.error("Error deleting template:", error);
            const message = error.message || "Failed to delete template";
            toast.error(`Failed to delete template: ${message}`);
        }
    };

    const confirmDelete = (template: UserTemplate) => {
        setTemplateToDelete(template);
        setDeleteConfirmOpen(true);
    };

    const handleUseTemplate = (template: UserTemplate) => {
        if (onTemplateSelect) {
            onTemplateSelect(template.id);
        }
        onOpenChange(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Manage Templates
                        </DialogTitle>
                        <DialogDescription>
                            Create and manage your quiz templates. All templates can be edited or deleted.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-end mb-4">
                        <Button onClick={() => openEditor()} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            New Template
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-3">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{template.name}</span>
                                                {template.is_default ? (
                                                    <Badge variant="secondary" className="text-xs">Default</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">Custom</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {template.description || template.subject}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUseTemplate(template)}
                                            >
                                                Use
                                            </Button>
                                            {(isSuperAdmin || !template.is_default) && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditor(template)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() => confirmDelete(template)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {!isSuperAdmin && template.is_default && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditor(template)}
                                                    title="Save as custom template"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {templates.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        No templates found. Create your first custom template!
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>

            {/* Template Editor Dialog */}
            <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? "Edit Template" : "Create New Template"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate
                                ? "Update your custom template settings"
                                : "Create a new quiz template with custom guidelines"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Template Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Indian History"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject *</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g., History"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                placeholder="Brief description of this template"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="prompt">System Prompt *</Label>
                            <Textarea
                                id="prompt"
                                placeholder="Enter the AI system prompt for this template..."
                                value={formData.prompt}
                                onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                                className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                This prompt guides the AI when generating quiz questions for this template.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditor} disabled={isSaving}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingTemplate ? "Update Template" : "Create Template"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
