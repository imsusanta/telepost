import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, XCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getUserApprovalStatus, type UserApprovalStatus } from '@/services/featureService';
import { supabase } from '@/integrations/supabase/client';

interface PendingApprovalScreenProps {
    children: React.ReactNode;
}

export default function PendingApprovalScreen({ children }: PendingApprovalScreenProps) {
    const navigate = useNavigate();
    const [status, setStatus] = useState<UserApprovalStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const checkApprovalStatus = async () => {
        try {
            const approvalStatus = await getUserApprovalStatus();
            setStatus(approvalStatus);
        } catch (error) {
            console.error('Failed to check approval status:', error);
            // Default to approved if check fails to avoid blocking users unnecessarily
            setStatus({ status: 'approved', approved_at: null, rejection_reason: null });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkApprovalStatus();
    }, []);

    const handleRefresh = async () => {
        setRefreshing(true);
        await checkApprovalStatus();
        setRefreshing(false);
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    // If approved, render children normally
    if (status?.status === 'approved') {
        return <>{children}</>;
    }

    // If pending or rejected, show blocking screen
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    {status?.status === 'pending' ? (
                        <>
                            <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-yellow-600" />
                            </div>
                            <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
                            <CardDescription className="text-base">
                                Your account is currently under review. An administrator will approve your access soon.
                            </CardDescription>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl text-red-600">Account Rejected</CardTitle>
                            <CardDescription className="text-base">
                                Your account access has been denied.
                            </CardDescription>
                        </>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {status?.status === 'rejected' && status.rejection_reason && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm font-medium text-red-600 mb-1">Reason:</p>
                            <p className="text-sm text-muted-foreground">{status.rejection_reason}</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="w-full gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            Check Status
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleSignOut}
                            className="w-full gap-2 text-muted-foreground"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </Button>
                    </div>

                    {status?.status === 'pending' && (
                        <p className="text-xs text-center text-muted-foreground">
                            Click "Check Status" to refresh your approval status
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
