
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { saveSettings } from "@/lib/storage";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { LanguageToggle } from "@/components/language-toggle";
import { useRouter } from "next/navigation";
import { createPayment } from "@/ai/flows/create-payment-flow";


export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const { user, settings, refreshSettings } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleSelectPlan = async (plan: 'free' | 'pro') => {
    if (!user || !settings) {
        toast({ variant: "destructive", title: t('pricing_error_title'), description: t('pricing_select_error') });
        return;
    }

    if (plan === 'pro') {
      setIsProcessingPayment(true);
      try {
          const planDetails = {
              plan: billingCycle,
              planName: billingCycle === 'monthly' ? 'Monthly' : 'Yearly',
              amount: billingCycle === 'monthly' ? 7000 : 70000,
              currency: 'CLP',
          };

          if (!user.email) {
            throw new Error("User email is not available for payment.");
          }

          const result = await createPayment({
              userId: user.uid,
              userEmail: user.email,
              ...planDetails
          });

          if (result.redirectUrl) {
              window.location.href = result.redirectUrl;
          } else {
              throw new Error("Failed to get payment redirect URL.");
          }
      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Payment Error',
              description: error.message || 'Could not initiate the payment process. Please try again.',
          });
          setIsProcessingPayment(false);
      }
    } else {
       await saveSettings({
        ...settings,
        isPro: false,
        planSelected: true,
        cloudSyncEnabled: false,
        autoCloudSync: false,
        aiCredits: 3, // Welcome bonus
        monthlyCreditsLastUpdated: new Date().toISOString(),
      }, user.uid);
       toast({ 
          title: t('pricing_free_plan_selected'),
          description: t('pricing_free_plan_selected_desc'),
      });
      await refreshSettings();
      router.push('/record');
    }
  };
    
  return (
    <div className="container mx-auto py-12 px-4 relative">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">{t('pricing_title')}</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          {t('pricing_subtitle')}
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Tabs defaultValue="monthly" onValueChange={(value) => setBillingCycle(value as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="monthly">{t('pricing_monthly')}</TabsTrigger>
            <TabsTrigger value="yearly">{t('pricing_yearly')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="flex flex-col bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{t('pricing_free_plan_title')}</CardTitle>
            <CardDescription>{t('pricing_free_plan_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <p className="text-4xl font-bold">$0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">{t('pricing_free_feature_1')}</span></span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">{t('pricing_free_feature_2')}</span></span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_free_feature_3')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_free_feature_4')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_free_feature_5')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_free_feature_6')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_free_feature_7')}</span></li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => handleSelectPlan('free')}>
                {t('pricing_free_button')}
            </Button>
          </CardFooter>
        </Card>
        <Card className="border-primary flex flex-col bg-card/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>{t('pricing_pro_plan_title')}</CardTitle>
                <Badge>{t('pricing_pro_plan_badge')}</Badge>
            </div>
            <CardDescription>{t('pricing_pro_plan_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div>
              {billingCycle === 'monthly' ? (
                <p className="text-4xl font-bold">
                  $7.000
                  <span className="text-lg font-normal text-muted-foreground"> CLP / {t('pricing_month_short')}</span>
                </p>
              ) : (
                <>
                  <p className="text-4xl font-bold">
                    $70.000
                    <span className="text-lg font-normal text-muted-foreground">
                      {' '}CLP / {t('pricing_year_short')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground -mt-1">{t('pricing_pro_billed_yearly')}</p>
                </>
              )}
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">{t('pricing_pro_feature_1')}</span></span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_2')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_3')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_4')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_5')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_6')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_7')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_8')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_9')}</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>{t('pricing_pro_feature_10')}</span></li>
            </ul>
          </CardContent>
          <CardFooter>
             <Button className="w-full" onClick={() => handleSelectPlan('pro')} disabled={isProcessingPayment}>
                {isProcessingPayment ? <Loader2 className="animate-spin" /> : t('pricing_pro_button_upgrade')}
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
