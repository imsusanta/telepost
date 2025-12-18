import { supabase } from "@/integrations/supabase/client";

export interface AttendanceSession {
  id: string;
  batch_id: string;
  course_id: string | null;
  session_date: string;
  session_type: 'regular' | 'extra' | 'makeup' | 'exam';
  start_time: string | null;
  end_time: string | null;
  created_by: string;
  qr_code: string | null;
  qr_expires_at: string | null;
  notes: string | null;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  batch?: { name: string };
  course?: { title: string };
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'half_day';
  check_in_time: string | null;
  check_out_time: string | null;
  check_in_method: 'manual' | 'qr_code' | 'biometric' | 'auto';
  late_minutes: number;
  reason: string | null;
  marked_by: string;
  student?: { full_name: string; email: string };
}

export interface LeaveRequest {
  id: string;
  student_id: string;
  batch_id: string | null;
  leave_type: 'sick' | 'personal' | 'family' | 'emergency' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  supporting_doc_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  student?: { full_name: string; email: string };
  batch?: { name: string };
}

// Sessions
export const getAttendanceSessions = async (batchId?: string, date?: string): Promise<AttendanceSession[]> => {
  let query = supabase
    .from('attendance_sessions')
    .select(`
      *,
      batch:batches(name),
      course:courses(title)
    `)
    .order('session_date', { ascending: false });

  if (batchId) query = query.eq('batch_id', batchId);
  if (date) query = query.eq('session_date', date);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as AttendanceSession[];
};

export const createAttendanceSession = async (session: {
  batch_id: string;
  course_id?: string;
  session_date: string;
  session_type?: 'regular' | 'extra' | 'makeup' | 'exam';
  start_time?: string;
  end_time?: string;
  created_by: string;
  notes?: string;
}): Promise<AttendanceSession> => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .insert({
      ...session,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as AttendanceSession;
};

export const updateAttendanceSession = async (
  id: string, 
  updates: Partial<AttendanceSession>
): Promise<AttendanceSession> => {
  const { data, error } = await supabase
    .from('attendance_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as AttendanceSession;
};

// Generate QR code for session
export const generateSessionQRCode = async (sessionId: string, expiryMinutes: number = 30): Promise<string> => {
  const qrCode = `ATT-${sessionId}-${Date.now()}`;
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

  await supabase
    .from('attendance_sessions')
    .update({ qr_code: qrCode, qr_expires_at: expiresAt, status: 'ongoing' })
    .eq('id', sessionId);

  return qrCode;
};

// Attendance Records
export const getAttendanceRecords = async (sessionId: string): Promise<AttendanceRecord[]> => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      *,
      student:profiles!attendance_records_student_id_fkey(full_name, email)
    `)
    .eq('session_id', sessionId);

  if (error) throw error;
  return data as unknown as AttendanceRecord[];
};

export const markAttendance = async (records: Array<{
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'half_day';
  check_in_method?: 'manual' | 'qr_code' | 'biometric' | 'auto';
  late_minutes?: number;
  reason?: string;
  marked_by: string;
}>): Promise<AttendanceRecord[]> => {
  const recordsWithTime = records.map(r => ({
    ...r,
    check_in_time: r.status !== 'absent' ? new Date().toISOString() : null
  }));

  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(recordsWithTime, { 
      onConflict: 'session_id,student_id',
      ignoreDuplicates: false 
    })
    .select();

  if (error) throw error;
  return data as unknown as AttendanceRecord[];
};

// QR Check-in
export const qrCheckIn = async (qrCode: string, studentId: string): Promise<AttendanceRecord> => {
  // Find the session with this QR code
  const { data: session, error: sessionError } = await supabase
    .from('attendance_sessions')
    .select('*')
    .eq('qr_code', qrCode)
    .single();

  if (sessionError || !session) {
    throw new Error('Invalid QR code');
  }

  // Check if QR is expired
  if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
    throw new Error('QR code has expired');
  }

  // Check for late arrival
  let status: 'present' | 'late' = 'present';
  let lateMinutes = 0;

  if (session.start_time) {
    const startTime = new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
    
    if (diffMinutes > 10) { // 10 minutes grace period
      status = 'late';
      lateMinutes = diffMinutes;
    }
  }

  const { data: user } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert({
      session_id: session.id,
      student_id: studentId,
      status,
      check_in_time: new Date().toISOString(),
      check_in_method: 'qr_code',
      late_minutes: lateMinutes,
      marked_by: user?.user?.id || studentId
    }, { 
      onConflict: 'session_id,student_id' 
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as AttendanceRecord;
};

// Leave Requests
export const getLeaveRequests = async (filters?: {
  student_id?: string;
  batch_id?: string;
  status?: string;
}): Promise<LeaveRequest[]> => {
  let query = supabase
    .from('leave_requests')
    .select(`
      *,
      student:profiles!leave_requests_student_id_fkey(full_name, email),
      batch:batches(name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.student_id) query = query.eq('student_id', filters.student_id);
  if (filters?.batch_id) query = query.eq('batch_id', filters.batch_id);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as LeaveRequest[];
};

export const createLeaveRequest = async (request: {
  student_id: string;
  batch_id?: string;
  leave_type: 'sick' | 'personal' | 'family' | 'emergency' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  supporting_doc_url?: string;
}): Promise<LeaveRequest> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .insert(request)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as LeaveRequest;
};

export const updateLeaveRequest = async (
  id: string,
  updates: { 
    status: 'approved' | 'rejected'; 
    approved_by: string;
    rejection_reason?: string;
  }
): Promise<LeaveRequest> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({
      ...updates,
      approved_at: updates.status === 'approved' ? new Date().toISOString() : null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as LeaveRequest;
};

// Reports
export const getStudentAttendanceReport = async (
  studentId: string,
  batchId?: string,
  dateRange?: { from: string; to: string }
): Promise<{
  total_sessions: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  records: AttendanceRecord[];
}> => {
  let sessionsQuery = supabase.from('attendance_sessions').select('id').eq('status', 'completed');
  if (batchId) sessionsQuery = sessionsQuery.eq('batch_id', batchId);
  if (dateRange) {
    sessionsQuery = sessionsQuery.gte('session_date', dateRange.from).lte('session_date', dateRange.to);
  }

  const { data: sessions } = await sessionsQuery;
  const sessionIds = sessions?.map(s => s.id) || [];

  if (sessionIds.length === 0) {
    return { total_sessions: 0, present: 0, absent: 0, late: 0, excused: 0, percentage: 0, records: [] };
  }

  const { data: records } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('student_id', studentId)
    .in('session_id', sessionIds);

  const report = {
    total_sessions: sessionIds.length,
    present: 0,
    absent: 0,
    late: 0,
    excused: 0,
    percentage: 0,
    records: records as unknown as AttendanceRecord[]
  };

  records?.forEach(r => {
    if (r.status === 'present') report.present++;
    else if (r.status === 'absent') report.absent++;
    else if (r.status === 'late') report.late++;
    else if (r.status === 'excused') report.excused++;
  });

  // Count absent for sessions without records
  report.absent += report.total_sessions - (records?.length || 0);
  
  const attended = report.present + report.late;
  report.percentage = report.total_sessions > 0 
    ? Math.round((attended / report.total_sessions) * 100) 
    : 0;

  return report;
};

export const getBatchAttendanceReport = async (
  batchId: string,
  date?: string
): Promise<{
  total_students: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}> => {
  // Get batch enrollment count
  const { count: totalStudents } = await supabase
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('batch_id', batchId)
    .eq('status', 'active');

  // Get session for the date
  let sessionQuery = supabase
    .from('attendance_sessions')
    .select('id')
    .eq('batch_id', batchId);
  
  if (date) sessionQuery = sessionQuery.eq('session_date', date);
  else sessionQuery = sessionQuery.order('session_date', { ascending: false }).limit(1);

  const { data: sessions } = await sessionQuery;
  
  if (!sessions || sessions.length === 0) {
    return { total_students: totalStudents || 0, present: 0, absent: 0, late: 0, percentage: 0 };
  }

  const { data: records } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('session_id', sessions[0].id);

  const report = {
    total_students: totalStudents || 0,
    present: 0,
    absent: 0,
    late: 0,
    percentage: 0
  };

  records?.forEach(r => {
    if (r.status === 'present') report.present++;
    else if (r.status === 'absent') report.absent++;
    else if (r.status === 'late') report.late++;
  });

  report.absent = report.total_students - (records?.length || 0) + report.absent;
  
  const attended = report.present + report.late;
  report.percentage = report.total_students > 0 
    ? Math.round((attended / report.total_students) * 100) 
    : 0;

  return report;
};
