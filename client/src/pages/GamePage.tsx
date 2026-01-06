import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import {
  useGameConfig,
  useGameStatus,
  useStartGameSession,
  useCompleteGameSession,
  useClaimGameReward,
  useClaimSocialBonus,
  useCreateChroniclePost,
  useUpdateTutorial,
  useDeclineFirstPurchaseDiscount,
} from "@/lib/api";
import {
  Zap,
  Shield,
  Flame,
  Clock,
  Trophy,
  Share2,
  Sparkles,
  AlertTriangle,
  Target,
  Users,
  BookOpen,
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
  Coins,
  Crown,
  X,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";

// Analytics tracking for CTAs with full context
const trackCTAEvent = (
  eventName: string,
  context: {
    userType: "free" | "s-class";
    reason: "runs_used" | "token_cap";
    device: "mobile" | "desktop";
    ctaVariantId?: string;
    eventActive?: boolean;
  }
) => {
  console.log(`[Analytics] ${eventName}`, context);
};

// S-Class specific analytics tracking
const trackSClassEvent = (
  eventName: string,
  context: {
    userType: "free" | "s-class";
    reason: "runs_used" | "token_cap";
    device: "mobile" | "desktop";
    ctaVariantId?: string;
    eventActive?: boolean;
  }
) => {
  console.log(`[Analytics] ${eventName}`, context);
};

// First purchase discount tracking
const trackFirstPurchaseEvent = (
  eventName: string,
  context: {
    userType: "free" | "s-class";
    reason: "runs_used" | "token_cap";
    device: "mobile" | "desktop";
    discountPercent: number;
  }
) => {
  console.log(`[Analytics] ${eventName}`, context);
};

import stableSigil from "@assets/generated_images/stable_fracture_blue_sigil.png";
import volatileSigil from "@assets/generated_images/volatile_fracture_purple_sigil.png";
import overchargedSigil from "@assets/generated_images/overcharged_rift_gold_sigil.png";

type TrialType = "safe" | "unstable" | "overcharged";
type GamePhase = "selection" | "playing" | "result";

interface FracturePoint {
  id: number;
  x: number;
  y: number;
  active: boolean;
  stabilized: boolean;
  window: number;
}

export default function GamePage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { data: config } = useGameConfig();
  const { data: status, refetch: refetchStatus } = useGameStatus();
  const startSession = useStartGameSession();
  const completeSession = useCompleteGameSession();
  const claimReward = useClaimGameReward();
  const claimSocialBonus = useClaimSocialBonus();
  const createChronicle = useCreateChroniclePost();
  const updateTutorial = useUpdateTutorial();

  const [phase, setPhase] = useState<GamePhase>("selection");
  const [selectedTrial, setSelectedTrial] = useState<TrialType | null>(null);
  const [isPractice, setIsPractice] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [trialConfig, setTrialConfig] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [fracturePoints, setFracturePoints] = useState<FracturePoint[]>([]);
  const [score, setScore] = useState(0);
  const [fracturesStabilized, setFracturesStabilized] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [shareToChronicle, setShareToChronicle] = useState(true);
  const [activeTab, setActiveTab] = useState("play");
  const [showRewardsEndedModal, setShowRewardsEndedModal] = useState(false);
  const [showTutorialButtons, setShowTutorialButtons] = useState(false);
  const [showTutorialRewarded, setShowTutorialRewarded] = useState(false);
  const [showTutorialPracticeOnly, setShowTutorialPracticeOnly] = useState(false);


  // Check if should show practice-only modal after game ends
  useEffect(() => {
    if (status?.isPracticeOnly && !status?.tutorial?.practiceOnlyDone && phase === 'selection') {
      setShowTutorialPracticeOnly(true);
    }
  }, [status?.isPracticeOnly, status?.tutorial?.practiceOnlyDone, phase]);

  // Auto-select practice mode if isPracticeOnly
  useEffect(() => {
    if (status?.isPracticeOnly && !isPractice) {
      setIsPractice(true);
    }
  }, [status?.isPracticeOnly, isPractice]);

  // Show buttons tutorial on first page load
  useEffect(() => {
    if (status && !status.tutorial?.buttonsDone && phase === 'selection') {
      setShowTutorialButtons(true);
    }
  }, [status?.tutorial?.buttonsDone, phase]);

  // Show rewarded tutorial when user first enters rewarded mode (after buttons tutorial is done)
  useEffect(() => {
    if (status && status.tutorial?.buttonsDone && !status.tutorial?.rewardedDone && 
        !status.isPracticeOnly && !isPractice && phase === 'selection' && !showTutorialButtons) {
      setShowTutorialRewarded(true);
    }
  }, [status?.tutorial?.buttonsDone, status?.tutorial?.rewardedDone, status?.isPracticeOnly, isPractice, phase, showTutorialButtons]);

  const handleTutorialButtonsDismiss = async () => {
    setShowTutorialButtons(false);
    await updateTutorial.mutateAsync('buttons');
  };

  const handleTutorialRewardedDismiss = async () => {
    setShowTutorialRewarded(false);
    await updateTutorial.mutateAsync('rewarded');
  };

  const handleTutorialPracticeOnlyDismiss = async (switchToPractice?: boolean) => {
    setShowTutorialPracticeOnly(false);
    await updateTutorial.mutateAsync('practiceOnly');
    if (switchToPractice) {
      setIsPractice(true);
    }
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const endGameCalledRef = useRef(false);

  const resetGame = useCallback(() => {
    setPhase('selection');
    setSelectedTrial(null);
    setCurrentSession(null);
    setTrialConfig(null);
    setTimeLeft(0);
    setFracturePoints([]);
    setScore(0);
    setFracturesStabilized(0);
    setResult(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    refetchStatus();
  }, [refetchStatus]);

  const startGame = async (trialType: TrialType) => {
    try {
      // Reset game state for new game
      endGameCalledRef.current = false;
      setFracturesStabilized(0);
      setScore(0);
      
      const response = await startSession.mutateAsync({ trialType, isPractice });
      setCurrentSession(response.session);
      setTrialConfig(response.trialConfig);
      setTimeLeft(response.trialConfig.duration);
      setPhase('playing');
      
      // Get gameplay parameters from config (with defaults for backward compat)
      const { 
        fractureCount = 5,
        spawnDelay = 2500,
        windowMin = 2000,
        windowMax = 3000,
        maxConcurrent = 1,
        spawnAcceleration = 1.0,
      } = response.trialConfig;
      
      // Generate all fracture points upfront with varied positions
      const initialPoints: FracturePoint[] = Array.from({ length: fractureCount }, (_, i) => ({
        id: i,
        x: 15 + Math.random() * 70, // Spread across arena
        y: 15 + Math.random() * 70,
        active: false,
        stabilized: false,
        window: windowMin + Math.random() * (windowMax - windowMin),
      }));
      setFracturePoints(initialPoints);

      // Timer countdown
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Simple spawning with concurrency: spawn one fracture at a time at spawnDelay intervals
      // maxConcurrent determines how many can be active simultaneously based on window overlap
      // With shorter spawnDelay + longer windows = more overlap = more concurrent active
      let nextSpawnIndex = 0;
      let currentDelay = spawnDelay;
      
      const spawnNextFracture = () => {
        if (nextSpawnIndex >= fractureCount) return;
        
        const pointToActivate = nextSpawnIndex;
        
        // Activate in React state
        setFracturePoints(prev => prev.map((p, i) => 
          i === pointToActivate ? { ...p, active: true } : p
        ));
        
        // Set timeout to deactivate if not clicked
        const pointWindow = initialPoints[pointToActivate].window;
        setTimeout(() => {
          setFracturePoints(prev => prev.map((p, i) => 
            i === pointToActivate && !p.stabilized ? { ...p, active: false } : p
          ));
        }, pointWindow);
        
        nextSpawnIndex++;
        
        // Schedule next spawn with acceleration
        if (nextSpawnIndex < fractureCount) {
          currentDelay = Math.max(currentDelay * spawnAcceleration, 500); // Accelerates over time
          gameLoopRef.current = setTimeout(spawnNextFracture, currentDelay);
        }
      };

      // Start spawning after brief delay
      setTimeout(spawnNextFracture, 600);

    } catch (error: any) {
      console.error('Failed to start game:', error);
    }
  };

  const handleFractureClick = (pointId: number) => {
    setFracturePoints(prev => prev.map(p => {
      if (p.id === pointId && p.active && !p.stabilized) {
        setFracturesStabilized(fs => fs + 1);
        setScore(s => s + 100);
        return { ...p, stabilized: true, active: false };
      }
      return p;
    }));
  };
  
  const endGame = useCallback(async (forceEnd: boolean = false) => {
    // Prevent multiple calls
    if (endGameCalledRef.current) return;
    endGameCalledRef.current = true;
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);

       if (!user) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
      <Card className="bg-gray-800/80 border-purple-500/30 max-w-md">
        <CardContent className="p-6 text-center">
          <Zap className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-gray-400">Please log in to play the Fracture Trial.</p>
        </CardContent>
      </Card>
    </div>
  );
}

return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4">
    <div className="max-w-4xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 mb-6">
          <TabsTrigger
            value="play"
            className="data-[state=active]:bg-purple-600"
            data-testid="tab-play"
          >
            <Zap className="w-4 h-4 mr-2" /> Play
          </TabsTrigger>

          <TabsTrigger
            value="rules"
            className="data-[state=active]:bg-yellow-600"
            data-testid="tab-rules"
          >
            <BookOpen className="w-4 h-4 mr-2" /> Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="play" className="space-y-6">
          <AnimatePresence mode="wait">
            {phase === "selection" && (
              <TrialSelection
                config={config}
                status={status}
                isPractice={isPractice}
                setIsPractice={setIsPractice}
                onSelectTrial={startGame}
                onSocialBonus={handleSocialBonus}
                isLoading={startSession.isPending}
                isMobile={isMobile}
                showTutorialButtons={showTutorialButtons}
                onTutorialButtonsDismiss={handleTutorialButtonsDismiss}
                showTutorialRewarded={showTutorialRewarded}
                onTutorialRewardedDismiss={handleTutorialRewardedDismiss}
                showTutorialPracticeOnly={showTutorialPracticeOnly}
                onTutorialPracticeOnlyDismiss={handleTutorialPracticeOnlyDismiss}
                onModeChange={(practice: boolean) => {
                  setIsPractice(practice);
                  if (
                    !practice &&
                    !status?.tutorial?.rewardedDone &&
                    !status?.isPracticeOnly
                  ) {
                    setShowTutorialRewarded(true);
                  }
                }}
              />
            )}

            {phase === "playing" && trialConfig && (
  <GameScreen
    trialConfig={trialConfig}
    session={currentSession}
    timeLeft={timeLeft}
    fracturePoints={fracturePoints}
    fracturesStabilized={fracturesStabilized}
    score={score}
    status={status}
    onFractureClick={handleFractureClick}
    onEndGame={() => endGame(true)}
  />
)}

{phase === "result" && result && (
  <ResultScreen
    result={result}
    shareToChronicle={shareToChronicle}
    setShareToChronicle={setShareToChronicle}
    onClaimReward={handleClaimReward}
    onPlayAgain={resetGame}
    isClaimLoading={claimReward.isPending || createChronicle.isPending}
    config={config}
  />
)}
</AnimatePresence>
</TabsContent>

<TabsContent value="rules">
  <RulesScreen status={status} />
</TabsContent>
</Tabs>
</div>
</div>

{/* ✅ KEEP GOING — DO NOT CLOSE THE COMPONENT HERE */}

{/* DESKTOP STATUS BOX */}
{!isMobile && status && (
  <Card
    className={`mb-6 ${
      isPracticeOnly
        ? "bg-gray-800/60 border-gray-500/30"
        : "bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30"
    }`}
    data-testid="desktop-status-box"
  >
    <CardContent className="p-4">
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        <Info className="w-5 h-5 text-purple-400" />
        Daily Rewards Status
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-gray-400 mb-1">Status</div>
          <div
            className={`font-medium flex items-center gap-1 ${
              isPracticeOnly ? "text-yellow-400" : "text-green-400"
            }`}
            data-testid="desktop-status-text"
          >
            {isPracticeOnly && <Lock className="w-4 h-4" />}
            {isPracticeOnly ? "Practice Only" : "Rewarded Available"}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Rewarded Games Left</div>
          <div className="text-white font-medium" data-testid="desktop-rewarded-remaining">
            {rewardedRemaining} / {rewardedTotal}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Tokens Earned Today</div>
          <div className="text-white font-medium" data-testid="desktop-tokens-today">
            {status.tokensEarnedToday} / {status.dailyTokenCap}
          </div>
        </div>
        <div>
          <div className="text-gray-400 mb-1">Daily Reset</div>
          <div className="text-gray-300" data-testid="desktop-reset-time">
            Resets in {getTimeUntilReset()}
          </div>
        </div>
      </div>

      {isPracticeOnly && (
        <div
          className="mt-3 text-sm text-yellow-400 bg-yellow-500/10 p-2 rounded"
          data-testid="desktop-practice-only-reason"
        >
          {getPracticeOnlyReason()}
        </div>
      )}

      {/* CTA for desktop - spec-compliant with dismiss button and dynamic copy */}
      {isPracticeOnly && !status?.isSClass && !ctaDismissed && (
        <div className="mt-4 pt-4 border-t border-gray-600/30 relative" data-testid="desktop-sclass-upsell">
          {/* Dismiss button (always visible per spec) */}
          <button
            className="absolute top-4 right-0 text-gray-400 hover:text-gray-300 p-1"
            onClick={() => {
              setCtaDismissed(true);
              trackCTAEvent("cta_dismissed", {
                userType: "free",
                reason: status?.tokensEarnedToday >= status?.dailyTokenCap ? "token_cap" : "runs_used",
                device: "desktop",
                ctaVariantId: status?.ctaVariantId,
                eventActive: status?.eventActive,
              });
            }}
            data-testid="btn-dismiss-cta-desktop"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Event badge */}
          {status?.eventActive && (
            <Badge
              className="mb-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white"
              data-testid="event-badge-desktop"
            >
              {status?.eventName || "Special Event"}
            </Badge>
          )}

          {/* First-purchase discount banner (spec-compliant copy) */}
          {status?.firstPurchaseDiscountEligible && status?.firstPurchaseCopy && (
            <div
              className="mb-4 p-3 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg relative"
              data-testid="first-purchase-discount-desktop"
            >
              {/* Decline button for discount */}
              <button
                className="absolute top-3 right-3 text-green-400 hover:text-green-300 p-1"
                onClick={() => {
                  declineDiscount.mutate();
                  trackFirstPurchaseEvent("first_purchase_discount_declined", {
                    userType: "free",
                    reason: status?.tokensEarnedToday >= status?.dailyTokenCap ? "token_cap" : "runs_used",
                    device: "desktop",
                    discountPercent: status?.firstPurchaseDiscountPercent || 20,
                  });
                }}
                data-testid="btn-decline-discount-desktop"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between">
                <div className="pr-8">
                  <p className="text-green-300 text-sm font-medium">{status.firstPurchaseCopy.headline}</p>
                  <p className="text-green-400/70 text-xs">{status.firstPurchaseCopy.subtext}</p>
                  <p className="text-green-400/50 text-xs mt-1">{status.firstPurchaseCopy.footnote}</p>
                </div>

                <Link href="/tokens">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 whitespace-nowrap"
                    onClick={() => {
                      trackFirstPurchaseEvent("first_purchase_discount_clicked", {
                        userType: "free",
                        reason: status?.tokensEarnedToday >= status?.dailyTokenCap ? "token_cap" : "runs_used",
                        device: "desktop",
                        discountPercent: status?.firstPurchaseDiscountPercent || 20,
                      });
                    }}
                    data-testid="btn-first-purchase-desktop"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    {status.firstPurchaseCopy.buttonLabel}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pr-8">
            <div>
              {/* Dynamic CTA headline from A/B test */}
              <p className="text-gray-300 text-sm">
                {status?.ctaCopy?.headline || "You've completed today's free runs"}
              </p>
              <p className="text-xs text-gray-400 mt-1">{status?.ctaCopy?.subtext || "Unlock extended play"}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="text-xs text-gray-400 hover:text-gray-300 underline"
                onClick={handleShowSClassPanel}
                data-testid="btn-learn-more-desktop"
              >
                Learn more
              </button>

              <Link href="/sclass">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                  onClick={() => {
                    trackSClassEvent("s_class_clicked_after_practice_only", {
                      userType: "free",
                      reason: status?.tokensEarnedToday >= status?.dailyTokenCap ? "token_cap" : "runs_used",
                      device: "desktop",
                      ctaVariantId: status?.ctaVariantId,
                      eventActive: status?.eventActive,
                    });
                  }}
                  data-testid="btn-upgrade-sclass-desktop"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  {status?.ctaCopy?.buttonLabel || "See Benefits"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
)}

{/* MODE BUTTONS - Two clear buttons */}
<div className={`relative ${isMobile ? "flex flex-col gap-3" : "flex gap-4 justify-center"} mb-6`}>
  {/* Tutorial overlay for buttons */}
  {showTutorialButtons && (
    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full z-50 w-72">
      <Card className="bg-purple-900/95 border-purple-400 shadow-xl">
        <CardContent className="p-4">
          <h4 className="text-white font-bold mb-2">Two Ways to Play</h4>
          <p className="text-gray-300 text-sm mb-3">
            Rewarded earns tokens (limited each day). Practice is unlimited but gives no tokens.
          </p>
          <Button size="sm" onClick={onTutorialButtonsDismiss} className="w-full" data-testid="btn-tutorial-buttons-dismiss">
            Got it
          </Button>
        </CardContent>
      </Card>
    </div>
  )}
</div>


        {/* Tutorial overlay for rewarded mode */}
        {showTutorialRewarded && (
          <div className="absolute -top-2 left-0 transform -translate-y-full z-50 w-72">
            <Card className="bg-green-900/95 border-green-400 shadow-xl">
              <CardContent className="p-4">
                <h4 className="text-white font-bold mb-2">Rewarded = Tokens</h4>
                <p className="text-gray-300 text-sm mb-3">
                  Play Rewarded games to earn tokens. Your daily limits show at the top.
                </p>
                <Button size="sm" onClick={onTutorialRewardedDismiss} className="w-full" data-testid="btn-tutorial-rewarded-dismiss">
                  Continue
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rewarded Button with CTA below when disabled */}
        <div className={`flex flex-col ${isMobile ? 'w-full' : ''}`}>
          <Button
            variant={!isPractice ? 'default' : 'outline'}
            size="lg"
            className={`${isMobile ? 'w-full py-6' : 'px-8 py-6'} flex flex-col items-center gap-1 ${
              isPracticeOnly 
                ? 'opacity-50 cursor-not-allowed bg-gray-700 border-gray-500' 
                : !isPractice 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                  : 'border-green-500/50 text-green-300 hover:bg-green-500/20'
            }`}
            onClick={() => !isPracticeOnly && onModeChange(false)}
            disabled={isPracticeOnly}
            data-testid="btn-mode-rewarded"
          >
            <div className="flex items-center gap-2">
              {isPracticeOnly && <Lock className="w-4 h-4" />}
              <Trophy className="w-5 h-5" />
              <span className="font-bold">Rewarded (Earn Tokens)</span>
            </div>
            <span className="text-xs opacity-80">
              {isPracticeOnly 
                ? 'Daily reward limit reached.' 
                : 'Uses 1 rewarded game'
              }
            </span>
          </Button>
          
          {/* S-Class link below disabled Rewarded button - only for non-S-Class users */}
          {isPracticeOnly && !status?.isSClass && (
            <div className="flex flex-col items-center gap-1 mt-2">
              <span className="text-xs text-gray-400">S-Class members earn more each day.</span>
              <button 
                className="text-sm text-purple-400 hover:text-purple-300 underline transition-colors"
                onClick={handleShowSClassPanel}
                data-testid="link-see-sclass-benefits"
              >
                See S-Class benefits
              </button>
            </div>
          )}
        </div>

        {/* Practice Button */}
        <Button
          variant={isPractice ? 'default' : 'outline'}
          size="lg"
          className={`${isMobile ? 'w-full py-6' : 'px-8 py-6'} flex flex-col items-center gap-1 ${
            isPractice 
              ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800' 
              : 'border-gray-500/50 text-gray-300 hover:bg-gray-500/20'
          }`}
          onClick={() => onModeChange(true)}
          data-testid="btn-mode-practice"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            <span className="font-bold">Practice (No Tokens)</span>
          </div>
          <span className="text-xs opacity-80">Unlimited play</span>
        </Button>
      </div>

      {/* Social Bonus */}
      {status && !status.socialBonusClaimed && !isPracticeOnly && (
        <div className="text-center mb-4">
          <Button 
            size="sm" 
            variant="outline" 
            className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20"
            onClick={onSocialBonus}
            data-testid="btn-social-bonus"
          >
            <Share2 className="w-4 h-4 mr-2" /> Claim +1 Rewarded Game (Social Bonus)
          </Button>
        </div>
      )}

      {/* Trial Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {trials.map(({ type, sigil, color, borderColor, glowColor, animation }) => {
          const trialInfo = config?.trials?.[type];
          if (!trialInfo) return null;
          
          const isOvercharged = type === 'overcharged';
          const hasEnoughTokens = !isOvercharged || (status?.tokens ?? 0) >= trialInfo.tokenCost;

          return (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`bg-gray-900/80 ${borderColor} border-2 cursor-pointer transition-all hover:shadow-xl ${glowColor} ${!hasEnoughTokens ? 'opacity-50' : ''}`}
                onClick={() => hasEnoughTokens && !isLoading && onSelectTrial(type)}
                data-testid={`trial-card-${type}`}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-20 h-20 mx-auto mb-4 ${animation}`}>
                    <img 
                      src={sigil} 
                      alt={trialInfo.name} 
                      className="w-full h-full object-contain drop-shadow-lg"
                    />
                  </div>
                  <h3 className={`text-lg font-bold mb-2 bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                    {trialInfo.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">{trialInfo.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Risk</span>
                      <Badge variant={type === 'safe' ? 'default' : type === 'unstable' ? 'secondary' : 'destructive'}>
                        {trialInfo.riskLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reward</span>
                      <span className="text-cyan-300">{trialInfo.rewardRange.min}-{trialInfo.rewardRange.max} tokens</span>
                    </div>
                    {isOvercharged && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entry</span>
                        <span className="text-yellow-300">{trialInfo.tokenCost} tokens</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration</span>
                      <span className="text-gray-300">{trialInfo.duration}s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {isPractice && (
        <div className="text-center text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Practice mode: No rewards will be earned
        </div>
      )}

      {/* Practice Only Tutorial Modal */}
      <Dialog open={showTutorialPracticeOnly} onOpenChange={() => {}}>
        <DialogContent className="bg-gray-900 border-yellow-500/50">
          <DialogHeader>
            <DialogTitle className="text-yellow-400 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Rewards Paused
            </DialogTitle>
            <DialogDescription className="text-gray-300 pt-4">
              You've reached today's reward limit. You can keep playing in Practice Mode, but you won't earn tokens until 00:00 UTC.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => onTutorialPracticeOnlyDismiss(true)}
              className="bg-gradient-to-r from-gray-600 to-gray-700"
              data-testid="btn-switch-to-practice"
            >
              Switch to Practice
            </Button>
            <Button 
              variant="outline"
              onClick={() => onTutorialPracticeOnlyDismiss(false)}
              data-testid="btn-dismiss-practice-modal"
            >
              OK
            </Button>
            
            {/* S-Class upsell - subtle text only for non-S-Class users */}
            {!status?.isSClass && (
              <div className="pt-3 border-t border-gray-700/50 mt-2 text-center">
                <p className="text-xs text-gray-400 mb-2">S-Class members get more rewarded games each day.</p>
                <Link href="/sclass">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                    onClick={() => {
                      onTutorialPracticeOnlyDismiss(false);
                      trackSClassEvent('s_class_clicked_after_practice_only', {
                        userType: 'free',
                        reason: status?.tokensEarnedToday >= status?.dailyTokenCap ? 'token_cap' : 'runs_used',
                        device: isMobile ? 'mobile' : 'desktop'
                      });
                    }}
                    data-testid="btn-see-sclass-modal"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    See S-Class
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* S-Class Info Panel */}
      <Dialog open={showSClassPanel} onOpenChange={setShowSClassPanel}>
        <DialogContent className="bg-gray-900 border-purple-500/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-purple-400 flex items-center gap-2">
              <Crown className="w-5 h-5" />
              S-Class at a Glance
            </DialogTitle>
            <DialogDescription className="sr-only">
              S-Class membership benefits and comparison
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-gray-400 text-xs mb-1">Rewarded games per day</div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-300 font-bold text-lg">6</span>
                  <span className="text-gray-500 text-xs">(Free: 3)</span>
                </div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-gray-400 text-xs mb-1">Daily token limit</div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-300 font-bold text-lg">210</span>
                  <span className="text-gray-500 text-xs">(Free: 90)</span>
                </div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-gray-400 text-xs mb-1">Practice Mode</div>
                <div className="text-white font-medium">Unlimited</div>
                <div className="text-gray-500 text-xs">(same as Free)</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg">
                <div className="text-gray-400 text-xs mb-1">Daily reset</div>
                <div className="text-white font-medium">00:00 UTC</div>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 text-center">
              S-Class helps you progress faster, but the game stays fair for everyone.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <Link href="/sclass">
                <Button 
                  variant="outline" 
                  className="w-full border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
                  onClick={() => {
                    setShowSClassPanel(false);
                    trackSClassEvent('s_class_clicked_after_practice_only', {
                      userType: status?.isSClass ? 's-class' : 'free',
                      reason: status?.tokensEarnedToday >= status?.dailyTokenCap ? 'token_cap' : 'runs_used',
                      device: isMobile ? 'mobile' : 'desktop'
                    });
                  }}
                  data-testid="btn-upgrade-sclass-panel"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to S-Class
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={() => setShowSClassPanel(false)}
                data-testid="btn-close-sclass-panel"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

function GameScreen({ trialConfig, session, timeLeft, fracturePoints, fracturesStabilized, score, status, onFractureClick, onEndGame }: { trialConfig: any; session: any; timeLeft: number; fracturePoints: FracturePoint[]; fracturesStabilized: number; score: number; status: any; onFractureClick: (id: number) => void; onEndGame: () => void }) {
  // Updated colors matching the new trial themes
  const trialColors: Record<string, string> = {
    safe: 'from-cyan-500/20 to-blue-900/20',
    unstable: 'from-purple-500/20 to-fuchsia-900/20',
    overcharged: 'from-yellow-500/20 to-orange-900/20',
  };
  
  const trialBorderColors: Record<string, string> = {
    safe: 'border-cyan-500/40',
    unstable: 'border-purple-500/40',
    overcharged: 'border-yellow-500/40',
  };
  
  const trialGlowColors: Record<string, string> = {
    safe: 'rgba(34, 211, 238, 0.5)',
    unstable: 'rgba(168, 85, 247, 0.5)',
    overcharged: 'rgba(250, 204, 21, 0.5)',
  };
  
  // Fracture point colors per trial
  const fractureActiveColors: Record<string, string> = {
    safe: 'bg-cyan-500 shadow-lg shadow-cyan-500/50',
    unstable: 'bg-purple-500 shadow-lg shadow-purple-500/50',
    overcharged: 'bg-yellow-500 shadow-lg shadow-yellow-500/50',
  };
  
  const fractureStabilizedColors: Record<string, string> = {
    safe: 'bg-cyan-300',
    unstable: 'bg-fuchsia-400',
    overcharged: 'bg-orange-400',
  };

  const urgencyColor = timeLeft <= 5 ? 'text-red-400 animate-pulse' : timeLeft <= 10 ? 'text-yellow-400' : 'text-white';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-800/50 rounded-lg border border-purple-500/30">
        <div className="flex items-center gap-4">
          <div className={`text-3xl font-mono font-bold ${urgencyColor}`}>
            <Clock className="w-6 h-6 inline mr-2" />
            {timeLeft}s
          </div>
          <Badge className={`${
            session.trialType === 'safe' ? 'bg-cyan-500/20 text-cyan-300' :
            session.trialType === 'unstable' ? 'bg-purple-500/20 text-purple-300' :
            'bg-yellow-500/20 text-yellow-300'
          }`}>
            {trialConfig.name}
          </Badge>
          <Badge variant={session.isRewarded ? 'default' : 'secondary'}>
            {session.isRewarded ? 'Rewarded' : 'Practice'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className={session.trialType === 'safe' ? 'text-cyan-300' : session.trialType === 'unstable' ? 'text-purple-300' : 'text-yellow-300'}>
            <Target className="w-4 h-4 inline mr-1" />
            {fracturesStabilized}/{trialConfig.fractureCount}
          </span>
          <span className={session.trialType === 'safe' ? 'text-cyan-300' : session.trialType === 'unstable' ? 'text-purple-300' : 'text-yellow-300'}>Score: {score}</span>
        </div>
      </div>

      <div 
        className={`relative w-full aspect-square max-w-lg mx-auto rounded-xl bg-gradient-to-br ${trialColors[session.trialType] || trialColors.safe} border-2 ${trialBorderColors[session.trialType] || trialBorderColors.safe} overflow-hidden`}
        data-testid="game-arena"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            className={`w-32 h-32 rounded-full border-4 ${trialBorderColors[session.trialType] || trialBorderColors.safe} flex items-center justify-center`}
            animate={{ 
              boxShadow: [`0 0 20px ${trialGlowColors[session.trialType]}`, `0 0 40px ${trialGlowColors[session.trialType]}`, `0 0 20px ${trialGlowColors[session.trialType]}`],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className={`w-16 h-16 ${session.trialType === 'safe' ? 'text-cyan-400' : session.trialType === 'overcharged' ? 'text-yellow-400' : 'text-purple-400'}`} />
          </motion.div>
        </div>

        <AnimatePresence>
          {fracturePoints.map((point) => (
            <motion.button
              key={point.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: point.active ? [1, 1.2, 1] : point.stabilized ? 0 : 0.5,
                opacity: point.active ? 1 : point.stabilized ? 0 : 0.3,
              }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                point.active 
                  ? `${fractureActiveColors[session.trialType] || fractureActiveColors.safe} animate-pulse` 
                  : point.stabilized 
                    ? fractureStabilizedColors[session.trialType] || fractureStabilizedColors.safe
                    : 'bg-gray-600'
              }`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onClick={() => onFractureClick(point.id)}
              disabled={!point.active || point.stabilized}
              data-testid={`fracture-point-${point.id}`}
            >
              <Sparkles className={`w-6 h-6 ${point.active ? 'text-white' : 'text-gray-400'}`} />
            </motion.button>
          ))}
        </AnimatePresence>

        {fracturePoints.some(p => p.active) && (
          <motion.div 
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{ background: `radial-gradient(circle at center, ${trialGlowColors[session.trialType] || trialGlowColors.safe} 0%, transparent 70%)` }}
          />
        )}
      </div>

      <div className="text-center">
        <p className="text-gray-400 mb-4">Tap the glowing fracture points before they fade!</p>
        <Button 
          size="lg" 
          variant="destructive" 
          onClick={onEndGame}
          data-testid="btn-end-game"
        >
          End Game Early
        </Button>
      </div>
    </motion.div>
  );
}

function ResultScreen({ result, shareToChronicle, setShareToChronicle, onClaimReward, onPlayAgain, isClaimLoading, config }: any) {
  const outcomeStyles: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    critical_success: { 
      bg: 'from-yellow-500/30 to-amber-600/30', 
      text: 'text-yellow-300', 
      icon: Sparkles,
      label: 'CRITICAL SUCCESS!' 
    },
    success: { 
      bg: 'from-green-500/30 to-emerald-600/30', 
      text: 'text-green-300', 
      icon: Trophy,
      label: 'Stabilized!' 
    },
    failure: { 
      bg: 'from-gray-500/30 to-gray-600/30', 
      text: 'text-gray-300', 
      icon: AlertTriangle,
      label: 'Fracture Slipped' 
    },
  };

  const style = outcomeStyles[result.outcome] || outcomeStyles.failure;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto"
    >
      <Card className={`bg-gradient-to-br ${style.bg} border-purple-500/30`}>
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <Icon className={`w-20 h-20 mx-auto mb-4 ${style.text}`} />
          </motion.div>

          <motion.h2 
            className={`text-3xl font-bold mb-2 ${style.text}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {style.label}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-4"
          >
            <div className="bg-gray-800/50 rounded-lg p-4 mt-6">
              <div className="text-lg text-gray-400 mb-2">Reward</div>
              <div className="text-4xl font-bold text-cyan-300">
                +{result.tokensRewarded} Tokens
              </div>
              {result.outcome === 'failure' && (
                <div className="text-sm text-gray-400 mt-2">Consolation reward</div>
              )}
            </div>

            {result.session && (
              <div className="flex justify-center gap-6 text-sm">
                <div>
                  <div className="text-gray-500">Fractures</div>
                  <div className="text-white">{result.session.fracturesStabilized}/{result.session.fracturesTotal}</div>
                </div>
                <div>
                  <div className="text-gray-500">Score</div>
                  <div className="text-white">{result.session.score}</div>
                </div>
              </div>
            )}

            {result.session?.isRewarded && config?.features?.chronicle_posts_enabled && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Switch 
                  checked={shareToChronicle} 
                  onCheckedChange={setShareToChronicle}
                  data-testid="switch-chronicle"
                />
                <span className="text-gray-300 text-sm">Share to Chronicle</span>
              </div>
            )}

            <div className="flex flex-col gap-3 mt-6">
              {result.canClaimReward && (
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
                  onClick={onClaimReward}
                  disabled={isClaimLoading}
                  data-testid="btn-claim-reward"
                >
                  {isClaimLoading ? 'Claiming...' : 'Claim Reward'}
                </Button>
              )}
              <Button 
                size="lg" 
                variant="outline"
                className="w-full border-purple-500/50"
                onClick={onPlayAgain}
                data-testid="btn-play-again"
              >
                Play Again
              </Button>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EventsScreen({ events, status }: any) {
  const upcomingEvents: any[] = events?.upcoming || [];
  const liveEvents: any[] = events?.live || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
          Scheduled Events
        </h2>
        <p className="text-gray-400">Join world events for bonus rewards</p>
      </div>

      {status && (
        <div className="flex justify-center mb-6">
          <Badge variant="outline" className="bg-gray-800/50 border-cyan-500/30 text-cyan-300 px-4 py-2">
            <Calendar className="w-4 h-4 mr-2" />
            {status.eventEntriesUsed}/3 Event Entries Used Today
          </Badge>
        </div>
      )}

      {liveEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-green-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Now
          </h3>
          {liveEvents.map((event) => (
            <EventCard key={event.id} event={event} isLive />
          ))}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-300">Upcoming Events</h3>
        {upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        ) : (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No upcoming events scheduled</p>
              <p className="text-gray-500 text-sm mt-2">Check back later for world events!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}

function EventCard({ event, isLive = false }: { event: any; isLive?: boolean }) {
  const scheduledTime = new Date(event.scheduledAt);
  const timeUntil = Math.max(0, scheduledTime.getTime() - Date.now());
  const hours = Math.floor(timeUntil / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Card className={`bg-gray-800/50 ${isLive ? 'border-green-500/50' : 'border-purple-500/30'}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white mb-1">{event.name}</h4>
            <p className="text-gray-400 text-sm mb-3">{event.description}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="outline" className="border-purple-500/30">
                <Clock className="w-3 h-3 mr-1" />
                {event.durationMinutes} min
              </Badge>
              <Badge variant="outline" className="border-cyan-500/30">
                <Users className="w-3 h-3 mr-1" />
                {event.participants} joined
              </Badge>
              <Badge variant="outline" className="border-yellow-500/30">
                <Sparkles className="w-3 h-3 mr-1" />
                {event.extraEntryCost} tokens/extra entry
              </Badge>
            </div>
          </div>
          <div className="text-right">
            {isLive ? (
              <Button size="sm" className="bg-green-500 hover:bg-green-600" data-testid={`btn-join-event-${event.id}`}>
                Join Now
              </Button>
            ) : (
              <>
                <div className="text-cyan-300 font-mono text-lg mb-2">
                  {hours}h {minutes}m
                </div>
                <Button size="sm" variant="outline" disabled data-testid={`btn-event-${event.id}`}>
                  Upcoming
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RulesScreen({ status }: { status: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
          Game & Token Rules
        </h1>
        <p className="text-gray-400">Everything you need to know about earning tokens</p>
      </div>

      {status && (
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <Badge variant="outline" className="bg-gray-800/50 border-purple-500/30 text-purple-300 px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {status.rewardedRunsRemaining} Rewarded Runs Left Today
          </Badge>
          <Badge variant="outline" className="bg-gray-800/50 border-cyan-500/30 text-cyan-300 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            {status.tokensEarnedToday}/{status.dailyTokenCap} Tokens Earned Today
          </Badge>
        </div>
      )}

      <div className="grid gap-4">
        <Card className="bg-gray-800/50 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">How You Earn Tokens</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• You earn tokens by playing <strong className="text-purple-300">rewarded games</strong></li>
                  <li>• Only rewarded games give tokens</li>
                  <li>• Practice Mode lets you play unlimited, but gives no tokens</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-cyan-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Daily Token Limits</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• <strong className="text-cyan-300">Free players:</strong> up to 90 tokens per day</li>
                  <li>• <strong className="text-cyan-300">S-Class members:</strong> up to 210 tokens per day</li>
                  <li>• This limit applies to all games combined</li>
                  <li>• Once you reach your daily token limit, you cannot earn more that day</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-yellow-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Rewarded Games Per Day</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• <strong className="text-yellow-300">Free players:</strong> up to 3 rewarded games per day</li>
                  <li>• <strong className="text-yellow-300">S-Class members:</strong> up to 6 rewarded games per day</li>
                  <li>• Some actions may give +1 extra rewarded game</li>
                  <li>• You must have a rewarded game available to earn tokens</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Important: Rewarded Games Are a Hard Limit</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• If you play all your rewarded games for the day:</li>
                  <li className="ml-4">- You cannot earn more tokens, even if you did not reach the daily token limit</li>
                  <li className="ml-4">- You can keep playing in Practice Mode, but will not earn tokens</li>
                </ul>
                <div className="mt-3 p-3 bg-red-500/10 rounded-lg text-sm">
                  <strong className="text-red-300">Example:</strong> A free player can earn up to 90 tokens per day.
                  If they play all 3 rewarded games and earn 65 tokens, only 65 tokens are added.
                  The remaining 25 tokens cannot be earned later.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What Happens If You Win More Than the Daily Limit</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Sometimes a game may give more tokens than you are allowed to earn</li>
                  <li>• Only the tokens that fit within your daily limit are added</li>
                  <li>• Any extra tokens are <strong className="text-orange-300">not added, not saved, and not carried over</strong></li>
                </ul>
                <div className="mt-3 p-3 bg-orange-500/10 rounded-lg text-sm">
                  <strong className="text-orange-300">Example:</strong> If you are at 85/90 tokens and win 30 tokens, 
                  only 5 tokens are added to reach the cap.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Practice Mode</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• <strong className="text-green-300">Unlimited play</strong> - play as much as you want</li>
                  <li>• No token rewards</li>
                  <li>• Always available, even when limits are reached</li>
                  <li>• Perfect for learning, testing, or just having fun!</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Daily Reset Time</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Token limits and rewarded games reset every day at <strong className="text-blue-300">00:00 UTC</strong></li>
                  <li>• Tokens or games you did not use do not carry over</li>
                  <li>• Each day starts fresh with full limits</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
