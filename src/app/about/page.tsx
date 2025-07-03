
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Linkedin, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="container mx-auto p-4 pt-8 max-w-2xl">
      <Card className="overflow-hidden shadow-lg border-primary/20">
        <div className="h-32 bg-gradient-to-r from-primary/10 to-accent/10" />
        <CardHeader className="items-center text-center -mt-16">
          <Avatar className="h-32 w-32 border-4 border-background shadow-md">
              <AvatarImage src="https://firebasestudio.com/api/files/view?path=f1c7b8e2-a3b4-4c5d-8e9f-a0b1c2d3e4f5.jpeg" alt="Milton Diaz" />
              <AvatarFallback>MD</AvatarFallback>
          </Avatar>
          <div className="pt-4">
            <CardTitle className="text-3xl">Milton Diaz</CardTitle>
            <CardDescription className="text-lg text-muted-foreground pt-1">Sole Developer & Creator</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 text-center px-6 sm:px-8 pb-8">
          <p className="text-lg leading-relaxed">
            👾 Hey, I'm Milton — a lifelong tech tinkerer and full-time code wrangler. I like building things that solve problems, break gracefully, and maybe even make life a bit easier. I'm always learning, always debugging, and never too far from a command line.
          </p>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row justify-center items-center gap-4 bg-muted/30 p-4 border-t">
           <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="https://www.linkedin.com/in/miltondz/" target="_blank" rel="noopener noreferrer">
                    <Linkedin /> LinkedIn
                </Link>
           </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="https://canvasdesk.me" target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Check out CanvasDesk
                </Link>
            </Button>
        </CardFooter>
      </Card>
      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          This application is proudly built with Next.js, React, and Genkit.
        </p>
      </div>
    </div>
  );
}
