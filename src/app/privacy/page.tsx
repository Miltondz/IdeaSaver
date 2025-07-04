
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto p-4 pt-8 max-w-3xl">
      <div className="mb-4">
        <Button variant="link" asChild className="pl-0">
            <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Link>
        </Button>
      </div>
      <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground prose dark:prose-invert max-w-none">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          <p>
            Your privacy is important to us. It is Idea Saver's policy to respect your privacy regarding any information we may collect from you across our website.
          </p>
          <h2>1. Information We Collect</h2>
          <p>
            We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used. The information we collect may include:
          </p>
          <ul>
            <li><strong>Account Information:</strong> When you register for an account, we collect your email address and name.</li>
            <li><strong>Voice and Transcription Data:</strong> We collect the audio you record and the transcriptions generated from it. This data is essential for the core functionality of the app.</li>
            <li><strong>Usage Data:</strong> We may collect information on how you use the app to help us improve our services.</li>
          </ul>
          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, operate, and maintain our services.</li>
            <li>Improve, personalize, and expand our services.</li>
            <li>Understand and analyze how you use our services.</li>
            <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes.</li>
          </ul>
          <h2>3. Data Storage</h2>
          <p>
            We only retain collected information for as long as necessary to provide you with your requested service. For Pro users with Cloud Sync, your data is stored securely in Firebase Firestore. For Free users, data is stored locally in your browser.
          </p>
          <h2>4. Security</h2>
          <p>
            The security of your data is important to us. We use industry-standard security measures to protect your information. However, no method of transmission over the Internet or method of electronic storage is 100% secure.
          </p>
          <h2>5. Your Consent</h2>
          <p>
            By using our website, you hereby consent to our Privacy Policy and agree to its terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
