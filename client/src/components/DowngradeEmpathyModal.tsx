import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Shield, History, Gamepad2, Trophy } from "lucide-react";
import { Link } from "wouter";

interface DowngradeEmpathyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeUntilDate?: string;
}

export function DowngradeEmpathyModal({ 
  open, 
  onOpenChange,
  activeUntilDate
}: DowngradeEmpathyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-white/10">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-cyan-500/10 border border-cyan-500/30 w-fit">
            <Heart className="h-8 w-8 text-cyan-400" />
          </div>
          <DialogTitle className="text-2xl font-display" data-testid="text-downgrade-title">
            You're Always Welcome Back
          </DialogTitle>
          <DialogDescription className="text-base">
            Thanks for being part of AniRealm.<br />
            Your progress, identity badge, and history remain safe.
          </DialogDescription>
        </DialogHeader>

        {activeUntilDate && (
          <Card className="bg-yellow-500/10 border-yellow-500/30 mt-4">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Your S-Class access remains active until</p>
              <p className="text-lg font-bold text-yellow-400 mt-1">{activeUntilDate}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Enjoy all your benefits until then — no early revocation
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3 mt-4">
          <h4 className="text-sm font-semibold text-muted-foreground">What stays with you:</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3 flex items-center gap-3">
                <History className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium">Progress</p>
                  <p className="text-xs text-muted-foreground">All saved</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3 flex items-center gap-3">
                <Shield className="h-5 w-5 text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">Badge</p>
                  <p className="text-xs text-muted-foreground">Still visible</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3 flex items-center gap-3">
                <Trophy className="h-5 w-5 text-purple-400" />
                <div>
                  <p className="text-sm font-medium">Cards</p>
                  <p className="text-xs text-muted-foreground">Keep all</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-3 flex items-center gap-3">
                <Gamepad2 className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm font-medium">Free Play</p>
                  <p className="text-xs text-muted-foreground">Continues</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6">
          <Link href="/">
            <Button 
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-12"
              onClick={() => onOpenChange(false)}
              data-testid="button-return-realm"
            >
              Return to the Realm
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          No paywalls on existing content · No penalties for leaving
        </p>
      </DialogContent>
    </Dialog>
  );
}
