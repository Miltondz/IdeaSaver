
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Mic, History, Settings, User, LogOut } from 'lucide-react';

function NavContent() {
    const pathname = usePathname();

    const navItems = [
        { href: '/record', label: 'Record', icon: Mic },
        { href: '/history', label: 'History', icon: History },
        { href: '/settings', label: 'Settings', icon: Settings },
        { href: '/about', label: 'About', icon: User },
    ];
    
    return (
        <>
            <SidebarHeader>
                <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary text-primary flex items-center justify-center">
                        <Mic className="w-5 h-5"/>
                    </div>
                    <h1 className="text-lg font-semibold tracking-tight group-data-[collapsible=icon]:hidden">Audio Capture</h1>
                </div>
                <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Logout">
                    <Link href="/">
                        <LogOut />
                        <span>Logout</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
        </>
    )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname === '/' || pathname === '/pricing';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <NavContent />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
