import { Check, X, Crown, Sparkles, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PremiumPage() {
  const features = [
    {
      name: "Daily Gacha Pulls",
      free: "1 Pull / Day",
      premium: "2 Pulls / Day + Higher Luck",
      icon: Star
    },
    {
      name: "Profile Customization",
      free: "Static Avatar & Basic Themes",
      premium: "Animated Avatars, Video Covers & Custom CSS",
      icon: Sparkles
    },
    {
      name: "Social Matching",
      free: "Standard Matching",
      premium: "See Who Liked You + Unlimited Swipes",
      icon: Zap
    },
    {
      name: "Community Access",
      free: "Public Rooms Only",
      premium: "Create Private Guilds & Enter VIP Rooms",
      icon: Crown
    },
    {
      name: "Identity",
      free: "Standard Badge",
      premium: "Exclusive 'S-Class' Golden Badge",
      icon: Badge
    }
  ];

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-display font-black neon-text">
          ASCEND TO <span className="text-yellow-400">S-CLASS</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Unlock the full power of your anime identity. Join the elite ranks of AniVerse Realm.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        <Card className="bg-card/30 border-white/10 relative overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Standard Agent</CardTitle>
            <CardDescription>For casual explorers of the realm.</CardDescription>
            <div className="mt-4 text-4xl font-display font-bold">Free</div>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <div className="mt-1 bg-white/10 p-1 rounded">
                  <feature.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-bold text-sm text-muted-foreground">{feature.name}</p>
                  <p className="text-sm">{feature.free}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-white/10" disabled>
              Current Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="bg-black/40 border-yellow-500/50 relative overflow-hidden shadow-[0_0_50px_hsl(45,100%,50%,0.2)]">
          <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
            RECOMMENDED
          </div>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-2">
              <Crown className="fill-current" /> S-Class Elite
            </CardTitle>
            <CardDescription>For the ultimate anime fan experience.</CardDescription>
            <div className="mt-4 text-4xl font-display font-bold text-yellow-400">
              $9.99 <span className="text-lg text-muted-foreground font-sans font-normal">/ month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="mt-1 bg-yellow-500/20 p-1 rounded">
                  <feature.icon className="h-4 w-4 text-yellow-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-yellow-400">{feature.name}</p>
                  <p className="text-sm text-white">{feature.premium}</p>
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 text-lg shadow-[0_0_20px_hsl(45,100%,50%,0.4)]">
              Upgrade to S-Class Now
            </Button>
          </CardFooter>

          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        </Card>
      </div>
    </div>
  );
}
