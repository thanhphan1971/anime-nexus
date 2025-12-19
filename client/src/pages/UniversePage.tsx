import { ArrowLeft, Sparkles, BookOpen, Globe, Zap, Users } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function UniversePage() {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full" data-testid="button-back-universe">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-display font-bold tracking-wider">The Universe</h1>
          </div>
        </div>

        <Card className="bg-card/50 backdrop-blur-sm border-primary/20 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-display font-semibold">Aurelith</h2>
            </div>
            <p className="text-foreground/90 leading-relaxed text-lg" data-testid="text-lore-summary">
              Aurelith was once a unified world governed by the Continuum — a force that kept reality stable. 
              When it fractured, time, matter, and memory splintered, leaving civilization in ruins. 
              In the aftermath, survivors evolved into tribes shaped by what they endured and what they believe is true. 
              You arrive in the age after the collapse — where power is collected, history is contested, 
              and the world's original balance may not be gone forever.
            </p>
          </CardContent>
        </Card>

        <Separator className="my-6 bg-border/30" />

        <div className="space-y-4">
          <h3 className="text-lg font-display font-semibold text-foreground/80 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Key Concepts
          </h3>

          <div className="grid gap-4">
            <Card className="bg-card/30 backdrop-blur-sm border-border/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <Zap className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">The Continuum</h4>
                    <p className="text-sm text-foreground/70">
                      The primordial force that once held all of reality together — regulating time, matter, memory, and life itself.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/30 backdrop-blur-sm border-border/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <Sparkles className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">The Fracture</h4>
                    <p className="text-sm text-foreground/70">
                      The cataclysmic event that shattered the Continuum, splitting reality and collapsing cities into fragments.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/30 backdrop-blur-sm border-border/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Users className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">The Tribes</h4>
                    <p className="text-sm text-foreground/70">
                      Survivors who adapted to the post-Fracture world, each group shaped by their experiences and their own version of truth.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-foreground/50 italic">
            Lore fragments unlock as you play.
          </p>
        </div>
      </div>
    </div>
  );
}
