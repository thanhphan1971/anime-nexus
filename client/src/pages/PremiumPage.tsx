import { useState, useEffect } from "react";
import { Check, X, Crown, Sparkles, Zap, Star, AlertCircle, Info, Shield, ExternalLink, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSClassStatus, useStartSClassTrial, useConvertSClassTrial, useCancelSClassTrial, useSubscribeSClass, useCancelSubscription, useReactivateSubscription } from "@/lib/api";
import { SClassWelcomeModal } from "@/components/SClassWelcomeModal";
import { CancellationSaveModal } from "@/components/CancellationSaveModal";
import { DowngradeEmpathyModal } from "@/components/DowngradeEmpathyModal";
import { getSupabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PremiumPage() {
  const { user, refreshUser } = useAuth();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCancelSaveModal, setShowCancelSaveModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [accessToken, setAccessToken] = useState<string>('');
  
  const { data: sclassStatus } = useSClassStatus();
  const startTrial = useStartSClassTrial();
  const convertTrial = useConvertSClassTrial();
  const cancelTrial = useCancelSClassTrial();
  const subscribeSClass = useSubscribeSClass();
  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();
  
  useEffect(() => {
    const getToken = async () => {
      const supabase = await getSupabase();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        setAccessToken(data.session.access_token);
      }
    };
    getToken();
  }, []);
  
  useEffect(() => {
    if (sclassStatus?.welcomeRewardPending) {
      setShowWelcomeModal(true);
    }
  }, [sclassStatus?.welcomeRewardPending]);
  
  const handleStartTrial = async () => {
    try {
      await startTrial.mutateAsync();
      setShowTrialModal(false);
      toast.success("Trial started! Enjoy 3 days of S-Class access.");
      refreshUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to start trial");
    }
  };
  
  const handleSubscribe = async () => {
    try {
      await convertTrial.mutateAsync();
      setShowSubscribeModal(false);
      refreshUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe");
    }
  };
  
  const handleWelcomeComplete = () => {
    setShowWelcomeModal(false);
    refreshUser();
  };
  
  const handleSubscribeWithPlan = async () => {
    try {
      await subscribeSClass.mutateAsync(selectedPlan);
      setShowSubscribeModal(false);
      toast.success(`Subscribed to S-Class ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}!`);
      refreshUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to subscribe");
    }
  };
  
  const handleCancelConfirmed = async () => {
    try {
      const result = await cancelSubscription.mutateAsync();
      setShowDowngradeModal(true);
      refreshUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    }
  };
  
  const handleCancelTrial = async () => {
    try {
      await cancelTrial.mutateAsync();
      toast.success("Trial canceled. You can rejoin anytime with a subscription.");
      refreshUser();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel trial");
    }
  };
  
  const features = [
    {
      name: "Daily Game Entries",
      free: "3 Rewarded Runs / Day",
      premium: "6 Rewarded Runs / Day",
      icon: Star,
      anchor: "game-entries"
    },
    {
      name: "Daily Token Cap",
      free: "Earn up to 90 Tokens / Day (via game)",
      premium: "Earn up to 210 Tokens / Day (via game)",
      icon: Zap,
      anchor: "token-cap"
    },
    {
      name: "Weekly & Monthly Draws",
      free: "Standard Entries",
      premium: "Extra Weekly & Monthly Entries",
      icon: Sparkles,
      anchor: "prize-draws"
    },
    {
      name: "Card Pull Efficiency",
      free: "Standard Rates",
      premium: "Higher Pull Efficiency (no guaranteed rarity)",
      icon: Crown,
      anchor: "card-pulls"
    },
    {
      name: "Identity Badge",
      free: "Standard Badge",
      premium: "Exclusive 'S-Class' Golden Badge",
      icon: Shield,
      anchor: "badges"
    }
  ];

  const isEligibleForTrial = sclassStatus?.canStartTrial ?? (!user?.trialUsed && !user?.isPremium);
  const isOnTrial = sclassStatus?.isOnTrial ?? user?.isOnTrial;
  const isSClass = user?.isPremium && !isOnTrial;
  const trialDaysRemaining = sclassStatus?.trialDaysRemaining ?? 0;

  return (
    <div className="space-y-12 pb-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-6xl font-display font-black neon-text">
          ASCEND TO <span className="text-yellow-400">S-CLASS</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Unlock the full power of your anime identity. Join the elite ranks of AniRealm.
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
              <Link key={i} href={`/benefits#${feature.anchor}`}>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group" data-testid={`link-benefit-free-${feature.anchor}`}>
                  <div className="mt-1 bg-white/10 p-1 rounded">
                    <feature.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-muted-foreground group-hover:text-white/80 flex items-center gap-1">
                      {feature.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-sm">{feature.free}</p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full border-white/10" disabled>
              {isSClass ? "Free Plan" : isOnTrial ? "Free Plan" : "Current Plan"}
            </Button>
          </CardFooter>
        </Card>

        {/* Premium Plan */}
        <Card className="bg-black/40 border-yellow-500/50 relative overflow-hidden shadow-[0_0_50px_hsl(45,100%,50%,0.2)]">
          <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
            {isOnTrial ? "TRIAL ACTIVE" : "RECOMMENDED"}
          </div>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-2">
              <Crown className="fill-current" /> S-Class Membership
            </CardTitle>
            <CardDescription>Premium Access to AniRealm</CardDescription>
            
            {!isSClass && !isOnTrial && (
              <Tabs value={selectedPlan} onValueChange={(v) => setSelectedPlan(v as 'monthly' | 'yearly')} className="mt-4">
                <TabsList className="grid w-full grid-cols-2 bg-black/40">
                  <TabsTrigger value="monthly" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="yearly" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
                    Yearly
                    <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                      Save 33%
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            
            <div className="mt-4 text-4xl font-display font-bold text-yellow-400">
              {selectedPlan === 'yearly' ? (
                <>
                  $79.99 <span className="text-lg text-muted-foreground font-sans font-normal">/ year</span>
                  <p className="text-sm text-green-400 font-sans font-normal mt-1">
                    $6.67/mo · Save $39.89 vs monthly
                  </p>
                </>
              ) : (
                <>$9.99 <span className="text-lg text-muted-foreground font-sans font-normal">/ month</span></>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, i) => (
              <Link key={i} href={`/benefits#${feature.anchor}`}>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 hover:bg-yellow-500/20 transition-colors cursor-pointer group" data-testid={`link-benefit-premium-${feature.anchor}`}>
                  <div className="mt-1 bg-yellow-500/20 p-1 rounded">
                    <feature.icon className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-yellow-400 flex items-center gap-1">
                      {feature.name}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-sm text-white">{feature.premium}</p>
                  </div>
                </div>
              </Link>
            ))}
            
            {/* Subscription Terms - Visible on Paywall */}
            <div className="mt-4 pt-3 border-t border-yellow-500/20 space-y-1.5 text-xs text-white/60">
              <p>Renews {selectedPlan === 'yearly' ? 'yearly at $79.99' : 'monthly at $9.99'} · Cancel anytime in App Store/Play Store</p>
              <p>Rewards are digital items only · No cash value · Outcomes not guaranteed</p>
              {selectedPlan === 'yearly' && (
                <p className="text-yellow-400/80 font-medium">
                  Yearly subscriptions are non-refundable. If canceled, your S-Class benefits remain active until your subscription expires.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {isSClass ? (
              <>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  {sclassStatus?.subscriptionType === 'yearly' ? 'Yearly' : 'Monthly'} Plan
                </Badge>
                {sclassStatus?.subscriptionStatus === 'canceled_pending_expiry' ? (
                  <div className="w-full text-center space-y-3">
                    <p className="text-sm text-yellow-400/80">
                      S-Class active until {sclassStatus?.premiumEndDate ? format(new Date(sclassStatus.premiumEndDate), 'MMMM d, yyyy') : 'end of billing period'}
                    </p>
                    <Button 
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12"
                      onClick={async () => {
                        try {
                          await reactivateSubscription.mutateAsync();
                          toast.success("Welcome back! Your S-Class membership is active again.");
                          refreshUser();
                        } catch (error: any) {
                          toast.error(error.message || "Failed to reactivate");
                        }
                      }}
                      disabled={reactivateSubscription.isPending}
                      data-testid="button-reactivate"
                    >
                      {reactivateSubscription.isPending ? "Reactivating..." : "Reactivate S-Class"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Keep benefits without interruption</p>
                  </div>
                ) : (
                  <>
                    <Button className="w-full bg-yellow-500/30 text-yellow-400 border border-yellow-500/50" disabled>
                      Current Plan
                    </Button>
                    <Button 
                      variant="ghost"
                      className="text-muted-foreground hover:text-white text-sm"
                      onClick={() => setShowCancelSaveModal(true)}
                      data-testid="button-cancel-subscription"
                    >
                      Cancel Subscription
                    </Button>
                  </>
                )}
              </>
            ) : isOnTrial ? (
              <>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  Trial: {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                </Badge>
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 text-lg shadow-[0_0_20px_hsl(45,100%,50%,0.4)]"
                  onClick={() => setShowSubscribeModal(true)}
                  disabled={convertTrial.isPending}
                  data-testid="button-convert-trial"
                >
                  {convertTrial.isPending ? "Processing..." : "Upgrade to Full S-Class"}
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-white/20 text-muted-foreground hover:bg-white/5"
                  onClick={handleCancelTrial}
                  disabled={cancelTrial.isPending}
                  data-testid="button-cancel-trial-inline"
                >
                  {cancelTrial.isPending ? "Ending..." : "End Play Early"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Auto-converts to $9.99/month if not canceled
                </p>
              </>
            ) : (
              <>
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 text-lg shadow-[0_0_20px_hsl(45,100%,50%,0.4)]"
                  onClick={() => setShowSubscribeModal(true)}
                  data-testid="button-subscribe"
                >
                  Subscribe to S-Class
                </Button>
                {isEligibleForTrial && (
                  <Button 
                    variant="outline" 
                    className="w-full border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
                    onClick={() => setShowTrialModal(true)}
                    data-testid="button-start-trial"
                  >
                    Start 3-Day Free Trial
                  </Button>
                )}
              </>
            )}
          </CardFooter>

          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        </Card>
      </div>

      {/* Subscription Terms - Always Visible */}
      <Card className="max-w-3xl mx-auto bg-card/30 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" /> Subscription Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              Subscription renews monthly at $9.99 unless canceled
            </p>
            <p className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              Cancel anytime in App Store / Play Store settings
            </p>
            <p className="flex items-start gap-2">
              <Check className="h-4 w-4 mt-0.5 text-green-400 shrink-0" />
              Payment is charged to your account upon confirmation
            </p>
            <p className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-400 shrink-0" />
              No refunds for partial billing periods
            </p>
          </div>
          <Separator className="bg-white/10" />
          <div className="space-y-2">
            <p className="font-semibold text-white">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Rewards are digital items only with no cash value</li>
              <li>Card pull outcomes are randomized and not guaranteed</li>
              <li>Higher efficiency does not guarantee specific rarities</li>
              <li>Subscription does not guarantee prizes in draws</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Confirmation Modal */}
      <Dialog open={showSubscribeModal} onOpenChange={setShowSubscribeModal}>
        <DialogContent className="max-w-md bg-gradient-to-b from-gray-900 to-black border-yellow-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-400 flex items-center gap-2">
              <Crown className="h-6 w-6" /> S-Class Membership
            </DialogTitle>
            <DialogDescription>Premium Access</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="text-center py-4">
                {selectedPlan === 'yearly' ? (
                  <>
                    <div className="text-3xl font-bold text-yellow-400">$79.99/year</div>
                    <p className="text-sm text-muted-foreground mt-1">Billed annually · $6.67/mo</p>
                    <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50">
                      Save 33% ($39.89/year)
                    </Badge>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-yellow-400">$9.99/month</div>
                    <p className="text-sm text-muted-foreground mt-1">Billed monthly</p>
                  </>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <p className="font-semibold text-white">Benefits include:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-400" />
                    <span>Additional daily game entries (6 vs 3)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-400" />
                    <span>Extra weekly and monthly draw entries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-400" />
                    <span>Higher card pull efficiency (no guaranteed rarity)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-400" />
                    <span>Cosmetic perks and progression boosts</span>
                  </li>
                </ul>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  Subscription renews {selectedPlan === 'yearly' ? 'annually' : 'monthly'} unless canceled
                </p>
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  Cancel anytime in App Store / Play Store settings
                </p>
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  Payment charged to your account upon confirmation
                </p>
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                  No refunds for partial periods
                </p>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold text-white">Important Notes:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Rewards are digital items only</li>
                  <li>No cash value</li>
                  <li>Outcomes are randomized and not guaranteed</li>
                  <li>Subscription does not guarantee prizes</li>
                </ul>
              </div>

              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 mt-4"
                onClick={isOnTrial ? handleSubscribe : handleSubscribeWithPlan}
                disabled={subscribeSClass.isPending || convertTrial.isPending}
                data-testid="button-confirm-subscribe"
              >
                {(subscribeSClass.isPending || convertTrial.isPending) ? "Processing..." : `Subscribe ${selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'}`}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={() => setShowSubscribeModal(false)}
                data-testid="button-cancel-subscribe"
              >
                Cancel
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Trial Confirmation Modal */}
      <Dialog open={showTrialModal} onOpenChange={setShowTrialModal}>
        <DialogContent className="max-w-md bg-gradient-to-b from-gray-900 to-black border-yellow-500/30">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-400 flex items-center gap-2">
              <Crown className="h-6 w-6" /> S-Class Trial
            </DialogTitle>
            <DialogDescription>3-Day Free Trial</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-yellow-400">3 Days Free</div>
                <p className="text-sm text-muted-foreground mt-1">Then $9.99/month</p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm">
                <p className="font-semibold text-yellow-400 mb-2">During your trial:</p>
                <ul className="space-y-1.5 text-white/80">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-400" />
                    <span>Access to S-Class gameplay perks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 text-green-400" />
                    <span>50% of full S-Class draw entries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 mt-0.5 text-red-400" />
                    <span className="text-muted-foreground">No monthly grand draw participation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="h-4 w-4 mt-0.5 text-red-400" />
                    <span className="text-muted-foreground">No bonus tokens during trial</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="font-semibold text-white flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Auto-Renewal Notice
                </p>
                <p>
                  Your trial automatically converts to a paid subscription ($9.99/month) 
                  at the end of the 3-day trial period unless you cancel before the trial ends.
                </p>
                <p>
                  Cancel anytime in App Store / Play Store settings. You will see a reminder 
                  24 hours before your trial ends.
                </p>
              </div>

              <Separator className="bg-white/10" />

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>One trial per account lifetime. Requires payment method confirmation.</p>
              </div>

              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 mt-4"
                onClick={handleStartTrial}
                disabled={startTrial.isPending}
                data-testid="button-confirm-trial"
              >
                {startTrial.isPending ? "Starting Trial..." : "Start Free Trial"}
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground"
                onClick={() => setShowTrialModal(false)}
                data-testid="button-cancel-trial"
              >
                Cancel
              </Button>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* S-Class Welcome Modal */}
      <SClassWelcomeModal 
        isOpen={showWelcomeModal}
        onComplete={handleWelcomeComplete}
        accessToken={accessToken}
      />

      {/* Cancellation Save Modal (Retention Flow) */}
      <CancellationSaveModal
        open={showCancelSaveModal}
        onOpenChange={setShowCancelSaveModal}
        onCancelConfirmed={handleCancelConfirmed}
        onSuccess={refreshUser}
        saveBonusAvailable={sclassStatus?.retentionSaveBonusAvailable ?? false}
        currentPlan={(sclassStatus?.subscriptionType as 'monthly' | 'yearly') ?? 'monthly'}
      />

      {/* Downgrade Empathy Modal (Post-Cancellation) */}
      <DowngradeEmpathyModal
        open={showDowngradeModal}
        onOpenChange={setShowDowngradeModal}
        activeUntilDate={sclassStatus?.premiumEndDate ? format(new Date(sclassStatus.premiumEndDate), 'MMMM d, yyyy') : undefined}
      />
    </div>
  );
}
