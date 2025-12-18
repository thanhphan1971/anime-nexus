import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Gift, Calendar, ArrowRight, Zap } from "lucide-react";
import { useClaimRetentionSaveBonus, useSwitchToYearly } from "@/lib/api";
import { toast } from "sonner";

interface CancellationSaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelConfirmed: () => void;
  onSuccess?: () => void;
  saveBonusAvailable: boolean;
  currentPlan: 'monthly' | 'yearly';
}

export function CancellationSaveModal({ 
  open, 
  onOpenChange, 
  onCancelConfirmed,
  onSuccess,
  saveBonusAvailable,
  currentPlan
}: CancellationSaveModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const claimSaveBonus = useClaimRetentionSaveBonus();
  const switchToYearly = useSwitchToYearly();

  const handleStay = async () => {
    setIsProcessing(true);
    try {
      await claimSaveBonus.mutateAsync();
      toast.success("Thank you for staying! +200 tokens added to your account.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to claim bonus");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwitchYearly = async () => {
    setIsProcessing(true);
    try {
      await switchToYearly.mutateAsync();
      toast.success("Switched to yearly billing! You're saving 33%.");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to switch plan");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancelConfirmed();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-white/10">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 w-fit">
            <Heart className="h-8 w-8 text-yellow-400" />
          </div>
          <DialogTitle className="text-2xl font-display" data-testid="text-cancel-save-title">
            Before You Go
          </DialogTitle>
          <DialogDescription className="text-base">
            You're an important part of AniRealm.<br />
            If something isn't working right now, we want to make this easier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {saveBonusAvailable && (
            <Card className="bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15 transition-colors cursor-pointer" onClick={handleStay}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <Gift className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-yellow-400">Stay in S-Class</span>
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                        Soft Save
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Keep S-Class and receive a small thank-you bonus.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold">+200 tokens (one-time only)</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">No renewal or billing changes</p>
                  </div>
                  <Button 
                    size="sm" 
                    className="bg-yellow-500 hover:bg-yellow-400 text-black"
                    disabled={isProcessing}
                    data-testid="button-save-stay"
                  >
                    {isProcessing ? "..." : "Stay"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentPlan === 'monthly' && (
            <Card className="bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/15 transition-colors cursor-pointer" onClick={handleSwitchYearly}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Calendar className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-cyan-400">Switch to Yearly</span>
                      <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 text-xs">
                        Best Value
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Save more by switching to annual billing.
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-cyan-400 font-semibold">$79.99/year</span>
                      <span className="text-muted-foreground">vs $119.88/year monthly</span>
                    </div>
                    <p className="text-xs text-green-400 mt-1">Save ~33% ($39.89/year)</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                    disabled={isProcessing}
                    data-testid="button-save-yearly"
                  >
                    {isProcessing ? "..." : "Switch"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Separator className="bg-white/10" />

          <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={handleCancel}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-muted-foreground">Cancel Membership</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Continue cancellation · Access remains until billing period ends
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-muted-foreground hover:text-white"
                  data-testid="button-confirm-cancel"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          Cancellation proceeds immediately with no further prompts.
        </p>
      </DialogContent>
    </Dialog>
  );
}
