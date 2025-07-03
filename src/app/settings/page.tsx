'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-4 pt-8 flex justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <p>Settings page is under construction.</p>
            <p>More customization options coming soon!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
