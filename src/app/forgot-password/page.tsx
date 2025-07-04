
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { useLanguage } from '@/hooks/use-language';
import { LanguageToggle } from '@/components/language-toggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleResetPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: t('forgot_password_email_required'), description: t('forgot_password_email_required_desc') });
      return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: t('auth_config_error'), description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: t('forgot_password_link_sent_title'),
        description: t('forgot_password_link_sent_desc'),
        className: 'bg-accent text-accent-foreground border-accent',
      });
    } catch (error: any) {
      let message = "An unexpected error occurred.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
          message = t('forgot_password_user_not_found');
      }
      toast({ variant: 'destructive', title: t('forgot_password_fail_title'), description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
       <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
       <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-primary/10 border border-primary/20 rounded-full p-4 mb-4">
            <Lightbulb className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t('appName')}</h1>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('forgot_password_title')}</CardTitle>
          <CardDescription>
            {t('forgot_password_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('login_email_label')}</Label>
            <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
          </div>
          <Button onClick={handleResetPassword} className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : t('forgot_password_button')}
          </Button>
        </CardContent>
        <CardFooter>
            <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('forgot_password_back_link')}
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
