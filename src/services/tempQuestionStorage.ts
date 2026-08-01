/**
 * Service for managing temporarily stored AI-generated questions
 * before they are saved to the question bank
 */

export interface TempQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
  topic: string;
  difficulty?: string;
  language: string;
  generated_at: string;
  source_type: 'ai_generator' | 'pdf_generator';
}

const STORAGE_KEY = 'temp_ai_questions';

export class TempQuestionStorageService {
  /**
   * Get all temporarily stored questions
   */
  static getAll(): TempQuestion[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error reading temp questions:', error);
      return [];
    }
  }

  /**
   * Add new questions to temporary storage
   */
  static addQuestions(
    questions: Array<{
      question: string;
      options: string[];
      correct_option_index: number;
      explanation?: string;
    }>,
    metadata: {
      topic: string;
      difficulty?: string;
      language: string;
      source_type: 'ai_generator' | 'pdf_generator';
    }
  ): void {
    try {
      const existing = this.getAll();
      const newQuestions: TempQuestion[] = questions.map((q) => ({
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...q,
        ...metadata,
        generated_at: new Date().toISOString(),
      }));

      const updated = [...newQuestions, ...existing]; // Add new questions at the beginning
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error storing temp questions:', error);
      throw new Error('Failed to store questions temporarily');
    }
  }

  /**
   * Remove a single question by ID
   */
  static removeQuestion(id: string): void {
    try {
      const existing = this.getAll();
      const filtered = existing.filter((q) => q.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing temp question:', error);
      throw new Error('Failed to remove question');
    }
  }

  /**
   * Remove multiple questions by IDs
   */
  static removeQuestions(ids: string[]): void {
    try {
      const existing = this.getAll();
      const filtered = existing.filter((q) => !ids.includes(q.id));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing temp questions:', error);
      throw new Error('Failed to remove questions');
    }
  }

  /**
   * Clear all temporarily stored questions
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing temp questions:', error);
      throw new Error('Failed to clear questions');
    }
  }

  /**
   * Get questions filtered by criteria
   */
  static getFiltered(filters: {
    topic?: string;
    difficulty?: string;
    language?: string;
    source_type?: 'ai_generator' | 'pdf_generator';
  }): TempQuestion[] {
    const all = this.getAll();
    return all.filter((q) => {
      if (filters.topic && q.topic !== filters.topic) return false;
      if (filters.language && q.language !== filters.language) return false;
      if (filters.source_type && q.source_type !== filters.source_type) return false;
      return true;
    });
  }

  /**
   * Get count of temporarily stored questions
   */
  static getCount(): number {
    return this.getAll().length;
  }
}
