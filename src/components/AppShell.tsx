
'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lightbulb, Settings, LogOut, Menu, Sun, Moon, Gem, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';
import { Separator } from './ui/separator';
import { useTheme } from 'next-themes';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { LanguageToggle } from './language-toggle';
import { FeedbackButton } from './FeedbackButton';
import { HistoryButton } from './HistoryButton';
import { useNavigationLoader } from '@/hooks/use-navigation-loader';
import { PlanBadge } from './PlanBadge';
import { DebugButton } from './DebugButton';

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

function Header() {
    const pathname = usePathname();
    const router = useRouter();
    const { toast } = useToast();
    const [open, setOpen] = React.useState(false);
    const { user, refreshSettings } = useAuth();
    const { t } = useLanguage();

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key && e.key.includes('voice-note-settings')) {
                refreshSettings();
            }
        }
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [refreshSettings]);

    const handleLogout = async () => {
      if (!auth) {
        toast({ variant: 'destructive', title: t('logout_fail_title'), description: t('auth_config_error') });
        return;
      }
      try {
        await signOut(auth);
        router.push('/');
        toast({ title: t('logout_success_title'), description: t('logout_success_desc') });
      } catch (error) {
        toast({ variant: 'destructive', title: t('logout_fail_title'), description: t('logout_fail_desc') });
      }
    };

    const navItems = [
        { href: '/record', label: t('nav_record') },
        { href: '/history', label: t('nav_history') },
        { href: '/settings', label: t('nav_settings') },
        { href: '/about', label: t('nav_about') },
    ];
    
    if (!user) return null;

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-card/80 backdrop-blur-sm">
            <div className="container flex h-14 items-center">
                <div className="mr-auto flex items-center">
                    <Link href="/record" className="mr-6 flex items-center space-x-2">
                        <Lightbulb className="h-6 w-6 text-primary"/>
                        <span className="font-bold hidden sm:inline-block">{t('appName')}</span>
                    </Link>
                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "transition-colors hover:text-foreground/80",
                                    pathname === item.href ? "text-foreground" : "text-foreground/60"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                     <PlanBadge />
                     <LanguageToggle />
                     <ThemeToggle />
                     <div className="hidden md:flex">
                        <Button variant="ghost" onClick={handleLogout}>{t('logout')} <LogOut className="ml-2 h-4 w-4"/></Button>
                     </div>
                     {/* Mobile Nav */}
                     <div className="md:hidden">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Menu />
                                    <span className="sr-only">Toggle Menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle className="sr-only">Menu</SheetTitle>
                                    <SheetDescription className="sr-only">Main application navigation and options.</SheetDescription>
                                </SheetHeader>
                                <div className="flex justify-end p-4 pb-0">
                                    <PlanBadge />
                                </div>
                                <div className="p-4">
                                  <nav className="flex flex-col gap-4">
                                      {navItems.map((item) => (
                                          <Link
                                              key={item.href}
                                              href={item.href}
                                              onClick={() => setOpen(false)}
                                              className={cn(
                                                  "block px-2 py-1 text-lg",
                                                  pathname === item.href ? "font-bold" : "text-muted-foreground"
                                              )}
                                          >
                                              {item.label}
                                          </Link>
                                      ))}
                                      <Separator className="my-2" />
                                      <Button variant="outline" className="w-full" onClick={() => { handleLogout(); setOpen(false); }}>
                                        <LogOut className="mr-2 h-4 w-4"/>
                                        {t('logout')}
                                      </Button>
                                  </nav>
                                </div>
                            </SheetContent>
                        </Sheet>
                     </div>
                </div>
            </div>
        </header>
    );
}

const LoadingOverlay = () => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isNavigating } = useNavigationLoader();
  const { t } = useLanguage();

  const noShellRoutes = ['/', '/pricing', '/forgot-password', '/terms', '/privacy'];
  
  if (loading) {
     return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
            <div className="bg-primary/10 border border-primary/20 rounded-full p-4">
                <Lightbulb className="h-12 w-12 text-primary" />
            </div>
            <div className="flex items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                <p className="ml-3 text-lg">{t('history_loading')}</p>
            </div>
        </div>
    );
  }
  
  if (noShellRoutes.includes(pathname) || !user) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {isNavigating && <LoadingOverlay />}
      <Header />
      <main className="flex-1">{children}</main>
      <FeedbackButton />
      <HistoryButton />
      <DebugButton />
    </div>
  );
}
