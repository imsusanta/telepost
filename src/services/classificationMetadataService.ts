import { supabase } from "@/integrations/supabase/client";

export interface ClassificationSubject {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    user_id: string | null; // null = global subject
    created_at: string;
}

export interface ClassificationTopic {
    id: string;
    subject_id: string;
    name: string;
    user_id: string | null; // null = global topic
    created_at: string;
}

export class ClassificationMetadataService {
    /**
     * Get all subjects (user's own + global)
     * RLS policy handles filtering, so no need to filter here
     */
    static async getSubjects(): Promise<ClassificationSubject[]> {
        const { data, error } = await supabase
            .from('classification_subjects' as any)
            .select('*')
            .order('name');

        if (error) throw error;
        return (data as unknown as ClassificationSubject[]) || [];
    }

    /**
     * Create a new subject for the current user
     */
    static async createSubject(name: string, userId: string, color?: string, icon?: string): Promise<ClassificationSubject> {
        const { data, error } = await supabase
            .from('classification_subjects')
            .insert({ name, color, icon, user_id: userId })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error(`Subject "${name}" already exists.`);
            }
            throw error;
        }
        return data as unknown as ClassificationSubject;
    }

    /**
     * Update a subject (user can only update their own)
     */
    static async updateSubject(id: string, updates: Partial<Pick<ClassificationSubject, 'name' | 'color' | 'icon'>>): Promise<ClassificationSubject> {
        const { data, error } = await supabase
            .from('classification_subjects' as any)
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as ClassificationSubject;
    }

    /**
     * Delete a subject (user can only delete their own)
     */
    static async deleteSubject(id: string): Promise<void> {
        const { error } = await supabase
            .from('classification_subjects' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Get all topics (user's own + global)
     * RLS policy handles filtering
     */
    static async getAllTopics(): Promise<ClassificationTopic[]> {
        const { data, error } = await supabase
            .from('classification_topics' as any)
            .select('*')
            .order('name');

        if (error) throw error;
        return (data as unknown as ClassificationTopic[]) || [];
    }

    /**
     * Get topics for a specific subject
     */
    static async getTopics(subjectId: string): Promise<ClassificationTopic[]> {
        const { data, error } = await supabase
            .from('classification_topics' as any)
            .select('*')
            .eq('subject_id', subjectId)
            .order('name');

        if (error) throw error;
        return (data as unknown as ClassificationTopic[]) || [];
    }

    /**
     * Create a new topic for the current user
     */
    static async createTopic(subjectId: string, name: string, userId: string): Promise<ClassificationTopic> {
        const { data, error } = await supabase
            .from('classification_topics')
            .insert({ subject_id: subjectId, name, user_id: userId })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error(`Topic "${name}" already exists for this subject.`);
            }
            throw error;
        }
        return data as unknown as ClassificationTopic;
    }

    /**
     * Update a topic (user can only update their own)
     */
    static async updateTopic(id: string, name: string): Promise<ClassificationTopic> {
        const { data, error } = await supabase
            .from('classification_topics' as any)
            .update({ name })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as unknown as ClassificationTopic;
    }

    /**
     * Delete a topic (user can only delete their own)
     */
    static async deleteTopic(id: string): Promise<void> {
        const { error } = await supabase
            .from('classification_topics' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}

