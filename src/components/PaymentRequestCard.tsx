import { useState, useEffect } from 'react';
import { CreditCard, Lock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getUserFullStatus, requestPaymentLock, type UserFullStatus } from '@/services/featureService';
import { useToast } from '@/hooks/use-toast';

interface PaymentRequestCardProps {
    onPaymentRequested?: () => void;
}

export default function PaymentRequestCard({ onPaymentRequested }: PaymentRequestCardProps) {
    const { toast } = useToast();
    const [status, setStatus] = useState<UserFullStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const fullStatus = await getUserFullStatus();
                setStatus(fullStatus);
            } catch (error) {
                console.error('Failed to get status:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const handleRequestPayment = async () => {
        setRequesting(true);
        try {
            await requestPaymentLock(999); // ₹999 subscription
            toast({
                title: 'Payment Request Sent',
                description: 'Please complete the payment to unlock all features.',
            });
            // Refresh page to show payment screen
            window.location.reload();
        } catch (error) {
            console.error('Failed to request payment:', error);
            toast({
                title: 'Error',
                description: 'Failed to initiate payment. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-6">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Don't show if already paid
    if (status?.payment.payment_status === 'paid') {
        return null;
    }

    // Show payment card for unpaid users
    return (
        <Card className="border-[#0088cc]/30 bg-gradient-to-br from-[#0088cc]/5 to-transparent">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#0088cc]" />
                        Subscription
                    </CardTitle>
                    <Badge
                        variant="outline"
                        className={
                            status?.payment.payment_status === 'locked'
                                ? "bg-red-500/10 text-red-600 border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                        }
                    >
                        {status?.payment.payment_status === 'locked' ? (
                            <><Lock className="w-3 h-3 mr-1" /> Payment Required</>
                        ) : (
                            <><AlertCircle className="w-3 h-3 mr-1" /> Pending</>
                        )}
                    </Badge>
                </div>
                <CardDescription>
                    {status?.payment.payment_status === 'locked'
                        ? 'Complete your payment to unlock all features'
                        : 'Upgrade to access all premium features'}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Pricing */}
                <div className="p-4 bg-card border rounded-xl text-center">
                    <p className="text-sm text-muted-foreground mb-1">Subscription Price</p>
                    <p className="text-3xl font-bold text-foreground">
                        ₹999
                        <span className="text-sm font-normal text-muted-foreground ml-1">/year</span>
                    </p>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    {[
                        'Unlimited Quizzes',
                        'AI Generation',
                        'Analytics',
                        'Priority Support'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                            <CheckCircle className="w-3.5 h-3.5 text-[#0088cc]" />
                            {feature}
                        </div>
                    ))}
                </div>

                {/* Action Button */}
                {status?.payment.payment_status === 'pending' && (
                    <Button
                        onClick={handleRequestPayment}
                        disabled={requesting}
                        className="w-full gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white"
                    >
                        {requesting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4" />
                                Send Payment Request
                            </>
                        )}
                    </Button>
                )}

                {status?.payment.payment_status === 'locked' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
                        <p className="text-sm text-red-600">
                            Account locked. Payment required to continue.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
