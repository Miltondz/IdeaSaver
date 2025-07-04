
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSettings } from '@/lib/storage';

export const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

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
        const routeUser = async () => {
            if (loading) return;

            const publicPages = ['/', '/pricing', '/forgot-password', '/terms', '/privacy', '/about'];

            // --- Logged out user routing ---
            if (!user) {
                if (!publicPages.includes(pathname)) {
                    if (pathname !== '/') router.push('/');
                }
                return;
            }

            // --- Logged in user routing ---
            const settings = await getSettings(user.uid);
            const isAuthPage = pathname === '/';
            const isPricingPage = pathname === '/pricing';

            if (settings.planSelected) {
                // User has completed onboarding, redirect them from auth/pricing pages.
                if (isAuthPage || isPricingPage) {
                    if (pathname !== '/record') router.push('/record');
                }
            } else {
                // User has NOT completed onboarding. They must select a plan.
                if (!isPricingPage && !isAuthPage) {
                    // If they try to navigate anywhere else (e.g. /history), force them to /pricing.
                    // We allow isAuthPage to prevent a redirect loop immediately after signup.
                    if (pathname !== '/pricing') router.push('/pricing');
                }
            }
        };

        routeUser();
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    const isProtectedPage = !['/', '/pricing', '/about', '/terms', '/privacy', '/forgot-password'].includes(pathname);
    if (!user && isProtectedPage) {
        return null;
    }


    return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
