
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSettings, saveSettings, getLocalRecordings, deleteRecording as deleteRecordingFromStorage } from "@/lib/storage";
import { Settings, KeyRound, Trash2, Trello, Save, Database, Copy, Archive } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { Recording } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


type DeletionPolicy = "never" | "7" | "15" | "30";

export default function SettingsPage() {
  const [deletionPolicy, setDeletionPolicy] = useState<DeletionPolicy>("never");
  const [trelloApiKey, setTrelloApiKey] = useState("");
  const [trelloToken, setTrelloToken] = useState("");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [dbIntegrationEnabled, setDbIntegrationEnabled] = useState(false);
  const [autoSendToDB, setAutoSendToDB] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [localRecordings, setLocalRecordings] = useState<Recording[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const settings = getSettings();
    setDeletionPolicy(settings.deletionPolicy);
    setTrelloApiKey(settings.trelloApiKey || "");
    setTrelloToken(settings.trelloToken || "");
    setAiApiKey(settings.aiApiKey || "");
    setAiModel(settings.aiModel || "gemini-2.0-flash");
    setDbIntegrationEnabled(settings.dbIntegrationEnabled || false);
    setAutoSendToDB(settings.autoSendToDB || false);
    setIsMounted(true);
  }, []);
  
  const refreshLocalRecordings = () => {
    const recs = getLocalRecordings();
    setLocalRecordings(recs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleManageClick = () => {
    refreshLocalRecordings();
    setIsSheetOpen(true);
  };

  const handleDeleteLocal = async (id: string) => {
    try {
      await deleteRecordingFromStorage(id);
      refreshLocalRecordings();
      toast({ title: "Recording Deleted" });
    } catch (error) {
       toast({ variant: "destructive", title: "Deletion Failed" });
    }
  };
  
  const formatBytes = (dataUri: string | undefined): string => {
      if (!dataUri) return 'N/A';
      // The Base64 encoded string is about 33% larger than the raw data.
      // (length * 3/4) is a close approximation of the original file size.
      const bytes = (dataUri.length * 3/4);
      if (bytes < 1) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSave = () => {
    saveSettings({
      deletionPolicy,
      trelloApiKey,
      trelloToken,
      aiApiKey,
      aiModel,
      dbIntegrationEnabled,
      autoSendToDB
    });
    toast({
      title: "Settings Saved",
      description: "Your new settings have been applied.",
      className: "bg-accent text-accent-foreground border-accent",
    });
  };

  const handlePaste = async (setter: React.Dispatch<React.SetStateAction<string>>) => {
    try {
      const text = await navigator.clipboard.readText();
      setter(text);
      toast({ title: "Pasted from clipboard!" });
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to paste", description: "Please grant clipboard permissions." });
    }
  };
  
  if (!isMounted) {
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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </CardTitle>
          <CardDescription>Manage your application settings and integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">

            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><Database className="h-5 w-5" /> Database Integration</h3>
                <div className="flex items-center space-x-2">
                  <Switch id="db-integration" checked={dbIntegrationEnabled} onCheckedChange={setDbIntegrationEnabled} />
                  <Label htmlFor="db-integration">Enable Cloud Database (Firebase)</Label>
                </div>
                <p className="text-sm text-muted-foreground">Saves your notes to a cloud database, allowing access across devices. Requires Firebase setup.</p>
                {dbIntegrationEnabled && (
                  <div className="flex items-center space-x-2 pl-4">
                    <Checkbox id="auto-send" checked={autoSendToDB} onCheckedChange={(checked) => setAutoSendToDB(!!checked)} />
                    <Label htmlFor="auto-send">Automatically save new notes to cloud</Label>
                  </div>
                )}
            </div>
            
            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><Trash2 className="h-5 w-5" /> Auto-delete Recordings</h3>
                <p className="text-sm text-muted-foreground">Automatically delete old recordings to save space. This cannot be undone.</p>
                <RadioGroup value={deletionPolicy} onValueChange={(value) => setDeletionPolicy(value as DeletionPolicy)}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="never" id="never" />
                        <Label htmlFor="never">Never</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="7" id="7" />
                        <Label htmlFor="7">After 7 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="15" id="15" />
                        <Label htmlFor="15">After 15 days</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="30" id="30" />
                        <Label htmlFor="30">After 30 days</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2"><KeyRound className="h-5 w-5" /> API Keys & Models</h3>
                <div className="space-y-2">
                    <Label htmlFor="ai-key">AI Provider API Key</Label>
                    <div className="flex items-center gap-2">
                      <Input id="ai-key" type="password" placeholder="Enter your provider API Key" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} />
                      <Button variant="ghost" size="icon" onClick={() => handlePaste(setAiApiKey)}><Copy className="h-4 w-4" /></Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="ai-model">AI Model Name</Label>
                    <div className="flex items-center gap-2">
                      <Input id="ai-model" type="text" placeholder="e.g., openai/gpt-4 or gemini-2.0-flash" value={aiModel} onChange={(e) => setAiModel(e.target.value)} />
                       <Button variant="ghost" size="icon" onClick={() => handlePaste(setAiModel)}><Copy className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-sm text-muted-foreground">Specify the model name for AI features. If no provider is included, 'googleai/' will be used.</p>
                </div>
            </div>

            <div className="space-y-4">
                 <h3 className="text-lg font-medium flex items-center gap-2"><Trello className="h-5 w-5" /> Trello Integration</h3>
                 <div className="space-y-2">
                    <Label htmlFor="trello-key">Trello API Key</Label>
                     <div className="flex items-center gap-2">
                      <Input id="trello-key" type="password" placeholder="Enter your Trello API Key" value={trelloApiKey} onChange={(e) => setTrelloApiKey(e.target.value)} />
                       <Button variant="ghost" size="icon" onClick={() => handlePaste(setTrelloApiKey)}><Copy className="h-4 w-4" /></Button>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="trello-token">Trello Token</Label>
                     <div className="flex items-center gap-2">
                      <Input id="trello-token" type="password" placeholder="Enter your Trello Token" value={trelloToken} onChange={(e) => setTrelloToken(e.target.value)} />
                       <Button variant="ghost" size="icon" onClick={() => handlePaste(setTrelloToken)}><Copy className="h-4 w-4" /></Button>
                    </div>
                 </div>
            </div>
            
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
                          This action cannot be undone and will permanently delete the recording from your device and the cloud (if synced).
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
                    <p>No local recordings found.</p>
                    <p className="text-xs mt-1">Recordings appear here when cloud sync is disabled.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
