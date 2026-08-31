import { supabase } from "@/integrations/supabase/client";

/** @deprecated PDF/document knowledge-base service. Topic-based KnowledgeBase replaces this workflow. */
export interface Document {
  id: string;
  user_id: string;
  channel_id?: string | null;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  storage_path: string;
  title?: string | null;
  description?: string | null;
  language: string | null;
  extracted_text?: string | null;
  page_count?: number | null;
  processing_status: "pending" | "processing" | "completed" | "failed";
  processing_error?: string | null;
  ai_summary?: string | null;
  topics?: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Legacy compatibility only. New code should use KnowledgeBaseTopicService.
 * PDF uploads are intentionally disabled.
 */
export class DocumentService {
  static async uploadDocument(): Promise<never> {
    throw new Error("PDF knowledge-base uploads have been removed. Add a topic in Knowledge Base instead.");
  }

  static async processDocument(): Promise<never> {
    throw new Error("PDF document processing has been removed. Use topic-based Knowledge Base.");
  }

  static async getUserDocuments(): Promise<Document[]> { return []; }
  static async getChannelDocuments(): Promise<Document[]> { return []; }
  static async searchDocuments(): Promise<Document[]> { return []; }

  static async getDocument(_documentId: string): Promise<never> {
    throw new Error("PDF documents are no longer supported.");
  }

  static async deleteDocument(_documentId: string, _userId: string): Promise<void> {
    throw new Error("PDF documents are no longer supported. Existing legacy records should be managed through migration/admin tooling.");
  }

  static async getDocumentUrl(_storagePath: string): Promise<never> {
    throw new Error("PDF documents are no longer supported.");
  }

  static async getChannelKnowledgeBase(): Promise<string> {
    return "";
  }
}
