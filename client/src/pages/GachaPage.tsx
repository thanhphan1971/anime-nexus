import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift, Zap, Coins, Clock, Star, Info, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PortalRing, PortalCharge } from "@/components/PortalRing";
import { CardReveal, CardBack } from "@/components/CardReveal";
import { RarityBadge, type Rarity } from "@/components/RarityFrame";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";

type PullPhase = "idle" | "charging" | "reveal";
type BannerType = "free" | "paid";

export default function GachaPage() {
  const [phase, setPhase] = useState<PullPhase>("idle");
  const [reward, setReward] = useState<any>(null);
  const [banner, setBanner] = useState<BannerType>("free");
  const [rulesOpen, setRulesOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: freeStatus, refetch: refetchFreeStatus } = useQuery<{
    dailyFreeLimit: number;
    usedToday: number;
    remainingToday: number;
    nextResetAt: string;
    isPremium: boolean;
  }>({
    queryKey: ["/api/gacha/free-status"],
    enabled: !!user,
  });

  const freeSummonMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/gacha/free-summon");
      return response.json();
    },
    onSuccess: (data) => {
      setReward(data.card);
      setPhase("reveal");
      refetchFreeStatus();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refreshUser?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to summon");
      setPhase("idle");
    },
  });

  const paidSummonMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cards/summon");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.cards && data.cards.length > 0) {
        setReward(data.cards[0]);
        setPhase("reveal");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refreshUser?.();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to summon");
      setPhase("idle");
    },
  });

  const handlePull = () => {
    if (phase !== "idle") return;
    
    if (!user) {
      toast.error("Please sign in to summon");
      return;
    }

    if (banner === "free") {
      if (!freeStatus || freeStatus.remainingToday <= 0) {
        toast.error("No free summons remaining today!");
        return;
      }
      setPhase("charging");
      setReward(null);
      const chargeDuration = prefersReducedMotion ? 200 : 800;
      setTimeout(() => {
        freeSummonMutation.mutate();
      }, chargeDuration);
    } else {
      if (!user || (user.tokens || 0) < 100) {
        toast.error("Not enough tokens! Need 100 tokens.");
        return;
      }
      setPhase("charging");
      setReward(null);
      const chargeDuration = prefersReducedMotion ? 200 : 800;
      setTimeout(() => {
        paidSummonMutation.mutate();
      }, chargeDuration);
    }
  };

  const handleCollect = () => {
    setPhase("idle");
    setReward(null);
    toast.success(`${reward?.name || 'Card'} added to your collection!`);
  };

  const canPull = () => {
    if (!user) return false;
    if (banner === "free") {
      return freeStatus && freeStatus.remainingToday > 0;
    } else {
      return (user.tokens || 0) >= 100;
    }
  };

  const getResetTimeString = () => {
    if (!freeStatus?.nextResetAt) return "12:00 AM";
    try {
      return format(new Date(freeStatus.nextResetAt), "h:mm a");
    } catch {
      return "12:00 AM";
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background -z-10" />
      
      <div 
        className="absolute inset-0 -z-10 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <div className="text-center mb-6 z-10">
        <h1 className="text-3xl md:text-5xl font-display font-black mb-2">
          <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            CARD SUMMON
          </span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Step through the Fracture Portal to reveal rare collectibles
        </p>
      </div>

      <Tabs value={banner} onValueChange={(v) => setBanner(v as BannerType)} className="w-full max-w-md mb-6 z-10">
        <TabsList className="grid w-full grid-cols-2 bg-black/30 border border-white/10">
          <TabsTrigger 
            value="free" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-600 data-[state=active]:to-emerald-600"
            data-testid="tab-free-banner"
          >
            <Gift className="h-4 w-4 mr-2" />
            Free Pull
          </TabsTrigger>
          <TabsTrigger 
            value="paid" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-600 data-[state=active]:to-amber-600"
            data-testid="tab-paid-banner"
          >
            <Coins className="h-4 w-4 mr-2" />
            Paid Pull
          </TabsTrigger>
        </TabsList>

        <TabsContent value="free" className="mt-4">
          <div className="bg-black/20 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-green-400">Standard Banner</h3>
                <p className="text-xs text-muted-foreground">Permanent Cards Only</p>
              </div>
              {user && freeStatus && (
                <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1.5 rounded-full">
                  <Star className="h-4 w-4 text-yellow-400" />
                  <span className="font-bold text-white" data-testid="text-free-remaining">
                    {freeStatus.remainingToday} / {freeStatus.dailyFreeLimit}
                  </span>
                </div>
              )}
            </div>
            {freeStatus && freeStatus.remainingToday <= 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Resets at {getResetTimeString()}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paid" className="mt-4">
          <div className="bg-black/20 rounded-lg p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-yellow-400">Premium Banner</h3>
                <p className="text-xs text-muted-foreground">Better Odds • All Cards</p>
              </div>
              <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="font-bold text-white">100 tokens</span>
              </div>
            </div>
            {user && (
              <p className="text-xs text-muted-foreground">
                Your balance: <span className="text-yellow-400 font-bold">{user.tokens || 0}</span> tokens
                {user.isPremium && <span className="ml-2 text-purple-400">(S-Class: 2 cards per pull!)</span>}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center mb-6">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <PortalRing isActive={phase === "charging"} size={350} />
        </div>
        
        <AnimatePresence mode="wait">
          {phase === "idle" && !reward && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <CardBack 
                onClick={handlePull} 
                disabled={!canPull()}
              />
            </motion.div>
          )}

          {phase === "charging" && (
            <motion.div
              key="charging"
              className="flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.2 }}
            >
              <PortalCharge duration={prefersReducedMotion ? 200 : 800} />
              
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.3, 1] }}
                >
                  <Zap className="h-8 w-8 text-cyan-400 mx-auto animate-pulse" />
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === "reveal" && reward && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CardReveal card={reward} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summon Button - Shows when idle and can pull */}
      {phase === "idle" && canPull() && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 z-10"
        >
          <Button
            size="lg"
            onClick={handlePull}
            disabled={phase !== "idle"}
            className={banner === "free" 
              ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 border-0 text-white font-bold px-8"
              : "bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 border-0 text-white font-bold px-8"
            }
            data-testid="button-summon"
          >
            {banner === "free" ? (
              <>
                <Gift className="h-5 w-5 mr-2" />
                Use Free Pull
              </>
            ) : (
              <>
                <Coins className="h-5 w-5 mr-2" />
                Summon (100 Tokens)
              </>
            )}
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {phase === "reveal" && reward && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-4 z-10"
          >
            <div className="text-center mb-2">
              <p className="text-sm text-muted-foreground">You obtained</p>
              <p className="text-lg font-bold text-white">{reward.name}</p>
              <RarityBadge rarity={reward.rarity} size="md" />
            </div>
            
            <Button 
              size="lg" 
              onClick={handleCollect}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 border-0"
              data-testid="button-collect"
            >
              Collect & Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!canPull() && phase === "idle" && user && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground z-10"
        >
          {banner === "free" ? (
            <>
              <p className="text-sm">No free pulls remaining today</p>
              <p className="text-xs mt-1">Come back at {getResetTimeString()} or try Paid Pull!</p>
            </>
          ) : (
            <>
              <p className="text-sm">Not enough tokens</p>
              <p className="text-xs mt-1">Earn more tokens or try Free Pull!</p>
            </>
          )}
        </motion.div>
      )}

      {!user && phase === "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground z-10"
        >
          <p className="text-sm">Sign in to start summoning</p>
        </motion.div>
      )}

      <Collapsible open={rulesOpen} onOpenChange={setRulesOpen} className="w-full max-w-md mt-6 z-10">
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors w-full justify-center py-2" data-testid="button-toggle-gacha-rules">
          <Info className="h-3.5 w-3.5" />
          <span>Summon Rules & Rates</span>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 p-4 bg-black/30 rounded-lg border border-white/10 text-xs space-y-3">
            <div>
              <h4 className="font-bold text-green-400 mb-1">Free Pull (Standard Banner)</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 1 free pull per day (2 for S-Class)</li>
                <li>• Only permanent cards available</li>
                <li>• Lower rare drop rates</li>
                <li>• Resets at 12:00 AM local time</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-yellow-400 mb-1">Paid Pull (Premium Banner)</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Costs 100 tokens per pull</li>
                <li>• All cards available (including event/premium)</li>
                <li>• Better rare drop rates</li>
                <li>• S-Class gets 2 cards + boosted odds</li>
              </ul>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="absolute bottom-4 left-4 right-4 flex justify-center z-10">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className={`px-2 py-1 rounded ${banner === 'free' ? 'bg-green-500/20 text-green-400' : 'bg-white/5'}`}>
            {banner === 'free' ? 'Standard Banner' : 'Premium Banner'}
          </span>
        </div>
      </div>
    </div>
  );
}
