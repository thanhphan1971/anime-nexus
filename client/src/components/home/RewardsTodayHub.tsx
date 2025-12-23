import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { 
  Sparkles, Gift, Clock, Star, Coins,
  ChevronRight, Loader2, Zap, Crown, Share2, Check
} from "lucide-react";
import { motion } from "framer-motion";
import { useFreeGachaStatus, useFreeSummon, useShareSummon } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PortalCharge } from "@/components/PortalRing";
import { RarityFrame } from "@/components/RarityFrame";

export function RewardsTodayHub() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: freeStatus, refetch: refetchFreeStatus } = useFreeGachaStatus();
  const freeSummonMutation = useFreeSummon();
  
  const [isSummoning, setIsSummoning] = useState(false);
  const [summonedCard, setSummonedCard] = useState<any>(null);
  const [showPortal, setShowPortal] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareDismissed, setShareDismissed] = useState(false);
  const shareSummon = useShareSummon();

  const handleShareToFeed = async () => {
    if (!summonedCard) return;
    
    setIsSharing(true);
    try {
      await shareSummon.mutateAsync({
        cardId: summonedCard.id,
        source: 'daily_free',
      });
      setHasShared(true);
      toast.success("Shared to Feed!");
    } catch (error: any) {
      toast.error(error.message || "Failed to share");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCloseResult = () => {
    toast.success(`${summonedCard?.name} added to your collection!`);
    setSummonedCard(null);
    setHasShared(false);
    setShareDismissed(false);
  };

  const handleDismissShare = () => {
    setShareDismissed(true);
  };

  const handleFreeSummon = () => {
    if (!user) {
      toast.error("Please sign in to use free summon");
      return;
    }
    if (!freeStatus || freeStatus.remainingToday <= 0) {
      toast.error("No free summons remaining today!");
      return;
    }
    setIsSummoning(true);
    setShowPortal(true);
    setSummonedCard(null);
    setHasShared(false);
    setShareDismissed(false);
    
    setTimeout(() => {
      freeSummonMutation.mutate(undefined, {
        onSuccess: (data: any) => {
          setSummonedCard(data.card);
          refetchFreeStatus();
          setTimeout(() => {
            setShowPortal(false);
            setIsSummoning(false);
          }, 2000);
        },
        onError: (error: any) => {
          toast.error(error.message || "Failed to summon");
          setIsSummoning(false);
          setShowPortal(false);
        },
      });
    }, 800);
  };

  const handlePortalComplete = () => {
    setShowPortal(false);
    setIsSummoning(false);
  };

  const getResetTimeString = () => {
    if (!freeStatus?.nextResetAt) return "12:00 AM";
    try {
      return format(new Date(freeStatus.nextResetAt), "h:mm a");
    } catch {
      return "12:00 AM";
    }
  };

  const hasTokens = user && user.tokens >= 100;
  const isPremium = user?.isPremium || false;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-5 w-5 text-purple-400" />
        <h2 className="font-display font-bold text-lg text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text">
          REWARDS TODAY
        </h2>
      </div>

      <Card 
        className="relative overflow-hidden border-purple-500/50 bg-gradient-to-br from-purple-950/60 via-slate-950/80 to-cyan-950/40"
        data-testid="card-daily-summon"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 via-cyan-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold uppercase">Daily Reward</span>
                </div>
                <h3 className="font-bold text-white">Free Summon</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {user && freeStatus && (
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="font-bold text-white text-sm" data-testid="text-free-summons-remaining">
                      {freeStatus.remainingToday}/{freeStatus.dailyFreeLimit}
                    </span>
                  </div>
                </div>
              )}
              
              <Button
                size="sm"
                onClick={handleFreeSummon}
                disabled={!user || isSummoning || !freeStatus || freeStatus.remainingToday <= 0}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold disabled:opacity-50"
                data-testid="button-claim-free-summon"
              >
                {isSummoning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !user ? (
                  "Sign In"
                ) : freeStatus && freeStatus.remainingToday > 0 ? (
                  <>
                    <Gift className="h-4 w-4 mr-1" />
                    Claim
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 mr-1" />
                    {getResetTimeString()}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {freeStatus?.remainingToday === 0 && isPremium === false && (
            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-300 flex items-center gap-2">
                <Crown className="h-3.5 w-3.5" />
                S-Class members get 2 free summons daily!
                <Button 
                  size="sm" 
                  variant="link" 
                  className="text-yellow-400 p-0 h-auto text-xs"
                  onClick={() => setLocation("/premium")}
                >
                  Upgrade
                </Button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card 
        className="relative overflow-hidden border-cyan-500/50 bg-gradient-to-br from-cyan-950/60 via-slate-950/80 to-purple-950/40"
        data-testid="card-paid-summon"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full font-bold uppercase">Gacha</span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Coins className="h-3 w-3" /> 100 Tokens
                  </span>
                </div>
                <h3 className="font-bold text-white">Premium Summon</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-lg">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="font-mono font-bold text-yellow-400">{user.tokens.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">Current Balance</span>
                </div>
              )}
              
              <Button
                size="sm"
                onClick={() => setLocation("/cards?mode=paid")}
                disabled={!user}
                className={hasTokens 
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold"
                  : "bg-muted text-muted-foreground"}
                data-testid="button-summon-now"
              >
                {!user ? (
                  "Sign In"
                ) : hasTokens ? (
                  <>
                    <Zap className="h-4 w-4 mr-1" />
                    Summon
                  </>
                ) : (
                  "Get Tokens"
                )}
              </Button>
            </div>
          </div>
          
          {user && !hasTokens && (
            <div className="mt-3 p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-xs text-cyan-300 flex items-center gap-2">
                <Coins className="h-3.5 w-3.5" />
                Need more tokens?
                <Button 
                  size="sm" 
                  variant="link" 
                  className="text-cyan-400 p-0 h-auto text-xs"
                  onClick={() => setLocation("/tokens")}
                >
                  Get Tokens
                </Button>
              </p>
            </div>
          )}
          
          <button 
            className="mt-2 text-[10px] text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
            onClick={() => setLocation("/cards")}
          >
            How Summoning Works <ChevronRight className="h-3 w-3" />
          </button>
        </CardContent>
      </Card>

      <Dialog open={showPortal} onOpenChange={() => {}}>
        <DialogContent className="bg-transparent border-0 shadow-none max-w-md p-0">
          <div className="flex items-center justify-center min-h-[300px]">
            <PortalCharge onComplete={handlePortalComplete} duration={800} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!summonedCard} onOpenChange={() => { setSummonedCard(null); setHasShared(false); setShareDismissed(false); }}>
        <DialogContent className="bg-slate-950/95 border-purple-500/30 max-w-sm p-6">
          {summonedCard && (
            <div className="flex flex-col items-center gap-4">
              <h3 className="font-display font-bold text-lg text-center text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text">
                Card Obtained!
              </h3>
              <RarityFrame rarity={summonedCard.rarity}>
                <img 
                  src={summonedCard.image} 
                  alt={summonedCard.name} 
                  className="w-48 h-64 object-cover rounded-lg"
                />
              </RarityFrame>
              <div className="text-center">
                <p className="font-bold text-white">{summonedCard.name}</p>
                <p className="text-sm text-muted-foreground">{summonedCard.character} • {summonedCard.anime}</p>
                <p className={`text-xs mt-1 font-bold ${
                  summonedCard.rarity === 'Mythic' ? 'text-red-400' :
                  summonedCard.rarity === 'Legendary' ? 'text-yellow-400' :
                  summonedCard.rarity === 'Epic' ? 'text-purple-400' :
                  summonedCard.rarity === 'Rare' ? 'text-blue-400' : 'text-gray-400'
                }`}>{summonedCard.rarity}</p>
              </div>
              
              {/* Share to Feed Panel */}
              {!shareDismissed && (
                <div className="w-full bg-slate-900/60 border border-white/10 rounded-lg p-3">
                  {hasShared ? (
                    <div className="flex items-center justify-center gap-2 text-green-400 font-medium text-sm">
                      <Check className="h-4 w-4" />
                      Shared to Feed!
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-center text-muted-foreground mb-2">Share your pull?</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={handleShareToFeed}
                          disabled={isSharing}
                          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-xs"
                          data-testid="button-share-to-feed"
                        >
                          {isSharing ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Share2 className="h-3 w-3 mr-1" />
                          )}
                          Share to Feed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleDismissShare}
                          className="text-muted-foreground hover:text-white text-xs"
                          data-testid="button-not-now"
                        >
                          Not now
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button 
                onClick={handleCloseResult} 
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600"
                data-testid="button-close-card-reveal"
              >
                Awesome!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
