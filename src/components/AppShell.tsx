'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Mic, History, Settings, User, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import React from 'react';
import { Separator } from './ui/separator';

function Header() {
    const pathname = usePathname();
    const [open, setOpen] = React.useState(false);

    const navItems = [
        { href: '/record', label: 'Record' },
        { href: '/history', label: 'History' },
        { href: '/settings', label: 'Settings' },
        { href: '/about', label: 'About' },
    ];
    
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center">
                <div className="mr-auto flex items-center">
                    <Link href="/record" className="mr-6 flex items-center space-x-2">
                        <Mic className="h-6 w-6"/>
                        <span className="font-bold hidden sm:inline-block">Audio Capture</span>
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

                <div className="flex items-center space-x-2">
                     <div className="hidden md:flex">
                        <Link href="/">
                            <Button variant="ghost">Logout <LogOut className="ml-2 h-4 w-4"/></Button>
                        </Link>
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
                                <div className="p-4">
                                  <nav className="flex flex-col gap-4 mt-4">
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
                                      <Link href="/" onClick={() => setOpen(false)}>
                                          <Button variant="outline" className="w-full">
                                            <LogOut className="mr-2 h-4 w-4"/>
                                            Logout
                                          </Button>
                                      </Link>
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


export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}
