
'use client';
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth as firebaseAuth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { getSettings, type AppSettings } from '@/lib/storage';

export const AuthContext = createContext<{ user: User | null; settings: AppSettings | null; loading: boolean }>({ user: null, settings: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!firebaseAuth) {
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userSettings = await getSettings(currentUser.uid);
                setSettings(userSettings);
            } else {
                setSettings(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const routeUser = () => {
            if (loading) return;

            const publicPages = ['/', '/pricing', '/forgot-password', '/terms', '/privacy', '/about'];

            if (!user) {
                if (!publicPages.includes(pathname)) {
                    if (pathname !== '/') router.push('/');
                }
                return;
            }
            
            if (settings) {
                const isAuthPage = pathname === '/';
                const isPricingPage = pathname === '/pricing';

                if (settings.planSelected) {
                    if (isAuthPage || isPricingPage) {
                        if (pathname !== '/record') router.push('/record');
                    }
                } else {
                    if (!isPricingPage && !isAuthPage) {
                        if (pathname !== '/pricing') router.push('/pricing');
                    }
                }
            }
        };

        routeUser();
    }, [user, settings, loading, router, pathname]);

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

    return <AuthContext.Provider value={{ user, settings, loading }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
