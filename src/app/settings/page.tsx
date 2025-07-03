'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSettings, saveSettings } from "@/lib/storage";
import { Settings, KeyRound, Trash2, Trello, Save } from "lucide-react";

type DeletionPolicy = "never" | "7" | "15" | "30";

export default function SettingsPage() {
  const [deletionPolicy, setDeletionPolicy] = useState<DeletionPolicy>("never");
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const settings = getSettings();
    setDeletionPolicy(settings.deletionPolicy);
    setIsMounted(true);
  }, []);

  const handleSave = () => {
    saveSettings({ deletionPolicy });
    toast({
      title: "Settings Saved",
      description: "Your new settings have been applied.",
      className: "bg-accent text-accent-foreground border-accent",
    });
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
    <div className="container mx-auto p-4 pt-8 flex justify-center">
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
                <h3 className="text-lg font-medium flex items-center gap-2"><KeyRound className="h-5 w-5" /> API Keys</h3>
                <p className="text-sm text-muted-foreground">
                    Using your own API keys for services like Gemini or OpenRouter is a planned feature but is not yet available. The app currently uses a built-in configuration.
                </p>
                <Input placeholder="Gemini or OpenRouter API Key" disabled />
            </div>

            <div className="space-y-4">
                 <h3 className="text-lg font-medium flex items-center gap-2"><Trello className="h-5 w-5" /> Trello Integration</h3>
                 <p className="text-sm text-muted-foreground">
                    Trello integration is planned for a future update. This will allow you to create Trello cards directly from your transcriptions.
                 </p>
                 <Input placeholder="Trello API Key" disabled />
                 <Input placeholder="Trello Token" disabled />
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Database Storage</h3>
                <p className="text-sm text-muted-foreground">
                    Your notes are currently saved in your browser's local storage. A cloud database integration is a planned feature for syncing across devices.
                </p>
            </div>
            
            <div className="flex justify-end">
                <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
