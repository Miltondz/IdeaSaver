
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Badge } from '@/components/ui/badge';
import { Gem, Sparkles } from 'lucide-react';

export function PlanBadge() {
    const { settings } = useAuth();
    const { t } = useLanguage();

    if (!settings) {
        return null;
    }

    if (settings.isPro) {
        return (
             <Badge variant="outline" className="border-green-500/50 text-green-600 dark:text-green-400 font-semibold">
                <Gem className="mr-2 h-3 w-3" />
                {t('settings_plan_pro')}
            </Badge>
        )
    }

    // Free user logic
    if (!settings.isPro) {
        return (
            <Badge variant="outline" className="border-primary/50 text-primary font-semibold">
                <Sparkles className="mr-2 h-3 w-3" />
                {t('header_credit_display', { credits: settings.aiCredits, plural: settings.aiCredits !== 1 ? 's' : '' })}
            </Badge>
        );
    }

    return null;
}
