
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AboutPage() {
  return (
    <div className="container mx-auto p-4 pt-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                  <AvatarImage src="https://placehold.co/200x200.png" alt="Your Name" data-ai-hint="person portrait" />
                  <AvatarFallback>U</AvatarFallback>
              </Avatar>
          </div>
          <CardTitle className="text-3xl">About Me</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">Your Name / Your Title</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-lg">
            This is a placeholder about page. You can replace this text with your own biography, skills, and contact information. 
            Tell your visitors a little bit about yourself and what you do.
          </p>
           <p className="text-muted-foreground">
            This application was built using Next.js, React, Tailwind CSS, ShadCN UI, and Genkit for AI features. 
            It's a demonstration of how modern web technologies can be combined to create powerful and intelligent applications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
