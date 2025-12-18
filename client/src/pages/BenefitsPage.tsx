import { Star, Zap, Sparkles, Crown, Shield, ArrowLeft, GamepadIcon, Gift, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";

export default function BenefitsPage() {
  const benefits = [
    {
      id: "game-entries",
      name: "Daily Game Entries",
      icon: Star,
      color: "yellow",
      summary: "Play The Fracture Trial to earn tokens",
      free: {
        value: "3 Rewarded Runs / Day",
        details: [
          "Each run earns tokens based on performance",
          "Runs reset daily at midnight UTC",
          "Additional runs available but won't earn tokens"
        ]
      },
      premium: {
        value: "6 Rewarded Runs / Day",
        details: [
          "Double the rewarded runs vs free tier",
          "Each run earns tokens based on performance",
          "Runs reset daily at midnight UTC"
        ]
      }
    },
    {
      id: "token-cap",
      name: "Daily Token Cap",
      icon: Zap,
      color: "cyan",
      summary: "Maximum tokens you can earn per day through gameplay",
      free: {
        value: "90 Tokens / Day",
        details: [
          "Tokens are earned by playing The Fracture Trial",
          "Performance determines tokens per run (15-35 tokens)",
          "Once you hit the cap, additional runs won't earn tokens",
          "Cap resets daily at midnight UTC"
        ]
      },
      premium: {
        value: "210 Tokens / Day",
        details: [
          "More than double the daily earning potential",
          "Tokens are earned by playing The Fracture Trial",
          "Performance determines tokens per run (15-35 tokens)",
          "Cap resets daily at midnight UTC"
        ]
      }
    },
    {
      id: "prize-draws",
      name: "Weekly & Monthly Draws",
      icon: Sparkles,
      color: "purple",
      summary: "Enter prize draws for exclusive rewards",
      free: {
        value: "Standard Entries",
        details: [
          "1 entry per weekly draw",
          "1 entry per monthly grand draw",
          "Prizes include rare cards and bonus tokens"
        ]
      },
      premium: {
        value: "Extra Entries",
        details: [
          "3 entries per weekly draw",
          "5 entries per monthly grand draw",
          "Access to S-Class exclusive prize pools",
          "Better odds at legendary rewards"
        ]
      }
    },
    {
      id: "card-pulls",
      name: "Card Pull Efficiency",
      icon: Crown,
      color: "orange",
      summary: "How cards are drawn from the gacha system",
      free: {
        value: "Standard Rates",
        details: [
          "Common: 60% chance",
          "Rare: 25% chance",
          "Epic: 12% chance",
          "Legendary: 3% chance"
        ]
      },
      premium: {
        value: "Higher Efficiency",
        details: [
          "Common: 50% chance",
          "Rare: 28% chance",
          "Epic: 16% chance",
          "Legendary: 6% chance",
          "Note: No guaranteed rarity per pull"
        ]
      }
    },
    {
      id: "badges",
      name: "Identity Badge",
      icon: Shield,
      color: "green",
      summary: "Visual badge displayed on your profile",
      free: {
        value: "Standard Badge",
        details: [
          "Basic agent badge on profile",
          "Standard colors and styling"
        ]
      },
      premium: {
        value: "S-Class Golden Badge",
        details: [
          "Exclusive golden S-Class badge",
          "Animated glow effect on profile",
          "Stand out in communities and chat",
          "Shows your elite status"
        ]
      }
    }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400" },
      cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400" },
      purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400" },
      orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" },
      green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400" }
    };
    return colors[color] || colors.yellow;
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center gap-4">
        <Link href="/sclass">
          <Button variant="ghost" size="icon" data-testid="button-back-to-premium">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold neon-text" data-testid="text-benefits-title">
            Membership Benefits
          </h1>
          <p className="text-muted-foreground">Complete guide to what you get with each plan</p>
        </div>
      </div>

      <div className="space-y-8">
        {benefits.map((benefit) => {
          const colors = getColorClasses(benefit.color);
          return (
            <Card 
              key={benefit.id} 
              id={benefit.id} 
              className={`${colors.bg} ${colors.border} border scroll-mt-24`}
              data-testid={`card-benefit-${benefit.id}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                    <benefit.icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <div>
                    <span className={colors.text}>{benefit.name}</span>
                    <p className="text-sm font-normal text-muted-foreground mt-1">{benefit.summary}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-white/20">Free</Badge>
                      <span className="font-bold">{benefit.free.value}</span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {benefit.free.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-white/40 mt-1">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">S-Class</Badge>
                      <span className="font-bold text-yellow-400">{benefit.premium.value}</span>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {benefit.premium.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-1">•</span>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Separator className="bg-white/10" />

      <Card className="bg-card/30 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-yellow-400" />
            S-Class Welcome Bonus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>When you subscribe to S-Class for the first time (not during trial), you receive:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span><strong>+300 Bonus Tokens</strong> - One-time welcome reward</span>
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span><strong>Founder's Badge</strong> - Exclusive collector badge</span>
            </li>
          </ul>
          <p className="text-muted-foreground">This bonus is one-time only and does not repeat on renewals.</p>
        </CardContent>
      </Card>

      <Card className="bg-card/30 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GamepadIcon className="h-5 w-5 text-cyan-400" />
            How Token Earning Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>Tokens are earned exclusively by playing <strong>The Fracture Trial</strong> mini-game:</p>
          <ol className="space-y-2 list-decimal list-inside">
            <li>Navigate to the Game page from the main menu</li>
            <li>Play The Fracture Trial - match cards to earn points</li>
            <li>Your performance determines tokens earned (15-35 per run)</li>
            <li>Tokens are added to your balance immediately</li>
            <li>Use tokens to pull cards from the gacha system</li>
          </ol>
          <p className="text-muted-foreground">
            Both rewarded runs and daily token caps reset at midnight UTC.
          </p>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/sclass">
          <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold" data-testid="button-view-plans">
            View Membership Plans
          </Button>
        </Link>
      </div>
    </div>
  );
}
