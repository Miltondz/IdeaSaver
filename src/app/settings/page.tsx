
'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSettings, saveSettings, getLocalRecordings, deleteRecording as deleteRecordingFromStorage, AppSettings } from "@/lib/storage";
import { Settings, Trash2, Trello, Save, Database, Archive, Code, BarChart3, LayoutDashboard, Server, Gem, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { Recording } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/hooks/use-language";

type DeletionPolicy = "never" | "7" | "15" | "30";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { t } = useLanguage();
  
  const [localRecordings, setLocalRecordings] = useState<Recording[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { toast } = useToast();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  useEffect(() => {
    const handleSettingsChange = async () => {
        if (user) {
            setSettings(await getSettings(user.uid));
        }
    };
    if (user) {
        getSettings(user.uid).then(setSettings);
    }
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, [user]);
  
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return;
    setSettings(prev => prev ? ({ ...prev, [key]: value }) : null);
  };

  const refreshLocalRecordings = useCallback(() => {
    if (!user) return;
    const recs = getLocalRecordings(user.uid);
    setLocalRecordings(recs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [user]);


  const handleManageClick = () => {
    refreshLocalRecordings();
    setIsSheetOpen(true);
  };

  const handleDeleteLocal = async (id: string) => {
    if (!user) return;
    try {
      await deleteRecordingFromStorage(id, user.uid);
      refreshLocalRecordings();
      toast({ title: t('settings_sheet_delete_success') });
    } catch (error) {
       toast({ variant: "destructive", title: t('settings_sheet_delete_fail') });
    }
  };
  
  const formatBytes = (dataUri: string | undefined): string => {
      if (!dataUri) return 'N/A';
      // Basic approximation for base64 encoded data
      const bytes = (dataUri.length * 3/4); 
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSave = async () => {
    if (!user || !settings) return;
    await saveSettings(settings, user.uid);
    toast({
      title: t('settings_save_success_title'),
      description: t('settings_save_success'),
      className: "bg-accent text-accent-foreground border-accent",
    });
  };
  
  if (!user || !settings) {
    return (
        <div className="container mx-auto p-4 pt-8 flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        {t('settings_page_title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-8">
                     <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <p>{t('history_loading')}</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pt-8 flex flex-col items-center">
      {user.email === 'mdvoid@gmail.com' && (
         <Card className="w-full max-w-2xl mb-8 border-blue-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <LayoutDashboard className="h-6 w-6" />
              {t('settings_admin_title')}
            </CardTitle>
            <CardDescription>{t('settings_admin_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Code className="h-5 w-5" /> {t('settings_dev_controls')}</h3>
                  <div className="flex items-center space-x-2">
                      <Switch id="is-pro-dev" checked={settings.isPro} onCheckedChange={(checked) => updateSetting('isPro', checked)} />
                      <Label htmlFor="is-pro-dev">{t('settings_simulate_pro')}</Label>
                  </div>
              </div>
              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><BarChart3 className="h-5 w-5" /> {t('settings_ai_usage')}</h3>
                  <p className="text-sm text-muted-foreground">
                      {t('settings_ai_usage_desc')}
                  </p>
                  <Link
                      href={`https://console.cloud.google.com/vertex-ai/usage?project=${projectId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                  >
                      {t('settings_view_vertex_usage')}
                  </Link>
              </div>

              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Database className="h-5 w-5" /> {t('settings_db_management')}</h3>
                  <p className="text-sm text-muted-foreground">
                     {t('settings_db_management_desc')}
                  </p>
                   <Link
                      href={`https://console.firebase.google.com/project/${projectId}/firestore/data`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                  >
                      {t('settings_open_firestore')}
                  </Link>
              </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('settings_page_title')}
          </CardTitle>
          <CardDescription>{t('settings_page_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <fieldset>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Gem className="h-5 w-5" /> {t('settings_plan_credits')}</h3>
                    <div className="bg-muted/50 p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="font-semibold">{t('settings_current_plan')} <span className="text-primary">{settings.isPro ? t('settings_plan_pro') : t('settings_plan_free')}</span></p>
                            {!settings.isPro && (
                                <p className="text-sm text-muted-foreground">{t('settings_credits_remaining', { credits: settings.aiCredits, plural: settings.aiCredits !== 1 ? 's' : '' })}</p>
                            )}
                        </div>
                        {!settings.isPro && (
                            <Button asChild size="sm">
                                <Link href="/pricing">{t('settings_upgrade_to_pro')}</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </fieldset>

            <fieldset className="space-y-4 group">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Database className="h-5 w-5" /> {t('settings_cloud_sync')}</h3>
                     {!settings.isPro && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
                           <p className="font-semibold text-foreground/90">{t('settings_cloud_sync_pro_feature')}</p>
                           <p>{t('settings_cloud_sync_pro_feature_desc')}</p>
                           <Button size="sm" className="mt-2" asChild><Link href="/pricing">{t('settings_upgrade_to_pro')}</Link></Button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2" style={{ opacity: !settings.isPro ? 0.5 : 1 }}>
                        <Switch id="cloud-sync" checked={settings.cloudSyncEnabled} onCheckedChange={(checked) => updateSetting('cloudSyncEnabled', checked)} disabled={!settings.isPro}/>
                        <Label htmlFor="cloud-sync">{t('settings_enable_cloud_sync')}</Label>
                    </div>
                    {settings.cloudSyncEnabled && settings.isPro && (
                      <div className="flex items-center space-x-2 pl-4">
                          <Checkbox id="auto-send" checked={settings.autoCloudSync} onCheckedChange={(checked) => updateSetting('autoCloudSync', !!checked)} />
                          <Label htmlFor="auto-send">{t('settings_auto_save_cloud')}</Label>
                      </div>
                    )}
                </div>
            </fieldset>

            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><Trash2 className="h-5 w-5" /> {t('settings_auto_delete')}</h3>
                <p className="text-sm text-muted-foreground">{t('settings_auto_delete_desc')}</p>
                <RadioGroup value={settings.deletionPolicy} onValueChange={(value) => updateSetting('deletionPolicy', value as DeletionPolicy)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="never" id="never" /><Label htmlFor="never">{t('settings_delete_never')}</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="7" id="7" /><Label htmlFor="7">{t('settings_delete_7_days')}</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="15" id="15" /><Label htmlFor="15">{t('settings_delete_15_days')}</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="30" id="30" /><Label htmlFor="30">{t('settings_delete_30_days')}</Label></div>
                </RadioGroup>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="trello" className="border-b-0">
                <AccordionTrigger className="p-0 hover:no-underline">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Trello className="h-5 w-5" /> {t('settings_trello')}</h3>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {!settings.isPro && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
                        <p className="font-semibold text-foreground/90">{t('settings_trello_pro_feature')}</p>
                        <p>{t('settings_trello_pro_feature_desc')}</p>
                        <Button size="sm" className="mt-2" asChild><Link href="/pricing">{t('settings_upgrade_to_pro')}</Link></Button>
                    </div>
                  )}
                  <div style={{ opacity: !settings.isPro ? 0.5 : 1 }}>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('settings_trello_connect_desc')}
                    </p>
                    <Button disabled={!settings.isPro}>
                        {t('settings_connect_trello')}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end">
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> {t('settings_save_button')}</Button>
            </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" /> {t('settings_local_storage')}
          </CardTitle>
          <CardDescription>{t('settings_local_storage_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleManageClick}>{t('settings_manage_local')}</Button>
        </CardContent>
      </Card>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('settings_sheet_title')}</SheetTitle>
            <SheetDescription>
              {t('settings_sheet_desc')}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100%-8rem)] mt-4 pr-4">
            <div className="flex flex-col gap-4 py-4">
              {localRecordings.length > 0 ? localRecordings.map(rec => (
                <div key={rec.id} className="flex items-center justify-between gap-4 p-2 rounded-lg border">
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold truncate">{rec.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(rec.date).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Size: {formatBytes(rec.audioDataUri)}</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('history_delete_dialog_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('history_delete_dialog_desc')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteLocal(rec.id)}>{t('history_delete_button')}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )) : (
                <div className="text-muted-foreground text-center py-8">
                    <p>{t('settings_sheet_empty')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
