import { supabase } from "@/integrations/supabase/client";

export interface UserTemplate {
    id: string;
    user_id: string | null;
    name: string;
    subject: string;
    description: string | null;
    prompt: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateTemplateRequest {
    name: string;
    subject: string;
    description?: string;
    prompt: string;
}

export interface UpdateTemplateRequest {
    name?: string;
    subject?: string;
    description?: string;
    prompt?: string;
}

export class TemplateService {
    /**
     * Get all templates for a user (own + defaults)
     */
    static async getTemplates(userId: string): Promise<UserTemplate[]> {
        const { data, error } = await (supabase as any)
            .from("user_templates")
            .select("*")
            .or(`user_id.eq.${userId},is_default.eq.true`)
            .order("is_default", { ascending: false })
            .order("name", { ascending: true });

        if (error) throw error;
        return data || [];
    }

    /**
     * Get a single template by ID
     */
    static async getTemplate(templateId: string): Promise<UserTemplate | null> {
        const { data, error } = await (supabase as any)
            .from("user_templates")
            .select("*")
            .eq("id", templateId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    /**
     * Create a new custom template
     */
    static async createTemplate(
        userId: string,
        template: CreateTemplateRequest
    ): Promise<UserTemplate> {
        const { data, error } = await (supabase as any)
            .from("user_templates")
            .insert({
                user_id: userId,
                name: template.name,
                subject: template.subject,
                description: template.description || null,
                prompt: template.prompt,
                is_default: false,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update a custom template
     */
    static async updateTemplate(
        templateId: string,
        updates: UpdateTemplateRequest
    ): Promise<UserTemplate> {
        const { data, error } = await (supabase as any)
            .from("user_templates")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", templateId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Delete a custom template
     */
    static async deleteTemplate(templateId: string): Promise<void> {
        const { error } = await (supabase as any)
            .from("user_templates")
            .delete()
            .eq("id", templateId);

        if (error) throw error;
    }

    /**
     * Check if a template name already exists for the user
     */
    static async isTemplateNameTaken(
        userId: string,
        name: string,
        excludeId?: string
    ): Promise<boolean> {
        let query = (supabase as any)
            .from("user_templates")
            .select("id")
            .eq("user_id", userId)
            .eq("name", name);

        if (excludeId) {
            query = query.neq("id", excludeId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) throw error;
        return !!data;
    }

    /**
     * Convert UserTemplate to the format used by systemPromptTemplates
     */
    static toSystemPromptFormat(template: UserTemplate) {
        return {
            id: template.id,
            name: template.name,
            subject: template.subject,
            description: template.description || "",
            prompt: template.prompt,
            isCustom: !template.is_default,
            userId: template.user_id,
        };
    }
}
