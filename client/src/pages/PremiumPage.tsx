import { useState, useEffect } from "react";
import { Check, X, Crown, Sparkles, Zap, Star, AlertCircle, Info, Shield, ExternalLink, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSClassStatus, useStartSClassTrial, useCancelSClassTrial, useCancelSubscription, useReactivateSubscription } from "@/lib/api";
import { SClassWelcomeModal } from "@/components/SClassWelcomeModal";
import { CancellationSaveModal } from "@/components/CancellationSaveModal";
import { DowngradeEmpathyModal } from "@/components/DowngradeEmpathyModal";
import { getSupabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { formatInTimeZone } from "date-fns-tz";

export default function PremiumPage() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showCancelSaveModal, setShowCancelSaveModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [accessToken, setAccessToken] = useState<string>('');
  
  const { data: sclassStatus } = useSClassStatus();
  const startTrial = useStartSClassTrial();
  const cancelTrial = useCancelSClassTrial();
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success("Welcome to S-Class! Your subscription is now active.");
      refreshUser();
      window.history.replaceState({}, '', '/premium');
    } else if (params.get('canceled') === 'true') {
      toast.info("Checkout was canceled. You can try again anytime.");
      window.history.replaceState({}, '', '/premium');
    }
  }, [refreshUser]);
  
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
  
  const handleWelcomeComplete = () => {
    setShowWelcomeModal(false);
    refreshUser();
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
  const isAdminGranted = sclassStatus?.accessSource === 'admin_grant';

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
            {isAdminGranted ? "GRANTED ACCESS" : isOnTrial ? "TRIAL ACTIVE" : isSClass ? "ACTIVE" : "RECOMMENDED"}
          </div>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-yellow-400 flex items-center justify-center gap-2">
              <Crown className="fill-current" /> S-Class Membership
            </CardTitle>
            <CardDescription>Premium Access to AniRealm</CardDescription>
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
            
            </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {isSClass && isAdminGranted ? (
              <>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-base px-4 py-1">
                  S-Class Access (Granted)
                </Badge>
                <p className="text-sm text-yellow-400/80">
                  Access valid until: {sclassStatus?.accessExpiresAt ? formatInTimeZone(new Date(sclassStatus.accessExpiresAt), 'UTC', 'MMMM d, yyyy') : 'N/A'}
                </p>
                <Separator className="bg-yellow-500/20 my-2" />
                <p className="text-xs text-muted-foreground text-center">
                  Your paid subscription will begin after your granted access ends.
                </p>
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 text-lg shadow-[0_0_20px_hsl(45,100%,50%,0.4)]"
                  onClick={() => setLocation('/checkout?plan=monthly')}
                  data-testid="button-subscribe-monthly-granted"
                >
                  Subscribe Monthly — $9.99
                </Button>
                <Button 
                  className="w-full bg-yellow-500/80 hover:bg-yellow-400 text-black font-bold h-12 text-lg"
                  onClick={() => setLocation('/checkout?plan=yearly')}
                  data-testid="button-subscribe-yearly-granted"
                >
                  Subscribe Yearly — $79.99
                </Button>
                <p className="text-sm text-yellow-400 text-center font-semibold">★ Best value — Save 33%</p>
              </>
            ) : isSClass ? (
              <>
                <p className="text-sm text-yellow-400 font-semibold">
                  Current Plan: {sclassStatus?.subscriptionType === 'yearly' ? 'Yearly' : 'Monthly'}
                </p>
                {sclassStatus?.subscriptionStatus === 'canceled_pending_expiry' ? (
                  <div className="w-full text-center space-y-3">
                    <p className="text-sm text-yellow-400/80">
                      S-Class active until {sclassStatus?.premiumEndDate ? formatInTimeZone(new Date(sclassStatus.premiumEndDate), 'UTC', 'MMMM d, yyyy') : 'end of billing period'}
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
                    {sclassStatus?.subscriptionType === 'monthly' ? (
                      <>
                        <Button className="w-full bg-yellow-500/30 text-yellow-400 border border-yellow-500/50" disabled data-testid="button-current-monthly">
                          Current Plan — $9.99/month
                        </Button>
                        <Button 
                          className="w-full bg-yellow-500/80 hover:bg-yellow-400 text-black font-bold h-12 text-lg"
                          onClick={() => setLocation('/checkout?plan=yearly')}
                          data-testid="button-switch-yearly"
                        >
                          Switch to Yearly — $79.99/year
                        </Button>
                        <p className="text-sm text-yellow-400 text-center font-semibold">★ Best value — Save 33%</p>
                        <p className="text-xs text-muted-foreground text-center">Changes apply at next renewal</p>
                      </>
                    ) : (
                      <>
                        <Button className="w-full bg-yellow-500/30 text-yellow-400 border border-yellow-500/50" disabled data-testid="button-current-monthly-disabled">
                          Monthly — $9.99/month
                        </Button>
                        <Button 
                          className="w-full bg-yellow-500/30 text-yellow-400 border border-yellow-500/50" 
                          disabled 
                          data-testid="button-current-yearly"
                        >
                          Current Plan — $79.99/year
                        </Button>
                        <p className="text-sm text-yellow-400 text-center font-semibold">★ Best value — Save 33%</p>
                        <p className="text-xs text-muted-foreground text-center">You're on the best value plan</p>
                      </>
                    )}
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
                  onClick={() => setLocation('/checkout?plan=monthly')}
                  data-testid="button-convert-trial"
                >
                  Subscribe Monthly — $9.99
                </Button>
                <Button 
                  className="w-full bg-yellow-500/80 hover:bg-yellow-400 text-black font-bold h-12 text-lg"
                  onClick={() => setLocation('/checkout?plan=yearly')}
                  data-testid="button-convert-trial-yearly"
                >
                  Subscribe Yearly — $79.99
                </Button>
                <p className="text-sm text-yellow-400 text-center font-semibold">★ Best value — Save 33%</p>
                <Button 
                  variant="outline"
                  className="w-full border-white/20 text-muted-foreground hover:bg-white/5"
                  onClick={handleCancelTrial}
                  disabled={cancelTrial.isPending}
                  data-testid="button-cancel-trial-inline"
                >
                  {cancelTrial.isPending ? "Ending..." : "End Trial Early"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-12 text-lg shadow-[0_0_20px_hsl(45,100%,50%,0.4)]"
                  onClick={() => setLocation('/checkout?plan=monthly')}
                  data-testid="button-subscribe-monthly"
                >
                  Subscribe Monthly — $9.99
                </Button>
                <Button 
                  className="w-full bg-yellow-500/80 hover:bg-yellow-400 text-black font-bold h-12 text-lg"
                  onClick={() => setLocation('/checkout?plan=yearly')}
                  data-testid="button-subscribe-yearly"
                >
                  Subscribe Yearly — $79.99
                </Button>
                <p className="text-sm text-yellow-400 text-center font-semibold">★ Best value — Save 33%</p>
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

          {/* Subscription Terms - Under S-Class Column (visible to all users) */}
          <div className="px-6 pb-6 space-y-4">
              <div className="border border-yellow-500/20 rounded-lg p-4 bg-black/20">
                <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Subscription Terms
                </h4>
                <ul className="text-sm text-white/70 space-y-1.5">
                  <li>• Subscription renews automatically unless canceled</li>
                  <li>• Taxes calculated based on your location</li>
                  <li>• Rewards are digital items only with no cash value</li>
                </ul>
              </div>
              
              <div className="border border-yellow-500/20 rounded-lg p-4 bg-black/20">
                <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Cancellation & Refund Policy
                </h4>
                <ul className="text-sm text-white/70 space-y-1.5">
                  <li>• Cancel anytime from Account → Subscription</li>
                  <li>• After you cancel, S-Class stays active until the end of your current billing period</li>
                  <li>• Your plan will not renew after the end date</li>
                  <li>• No partial refunds or prorated refunds for unused time</li>
                  <li>• Yearly subscriptions are not partially refunded once started</li>
                  <li>• Refunds are only available for duplicate charges or billing errors</li>
                </ul>
                <p className="text-xs text-yellow-400/70 mt-3 italic">
                  By subscribing, you acknowledge these terms.
                </p>
              </div>
            </div>

          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
        </Card>
      </div>

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
        activeUntilDate={sclassStatus?.premiumEndDate ? formatInTimeZone(new Date(sclassStatus.premiumEndDate), 'UTC', 'MMMM d, yyyy') : undefined}
      />
    </div>
  );
}
