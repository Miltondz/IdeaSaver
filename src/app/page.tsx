
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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { auth, firebaseConfigError } from '@/lib/firebase';
import { saveSettings, getSettings } from '@/lib/storage';

const GoogleIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.98-4.66 1.98-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47c1.98 0 3.06.83 3.79 1.48l2.84-2.76C18.99 1.83 16.14 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c7.1 0 12.23-4.88 12.23-12.48 0-.79-.08-1.54-.22-2.28H12.48z"/></svg>;

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  if (firebaseConfigError) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center p-8 border-destructive">
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
                      <li>Select your project (<span className="font-mono bg-muted px-1 py-0.5 rounded">{process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '...'}</span>).</li>
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
        message = 'Please enter a valid email address.';
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        message = 'No account found with that email and password combination.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/email-already-in-use':
        message = 'An account already exists with this email address.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-api-key':
        message = `Your Firebase API Key is invalid. The app is configured with Project ID: '${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Set'}'. Please check the API Key in your .env file matches the one from that project in the Firebase Console.`;
        break;
      case 'auth/popup-blocked':
        message = 'Your browser blocked the sign-in popup. Please allow popups for this site.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'The sign-in window was closed. Please try again.';
        break;
      case 'auth/unauthorized-domain':
        message = `This domain isn't authorized. Your app is trying to connect to Project ID: '${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Not Set'}'. Go to the Firebase Console for that specific project and add 'localhost' to the 'Authorized domains' list.`;
        break;
      case 'auth/account-exists-with-different-credential':
        message = 'An account already exists with this email, but with a different sign-in method (e.g., password). Try signing in with that method.';
        break;
      default:
        console.error(error);
    }
    toast({ variant: 'destructive', title: 'Authentication Failed', description: message });
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter both an email and a password.' });
      return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: 'Account Created!', description: "Welcome! Please select a plan to continue." });
      router.push('/pricing');
    } catch (error) {
      handleAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please enter both an email and a password.' });
      return;
    }
    if (!auth) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Firebase is not configured correctly.' });
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
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Firebase is not configured correctly.' });
        return;
    }
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      if (additionalInfo?.isNewUser) {
        toast({ title: 'Account Created!', description: "Welcome! Please select a plan to continue." });
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
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-primary/10 border border-primary/20 rounded-full p-4 mb-4">
            <Lightbulb className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">Idea Saver</h1>
        <p className="text-muted-foreground mt-1">Quickly capture and transcribe your ideas.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin" disabled={isLoading}>Sign In</TabsTrigger>
          <TabsTrigger value="signup" disabled={isLoading}>Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>
                Sign in to access your notes and recordings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-in">Email</Label>
                <Input id="email-in" type="email" placeholder="m@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-in">Password</Label>
                <Input id="password-in" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
              </div>
              <Button onClick={handleSignIn} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Sign In'}
              </Button>
            </CardContent>
            <CardFooter className="flex-col items-center justify-center text-center text-sm gap-2 pt-4">
                <Link href="/forgot-password" className="text-sm text-muted-foreground underline hover:text-foreground">
                    Forgot Password?
                </Link>
                <div className="text-muted-foreground">
                    Don't have an account?{' '}
                    <button onClick={() => setActiveTab('signup')} className="font-semibold underline text-primary hover:text-primary/80" disabled={isLoading}>Sign Up</button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Unleash Your Ideas</CardTitle>
              <CardDescription>
                First, create your account. Then, select a plan on the next screen to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">Password</Label>
                <Input id="password-up" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
              </div>
               <Button onClick={handleSignUp} className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : 'Create Account'}
              </Button>
            </CardContent>
            <CardFooter className="flex-col items-center justify-center text-center text-sm gap-2 pt-4">
                 <div className="text-muted-foreground px-4">
                    By signing up, you agree to our{' '}
                    <Link href="#" className="underline hover:text-foreground">Terms of Service</Link> and{' '}
                    <Link href="#" className="underline hover:text-foreground">Privacy Policy</Link>.
                 </div>
                 <div className="text-muted-foreground">
                    Already have an account?{' '}
                    <button onClick={() => setActiveTab('signin')} className="font-semibold underline text-primary hover:text-primary/80" disabled={isLoading}>Sign In</button>
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
                Or continue with
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
