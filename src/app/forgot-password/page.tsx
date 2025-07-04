
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Email required', description: 'Please enter your email address.' });
      return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset Link Sent',
        description: 'Please check your email for a link to reset your password.',
        className: 'bg-accent text-accent-foreground border-accent',
      });
    } catch (error: any) {
      let message = "An unexpected error occurred.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
          message = "No account found with this email address.";
      }
      toast({ variant: 'destructive', title: 'Failed to Send', description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
       <div className="mb-8">
        <Image src="/logo.svg" alt="Idea Saver Logo" width={150} height={150} priority />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            No problem. Enter your email below and we'll send you a link to reset it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
          </div>
          <Button onClick={handleResetPassword} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : 'Send Reset Link'}
          </Button>
        </CardContent>
        <CardFooter>
            <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign In
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
