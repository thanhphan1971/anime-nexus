import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { 
  useGameConfig, 
  useGameStatus, 
  useStartGameSession, 
  useCompleteGameSession, 
  useClaimGameReward,
  useClaimSocialBonus,
  useCreateChroniclePost,
  useGameEvents
} from "@/lib/api";
import { Zap, Shield, Flame, Clock, Trophy, Share2, Sparkles, AlertTriangle, Target, Calendar, Users } from "lucide-react";

type TrialType = 'safe' | 'unstable' | 'overcharged';
type GamePhase = 'selection' | 'playing' | 'result';

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
  const { data: config } = useGameConfig();
  const { data: status, refetch: refetchStatus } = useGameStatus();
  const { data: eventsData } = useGameEvents();
  const startSession = useStartGameSession();
  const completeSession = useCompleteGameSession();
  const claimReward = useClaimGameReward();
  const claimSocialBonus = useClaimSocialBonus();
  const createChronicle = useCreateChroniclePost();

  const [phase, setPhase] = useState<GamePhase>('selection');
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
  const [activeTab, setActiveTab] = useState('play');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

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
      const response = await startSession.mutateAsync({ trialType, isPractice });
      setCurrentSession(response.session);
      setTrialConfig(response.trialConfig);
      setTimeLeft(response.trialConfig.duration);
      setPhase('playing');
      
      const initialPoints: FracturePoint[] = Array.from({ length: response.trialConfig.fractureCount }, (_, i) => ({
        id: i,
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        active: false,
        stabilized: false,
        window: 2000 + Math.random() * 1000,
      }));
      setFracturePoints(initialPoints);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      let currentPointIndex = 0;
      const activateNextPoint = () => {
        if (currentPointIndex < initialPoints.length) {
          setFracturePoints(prev => prev.map((p, i) => 
            i === currentPointIndex ? { ...p, active: true } : p
          ));
          
          const pointWindow = initialPoints[currentPointIndex].window;
          setTimeout(() => {
            setFracturePoints(prev => prev.map((p, i) => 
              i === currentPointIndex && !p.stabilized ? { ...p, active: false } : p
            ));
          }, pointWindow);
          
          currentPointIndex++;
          if (currentPointIndex < initialPoints.length) {
            gameLoopRef.current = setTimeout(activateNextPoint, (response.trialConfig.duration * 1000) / initialPoints.length);
          }
        }
      };

      setTimeout(activateNextPoint, 1000);

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

  const endGame = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);

    if (currentSession) {
      try {
        // Server-authoritative: only send sessionId, server determines outcome
        const response = await completeSession.mutateAsync(currentSession.id);
        // Use server-provided values for display
        setFracturesStabilized(response.fracturesStabilized || 0);
        setScore(response.session?.score || 0);
        setResult(response);
        setPhase('result');
      } catch (error: any) {
        console.error('Failed to complete game:', error);
        // Handle session expired or too fast errors
        if (error?.code === 'EXPIRED' || error?.code === 'TOO_FAST') {
          setResult({ outcome: 'failure', tokensRewarded: 0, canClaimReward: false });
          setPhase('result');
        }
      }
    }
  }, [currentSession, completeSession]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0 && currentSession) {
      endGame();
    }
  }, [timeLeft, phase, currentSession, endGame]);

  const handleClaimReward = async () => {
    if (!result?.session?.id) return;
    try {
      await claimReward.mutateAsync(result.session.id);
      if (shareToChronicle && result.session.isRewarded) {
        await createChronicle.mutateAsync(result.session.id);
      }
      refetchStatus();
    } catch (error: any) {
      console.error('Failed to claim reward:', error);
    }
  };

  const handleSocialBonus = async () => {
    try {
      await claimSocialBonus.mutateAsync();
      refetchStatus();
    } catch (error: any) {
      console.error('Failed to claim social bonus:', error);
    }
  };

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
            <TabsTrigger value="play" className="data-[state=active]:bg-purple-600" data-testid="tab-play">
              <Zap className="w-4 h-4 mr-2" /> Play
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-cyan-600" data-testid="tab-events">
              <Calendar className="w-4 h-4 mr-2" /> Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="play" className="space-y-6">
            <AnimatePresence mode="wait">
              {phase === 'selection' && (
                <TrialSelection 
                  config={config}
                  status={status}
                  isPractice={isPractice}
                  setIsPractice={setIsPractice}
                  onSelectTrial={startGame}
                  onSocialBonus={handleSocialBonus}
                  isLoading={startSession.isPending}
                />
              )}

              {phase === 'playing' && trialConfig && (
                <GameScreen
                  trialConfig={trialConfig}
                  session={currentSession}
                  timeLeft={timeLeft}
                  fracturePoints={fracturePoints}
                  fracturesStabilized={fracturesStabilized}
                  score={score}
                  status={status}
                  onFractureClick={handleFractureClick}
                  onEndGame={endGame}
                />
              )}

              {phase === 'result' && result && (
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

          <TabsContent value="events">
            <EventsScreen events={eventsData} status={status} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TrialSelection({ config, status, isPractice, setIsPractice, onSelectTrial, onSocialBonus, isLoading }: any) {
  const trials = [
    { type: 'safe' as TrialType, icon: Shield, color: 'from-green-500 to-emerald-600', borderColor: 'border-green-500/50' },
    { type: 'unstable' as TrialType, icon: Zap, color: 'from-purple-500 to-violet-600', borderColor: 'border-purple-500/50' },
    { type: 'overcharged' as TrialType, icon: Flame, color: 'from-orange-500 to-red-600', borderColor: 'border-orange-500/50' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          The Fracture Trial
        </h1>
        <p className="text-gray-400">Stabilize dimensional fractures and earn rewards</p>
      </div>

      {status && (
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <Badge variant="outline" className="bg-gray-800/50 border-purple-500/30 text-purple-300 px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            {status.rewardedRunsRemaining}/{status.baseRewardedRuns + (status.socialBonusClaimed ? 1 : 0)} Rewarded Runs Left
          </Badge>
          <Badge variant="outline" className="bg-gray-800/50 border-cyan-500/30 text-cyan-300 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            {status.tokensEarnedToday}/{status.dailyTokenCap} Tokens Today
          </Badge>
          {!status.socialBonusClaimed && (
            <Button 
              size="sm" 
              variant="outline" 
              className="border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/20"
              onClick={onSocialBonus}
              data-testid="btn-social-bonus"
            >
              <Share2 className="w-4 h-4 mr-2" /> Claim +1 Run (Social)
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-sm ${!isPractice ? 'text-white' : 'text-gray-400'}`}>Rewarded</span>
        <Switch 
          checked={isPractice} 
          onCheckedChange={setIsPractice}
          data-testid="switch-practice"
        />
        <span className={`text-sm ${isPractice ? 'text-white' : 'text-gray-400'}`}>Practice</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {trials.map(({ type, icon: Icon, color, borderColor }) => {
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
                className={`bg-gray-800/50 ${borderColor} cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/20 ${!hasEnoughTokens ? 'opacity-50' : ''}`}
                onClick={() => hasEnoughTokens && !isLoading && onSelectTrial(type)}
                data-testid={`trial-card-${type}`}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} mx-auto mb-4 flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{trialInfo.name}</h3>
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
                        <span className="text-orange-300">{trialInfo.tokenCost} tokens</span>
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
    </motion.div>
  );
}

function GameScreen({ trialConfig, session, timeLeft, fracturePoints, fracturesStabilized, score, status, onFractureClick, onEndGame }: { trialConfig: any; session: any; timeLeft: number; fracturePoints: FracturePoint[]; fracturesStabilized: number; score: number; status: any; onFractureClick: (id: number) => void; onEndGame: () => void }) {
  const trialColors: Record<string, string> = {
    safe: 'from-green-500/20 to-green-900/20',
    unstable: 'from-purple-500/20 to-purple-900/20',
    overcharged: 'from-orange-500/20 to-red-900/20',
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
            session.trialType === 'safe' ? 'bg-green-500/20 text-green-300' :
            session.trialType === 'unstable' ? 'bg-purple-500/20 text-purple-300' :
            'bg-orange-500/20 text-orange-300'
          }`}>
            {trialConfig.name}
          </Badge>
          <Badge variant={session.isRewarded ? 'default' : 'secondary'}>
            {session.isRewarded ? 'Rewarded' : 'Practice'}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-cyan-300">
            <Target className="w-4 h-4 inline mr-1" />
            {fracturesStabilized}/{trialConfig.fractureCount}
          </span>
          <span className="text-purple-300">Score: {score}</span>
        </div>
      </div>

      <div 
        className={`relative w-full aspect-square max-w-lg mx-auto rounded-xl bg-gradient-to-br ${trialColors[session.trialType] || trialColors.safe} border border-purple-500/30 overflow-hidden`}
        data-testid="game-arena"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            className="w-32 h-32 rounded-full border-4 border-purple-500/50 flex items-center justify-center"
            animate={{ 
              boxShadow: ['0 0 20px rgba(168, 85, 247, 0.5)', '0 0 40px rgba(168, 85, 247, 0.8)', '0 0 20px rgba(168, 85, 247, 0.5)'],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-16 h-16 text-purple-400" />
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
                  ? 'bg-cyan-500 shadow-lg shadow-cyan-500/50 animate-pulse' 
                  : point.stabilized 
                    ? 'bg-green-500' 
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
            style={{ background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.2) 0%, transparent 70%)' }}
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
          End Trial Early
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

            {result.session.isRewarded && config?.features?.chronicle_posts_enabled && (
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
