import { supabase } from "@/integrations/supabase/client";

export interface ClassificationSubject {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    created_at: string;
}

export interface ClassificationTopic {
    id: string;
    subject_id: string;
    name: string;
    created_at: string;
}

export class ClassificationMetadataService {
    /**
     * Get all subjects
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
     * Create a new subject
     */
    static async createSubject(name: string, color?: string, icon?: string): Promise<ClassificationSubject> {
        const { data, error } = await supabase
            .from('classification_subjects' as any)
            .insert({ name, color, icon })
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
     * Update a subject
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
     * Delete a subject
     */
    static async deleteSubject(id: string): Promise<void> {
        const { error } = await supabase
            .from('classification_subjects' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Get all topics for all subjects
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
     * Create a new topic
     */
    static async createTopic(subjectId: string, name: string): Promise<ClassificationTopic> {
        const { data, error } = await supabase
            .from('classification_topics' as any)
            .insert({ subject_id: subjectId, name })
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
     * Update a topic
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
     * Delete a topic
     */
    static async deleteTopic(id: string): Promise<void> {
        const { error } = await supabase
            .from('classification_topics' as any)
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
