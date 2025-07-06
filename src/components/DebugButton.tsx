'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bug, Copy, Check, Trash2 } from 'lucide-react';
import { useLogger } from '@/hooks/use-logger';
import { useLanguage } from '@/hooks/use-language';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function DebugButton() {
  const [open, setOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { logs, clearLogs } = useLogger();
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(logs.join('\n\n'));
    setIsCopied(true);
    toast({
        title: t('debug_drawer_copied_toast'),
        className: 'bg-accent text-accent-foreground border-accent',
    });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleClear = () => {
    clearLogs();
    toast({
        title: t('debug_drawer_cleared_toast'),
    });
  };

  return (
    <TooltipProvider>
        <Sheet open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                        <Button 
                        variant="outline" 
                        size="icon" 
                        className="fixed bottom-4 -translate-x-10 h-14 w-14 rounded-r-full shadow-lg bg-card/80 backdrop-blur-sm z-50 transition-transform duration-300 ease-in-out hover:translate-x-0 border-yellow-500/50"
                        >
                        <Bug className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                    <p>{t('tooltip_debug')}</p>
                </TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="w-[80vw] max-w-lg flex flex-col">
                <SheetHeader>
                <SheetTitle>{t('debug_drawer_title')}</SheetTitle>
                <SheetDescription>{t('debug_drawer_desc')}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 my-4 min-h-0">
                <ScrollArea className="h-full rounded-md border p-4">
                    <pre className="text-xs whitespace-pre-wrap">
                    {logs.length > 0 ? logs.join('\n\n') : 'No logs yet.'}
                    </pre>
                </ScrollArea>
                </div>
                <SheetFooter>
                    <Button variant="outline" onClick={handleClear}><Trash2 /> {t('debug_drawer_clear_button')}</Button>
                    <Button onClick={handleCopy}>
                        {isCopied ? <Check /> : <Copy />}
                        {t('debug_drawer_copy_button')}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    </TooltipProvider>
  );
}
