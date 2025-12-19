import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useEnterDraw, useUserDrawEntries, useActiveDraws, useRecentWinners } from "@/lib/api";
import { 
  Trophy, Gift, Clock, Sparkles, Crown, Star, 
  Ticket, Award, Zap, Calendar, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";
import { CrystalSigil } from "@/components/CrystalSigil";

interface Draw {
  id: string;
  name: string;
  description: string;
  cadence: string;
  cycleId?: string;
  status: string;
  startAt: string;
  endAt: string;
  drawAt: string;
  executedAt?: string;
  prizePool: any[];
  entryRules: any;
  bannerImage?: string;
  isFeatured: boolean;
  maxEntriesPerUser: number;
  premiumEntriesPerUser: number;
}

type DrawButtonState = 'cooldown' | 'open' | 'entered' | 'max_entries' | 'locked' | 'next_cycle' | 'premium_only';

function getDrawButtonState(
  draw: Draw | null,
  entriesUsed: number,
  maxEntries: number,
  isPremium: boolean,
  isMonthly: boolean
): { state: DrawButtonState; cooldownEndTime?: Date } {
  if (!draw) return { state: 'open' };
  
  const now = new Date();
  const drawTime = new Date(draw.drawAt);
  const lockTime = new Date(drawTime.getTime() - 60000);
  
  if (isMonthly && !isPremium) {
    return { state: 'premium_only' };
  }
  
  if (draw.status === 'executed' || draw.status === 'completed') {
    if (draw.executedAt) {
      const cooldownEnd = new Date(new Date(draw.executedAt).getTime() + 24 * 60 * 60 * 1000);
      if (now < cooldownEnd) {
        return { state: 'cooldown', cooldownEndTime: cooldownEnd };
      }
    }
    return { state: 'next_cycle' };
  }
  
  if (draw.status === 'locked' || now >= lockTime) {
    return { state: 'locked' };
  }
  
  if (entriesUsed >= maxEntries) {
    return { state: 'max_entries' };
  }
  
  if (entriesUsed > 0) {
    return { state: 'entered' };
  }
  
  return { state: 'open' };
}

function CooldownTimer({ cooldownEndTime }: { cooldownEndTime: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = cooldownEndTime.getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          hours: Math.floor(difference / (1000 * 60 * 60)),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [cooldownEndTime]);

  return (
    <span>
      Re-entry in: {timeLeft.hours.toString().padStart(2, '0')}:{timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}
    </span>
  );
}

interface Winner {
  id: string;
  userId: string;
  prizeId: string;
  drawId: string;
  awardedAt: string;
  claimStatus: string;
  user: {
    name: string;
    avatar: string;
    handle: string;
  };
  prize: {
    name: string;
    type: string;
    rarity: string;
  };
  draw?: {
    name: string;
  };
}

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex gap-2">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hrs' },
        { value: timeLeft.minutes, label: 'Min' },
        { value: timeLeft.seconds, label: 'Sec' },
      ].map((item, index) => (
        <div key={index} className="text-center">
          <div className="bg-black/60 border border-cyan-500/50 rounded-lg px-3 py-2 min-w-[52px]">
            <span className="text-xl font-bold text-cyan-400 font-mono">
              {item.value.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DrawSection({ 
  draw, 
  type, 
  onEnter, 
  isEntering,
  isPremium,
  entriesUsed = 0
}: { 
  draw: Draw | null; 
  type: 'weekly' | 'monthly';
  onEnter: () => void;
  isEntering: boolean;
  isPremium: boolean;
  entriesUsed?: number;
}) {
  const isWeekly = type === 'weekly';
  const gradientClass = isWeekly 
    ? 'from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border-cyan-500/30' 
    : 'from-purple-500/10 via-pink-500/10 to-yellow-500/10 border-purple-500/30';
  const accentColor = isWeekly ? 'cyan' : 'purple';
  const Icon = isWeekly ? Calendar : Star;
  
  const maxEntries = isWeekly 
    ? (isPremium ? 2 : 1) 
    : 1;
  const entriesRemaining = Math.max(0, maxEntries - entriesUsed);
  const allEntriesUsed = entriesUsed >= maxEntries;
  
  const getCrystalState = (): "dormant" | "active" | "charged" => {
    if (!draw) return "dormant";
    if (draw.status === 'open') return "charged";
    if (draw.status === 'upcoming') return "active";
    return "dormant";
  };

  const weeklyPrizes = [
    { name: '5,000 Tokens', type: 'tokens', icon: <Zap className="h-4 w-4" />, qty: '1 Winner' },
    { name: '2,000 Tokens', type: 'tokens', icon: <Zap className="h-4 w-4" />, qty: '3 Winners' },
    { name: '500 Tokens', type: 'tokens', icon: <Zap className="h-4 w-4" />, qty: '10 Winners' },
  ];

  const monthlyPrizes = [
    { name: 'Mythic Card Pack', type: 'card', icon: <Sparkles className="h-4 w-4" />, qty: '1 Winner', rarity: 'mythic' },
    { name: 'Legendary Card Pack', type: 'card', icon: <Sparkles className="h-4 w-4" />, qty: '3 Winners', rarity: 'legendary' },
    { name: '30 Days S-Class', type: 'premium', icon: <Crown className="h-4 w-4" />, qty: '2 Winners' },
  ];

  const prizes = isWeekly ? weeklyPrizes : monthlyPrizes;
  const entryNote = isWeekly 
    ? `Free: 1 entry • S-Class: 2 entries`
    : isPremium 
      ? `S-Class: 1 entry` 
      : `S-Class members only`;

  const buttonState = getDrawButtonState(draw, entriesUsed, maxEntries, isPremium, !isWeekly);

  const renderButton = () => {
    const baseClass = isWeekly 
      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600' 
      : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
    
    switch (buttonState.state) {
      case 'premium_only':
        return (
          <Link href="/sclass">
            <Button 
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to S-Class
            </Button>
          </Link>
        );
      
      case 'cooldown':
        return (
          <Button 
            disabled
            className={`${baseClass} text-white font-bold px-6 disabled:opacity-50`}
            data-testid={`button-enter-${type}-draw`}
          >
            <Clock className="h-4 w-4 mr-2" />
            {buttonState.cooldownEndTime && <CooldownTimer cooldownEndTime={buttonState.cooldownEndTime} />}
          </Button>
        );
      
      case 'locked':
        return (
          <Button 
            disabled
            className={`${baseClass} text-white font-bold px-6 disabled:opacity-50`}
            data-testid={`button-enter-${type}-draw`}
          >
            <Clock className="h-4 w-4 mr-2" />
            Entries Locked
          </Button>
        );
      
      case 'max_entries':
        return (
          <Button 
            disabled
            className={`${baseClass} text-white font-bold px-6 disabled:opacity-50`}
            data-testid={`button-enter-${type}-draw`}
          >
            <Ticket className="h-4 w-4 mr-2" />
            Max Entries Reached
          </Button>
        );
      
      case 'entered':
        return (
          <Button 
            onClick={onEnter}
            disabled={isEntering}
            className={`${baseClass} text-white font-bold px-6`}
            data-testid={`button-enter-${type}-draw`}
          >
            <Ticket className="h-4 w-4 mr-2" />
            {isEntering ? 'Entering...' : `You're entered ✓ (Add more)`}
          </Button>
        );
      
      case 'next_cycle':
        return (
          <Button 
            disabled
            className={`${baseClass} text-white font-bold px-6 disabled:opacity-50`}
            data-testid={`button-enter-${type}-draw`}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Next Cycle Coming Soon
          </Button>
        );
      
      case 'open':
      default:
        return (
          <Button 
            onClick={onEnter}
            disabled={isEntering}
            className={`${baseClass} text-white font-bold px-6`}
            data-testid={`button-enter-${type}-draw`}
          >
            <Ticket className="h-4 w-4 mr-2" />
            {isEntering ? 'Entering...' : 'Enter Draw'}
          </Button>
        );
    }
  };

  return (
    <Card className={`bg-gradient-to-r ${gradientClass} overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className={`flex items-center gap-2 text-xl text-${accentColor}-400`}>
              <CrystalSigil size={28} state={getCrystalState()} />
              {isWeekly ? 'Weekly Token Jackpot' : 'Monthly Card Giveaway'}
              {draw?.status === 'open' && (
                <Badge className="ml-2 bg-green-500/20 text-green-400 text-xs">OPEN</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isWeekly 
                ? 'Win tokens every week! All members can enter.' 
                : 'S-Class exclusive! Win legendary and mythic cards.'}
            </p>
          </div>
          
          {draw && (
            <div className="flex flex-col items-center sm:items-end gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Time until draw:
              </span>
              <CountdownTimer targetDate={draw.drawAt} />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Prizes</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {prizes.map((prize, idx) => (
              <div 
                key={idx} 
                className={`flex items-center gap-2 p-2 rounded-lg bg-black/30 border ${
                  (prize as any).rarity === 'mythic' ? 'border-pink-500/50' :
                  (prize as any).rarity === 'legendary' ? 'border-yellow-500/50' :
                  `border-${accentColor}-500/30`
                }`}
              >
                <div className={`p-1.5 rounded bg-${accentColor}-500/20 text-${accentColor}-400`}>
                  {prize.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{prize.name}</p>
                  <p className="text-[10px] text-gray-400">{prize.qty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              <span className="text-white font-medium">Entry: </span>
              {entryNote}
            </div>
            {draw && buttonState.state !== 'premium_only' && buttonState.state !== 'cooldown' && (
              <div className={`text-xs ${allEntriesUsed ? 'text-red-400' : 'text-green-400'}`} data-testid={`text-entries-${type}`}>
                {allEntriesUsed 
                  ? `All ${maxEntries} entries used` 
                  : `${entriesUsed} / ${maxEntries} entries used (${entriesRemaining} remaining)`}
              </div>
            )}
            {draw && (
              <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Opens: {format(new Date(draw.startAt), 'MMM d, yyyy h:mm a')}
                </span>
                <span>
                  <Trophy className="h-3 w-3 inline mr-1" />
                  Draw: {format(new Date(draw.drawAt), 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            )}
          </div>
          
          {renderButton()}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DrawsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const enterDraw = useEnterDraw();

  const { data: activeDraws = [], isLoading: drawsLoading } = useActiveDraws();
  const { data: myEntries = [] } = useUserDrawEntries();
  const { data: recentWinners = [] } = useRecentWinners();

  const weeklyDraw = activeDraws.find((d: Draw) => d.cadence === 'weekly') || null;
  const monthlyDraw = activeDraws.find((d: Draw) => d.cadence === 'monthly') || null;

  const MOCK_WINNERS: Winner[] = [
    {
      id: '1',
      userId: '1',
      prizeId: '1',
      drawId: '1',
      awardedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'pending',
      user: { name: 'NeoKai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neokai', handle: '@neokai' },
      prize: { name: '5000 Tokens', type: 'tokens', rarity: 'epic' },
    },
    {
      id: '2',
      userId: '2',
      prizeId: '2',
      drawId: '1',
      awardedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'SakuraBlossom', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sakura', handle: '@sakurablossom' },
      prize: { name: 'Mythic Card Pack', type: 'card', rarity: 'mythic' },
    },
    {
      id: '3',
      userId: '3',
      prizeId: '3',
      drawId: '2',
      awardedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'ShadowHunter', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shadow', handle: '@shadowhunter' },
      prize: { name: '30 Days S-Class', type: 'premium_days', rarity: 'legendary' },
    },
  ];

  const displayWinners = (recentWinners.length > 0 ? recentWinners : MOCK_WINNERS)
    .sort((a: Winner, b: Winner) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());

  const handleEnterDraw = (drawId: string, type: string) => {
    enterDraw.mutate(drawId, {
      onSuccess: () => {
        toast({ title: "Entry Confirmed!", description: `You've entered the ${type} draw. Good luck!` });
      },
      onError: (error: any) => {
        toast({ title: "Entry Failed", description: error.message, variant: "destructive" });
      },
    });
  };

  if (drawsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/20 to-black p-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="h-12 w-12 text-yellow-500 animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading Prize Draws...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-purple-950/20 to-black p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold font-display text-white flex items-center gap-3" data-testid="text-page-title">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Prize Draws
            </h1>
            <p className="text-gray-400 mt-1">Win amazing prizes and exclusive rewards</p>
          </div>
          {user && (
            <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
              <Ticket className="h-3 w-3 mr-1" />
              {myEntries.reduce((sum: number, e: any) => sum + (e.tickets || 1), 0)} Entries
            </Badge>
          )}
        </div>

        <DrawSection 
          draw={weeklyDraw}
          type="weekly"
          onEnter={() => weeklyDraw && handleEnterDraw(weeklyDraw.id, 'weekly')}
          isEntering={enterDraw.isPending}
          isPremium={user?.isPremium || false}
          entriesUsed={weeklyDraw ? myEntries.filter((e: any) => e.drawId === weeklyDraw.id).reduce((sum: number, e: any) => sum + (e.tickets || 1), 0) : 0}
        />

        <DrawSection 
          draw={monthlyDraw}
          type="monthly"
          onEnter={() => monthlyDraw && handleEnterDraw(monthlyDraw.id, 'monthly')}
          isEntering={enterDraw.isPending}
          isPremium={user?.isPremium || false}
          entriesUsed={monthlyDraw ? myEntries.filter((e: any) => e.drawId === monthlyDraw.id).reduce((sum: number, e: any) => sum + (e.tickets || 1), 0) : 0}
        />

        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-muted-foreground">
          <strong className="text-white">Eligibility:</strong> To win, your account must be at least 24 hours old. One win per account per draw period.
        </div>

        <Card className="bg-gradient-to-r from-yellow-950/40 via-amber-950/30 to-orange-950/40 border-yellow-500/30 overflow-hidden" data-testid="winners-showcase">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-yellow-400">
                <Trophy className="h-5 w-5" />
                <span className="font-display">WINNERS HALL OF FAME</span>
              </div>
              <Badge variant="outline" className="text-green-400 border-green-400/50 animate-pulse">
                <span className="h-2 w-2 bg-green-400 rounded-full mr-1.5 inline-block" />
                LIVE
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Real winners, real prizes - updated in real-time</p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[220px]">
              <div className="p-4 space-y-2">
                {displayWinners.map((winner: Winner, index: number) => (
                  <motion.div
                    key={winner.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                    data-testid={`winner-row-${winner.id}`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-yellow-500/50">
                        <AvatarImage src={winner.user.avatar} />
                        <AvatarFallback>{winner.user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5">
                        <Trophy className="h-2.5 w-2.5 text-black" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">{winner.user.name}</span>
                        <span className="text-xs text-muted-foreground">{winner.user.handle}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Gift className="h-3 w-3 text-purple-400" />
                        <span className="text-purple-300 font-medium">{winner.prize.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={`text-[10px] ${
                          winner.claimStatus === 'claimed' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {winner.claimStatus === 'claimed' ? '✓ Claimed' : 'Pending'}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(winner.awardedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                {displayWinners.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No winners yet - Be the first!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Crown className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-white">S-Class Members Get More Entries!</h3>
                <p className="text-gray-400 text-sm">3x weekly entries + exclusive monthly draw access</p>
              </div>
              <Link href="/sclass">
                <Button 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold"
                  data-testid="button-upgrade-premium"
                >
                  Upgrade Now
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
