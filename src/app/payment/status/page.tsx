'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getPaymentStatus } from '@/lib/flow';
import type { FlowPaymentStatus } from '@/lib/flow';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

function PaymentStatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { refreshSettings } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'rejected' | 'error'>('loading');
    const [paymentDetails, setPaymentDetails] = useState<FlowPaymentStatus | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setError('Payment token not found in URL.');
            setStatus('error');
            return;
        }

        async function verifyPayment() {
            try {
                const result = await getPaymentStatus(token);
                setPaymentDetails(result);
                switch (result.status) {
                    case 2: // Paid
                        setStatus('success');
                        await refreshSettings(); // Refresh settings in the auth context
                        break;
                    case 3: // Rejected
                        setStatus('rejected');
                        break;
                    default: // Pending, Voided, etc.
                        setStatus('rejected');
                        setError(`Payment status is 'pending' or 'voided' (status code: ${result.status}).`);
                        break;
                }
            } catch (e: any) {
                setError(e.message);
                setStatus('error');
            }
        }

        verifyPayment();
    }, [searchParams, refreshSettings]);

    return (
        <div className="container mx-auto p-4 pt-8 max-w-md">
            <Card className="bg-card/80 backdrop-blur-sm">
                <CardHeader className="items-center text-center">
                    {status === 'loading' && <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />}
                    {status === 'success' && <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />}
                    {status === 'rejected' && <XCircle className="h-12 w-12 text-destructive mb-4" />}
                    {status === 'error' && <AlertTriangle className="h-12 w-12 text-destructive mb-4" />}
                    
                    <CardTitle className="text-2xl">
                        {status === 'loading' && 'Verifying Payment...'}
                        {status === 'success' && 'Payment Successful!'}
                        {status === 'rejected' && 'Payment Not Completed'}
                        {status === 'error' && 'An Error Occurred'}
                    </CardTitle>
                    <CardDescription>
                        {status === 'loading' && 'Please wait while we confirm your payment with the provider.'}
                        {status === 'success' && 'Thank you for your purchase! Your Pro plan is now active.'}
                        {status === 'rejected' && 'Your payment was not completed or was rejected. You have not been charged.'}
                        {status === 'error' && `There was a problem verifying your payment: ${error}`}
                    </CardDescription>
                </CardHeader>
                <CardFooter className="flex-col gap-4">
                    <Button onClick={() => router.push('/record')} className="w-full">
                        Go to App
                    </Button>
                     {(status === 'rejected' || status === 'error') && (
                        <Button onClick={() => router.push('/pricing')} className="w-full" variant="outline">
                            Try Again
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

export default function PaymentStatusPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Loading payment status...</p>
            </div>
        }>
            <PaymentStatusContent />
        </Suspense>
    );
}
