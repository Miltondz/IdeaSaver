'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
    
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Find the perfect plan</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Start for free, then choose a plan that fits your needs. Simple, transparent pricing.
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <Tabs defaultValue="monthly" onValueChange={(value) => setBillingCycle(value as any)} className="w-auto">
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly (Save 12%)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Free Plan</CardTitle>
            <CardDescription>Capture your key thoughts and experience the magic of AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <p className="text-4xl font-bold">$0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">Up to 2 Recordings</span> per month (Max 10 minutes per recording)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Transcription</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Naming</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Mobile Sharing Ready (Share via any app on your device)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Basic Note Editing (Edit your text manually)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Save up to 20 Notes permanently</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Basic Search within notes</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Dark Mode</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Email Support</span></li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/record">Start for Free</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card className="border-primary flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Pro Plan</CardTitle>
                <Badge>Most Popular</Badge>
            </div>
            <CardDescription>Unlock unlimited potential for your ideas with advanced AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div>
              {billingCycle === 'monthly' ? (
                <p className="text-4xl font-bold">
                  $7
                  <span className="text-lg font-normal text-muted-foreground">/mo</span>
                </p>
              ) : (
                <>
                  <p className="text-4xl font-bold">
                    $6.16
                    <span className="text-lg font-normal text-muted-foreground">
                      /mo
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground -mt-1">Billed yearly</p>
                </>
              )}
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">Unlimited</span> Recordings (Max 10 minutes per recording)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Transcription</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Naming</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Note Expansion <span className="font-semibold text-foreground">(Crucial upgrade feature)</span></span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Summarization</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Action Item Extraction</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Cloud Sync (Access notes across all your devices)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Unlimited Note Storage</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Advanced Search & Organization (Folders, Tags)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Trello Integration (and more coming!)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Priority Customer Support</span></li>
            </ul>
          </CardContent>
          <CardFooter>
             <Button className="w-full">
                Choose Plan (PayPal)
             </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
