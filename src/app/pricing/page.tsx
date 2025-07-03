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


      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Free Trial</CardTitle>
            <CardDescription>For getting started and trying out our features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <p className="text-4xl font-bold">$0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">10 Recordings</span> limit (7-day trial)</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Transcription</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Naming</span></li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
                <Link href="/record">Start Free Trial</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card className="border-primary flex flex-col">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Pro Plan</CardTitle>
                <Badge>Most Popular</Badge>
            </div>
            <CardDescription>For power users who need more.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <p className="text-4xl font-bold">
              {billingCycle === "monthly" ? "$6" : "$65"}
              <span className="text-lg font-normal text-muted-foreground">
                {billingCycle === "monthly" ? "/mo" : "/yr"}
              </span>
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span><span className="font-semibold text-foreground">Unlimited</span> Recordings</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Transcription</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Naming</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>AI-powered Note Expansion</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Trello Integration</span></li>
                 <li className="flex items-start gap-2"><CheckCircle2 className="text-primary w-4 h-4 mt-1 shrink-0"/> <span>Cloud Sync</span></li>
            </ul>
          </CardContent>
          <CardFooter>
             <Button className="w-full">
                Choose Plan
             </Button>
          </CardFooter>
        </Card>
        <Card className="flex flex-col">
          <CardHeader>
             <CardTitle>Pay as you go</CardTitle>
            <CardDescription>Top up with one-time credit purchases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
             <p className="text-4xl font-bold">Credits</p>
             <p className="text-sm text-muted-foreground">Purchase credits for transcription and AI features without a subscription.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
                Buy Credits
            </Button>
          </CardFooter>
        </Card>
      </div>

       <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {[{credits:1, price: 1.99, description: "To top off your balance"}, 
          {credits:10, price:16.99, off:"15%", description: "6 mins of human | 40 mins of AI"}, 
          {credits:30, price: 47.99, off:"20%", description: "20 mins of human | 120 mins of AI"}, 
          {credits:100, price:149.99, off:"25%", description: "60 mins of human | 400 mins of AI"}
         ].map(p => (
            <Card key={p.credits} className="flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{p.credits} Credit{p.credits > 1 ? 's' : ''}</CardTitle>
                        {p.off && <Badge variant="secondary" className="bg-primary/10 text-primary">{p.off} OFF</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-2xl font-bold">${p.price}</p>
                    <CardDescription className="text-xs mt-1">
                        {p.description}
                    </CardDescription>
                </CardContent>
                <CardFooter>
                     <Button variant="outline" className="w-full">Buy Now (PayPal)</Button>
                </CardFooter>
            </Card>
        ))}
       </div>
    </div>
  );
}
