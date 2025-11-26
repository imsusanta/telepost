import { supabase } from "@/integrations/supabase/client";

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

export class DocumentService {
  /**
   * Upload a PDF document
   */
  static async uploadDocument(
    userId: string,
    file: File,
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      channelId?: string;
    }
  ): Promise<Document> {
    // Create storage path
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${userId}/${timestamp}_${fileName}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create document record
    const { data, error } = await supabase
      .from("documents")
      .insert({
        user_id: userId,
        channel_id: metadata?.channelId,
        file_name: file.name,
        file_size_bytes: file.size,
        file_type: file.type,
        storage_path: storagePath,
        title: metadata?.title || file.name,
        description: metadata?.description,
        language: metadata?.language || "bn",
        processing_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger processing (in background)
    this.processDocument(data.id).catch((error) => {
      console.error(`Failed to process document ${data.id}:`, error);
      // Error is already handled in processDocument by setting status to 'failed'
    });

    return data as Document;
  }

  /**
   * Process document (extract text, analyze, etc.)
   */
  static async processDocument(documentId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from("documents")
        .update({ processing_status: "processing" })
        .eq("id", documentId);

      // Get document
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (docError) throw docError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(doc.storage_path);

      // Call edge function to process document with timeout
      const timeoutMs = 120000; // 2 minutes timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Document processing timeout - please try again")), timeoutMs);
      });

      const processPromise = supabase.functions.invoke("process-document", {
        body: {
          documentId: documentId,
          storagePath: doc.storage_path,
          publicUrl: urlData.publicUrl,
        },
      });

      const { data, error } = await Promise.race([processPromise, timeoutPromise]) as any;

      if (error) {
        console.error(`Document processing error for ${documentId}:`, error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from document processing");
      }

      // Validate response data
      if (!data.extractedText && !data.aiSummary) {
        console.warn(`Document ${documentId} processed but no content extracted`);
      }

      // Update document with results
      await supabase
        .from("documents")
        .update({
          processing_status: "completed",
          extracted_text: data.extractedText || "Document processed",
          page_count: data.pageCount || 1,
          ai_summary: data.aiSummary || "Document uploaded successfully",
          topics: data.topics || ["General"],
        })
        .eq("id", documentId);

      console.log(`Document ${documentId} processing completed successfully`);
    } catch (error: unknown) {
      console.error(`Document ${documentId} processing failed:`, error);

      // Update status to failed
      await supabase
        .from("documents")
        .update({
          processing_status: "failed",
          processing_error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", documentId);

      throw error;
    }
  }

  /**
   * Get user's documents (optionally filtered by channel)
   */
  static async getUserDocuments(userId: string, channelId?: string): Promise<Document[]> {
    let query = supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId);

    if (channelId) {
      query = query.eq("channel_id", channelId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Get documents for a specific channel
   */
  static async getChannelDocuments(channelId: string, userId: string): Promise<Document[]> {
    return this.getUserDocuments(userId, channelId);
  }

  /**
   * Get document by ID
   */
  static async getDocument(documentId: string): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (error) throw error;
    return data as Document;
  }

  /**
   * Delete document
   */
  static async deleteDocument(documentId: string, userId: string): Promise<void> {
    // Get document
    const doc = await this.getDocument(documentId);

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.storage_path]);

    if (storageError) throw storageError;

    // Delete from database
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("user_id", userId);

    if (error) throw error;

    // Note: Usage tracking update removed as raw SQL not supported in client
  }

  /**
   * Get document download URL
   */
  static async getDocumentUrl(storagePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 3600); // 1 hour expiry

    if (!data) throw new Error("Could not generate download URL");

    return data.signedUrl;
  }

  /**
   * Search documents (optionally filtered by channel)
   */
  static async searchDocuments(
    userId: string,
    query: string,
    channelId?: string
  ): Promise<Document[]> {
    let dbQuery = supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId);

    if (channelId) {
      dbQuery = dbQuery.eq("channel_id", channelId);
    }

    const { data, error } = await dbQuery
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,extracted_text.ilike.%${query}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as Document[];
  }

  /**
   * Get all documents in a channel's knowledge base for quiz generation
   */
  static async getChannelKnowledgeBase(channelId: string, userId: string): Promise<string> {
    const documents = await this.getChannelDocuments(channelId, userId);

    // Filter only completed documents with extracted text
    const processedDocs = documents.filter(
      doc => doc.processing_status === 'completed' && doc.extracted_text
    );

    if (processedDocs.length === 0) {
      return '';
    }

    // Combine all extracted text with document titles
    const knowledgeBase = processedDocs
      .map(doc => `Document: ${doc.title}\n${doc.extracted_text}`)
      .join('\n\n---\n\n');

    // Limit to reasonable size (e.g., 10000 characters)
    return knowledgeBase.substring(0, 10000);
  }
}
