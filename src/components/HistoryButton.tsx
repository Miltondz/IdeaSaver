'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';

export function HistoryButton() {
  return (
    <Button
      asChild
      variant="outline"
      size="icon"
      className="fixed top-1/2 -translate-y-1/2 right-0 h-14 w-14 rounded-l-full shadow-lg bg-card/80 backdrop-blur-sm z-50 transition-transform duration-300 ease-in-out hover:translate-x-0 translate-x-10"
    >
      <Link href="/history">
        <History className="h-6 w-6" />
      </Link>
    </Button>
  );
}
