
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageSquarePlus, Send, Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from '@/hooks/use-toast';

type FeedbackType = 'bug' | 'suggestion' | 'other';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t } = useLanguage();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!message.trim()) {
      toast({
        variant: 'destructive',
        title: t('feedback_message_required_title'),
        description: t('feedback_message_required_desc'),
      });
      return;
    }

    setIsSubmitting(true);
    
    // Using mailto: as a simple and effective initial implementation
    const subject = encodeURIComponent(t('feedback_email_subject', { type: t(`feedback_type_${feedbackType}`) }));
    const body = encodeURIComponent(message);
    window.location.href = `mailto:theideasaver@gmail.com?subject=${subject}&body=${body}`;

    setTimeout(() => {
        setIsSubmitting(false);
        setOpen(false);
        setMessage('');
        toast({
            title: t('feedback_thank_you_title'),
            description: t('feedback_thank_you_desc'),
            className: 'bg-accent text-accent-foreground border-accent',
        });
    }, 1000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="fixed bottom-4 left-4 h-14 w-14 rounded-full shadow-lg bg-card/80 backdrop-blur-sm z-50">
          <MessageSquarePlus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('feedback_dialog_title')}</DialogTitle>
          <DialogDescription>{t('feedback_dialog_desc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>{t('feedback_type_label')}</Label>
            <RadioGroup value={feedbackType} onValueChange={(value: FeedbackType) => setFeedbackType(value)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bug" id="bug" />
                <Label htmlFor="bug">{t('feedback_type_bug')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="suggestion" id="suggestion" />
                <Label htmlFor="suggestion">{t('feedback_type_suggestion')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">{t('feedback_type_other')}</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t('feedback_message_label')}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback_message_placeholder')}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
            {t('feedback_submit_button')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
