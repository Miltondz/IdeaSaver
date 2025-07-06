'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Lightbulb, Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, fetchSignInMethodsForEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth, firebaseConfigError } from '@/lib/firebase';
import { useLanguage } from '@/hooks/use-language';
import { LanguageToggle } from '@/components/language-toggle';

const GoogleIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.98-4.66 1.98-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47c1.98 0 3.06.83 3.79 1.48l2.84-2.76C18.99 1.83 16.14 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c7.1 0 12.23-4.88 12.23-12.48 0-.79-.08-1.54-.22-2.28H12.48z"/></svg>;

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Set';

  if (firebaseConfigError) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center p-8 border-destructive bg-card/80 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-destructive">Configuration Error</CardTitle>
                <CardDescription className="text-destructive/90">
                    {firebaseConfigError}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-left space-y-4">
               <div>
                  <h3 className="font-semibold mb-2">How to Fix:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a>.</li>
                      <li>Select your project (<span className="font-mono bg-muted px-1 py-0.5 rounded">{projectId}</span>).</li>
                      <li>Click the gear icon for <strong>Project settings</strong>.</li>
                      <li>Under the <strong>General</strong> tab, scroll down to <strong>Your apps</strong>.</li>
                      <li>If you don't have a web app, click the Web icon ( <strong>&lt;/&gt;</strong> ) to create one.</li>
                      <li>Find the app and copy its configuration credentials.</li>
                      <li>Paste these values into the <code className="font-mono bg-muted px-1 py-0.5 rounded">.env</code> file in your project.</li>
                  </ol>
               </div>
            </CardContent>
        </Card>
      </div>
    );
  }

  const handleAuthError = (error: any) => {
    let message = "An unexpected error occurred.";
    switch (error.code) {
      case 'auth/invalid-email':
        message = t('auth_invalid_email');
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        message = t('auth_user_not_found');
        break;
      case 'auth/wrong-password':
        message = t('auth_wrong_password');
        break;
      case 'auth/weak-password':
        message = t('auth_weak_password');
        break;
      case 'auth/invalid-api-key':
        message = t('auth_invalid_api_key', { projectId });
        break;
      case 'auth/popup-blocked':
        message = t('auth_popup_blocked');
        break;
      case 'auth/popup-closed-by-user':
        message = t('auth_popup_closed');
        break;
      case 'auth/unauthorized-domain':
        message = t('auth_unauthorized_domain', { projectId });
        break;
      case 'auth/account-exists-with-different-credential':
        message = t('auth_account_exists');
        break;
      default:
        console.error(error);
    }
    toast({ variant: 'destructive', title: t('auth_fail_title'), description: message });
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({ variant: 'destructive', title: t('auth_fail_title'), description: t('auth_missing_info') });
      return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: t('auth_config_error'), description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: t('account_created_title'), description: t('account_created_desc') });
      router.push('/pricing');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            let message = t('auth_email_in_use');
            if (methods.includes('google.com')) {
                message = t('auth_email_in_use_google');
            } else if (methods.includes('password')) {
                message = t('auth_email_in_use_password');
            }
            toast({ variant: 'destructive', title: t('auth_fail_title'), description: message });
        } catch (fetchError) {
            handleAuthError(error);
        }
      } else {
        handleAuthError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({ variant: 'destructive', title: t('auth_fail_title'), description: t('auth_missing_info') });
      return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: t('auth_config_error'), description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/record');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
        toast({ variant: 'destructive', title: t('auth_config_error'), description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      if (additionalInfo?.isNewUser) {
        toast({ title: t('account_created_title'), description: t('account_created_desc') });
        router.push('/pricing');
      } else {
        router.push('/record');
      }
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="absolute top-4 right-4">
            <LanguageToggle />
        </div>
       <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-primary/10 border border-primary/20 rounded-full p-4 mb-4">
            <Lightbulb className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">{t('login_header')}</h1>
        <p className="text-muted-foreground mt-1">{t('login_subheader')}</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" disabled={isLoading}>{t('login_signin_tab')}</TabsTrigger>
            <TabsTrigger value="signup" disabled={isLoading}>{t('login_signup_tab')}</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('login_signin_title')}</CardTitle>
              <CardDescription>
                {t('login_signin_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">{t('login_email_label')}</Label>
                <Input id="email-in" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-in">{t('login_password_label')}</Label>
                <Input id="password-in" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
              </div>
              <Button onClick={handleSignIn} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : t('login_signin_button')}
              </Button>
            </CardContent>
            <CardFooter className="flex-col items-center justify-center text-center text-sm gap-2 pt-4">
                <Link href="/forgot-password" className="text-sm text-muted-foreground underline hover:text-foreground">
                    {t('login_forgot_password_link')}
                </Link>
                <div className="text-muted-foreground">
                    {t('login_no_account')}{' '}
                    <button onClick={() => setActiveTab('signup')} className="font-semibold underline text-primary hover:text-primary/80" disabled={isLoading}>{t('login_signup_link')}</button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{t('login_signup_title')}</CardTitle>
              <CardDescription>
                {t('login_signup_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="email-up">{t('login_email_label')}</Label>
                <Input id="email-up" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">{t('login_password_label')}</Label>
                <Input id="password-up" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
              </div>
               <Button onClick={handleSignUp} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : t('login_create_account_button')}
              </Button>
            </CardContent>
            <CardFooter className="flex-col items-center justify-center text-center text-sm gap-2 pt-4">
                 <div className="text-muted-foreground px-4">
                    {t('login_terms_prefix')}{' '}
                    <Link href="/terms" className="underline hover:text-foreground">{t('login_terms_link')}</Link> {t('login_and')}{' '}
                    <Link href="/privacy" className="underline hover:text-foreground">{t('login_privacy_link')}</Link>.
                 </div>
                 <div className="text-muted-foreground">
                    {t('login_already_account')}{' '}
                    <button onClick={() => setActiveTab('signin')} className="font-semibold underline text-primary hover:text-primary/80" disabled={isLoading}>{t('login_signin_link')}</button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
       <div className="w-full max-w-sm mt-4 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('login_or_continue_with')}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading}><GoogleIcon/> Google</Button>
          </div>
        </div>
    </div>
  );
}
