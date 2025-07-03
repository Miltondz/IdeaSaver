"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Mic, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Footer() {
  const pathname = usePathname();

  const navItems = [
    { href: "/history", icon: History, label: "History" },
    { href: "/", icon: Mic, label: "Record" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <footer className="w-full max-w-md mx-auto fixed bottom-0 left-0 right-0 h-24 bg-black/30 backdrop-blur-lg rounded-t-[32px] flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Button
            key={item.href}
            variant="ghost"
            className={cn(
              "rounded-full flex-col h-auto p-2 gap-1",
              isActive ? "text-primary" : "text-white/50 hover:text-white"
            )}
            asChild
          >
            <Link href={item.href}>
              {item.label === "Record" ? (
                <div
                  className={cn(
                    "p-3 rounded-full",
                    isActive ? "bg-primary/20" : ""
                  )}
                >
                  <item.icon className="w-7 h-7" />
                </div>
              ) : (
                <item.icon className="w-7 h-7" />
              )}
              <span className="text-xs">{item.label}</span>
            </Link>
          </Button>
        );
      })}
    </footer>
  );
}
