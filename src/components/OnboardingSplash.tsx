
'use client';

import { useState } from 'react';
import { useLanguage } from '@/hooks/use-language';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb, Sparkles, Cloud } from 'lucide-react';

interface OnboardingSplashProps {
  onComplete: (dontShowAgain: boolean) => void;
}

const steps = [
  {
    icon: Lightbulb,
    titleKey: 'onboarding_step1_title',
    descKey: 'onboarding_step1_desc',
  },
  {
    icon: Sparkles,
    titleKey: 'onboarding_step2_title',
    descKey: 'onboarding_step2_desc',
  },
  {
    icon: Cloud,
    titleKey: 'onboarding_step3_title',
    descKey: 'onboarding_step3_desc',
  },
];

export function OnboardingSplash({ onComplete }: OnboardingSplashProps) {
  const { t } = useLanguage();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onComplete(dontShowAgain)}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <Carousel className="w-full">
          <CarouselContent>
            {steps.map((step, index) => (
              <CarouselItem key={index}>
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="bg-primary/10 text-primary p-4 rounded-full">
                    <step.icon className="h-10 w-10" />
                  </div>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{t(step.titleKey as any)}</DialogTitle>
                  </DialogHeader>
                  <p className="text-muted-foreground">{t(step.descKey as any)}</p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>

        <DialogFooter className="flex-col sm:flex-col sm:space-x-0 gap-4 p-6 border-t bg-muted/50">
           <Button onClick={() => onComplete(dontShowAgain)} size="lg">
              {t('onboarding_get_started')}
            </Button>
            <div className="flex items-center space-x-2 justify-center">
                <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(!!checked)} />
                <label
                    htmlFor="dont-show-again"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-muted-foreground"
                >
                    {t('onboarding_dont_show_again')}
                </label>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
