
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export const AuthContext = createContext<{ user: User | null }>({ user: null });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!firebaseAuth) {
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
        const isPricingPage = pathname === '/pricing';
        const isPublicPage = isAuthPage || isPricingPage;

        // If there's no user and they are on a private page, redirect to login.
        if (!user && !isPublicPage) {
            router.push('/');
        }
        
        // If there IS a user and they are on the login page, redirect to the app.
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
