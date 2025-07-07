
'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { saveSettings, getLocalRecordings, deleteRecording as deleteRecordingFromStorage, AppSettings, deleteUserData, clearUserLocalStorage } from "@/lib/storage";
import { Settings, Trash2, Trello, Save, Database, Archive, Code, BarChart3, LayoutDashboard, Gem, Loader2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Recording } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { deleteUser, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

type DeletionPolicy = "never" | "7" | "15" | "30";

export default function SettingsPage() {
  const { user, settings: contextSettings, refreshSettings } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const { t } = useLanguage();
  const router = useRouter();
  
  const [localRecordings, setLocalRecordings] = useState<Recording[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false);
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { toast } = useToast();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  useEffect(() => {
    if (contextSettings) {
        setSettings(contextSettings);
        setHasChanges(false);
    }
  }, [contextSettings]);
  
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    if (key === 'cloudSyncEnabled' && !value) {
      newSettings.autoCloudSync = false;
    }
    setSettings(newSettings);
    setHasChanges(true);
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
    setHasChanges(false);
    toast({
      title: t('settings_save_success_title'),
      description: t('settings_save_success'),
      className: "bg-accent text-accent-foreground border-accent",
    });
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    setIsDeleting(true);
    try {
        await deleteUserData(user.uid);
        clearUserLocalStorage(user.uid);
        await deleteUser(auth.currentUser);
        toast({ title: t('settings_account_deleted_title'), description: t('settings_account_deleted_desc') });
        // The useAuth hook will handle the redirect to the login page after deleteUser signs out.
    } catch(error: any) {
        if (error.code === 'auth/requires-recent-login') {
            toast({ variant: "destructive", title: t('settings_reauth_required_title'), description: t('settings_reauth_required_desc') });
            await signOut(auth); // Sign out the user automatically
            // The useAuth hook will catch the auth state change and redirect to login.
        } else {
            toast({ variant: "destructive", title: t('settings_delete_account_fail_title'), description: `${t('settings_delete_account_fail_desc')} ${error.message}` });
        }
    } finally {
        setIsDeleting(false);
        setShowDeleteConfirm1(false);
        setShowDeleteConfirm2(false);
    }
  };

  const handleDowngradeToFree = async () => {
    if (!user || !settings) return;
    await saveSettings({
        ...settings,
        isPro: false,
        cloudSyncEnabled: false,
        autoCloudSync: false,
        proTrialEndsAt: undefined,
        subscriptionEndsAt: undefined,
    }, user.uid);
    await refreshSettings();
    toast({
        title: t('settings_downgrade_success_title'),
        description: t('settings_downgrade_success_desc'),
    });
  };
  
  if (!user || !settings) {
    return null; // The global loader in AppShell will be visible
  }

  return (
    <div className="container mx-auto p-4 pt-8 flex flex-col items-center gap-8">
      <div className="w-full max-w-2xl flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Settings className="h-8 w-8" />
            {t('settings_page_title')}
          </h1>
          <p className="text-muted-foreground">{t('settings_page_desc')}</p>
      </div>

      {user.email === 'mdvoid@gmail.com' && (
         <Card className="w-full max-w-2xl border-blue-500/50 bg-card/80 backdrop-blur-sm">
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

      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gem className="h-5 w-5" /> {t('settings_plan_credits')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <p className="font-semibold">{t('settings_current_plan')} <span className="text-primary">{settings.isPro ? t('settings_plan_pro') : t('settings_plan_free')}</span></p>
                  {!settings.isPro && (
                      <p className="text-sm text-muted-foreground">{t('settings_credits_remaining', { credits: settings.aiCredits, plural: settings.aiCredits !== 1 ? 's' : '' })}</p>
                  )}
              </div>
              {settings.isPro ? (
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">{t('settings_downgrade_to_free')}</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>{t('settings_downgrade_confirm_title')}</AlertDialogTitle>
                              <AlertDialogDescription>
                              {t('settings_downgrade_confirm_desc')}
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDowngradeToFree}>{t('settings_downgrade_confirm_button')}</AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
              ) : (
                  <Button size="sm" onClick={() => router.push('/pricing')}>
                      {t('settings_upgrade_to_pro')}
                  </Button>
              )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> {t('settings_data_and_sync_title')}</CardTitle>
            <CardDescription>{t('settings_data_and_sync_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4 group">
                <h3 className="text-lg font-medium flex items-center gap-2">{t('settings_cloud_sync')}</h3>
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
                {settings.isPro && settings.cloudSyncEnabled && (
                  <div className="flex items-center space-x-2 pl-4">
                      <Switch id="auto-send" checked={settings.autoCloudSync} onCheckedChange={(checked) => updateSetting('autoCloudSync', !!checked)} />
                      <Label htmlFor="auto-send">{t('settings_auto_save_cloud')}</Label>
                  </div>
                )}
            </div>
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
            <div className="space-y-4">
                 <h3 className="text-lg font-medium flex items-center gap-2"><Archive className="h-5 w-5" /> {t('settings_local_storage')}</h3>
                 <p className="text-sm text-muted-foreground">{t('settings_local_storage_desc')}</p>
                 <Button variant="outline" onClick={handleManageClick}>{t('settings_manage_local')}</Button>
            </div>
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trello className="h-5 w-5" /> {t('settings_trello')}</CardTitle>
        </CardHeader>
        <CardContent>
            {!settings.isPro && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed mb-4">
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
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-2xl mt-8 border-destructive/50 bg-destructive/5 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('settings_danger_zone_title')}
            </CardTitle>
            <CardDescription className="text-destructive/80">{t('settings_danger_zone_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm1(true)} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="animate-spin mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {t('settings_delete_account_button')}
            </Button>
        </CardContent>
      </Card>

      <div className="w-full max-w-2xl flex justify-end pb-8">
          <Button onClick={handleSave} disabled={!hasChanges}><Save className="mr-2 h-4 w-4" /> {t('settings_save_button')}</Button>
      </div>

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

       <AlertDialog open={showDeleteConfirm1} onOpenChange={setShowDeleteConfirm1}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings_delete_confirm1_title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('settings_delete_confirm1_desc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction 
                  className={cn(buttonVariants({ variant: "destructive" }))}
                  onClick={() => { setShowDeleteConfirm1(false); setShowDeleteConfirm2(true); }}
                >
                  {t('settings_delete_confirm1_button')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteConfirm2} onOpenChange={setShowDeleteConfirm2}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('settings_delete_confirm2_title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('settings_delete_confirm2_desc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('history_cancel_button')}</AlertDialogCancel>
                <AlertDialogAction 
                  className={cn(buttonVariants({ variant: "destructive" }))}
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="animate-spin" /> : t('settings_delete_confirm2_button')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
