
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
import { Settings, Trash2, Trello, Save, Database, Archive, Code, BarChart3, LayoutDashboard, Server, Gem } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { Recording } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type DeletionPolicy = "never" | "7" | "15" | "30";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings(user?.uid));
  const [isMounted, setIsMounted] = useState(false);
  
  const [localRecordings, setLocalRecordings] = useState<Recording[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { toast } = useToast();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  useEffect(() => {
    setIsMounted(true);
    const handleSettingsChange = () => {
        if (user) {
            setSettings(getSettings(user.uid));
        }
    };
    if (user) {
        setSettings(getSettings(user.uid));
    }
    window.addEventListener('storage', handleSettingsChange);
    return () => window.removeEventListener('storage', handleSettingsChange);
  }, [user]);
  
  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      toast({ title: "Recording Deleted" });
    } catch (error) {
       toast({ variant: "destructive", title: "Deletion Failed" });
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

  const handleSave = () => {
    if (!user) return;
    saveSettings(settings, user.uid);
    toast({
      title: "Settings Saved",
      description: "Your new settings have been applied.",
      className: "bg-accent text-accent-foreground border-accent",
    });
  };
  
  if (!isMounted || !user) {
    return (
        <div className="container mx-auto p-4 pt-8 flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        Settings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Loading settings...</p>
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
              Admin Dashboard
            </CardTitle>
            <CardDescription>Usage tracking, cost management, and developer controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Code className="h-5 w-5" /> Developer Controls</h3>
                  <div className="flex items-center space-x-2">
                      <Switch id="is-pro-dev" checked={settings.isPro} onCheckedChange={(checked) => updateSetting('isPro', checked)} />
                      <Label htmlFor="is-pro-dev">Simulate Pro User</Label>
                  </div>
              </div>
              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><BarChart3 className="h-5 w-5" /> AI Usage & Cost Tracking</h3>
                  <p className="text-sm text-muted-foreground">
                      Monitor your AI model usage and associated costs directly in the Google Cloud console. This is the most accurate source for billing information.
                  </p>
                  <Link
                      href={`https://console.cloud.google.com/vertex-ai/usage?project=${projectId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                  >
                      View Vertex AI Usage
                  </Link>
              </div>

              <div className="space-y-4">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Database className="h-5 w-5" /> Database Management</h3>
                  <p className="text-sm text-muted-foreground">
                     Manage your Firestore database, including collections, documents, and security rules.
                  </p>
                   <Link
                      href={`https://console.firebase.google.com/project/${projectId}/firestore/data`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
                  >
                      Open Firestore Console
                  </Link>
              </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </CardTitle>
          <CardDescription>Manage your application settings and integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <fieldset>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Gem className="h-5 w-5" /> Plan & Credits</h3>
                    <div className="bg-muted/50 p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="font-semibold">Your current plan: <span className="text-primary">{settings.isPro ? 'Pro' : 'Free'}</span></p>
                            {!settings.isPro && (
                                <p className="text-sm text-muted-foreground">You have <span className="font-bold text-foreground">{settings.aiCredits}</span> AI credits remaining.</p>
                            )}
                        </div>
                        {!settings.isPro && (
                            <Button asChild size="sm">
                                <Link href="/pricing">Upgrade to Pro</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </fieldset>

            <fieldset className="space-y-4 group">
                <div className="space-y-2">
                    <h3 className="text-lg font-medium flex items-center gap-2"><Database className="h-5 w-5" /> Cloud Sync</h3>
                     {!settings.isPro && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
                           <p className="font-semibold text-foreground/90">Cloud Sync is a Pro feature.</p>
                           <p>Sync your notes securely across all your devices and ensure they're always backed up.</p>
                           <Button size="sm" className="mt-2" asChild><Link href="/pricing">Upgrade to Pro</Link></Button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2" style={{ opacity: !settings.isPro ? 0.5 : 1 }}>
                        <Switch id="cloud-sync" checked={settings.cloudSyncEnabled} onCheckedChange={(checked) => updateSetting('cloudSyncEnabled', checked)} disabled={!settings.isPro}/>
                        <Label htmlFor="cloud-sync">Enable Cloud Sync</Label>
                    </div>
                    {settings.cloudSyncEnabled && (
                    <div className="flex items-center space-x-2 pl-4" style={{ opacity: !settings.isPro ? 0.5 : 1 }}>
                        <Checkbox id="auto-send" checked={settings.autoCloudSync} onCheckedChange={(checked) => updateSetting('autoCloudSync', !!checked)} disabled={!settings.isPro} />
                        <Label htmlFor="auto-send">Automatically save new notes to cloud</Label>
                    </div>
                    )}
                </div>
            </fieldset>

            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><Trash2 className="h-5 w-5" /> Auto-delete Recordings</h3>
                <p className="text-sm text-muted-foreground">Automatically delete old local recordings to save space on your device. This cannot be undone.</p>
                <RadioGroup value={settings.deletionPolicy} onValueChange={(value) => updateSetting('deletionPolicy', value as DeletionPolicy)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="never" id="never" /><Label htmlFor="never">Never</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="7" id="7" /><Label htmlFor="7">After 7 days</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="15" id="15" /><Label htmlFor="15">After 15 days</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="30" id="30" /><Label htmlFor="30">After 30 days</Label></div>
                </RadioGroup>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="trello" className="border-b-0">
                <AccordionTrigger className="p-0 hover:no-underline">
                  <h3 className="text-lg font-medium flex items-center gap-2"><Trello className="h-5 w-5" /> Trello Integration</h3>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-4">
                  {!settings.isPro && (
                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border border-dashed">
                        <p className="font-semibold text-foreground/90">Trello Integration is a Pro feature.</p>
                        <p>Connect ideas directly to your Trello boards for seamless project management.</p>
                        <Button size="sm" className="mt-2" asChild><Link href="/pricing">Upgrade to Pro</Link></Button>
                    </div>
                  )}
                  <div style={{ opacity: !settings.isPro ? 0.5 : 1 }}>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your Trello account to seamlessly create cards from your notes.
                    </p>
                    <Button disabled={!settings.isPro}>
                        Connect to Trello
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <div className="flex justify-end">
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
            </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" /> Local Storage Management
          </CardTitle>
          <CardDescription>View and manage recordings stored directly on this device's browser storage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleManageClick}>Manage Local Recordings</Button>
        </CardContent>
      </Card>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Local Device Recordings</SheetTitle>
            <SheetDescription>
              These recordings are saved in your browser. Deleting them here is permanent.
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
                        <AlertDialogTitle>Delete this recording?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone and will permanently delete the recording from your device.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteLocal(rec.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )) : (
                <div className="text-muted-foreground text-center py-8">
                    <p>No local recordings found for this user.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
