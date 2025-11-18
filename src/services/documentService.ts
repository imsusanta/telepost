import { supabase } from "@/integrations/supabase/client";
import { SubscriptionService } from "./subscriptionService";

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_size_bytes: number;
  file_type: string;
  storage_path: string;
  title?: string;
  description?: string;
  language: string;
  extracted_text?: string;
  page_count?: number;
  processing_status: "pending" | "processing" | "completed" | "failed";
  processing_error?: string;
  ai_summary?: string;
  topics?: any;
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
    }
  ): Promise<Document> {
    // Check if user can upload PDFs
    const canUpload = await SubscriptionService.canUserPerformAction(userId, "upload_pdf");

    if (!canUpload.allowed) {
      throw new Error(canUpload.reason || "Cannot upload PDF");
    }

    // Create storage path
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${userId}/${timestamp}_${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
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

    // Track usage
    await SubscriptionService.trackPdfUpload(userId, file.size);

    // Trigger processing (in background)
    this.processDocument(data.id).catch(console.error);

    return data;
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

      // Call edge function to process document
      const { data, error } = await supabase.functions.invoke("process-document", {
        body: {
          documentId: documentId,
          storagePath: doc.storage_path,
          publicUrl: urlData.publicUrl,
        },
      });

      if (error) throw error;

      // Update document with results
      await supabase
        .from("documents")
        .update({
          processing_status: "completed",
          extracted_text: data.extractedText,
          page_count: data.pageCount,
          ai_summary: data.aiSummary,
          topics: data.topics,
        })
        .eq("id", documentId);
    } catch (error: any) {
      // Update status to failed
      await supabase
        .from("documents")
        .update({
          processing_status: "failed",
          processing_error: error.message,
        })
        .eq("id", documentId);

      throw error;
    }
  }

  /**
   * Get user's documents
   */
  static async getUserDocuments(userId: string): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
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
    return data;
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

    // Update usage tracking
    await supabase
      .from("usage_tracking")
      .update({
        total_storage_used_bytes: supabase.raw(
          `total_storage_used_bytes - ${doc.file_size_bytes}`
        ),
      })
      .eq("user_id", userId);
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
   * Search documents
   */
  static async searchDocuments(
    userId: string,
    query: string
  ): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,extracted_text.ilike.%${query}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
