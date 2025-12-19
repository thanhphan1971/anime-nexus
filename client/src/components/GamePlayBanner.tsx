import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Play, Calendar, Zap, Crown } from "lucide-react";
import { useLocation } from "wouter";
import { useGameStatus } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface GamePlayBannerProps {
  variant?: 'default' | 'direct' | 'habit' | 'lore';
}

const copyVariants = {
  default: {
    description: "Play short challenges inside AniRealm to earn tokens, rewards, and influence the world.",
    supportingLine: "Daily free plays available. Premium members unlock more runs.",
  },
  direct: {
    description: "Play games. Earn tokens. Shape the fate of AniRealm.",
    supportingLine: "Daily free plays available. Premium members unlock more runs.",
  },
  habit: {
    description: "Jump into daily challenges and earn tokens in under 30 seconds.",
    supportingLine: "Daily free plays available. Premium members unlock more runs.",
  },
  lore: {
    description: "Reality is fracturing. Enter trials, stabilize the world, and earn rewards.",
    supportingLine: "Daily free plays available. Premium members unlock more runs.",
  },
};

export default function GamePlayBanner({ variant = 'default' }: GamePlayBannerProps) {
  const [, setLocation] = useLocation();
  const { data: status } = useGameStatus();
  const { user } = useAuth();
  
  const copy = copyVariants[variant];
  
  const isPracticeOnly = status?.isPracticeOnly || false;
  const rewardedTotal = status?.rewardedRunsTotal || status?.baseRewardedRuns || 3;
  const rewardedRemaining = status?.rewardedRunsRemaining || 0;
  const eventActive = status?.eventActive || false;
  const hasNeverPlayed = status?.totalSessionsPlayed === 0;
  const userTokens = user?.tokens || 0;

  const getStatusMessage = () => {
    if (hasNeverPlayed) {
      return "New! Play short games to earn your first tokens.";
    }
    if (userTokens === 0 && !isPracticeOnly) {
      return "Play games to earn tokens — no purchase required.";
    }
    if (isPracticeOnly) {
      return "No rewarded runs left today — practice mode still available.";
    }
    return `You have ${rewardedRemaining} rewarded run${rewardedRemaining !== 1 ? 's' : ''} available today.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card 
        className="relative overflow-hidden border-cyan-500/50 bg-gradient-to-br from-slate-950/80 via-cyan-950/40 to-purple-950/40"
        data-testid="section-gameplay-banner"
      >
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-1/4 right-1/4 w-32 h-32 border border-cyan-400/40 rounded-full animate-pulse" />
          <div className="absolute bottom-1/4 left-1/4 w-24 h-24 border border-purple-400/30 rounded-full" style={{ animation: 'pulse 3s infinite' }} />
        </div>
        <div className="absolute top-0 left-0 w-40 h-40 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full" />
        
        <CardContent className="p-5 relative z-10 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Gamepad2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text">
                    🎮 GAME PLAY
                  </h3>
                  {eventActive && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-[10px] px-1.5 py-0">
                      <Zap className="h-3 w-3 mr-0.5" />
                      LIVE EVENT
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  {copy.description}
                </p>
              </div>
            </div>
            
            {user && !isPracticeOnly && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5 justify-end">
                  <Play className="h-4 w-4 text-cyan-400" />
                  <span className="font-bold text-white" data-testid="text-rewarded-runs">
                    {rewardedRemaining} / {rewardedTotal}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">rewarded runs</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isPracticeOnly ? (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                Practice Mode Only
              </Badge>
            ) : (
              <span className="text-cyan-300" data-testid="text-status-message">
                {getStatusMessage()}
              </span>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Crown className="h-3 w-3 text-yellow-500" />
            {copy.supportingLine}
          </p>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              onClick={() => setLocation("/game")}
              className={`flex-1 h-12 font-bold shadow-lg ${
                isPracticeOnly 
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 shadow-gray-500/20"
                  : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
              } text-white`}
              data-testid="button-play-now"
            >
              <Play className="h-5 w-5 mr-2" />
              {isPracticeOnly ? "Practice Mode" : "Play Now"}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setLocation("/game")}
              className="h-12 border-purple-500/50 hover:bg-purple-500/10 text-purple-300"
              data-testid="button-events"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Events
            </Button>
          </div>

          {isPracticeOnly && (
            <p className="text-[10px] text-center text-amber-400/70">
              No rewards in practice mode
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
