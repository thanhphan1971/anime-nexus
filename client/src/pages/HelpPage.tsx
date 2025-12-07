import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Mail, MessageCircle, FileText, Shield, Bug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function HelpPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Support Request Sent",
        description: "An admin will reply to your inbox shortly.",
        className: "bg-green-500/10 border-green-500 text-green-500"
      });
    }, 1500);
  };

  const faqs = [
    {
      question: "How do I get more Daily Tokens?",
      answer: "You receive 1 Free Token every day at midnight (UTC). S-Class members receive 5 Tokens daily. You can also earn tokens by completing community challenges or trading cards in the Marketplace."
    },
    {
      question: "What are the benefits of S-Class?",
      answer: "S-Class Elite members get 5x Daily Summons, higher luck for UR cards, animated profile avatars, exclusive access to VIP chat rooms, and the ability to see who liked their profile in Find Nakama."
    },
    {
      question: "How does the 'Find Nakama' matching work?",
      answer: "Our algorithm matches you based on your favorite anime genres, viewing history, and activity tags. The 'Compatibility Score' shows how likely you are to get along!"
    },
    {
      question: "Can I trade cards with friends?",
      answer: "Yes! Go to the 'Cards' hub and select the 'Offers' tab to view or send trade requests. You can also list cards for sale or trade in the Market."
    },
    {
      question: "How do I report bad behavior?",
      answer: "If you see someone violating our Code of Ethics, click the 'Report' flag icon on their post or profile. Our moderation team reviews all reports 24/7."
    }
  ];

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 mb-2">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold neon-text">HELP CENTER</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Have a question? Found a bug? We're here to help you navigate the AniRealm.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* FAQ Section */}
        <Card className="bg-card/40 border-white/10 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Frequently Asked Questions
            </CardTitle>
            <CardDescription>Quick answers to common questions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left font-bold hover:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card className="bg-card/40 border-white/10 md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Contact Support
            </CardTitle>
            <CardDescription>Send a message to our Admin team.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <div className="relative">
                  <select 
                    id="subject" 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option>General Inquiry</option>
                    <option>Report a Bug</option>
                    <option>Account Issue</option>
                    <option>Billing / S-Class</option>
                    <option>Report User</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message" 
                  placeholder="Describe your issue in detail..." 
                  className="min-h-[150px]"
                  required
                />
              </div>

              <div className="pt-2">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <Shield className="h-8 w-8 text-blue-400" />
            <h3 className="font-bold text-blue-400">Community Guidelines</h3>
            <p className="text-xs text-muted-foreground">Read our code of ethics and rules.</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <MessageCircle className="h-8 w-8 text-purple-400" />
            <h3 className="font-bold text-purple-400">Live Chat Support</h3>
            <p className="text-xs text-muted-foreground">Chat with a moderator (Online).</p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center text-center gap-3">
            <Bug className="h-8 w-8 text-yellow-400" />
            <h3 className="font-bold text-yellow-400">Bug Bounty</h3>
            <p className="text-xs text-muted-foreground">Report glitches and earn tokens.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
