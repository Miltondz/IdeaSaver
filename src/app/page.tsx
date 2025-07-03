
'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Lightbulb } from 'lucide-react';

// Mock SVG icons for Apple and Google
const GoogleIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.98-4.66 1.98-3.57 0-6.47-2.9-6.47-6.47s2.9-6.47 6.47-6.47c1.98 0 3.06.83 3.79 1.48l2.84-2.76C18.99 1.83 16.14 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c7.1 0 12.23-4.88 12.23-12.48 0-.79-.08-1.54-.22-2.28H12.48z"/></svg>;
const AppleIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4"><title>Apple</title><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-1.84.043-3.343 1.2-4.237 2.998-1.742 3.518-.455 8.733 1.403 11.64.884 1.348 1.933 2.515 3.255 2.515.33 0 1.26-.516 2.45-2.028a.22.22 0 0 0 .034-.148c-.023-.112-2.14-1.242-2.14-3.623 0-2.19 1.851-3.21 1.98-3.254a.208.208 0 0 1 .157-.01c.06.01.915.29 1.92.29a.188.188 0 0 0 .19-.153c.048-.192.54-3.565-.914-3.58zM15.53 0c-1.39 0-2.56.63-3.35 1.63-.82.98-1.52 2.37-1.39 3.79.2 2.23 2.19 3.48 3.32 3.48 1.39 0 2.56-.63 3.35-1.63.82-.98 1.52-2.37 1.39-3.79C18.66 1.25 16.92 0 15.53 0z"/></svg>;

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('signup');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-8 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary text-primary flex items-center justify-center">
            <Lightbulb className="w-6 h-6"/>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Idea Saver</h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
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
                <Input id="email-in" type="email" placeholder="m@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-in">Password</Label>
                <Input id="password-in" type="password" />
              </div>
              <Button asChild className="w-full">
                <Link href="/record">Sign In</Link>
              </Button>
            </CardContent>
            <CardFooter className="flex-col items-center justify-center text-center text-sm gap-2 pt-4">
                <Link href="#" className="text-sm text-muted-foreground underline hover:text-foreground">
                    Forgot Password?
                </Link>
                <div className="text-muted-foreground">
                    Don't have an account?{' '}
                    <button onClick={() => setActiveTab('signup')} className="font-semibold underline text-primary hover:text-primary/80">Sign Up</button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Unleash Your Ideas</CardTitle>
              <CardDescription>
                Experience AI-powered notes and unlock your potential with a 7-day Pro Plan trial.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                <Label htmlFor="email-up">Email</Label>
                <Input id="email-up" type="email" placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-up">Password</Label>
                <Input id="password-up" type="password" />
              </div>
               <Button asChild className="w-full">
                <Link href="/record">Sign Up &amp; Start Free Trial</Link>
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
                    <button onClick={() => setActiveTab('signin')} className="font-semibold underline text-primary hover:text-primary/80">Sign In</button>
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
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline"><GoogleIcon/> Google</Button>
            <Button variant="outline"><AppleIcon/> Apple</Button>
          </div>
        </div>
    </div>
  );
}
