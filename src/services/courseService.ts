import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface Course {
  id: string;
  created_by: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  category: string;
  difficulty_level: string;
  duration_hours: number;
  price: number;
  currency: string;
  is_published: boolean;
  is_featured: boolean;
  enrollment_limit: number | null;
  start_date: string | null;
  end_date: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_free: boolean;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  content_type: string;
  video_url: string | null;
  video_duration_seconds: number | null;
  content_html: string | null;
  order_index: number;
  is_free: boolean;
  is_downloadable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  course_id: string;
  created_by: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  timing: string | null;
  capacity: number;
  current_strength: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  batch_id: string | null;
  enrolled_by: string | null;
  enrollment_date: string;
  status: string;
  payment_status: string;
  amount_paid: number;
  discount_amount: number;
  coupon_code: string | null;
  progress_percentage: number;
  completed_lessons: string[];
  last_accessed_at: string | null;
  completion_date: string | null;
  certificate_issued: boolean;
  certificate_url: string | null;
  roll_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
}

export class CourseService {
  // ==================== COURSES ====================
  
  static async getCourses(options?: { 
    publishedOnly?: boolean;
    category?: string;
    limit?: number;
  }): Promise<Course[]> {
    let query = supabase.from('courses').select('*');
    
    if (options?.publishedOnly) {
      query = query.eq('is_published', true);
    }
    if (options?.category) {
      query = query.eq('category', options.category);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return (data || []) as Course[];
  }

  static async getMyCourses(): Promise<Course[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Course[];
  }

  static async getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Course | null;
  }

  static async getCourseBySlug(slug: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Course | null;
  }

  static async createCourse(course: { title: string; description?: string; category?: string; difficulty_level?: string; price?: number; duration_hours?: number }): Promise<Course> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const slug = generateSlug(course.title || 'untitled');

    const { data, error } = await supabase
      .from('courses')
      .insert([{
        title: course.title,
        description: course.description || null,
        category: course.category || 'general',
        difficulty_level: course.difficulty_level || 'beginner',
        price: course.price || 0,
        duration_hours: course.duration_hours || 0,
        created_by: user.id,
        slug,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Course;
  }

  static async updateCourse(id: string, updates: { title?: string; description?: string | null; category?: string; difficulty_level?: string; price?: number; duration_hours?: number; is_published?: boolean }): Promise<Course> {
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Course;
  }

  static async deleteCourse(id: string): Promise<void> {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  static async publishCourse(id: string, publish: boolean = true): Promise<Course> {
    return this.updateCourse(id, { is_published: publish });
  }

  // ==================== CHAPTERS ====================

  static async getChapters(courseId: string): Promise<Chapter[]> {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as Chapter[];
  }

  static async getChaptersWithLessons(courseId: string): Promise<Chapter[]> {
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (chaptersError) throw new Error(chaptersError.message);

    const chaptersWithLessons = await Promise.all(
      (chapters || []).map(async (chapter) => {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('*')
          .eq('chapter_id', chapter.id)
          .order('order_index', { ascending: true });
        
        return { ...chapter, lessons: lessons || [] } as Chapter;
      })
    );

    return chaptersWithLessons;
  }

  static async createChapter(chapter: { course_id: string; title: string; description?: string; is_free?: boolean; order_index?: number }): Promise<Chapter> {
    const { data, error } = await supabase
      .from('chapters')
      .insert([{ ...chapter, title: chapter.title, course_id: chapter.course_id }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Chapter;
  }

  static async updateChapter(id: string, updates: Partial<Chapter>): Promise<Chapter> {
    const { data, error } = await (supabase as any)
      .from('chapters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Chapter;
  }

  static async deleteChapter(id: string): Promise<void> {
    const { error } = await supabase.from('chapters').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  static async reorderChapters(chapterIds: string[]): Promise<void> {
    for (let i = 0; i < chapterIds.length; i++) {
      await supabase.from('chapters').update({ order_index: i }).eq('id', chapterIds[i]);
    }
  }

  // ==================== LESSONS ====================

  static async getLessons(chapterId: string): Promise<Lesson[]> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as Lesson[];
  }

  static async getLessonById(id: string): Promise<Lesson | null> {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Lesson | null;
  }

  static async createLesson(lesson: { chapter_id: string; title: string; description?: string; content_type?: string; video_url?: string; is_free?: boolean; order_index?: number }): Promise<Lesson> {
    const { data, error } = await supabase
      .from('lessons')
      .insert([{ ...lesson, chapter_id: lesson.chapter_id, title: lesson.title }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Lesson;
  }

  static async updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson> {
    const { data, error } = await supabase
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Lesson;
  }

  static async deleteLesson(id: string): Promise<void> {
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ==================== BATCHES ====================

  static async getBatches(courseId?: string): Promise<Batch[]> {
    let query = supabase.from('batches').select('*');
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query.order('start_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Batch[];
  }

  static async getMyBatches(): Promise<Batch[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('created_by', user.id)
      .order('start_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Batch[];
  }

  static async createBatch(batch: { course_id?: string; name: string; description?: string; start_date: string; end_date?: string; timing?: string; capacity?: number }): Promise<Batch> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('batches')
      .insert([{ ...batch, name: batch.name, start_date: batch.start_date, created_by: user.id }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Batch;
  }

  static async updateBatch(id: string, updates: Partial<Batch>): Promise<Batch> {
    const { data, error } = await supabase
      .from('batches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Batch;
  }

  static async deleteBatch(id: string): Promise<void> {
    const { error } = await supabase.from('batches').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ==================== ENROLLMENTS ====================

  static async getMyEnrollments(): Promise<Enrollment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('enrollments')
      .select('*, courses(*)')
      .eq('student_id', user.id)
      .order('enrollment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(e => ({
      ...e,
      course: e.courses as Course,
    })) as unknown as Enrollment[];
  }

  static async getCourseEnrollments(courseId: string): Promise<Enrollment[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('course_id', courseId)
      .order('enrollment_date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []) as Enrollment[];
  }

  static async enrollStudent(enrollment: { student_id: string; course_id: string; batch_id?: string; amount_paid?: number }): Promise<Enrollment> {
    const { data, error } = await supabase
      .from('enrollments')
      .insert([{ student_id: enrollment.student_id, course_id: enrollment.course_id, batch_id: enrollment.batch_id, amount_paid: enrollment.amount_paid }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Enrollment;
  }

  static async updateEnrollment(id: string, updates: Partial<Enrollment>): Promise<Enrollment> {
    const { data, error } = await (supabase as any)
      .from('enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Enrollment;
  }

  // ==================== STATISTICS ====================

  static async getCourseStats(courseId: string): Promise<{
    totalEnrollments: number;
    activeEnrollments: number;
    completedEnrollments: number;
    totalRevenue: number;
  }> {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('status, amount_paid')
      .eq('course_id', courseId);

    if (error) throw new Error(error.message);

    const stats = {
      totalEnrollments: enrollments?.length || 0,
      activeEnrollments: enrollments?.filter(e => e.status === 'active').length || 0,
      completedEnrollments: enrollments?.filter(e => e.status === 'completed').length || 0,
      totalRevenue: enrollments?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0,
    };

    return stats;
  }

  static async getTeacherStats(): Promise<{
    totalCourses: number;
    publishedCourses: number;
    totalStudents: number;
    totalRevenue: number;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: courses } = await supabase
      .from('courses')
      .select('id, is_published')
      .eq('created_by', user.id);

    const courseIds = courses?.map(c => c.id) || [];

    let totalStudents = 0;
    let totalRevenue = 0;

    if (courseIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('amount_paid')
        .in('course_id', courseIds);

      totalStudents = enrollments?.length || 0;
      totalRevenue = enrollments?.reduce((sum, e) => sum + (e.amount_paid || 0), 0) || 0;
    }

    return {
      totalCourses: courses?.length || 0,
      publishedCourses: courses?.filter(c => c.is_published).length || 0,
      totalStudents,
      totalRevenue,
    };
  }
}
