
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth, firebaseConfigError } from '@/lib/firebase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export const AuthContext = createContext<{ user: User | null }>({ user: null });

const FirebaseErrorDisplay = ({ message }: { message: string }) => (
    <div className="flex h-screen w-full items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
        <div className="max-w-3xl w-full rounded-lg border-2 border-destructive bg-card p-8 text-card-foreground shadow-2xl shadow-red-500/20">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-destructive">Configuration Error</h1>
                    <p className="mt-2 text-lg text-muted-foreground">The application cannot connect to Firebase.</p>
                </div>
            </div>
            <div className="mt-6 rounded-lg bg-red-100 dark:bg-red-900/50 p-4 font-mono text-sm text-red-900 dark:text-red-200 border border-destructive/50">
                <p className="font-bold">Error Details:</p>
                <p>{message}</p>
            </div>
            <div className="mt-6 text-muted-foreground space-y-3">
                <p className="font-semibold text-foreground text-base">How to Fix:</p>
                <p>
                    1. Go to your project in the <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium text-primary hover:text-primary/80">Firebase Console</a>.
                </p>
                <p>
                    2. Select your project, click the gear icon for <span className="font-semibold">'Project settings'</span>.
                </p>
                <p>
                    3. Under the <span className="font-semibold">'General'</span> tab, scroll down to <span className="font-semibold">'Your apps'</span> and find your web app configuration.
                </p>
                <p>
                    4. Copy the configuration values and paste them into the <code className="bg-muted px-1 py-0.5 rounded-sm font-semibold text-foreground">.env</code> file in your project, replacing the placeholders.
                </p>
            </div>
        </div>
    </div>
);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
    // Check for config error first
    if (firebaseConfigError) {
        return <FirebaseErrorDisplay message={firebaseConfigError} />;
    }
    
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!firebaseAuth) { // Guard against null auth object
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (loading) return;

        const isAuthPage = pathname === '/';

        if (!user && !isAuthPage) {
            router.push('/');
        }
        if (user && isAuthPage) {
            router.push('/record');
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
