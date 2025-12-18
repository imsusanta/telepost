import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { LoadingState } from "@/components/LoadingState";
import { Plus, UserCheck, UserX, Clock } from "lucide-react";
import { 
  getAttendanceSessions, 
  createAttendanceSession, 
  getAttendanceRecords,
  markAttendance,
  getBatchAttendanceReport,
  type AttendanceSession 
} from "@/services/attendanceService";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function Attendance() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formData, setFormData] = useState({
    batch_id: "",
    session_date: format(new Date(), "yyyy-MM-dd"),
    session_type: "regular" as AttendanceSession['session_type'],
    start_time: "09:00",
    end_time: "10:00",
    notes: "",
  });

  const { data: batches } = useQuery({
    queryKey: ['batches-for-attendance'],
    queryFn: async () => {
      const { data } = await supabase
        .from('batches')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      return data || [];
    },
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['attendance-sessions', selectedBatch, selectedDate],
    queryFn: () => getAttendanceSessions(selectedBatch || undefined, selectedDate || undefined),
  });

  const { data: students } = useQuery({
    queryKey: ['batch-students', selectedSession?.batch_id],
    queryFn: async () => {
      if (!selectedSession?.batch_id) return [];
      const { data } = await supabase
        .from('enrollments')
        .select('student_id, profiles!enrollments_student_id_fkey(id, full_name, email)')
        .eq('batch_id', selectedSession.batch_id)
        .eq('status', 'active');
      return data?.map(e => e.profiles) || [];
    },
    enabled: !!selectedSession?.batch_id,
  });

  const { data: attendanceRecords } = useQuery({
    queryKey: ['attendance-records', selectedSession?.id],
    queryFn: () => selectedSession ? getAttendanceRecords(selectedSession.id) : Promise.resolve([]),
    enabled: !!selectedSession?.id,
  });

  const { data: batchReport } = useQuery({
    queryKey: ['batch-report', selectedBatch, selectedDate],
    queryFn: () => selectedBatch ? getBatchAttendanceReport(selectedBatch, selectedDate) : null,
    enabled: !!selectedBatch,
  });

  const createSessionMutation = useMutation({
    mutationFn: createAttendanceSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      toast({ title: "Session created successfully" });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-records'] });
      queryClient.invalidateQueries({ queryKey: ['batch-report'] });
      toast({ title: "Attendance marked successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    createSessionMutation.mutate({
      ...formData,
      created_by: user.id,
    });
  };

  const handleMarkAttendance = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    if (!selectedSession) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    markAttendanceMutation.mutate([{
      session_id: selectedSession.id,
      student_id: studentId,
      status,
      marked_by: user.id,
    }]);
  };

  const getStudentStatus = (studentId: string) => {
    return attendanceRecords?.find(r => r.student_id === studentId)?.status;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Attendance</h1>
            <p className="text-muted-foreground">Track and manage batch attendance</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Create Session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Attendance Session</DialogTitle>
                <DialogDescription>Start a new attendance session for a batch</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Batch</Label>
                  <Select
                    value={formData.batch_id}
                    onValueChange={(v) => setFormData({ ...formData, batch_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                    <SelectContent>
                      {batches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={formData.session_date}
                      onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Session Type</Label>
                    <Select
                      value={formData.session_type}
                      onValueChange={(v) => setFormData({ ...formData, session_type: v as AttendanceSession['session_type'] })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="extra">Extra Class</SelectItem>
                        <SelectItem value="makeup">Makeup Class</SelectItem>
                        <SelectItem value="exam">Exam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSession} disabled={createSessionMutation.isPending || !formData.batch_id}>
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={selectedBatch} onValueChange={setSelectedBatch}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Batches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Batches</SelectItem>
              {batches?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
        </div>

        {/* Stats */}
        {batchReport && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Students</CardDescription>
                <CardTitle className="text-2xl">{batchReport.total_students}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Present</CardDescription>
                <CardTitle className="text-2xl text-green-600">{batchReport.present}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Absent</CardDescription>
                <CardTitle className="text-2xl text-red-600">{batchReport.absent}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Attendance %</CardDescription>
                <CardTitle className="text-2xl">{batchReport.percentage}%</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="mark" disabled={!selectedSession}>Mark Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            {sessionsLoading ? (
              <LoadingState message="Loading sessions..." />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Sessions</CardTitle>
                  <CardDescription>Click on a session to mark attendance</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessions?.map((session) => (
                        <TableRow 
                          key={session.id}
                          className={selectedSession?.id === session.id ? "bg-muted" : ""}
                        >
                          <TableCell className="font-medium">{session.batch?.name}</TableCell>
                          <TableCell>{format(new Date(session.session_date), "MMM d, yyyy")}</TableCell>
                          <TableCell>
                            {session.start_time && session.end_time 
                              ? `${session.start_time} - ${session.end_time}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{session.session_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedSession(session)}
                            >
                              Mark Attendance
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!sessions || sessions.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No sessions found for selected filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="mark">
            {selectedSession && (
              <Card>
                <CardHeader>
                  <CardTitle>Mark Attendance - {selectedSession.batch?.name}</CardTitle>
                  <CardDescription>
                    {format(new Date(selectedSession.session_date), "MMMM d, yyyy")} | 
                    {selectedSession.start_time} - {selectedSession.end_time}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(students as Array<{ id: string; full_name: string | null; email: string | null }>)?.map((student) => {
                        const status = getStudentStatus(student.id);
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.full_name || student.email}
                            </TableCell>
                            <TableCell>
                              {status ? (
                                <Badge variant={status === 'present' ? 'default' : status === 'late' ? 'secondary' : 'destructive'}>
                                  {status}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Not marked</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                size="sm"
                                variant={status === 'present' ? 'default' : 'outline'}
                                onClick={() => handleMarkAttendance(student.id, 'present')}
                              >
                                <UserCheck className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={status === 'late' ? 'secondary' : 'outline'}
                                onClick={() => handleMarkAttendance(student.id, 'late')}
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={status === 'absent' ? 'destructive' : 'outline'}
                                onClick={() => handleMarkAttendance(student.id, 'absent')}
                              >
                                <UserX className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!students || students.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                            No students enrolled in this batch
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
