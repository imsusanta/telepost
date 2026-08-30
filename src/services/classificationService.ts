import { supabase } from "@/integrations/supabase/client";
import { ClassificationMetadataService, ClassificationSubject } from "./classificationMetadataService";

// Predefined subjects with their display colors (kept as fallback/initial state)
export const PREDEFINED_SUBJECTS = [
    { id: 'science', name: 'Science', color: '#2563eb', icon: '🔬' },
    { id: 'mathematics', name: 'Mathematics', color: '#ea580c', icon: '🔢' },
    { id: 'social_studies', name: 'Social Studies', color: '#9333ea', icon: '🌍' },
    { id: 'english', name: 'English', color: '#0d9488', icon: '📚' },
    { id: 'computer_science', name: 'Computer Science', color: '#7c3aed', icon: '💻' },
] as const;

export type SubjectId = typeof PREDEFINED_SUBJECTS[number]['id'];

// Cache for dynamic subjects to avoid too many DB calls
let cachedSubjects: ClassificationSubject[] = [];

/**
 * Initialize or refresh the subjects cache
 */
export async function refreshSubjectsCache() {
    try {
        cachedSubjects = await ClassificationMetadataService.getSubjects();
    } catch (error) {
        console.error("Failed to refresh subjects cache:", error);
    }
}

// Legacy difficulty fallback helper (kept for backward compatibility with old code calls)
export const DIFFICULTY_LEVELS = [
    { id: 'medium', name: 'Government Exam Standard', color: '#3b82f6', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600' },
] as const;

export type DifficultyLevel = string;

// Classification result interface
export interface ClassificationResult {
    subject: string;
    topic: string;
    difficulty?: string;
    confidence: number; // 0-100
    suggestedTags?: string[];
}

// Classification request interface
export interface ClassificationRequest {
    question: string;
    options: string[];
    explanation?: string;
}

export function getSubjectById(idOrName?: string | null) {
    if (!idOrName || typeof idOrName !== 'string') return undefined;
    const target = idOrName.toLowerCase().trim();
    // Try cache first
    const dynamicSubject = cachedSubjects.find(
        s => s && (s.id === idOrName || (s.name && s.name.toLowerCase().trim() === target))
    );
    if (dynamicSubject) return dynamicSubject;

    // Fallback to predefined
    return PREDEFINED_SUBJECTS.find(
        s => s && (s.id === idOrName || (s.name && s.name.toLowerCase().trim() === target))
    );
}

// Get subject color
export function getSubjectColor(subjectName: string): string {
    const subject = getSubjectById(subjectName);
    return subject?.color || '#6b7280'; // Default gray
}

// Get subject icon
export function getSubjectIcon(subjectName: string): string {
    const subject = getSubjectById(subjectName);
    return subject?.icon || '📋';
}

// Get difficulty config (legacy)
export function getDifficultyConfig(_difficulty?: string) {
    return DIFFICULTY_LEVELS[0];
}

/**
 * Classification Service
 * Handles AI-powered classification of questions
 */
export class ClassificationService {
    /**
     * Classify a single question using AI
     */
    static async classifyQuestion(_request: ClassificationRequest): Promise<ClassificationResult> {
        // Edge function removed - returning fallback immediately
        return {
            subject: 'General Knowledge',
            topic: 'General',
            difficulty: 'medium',
            confidence: 0
        };
    }

    /**
     * Classify multiple questions in batch
     */
    static async classifyQuestionsBulk(
        requests: ClassificationRequest[],
        onProgress?: (completed: number, total: number) => void
    ): Promise<ClassificationResult[]> {
        // Edge function removed - returning fallbacks immediately
        const results = requests.map(() => ({
            subject: 'General Knowledge',
            topic: 'General',
            difficulty: 'medium' as const,
            confidence: 0
        }));

        if (onProgress) {
            onProgress(requests.length, requests.length);
        }

        return results;
    }

    /**
     * Get unique subjects from user's question bank with counts (includes public questions)
     */
    static async getSubjectsWithCounts(userId: string): Promise<Array<{ subject: string; count: number }>> {
        try {
            const { data, error } = await supabase
                .from('question_banks')
                .select('subject')
                .or(`user_id.eq.${userId},is_public.eq.true`)
                .not('subject', 'is', null)
                .neq('subject', '');

            if (error) throw error;

            // Count subjects
            const counts: Record<string, number> = {};
            data?.forEach(item => {
                if (item.subject && item.subject.trim()) {
                    counts[item.subject] = (counts[item.subject] || 0) + 1;
                }
            });

            return Object.entries(counts)
                .map(([subject, count]) => ({ subject, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('Error fetching subjects:', error);
            return [];
        }
    }

    /**
     * Get topics for a specific subject with counts
     */
    static async getTopicsForSubject(
        userId: string,
        subject: string
    ): Promise<Array<{ topic: string; count: number }>> {
        try {
            const { data, error } = await supabase
                .from('question_banks')
                .select('topic')
                .eq('user_id', userId)
                .eq('subject', subject);

            if (error) throw error;

            // Count topics
            const counts: Record<string, number> = {};
            data?.forEach(item => {
                if (item.topic) {
                    counts[item.topic] = (counts[item.topic] || 0) + 1;
                }
            });

            return Object.entries(counts)
                .map(([topic, count]) => ({ topic, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('Error fetching topics:', error);
            return [];
        }
    }

    /**
     * Get all unique topics from user's question bank
     */
    static async getAllTopics(userId: string): Promise<string[]> {
        try {
            const { data, error } = await supabase
                .from('question_banks')
                .select('topic')
                .eq('user_id', userId);

            if (error) throw error;

            const topics = new Set<string>();
            data?.forEach(item => {
                if (item.topic) {
                    topics.add(item.topic);
                }
            });

            return Array.from(topics).sort();
        } catch (error) {
            console.error('Error fetching topics:', error);
            return [];
        }
    }

    /**
     * Get all unique topics from user's question bank with counts (includes public questions)
     */
    static async getTopicsWithCounts(userId: string): Promise<Array<{ topic: string; count: number }>> {
        try {
            // Query user's own questions + public questions (matching what Question Bank displays)
            const { data, error } = await supabase
                .from('question_banks')
                .select('topic')
                .or(`user_id.eq.${userId},is_public.eq.true`)
                .not('topic', 'is', null)
                .neq('topic', '');

            if (error) throw error;

            const counts: Record<string, number> = {};
            data?.forEach(item => {
                if (item.topic && item.topic.trim()) {
                    counts[item.topic] = (counts[item.topic] || 0) + 1;
                }
            });

            return Object.entries(counts)
                .map(([topic, count]) => ({ topic, count }))
                .sort((a, b) => b.count - a.count);
        } catch (error) {
            console.error('Error fetching topics with counts:', error);
            return [];
        }
    }

    /**
     * Update classification for a question
     */
    static async updateQuestionClassification(
        questionId: string,
        userId: string,
        classification: {
            subject?: string;
            topic?: string;
            difficulty?: string;
            classification_confidence?: number;
            classification_source?: 'auto' | 'manual';
        }
    ): Promise<void> {
        const { error } = await supabase
            .from('question_banks')
            .update({
                ...classification,
                updated_at: new Date().toISOString()
            })
            .eq('id', questionId)
            .eq('user_id', userId);

        if (error) throw error;
    }

    /**
     * Bulk update classifications for multiple questions
     */
    static async bulkUpdateClassifications(
        userId: string,
        updates: Array<{
            id: string;
            subject: string;
            topic: string;
            difficulty: string;
            classification_confidence: number;
            classification_source: 'auto' | 'manual';
        }>
    ): Promise<void> {
        // Update each question individually (Supabase doesn't support bulk updates with different values)
        const promises = updates.map(update =>
            supabase
                .from('question_banks')
                .update({
                    subject: update.subject,
                    topic: update.topic,
                    difficulty: update.difficulty,
                    classification_confidence: update.classification_confidence,
                    classification_source: update.classification_source,
                    updated_at: new Date().toISOString()
                })
                .eq('id', update.id)
                .eq('user_id', userId)
        );

        const results = await Promise.all(promises);
        const errors = results.filter(r => r.error);

        if (errors.length > 0) {
            console.error('Some updates failed:', errors);
            throw new Error(`${errors.length} updates failed`);
        }
    }
}
