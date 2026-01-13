import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Loader2, X, UserCheck, UserX, AlertCircle, CreditCard } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllUsersWithApproval, approveUser, rejectUser } from '@/services/featureService';
import { format } from 'date-fns';

interface UserWithApproval {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    approval_status: 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
    rejection_reason: string | null;
    payment_status: 'pending' | 'paid' | 'locked';
    payment_requested_at: string | null;
    payment_amount: number | null;
}

export default function PendingUsers() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserWithApproval | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['users-with-approval'],
        queryFn: getAllUsersWithApproval,
    });

    const approveMutation = useMutation({
        mutationFn: (userId: string) => approveUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-with-approval'] });
            toast({
                title: 'User Approved',
                description: 'The user can now access the platform.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
            rejectUser(userId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-with-approval'] });
            setRejectDialogOpen(false);
            setRejectionReason('');
            setSelectedUser(null);
            toast({
                title: 'User Rejected',
                description: 'The user has been rejected and notified.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    const pendingUsers = users.filter((u: UserWithApproval) => u.approval_status === 'pending');
    const approvedUsers = users.filter((u: UserWithApproval) => u.approval_status === 'approved');
    const rejectedUsers = users.filter((u: UserWithApproval) => u.approval_status === 'rejected');

    const handleRejectClick = (user: UserWithApproval) => {
        setSelectedUser(user);
        setRejectDialogOpen(true);
    };

    const handleConfirmReject = () => {
        if (selectedUser) {
            rejectMutation.mutate({
                userId: selectedUser.id,
                reason: rejectionReason || 'No reason provided',
            });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'approved':
                return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
            case 'rejected':
                return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return null;
        }
    };

    const getPaymentBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20"><CreditCard className="w-3 h-3 mr-1" />Unpaid</Badge>;
            case 'paid':
                return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20"><Check className="w-3 h-3 mr-1" />Paid</Badge>;
            case 'locked':
                return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20"><Clock className="w-3 h-3 mr-1" />Awaiting Payment</Badge>;
            default:
                return <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/20">N/A</Badge>;
        }
    };

    const UserTable = ({ users: userList, showActions = false }: { users: UserWithApproval[], showActions?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    {showActions && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {userList.map((user) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(user.approval_status)}</TableCell>
                        <TableCell>{getPaymentBadge(user.payment_status)}</TableCell>
                        {showActions && (
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => approveMutation.mutate(user.id)}
                                        disabled={approveMutation.isPending}
                                        className="gap-1"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectClick(user)}
                                        className="gap-1 text-destructive hover:text-destructive"
                                    >
                                        <UserX className="w-4 h-4" />
                                        Reject
                                    </Button>
                                </div>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
                {userList.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground py-8">
                            No users found
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">User Approvals</h1>
                    <p className="text-muted-foreground">
                        Manage user registration approvals
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Pending</CardDescription>
                            <CardTitle className="text-3xl text-yellow-600">{pendingUsers.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Approved</CardDescription>
                            <CardTitle className="text-3xl text-green-600">{approvedUsers.length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Rejected</CardDescription>
                            <CardTitle className="text-3xl text-red-600">{rejectedUsers.length}</CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* Pending Alert */}
                {pendingUsers.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="text-yellow-600 font-medium">
                            {pendingUsers.length} user{pendingUsers.length > 1 ? 's' : ''} waiting for approval
                        </span>
                    </div>
                )}

                <Tabs defaultValue="pending">
                    <TabsList>
                        <TabsTrigger value="pending" className="gap-2">
                            <Clock className="w-4 h-4" />
                            Pending ({pendingUsers.length})
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="gap-2">
                            <Check className="w-4 h-4" />
                            Approved ({approvedUsers.length})
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="gap-2">
                            <X className="w-4 h-4" />
                            Rejected ({rejectedUsers.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pending">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Users</CardTitle>
                                <CardDescription>Users waiting for approval to access the platform</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserTable users={pendingUsers} showActions />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="approved">
                        <Card>
                            <CardHeader>
                                <CardTitle>Approved Users</CardTitle>
                                <CardDescription>Users with full platform access</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserTable users={approvedUsers} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rejected">
                        <Card>
                            <CardHeader>
                                <CardTitle>Rejected Users</CardTitle>
                                <CardDescription>Users who were denied access</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <UserTable users={rejectedUsers} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Reject Dialog */}
                <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reject User</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to reject {selectedUser?.full_name || selectedUser?.email}?
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Reason for rejection (optional)"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmReject}
                                disabled={rejectMutation.isPending}
                            >
                                {rejectMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                Reject User
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
