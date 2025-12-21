import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Heart, Users, AlertTriangle, Ban, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function CodeOfEthicsPage() {
  const guidelines = [
    {
      icon: Heart,
      title: "Be Respectful",
      description: "Treat everyone with kindness and respect. Disagreements are fine, but personal attacks, insults, and harassment are not tolerated.",
      color: "text-pink-400"
    },
    {
      icon: Users,
      title: "Keep It Safe",
      description: "Do not share personal information about yourself or others. Protect your privacy and the privacy of fellow community members.",
      color: "text-blue-400"
    },
    {
      icon: MessageSquare,
      title: "Stay On Topic",
      description: "Keep discussions relevant to anime, manga, and community activities. Spam, excessive self-promotion, and off-topic content may be removed.",
      color: "text-green-400"
    },
    {
      icon: Ban,
      title: "No Harmful Content",
      description: "Content that is illegal, violent, sexually explicit, or promotes harm is strictly prohibited. This includes hate speech, discrimination, and threats.",
      color: "text-red-400"
    },
    {
      icon: AlertTriangle,
      title: "No Cheating or Exploits",
      description: "Do not use bots, exploits, or other methods to manipulate the platform. Play fair and let everyone enjoy the experience equally.",
      color: "text-yellow-400"
    },
    {
      icon: Shield,
      title: "Report Issues",
      description: "If you see behavior that violates these guidelines, use the Report feature. All reports are reviewed by the moderation team.",
      color: "text-purple-400"
    }
  ];

  return (
    <div className="space-y-8 pb-24 max-w-4xl mx-auto">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/20 mb-2">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-display font-bold neon-text">CODE OF ETHICS</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          AniRealm is a community for anime fans. These guidelines help keep it welcoming and safe for everyone.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {guidelines.map((guideline, i) => (
          <Card key={i} className="bg-card/40 border-white/10" data-testid={`card-guideline-${i}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <guideline.icon className={`h-5 w-5 ${guideline.color}`} />
                {guideline.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{guideline.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Enforcement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground text-sm">
          <p>Violations of these guidelines may result in content removal, temporary restrictions, or permanent account suspension, depending on severity.</p>
          <p>AniRealm reserves the right to take action on any behavior that negatively impacts the community, even if not explicitly listed above.</p>
          <p>These guidelines may be updated as the community evolves.</p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/help">
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10" data-testid="button-back-to-help">
            Back to Help Center
          </Button>
        </Link>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Features and limits may vary by region, event, or update.
      </p>
    </div>
  );
}
