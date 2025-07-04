
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Linkedin, ExternalLink, Mail } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";

export default function AboutPage() {
  const { t } = useLanguage();
  return (
    <div className="container mx-auto p-4 pt-8 max-w-2xl">
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader className="items-center text-center p-8">
          <CardTitle className="text-3xl">Milton Diaz</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-1">{t('about_title')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center px-6 sm:px-8 pb-8">
          <p className="text-lg leading-relaxed">
            {t('about_description')}
          </p>
        </CardContent>
        <CardFooter className="flex-col sm:flex-row justify-center items-center gap-4 bg-muted/30 p-4 border-t flex-wrap">
           <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="https://www.linkedin.com/in/miltondz/" target="_blank" rel="noopener noreferrer">
                    <Linkedin /> {t('about_linkedin')}
                </Link>
           </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="https://canvasdesk.me" target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> {t('about_canvasdesk')}
                </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href="mailto:theideasaver@gmail.com">
                    <Mail /> {t('about_contact_email')}
                </a>
            </Button>
        </CardFooter>
      </Card>
      <div className="text-center mt-6">
        <p className="text-sm text-muted-foreground">
          {t('about_footer')}
        </p>
      </div>
    </div>
  );
}
