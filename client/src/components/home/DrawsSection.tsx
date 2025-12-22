import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Trophy, Clock, Crown, ChevronRight, Loader2, Calendar, Gift, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNextDraws, useEnterDraw } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface DrawData {
  id: string;
  name: string;
  description: string;
  cadence: string;
  status: string;
  drawAt: string;
  executedAt?: string;
  userEntry: { tickets: number } | null;
  entryCount: number;
  maxEntriesPerUser: number;
  premiumEntriesPerUser: number;
  entryRules?: { premiumOnly?: boolean };
}

function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      
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

  if (timeLeft.days > 0) {
    return (
      <div className="flex gap-1 text-xs font-mono">
        <span className="bg-black/50 px-1.5 py-0.5 rounded">{timeLeft.days}d</span>
        <span className="bg-black/50 px-1.5 py-0.5 rounded">{timeLeft.hours.toString().padStart(2, '0')}h</span>
        <span className="bg-black/50 px-1.5 py-0.5 rounded">{timeLeft.minutes.toString().padStart(2, '0')}m</span>
      </div>
    );
  }

  return (
    <div className="flex gap-1 text-xs font-mono">
      <span className="bg-black/50 px-1.5 py-0.5 rounded">{timeLeft.hours.toString().padStart(2, '0')}</span>
      <span>:</span>
      <span className="bg-black/50 px-1.5 py-0.5 rounded">{timeLeft.minutes.toString().padStart(2, '0')}</span>
      <span>:</span>
      <span className="bg-black/50 px-1.5 py-0.5 rounded">{timeLeft.seconds.toString().padStart(2, '0')}</span>
    </div>
  );
}

function DrawCard({ 
  draw, 
  type, 
  isPremium,
  onEnter,
  isEntering 
}: { 
  draw: DrawData | null; 
  type: 'weekly' | 'monthly';
  isPremium: boolean;
  onEnter: (drawId: string) => void;
  isEntering: boolean;
}) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const isWeekly = type === 'weekly';
  const colorScheme = isWeekly 
    ? { from: 'from-green-500', to: 'to-emerald-600', border: 'border-green-500/50', text: 'text-green-400', bg: 'from-green-950/60', bgTo: 'to-emerald-950/40' }
    : { from: 'from-purple-500', to: 'to-violet-600', border: 'border-purple-500/50', text: 'text-purple-400', bg: 'from-purple-950/60', bgTo: 'to-violet-950/40' };

  if (!draw) {
    return (
      <Card className={`relative overflow-hidden ${colorScheme.border} bg-gradient-to-br ${colorScheme.bg} via-slate-950/80 ${colorScheme.bgTo} opacity-60`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorScheme.from} ${colorScheme.to} flex items-center justify-center opacity-50`}>
              {isWeekly ? <Calendar className="h-5 w-5 text-white" /> : <Crown className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-white/50">{isWeekly ? 'Weekly Draw' : 'Monthly Draw'}</h3>
              <p className="text-xs text-muted-foreground">No active draw</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasEntered = !!draw.userEntry;
  const maxEntries = isPremium ? draw.premiumEntriesPerUser : draw.maxEntriesPerUser;
  const currentTickets = draw.userEntry?.tickets || 0;
  const canAddMore = currentTickets < maxEntries;
  const isMonthlyPremiumOnly = type === 'monthly' && draw.entryRules?.premiumOnly && !isPremium;
  const drawTime = new Date(draw.drawAt);
  const now = new Date();
  const isLocked = now >= new Date(drawTime.getTime() - 60000);
  const isExecuted = draw.status === 'executed' || draw.status === 'completed';

  const getButtonContent = () => {
    if (!user) return { text: "Sign In", disabled: true };
    if (isExecuted) return { text: "View Results", disabled: false, action: 'view' };
    if (isLocked) return { text: "Locked", disabled: true };
    if (isMonthlyPremiumOnly) return { text: "S-Class Only", disabled: true, upgrade: true };
    if (hasEntered && !canAddMore) return { text: "Entered", disabled: true, entered: true };
    if (hasEntered && canAddMore) return { text: `+1 Entry (${currentTickets}/${maxEntries})`, disabled: false };
    return { text: "Enter Draw", disabled: false };
  };

  const buttonState = getButtonContent();

  const handleClick = () => {
    if (buttonState.action === 'view') {
      setLocation(`/draws?recap=${draw.id}`);
    } else if (buttonState.upgrade) {
      setLocation('/premium');
    } else if (!buttonState.disabled) {
      onEnter(draw.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`relative overflow-hidden ${colorScheme.border} bg-gradient-to-br ${colorScheme.bg} via-slate-950/80 ${colorScheme.bgTo} cursor-pointer hover:scale-[1.02] transition-transform`}
        onClick={() => setLocation(`/draws?id=${draw.id}`)}
        data-testid={`card-draw-${type}`}
      >
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${colorScheme.from} ${colorScheme.to} opacity-10 blur-3xl rounded-full`} />
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorScheme.from} ${colorScheme.to} flex items-center justify-center shadow-lg`}>
                {isWeekly ? <Calendar className="h-5 w-5 text-white" /> : <Crown className="h-5 w-5 text-white" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 ${colorScheme.text} bg-black/30 rounded-full font-bold uppercase`}>
                    {isWeekly ? 'Weekly' : 'Monthly'}
                  </span>
                  {hasEntered && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full font-bold">
                      Entered
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white text-sm">{draw.name}</h3>
              </div>
            </div>
            
            <ChevronRight className={`h-4 w-4 ${colorScheme.text}`} />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {isExecuted ? (
                <span className="text-xs text-muted-foreground">Draw Complete</span>
              ) : isLocked ? (
                <span className="text-xs text-yellow-400">Drawing soon...</span>
              ) : (
                <CountdownTimer targetDate={drawTime} />
              )}
            </div>
            
            <div className="text-xs text-muted-foreground">
              {draw.entryCount} entries
            </div>
          </div>

          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={handleClick}
              disabled={buttonState.disabled && !buttonState.upgrade && buttonState.action !== 'view'}
              className={`w-full ${
                buttonState.entered 
                  ? 'bg-green-600/50 text-white cursor-default' 
                  : buttonState.upgrade
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white'
                  : `bg-gradient-to-r ${colorScheme.from} ${colorScheme.to} hover:opacity-90 text-white`
              } font-bold text-xs`}
              data-testid={`button-enter-${type}-draw`}
            >
              {isEntering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : buttonState.entered ? (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {buttonState.text}
                </>
              ) : (
                <>
                  <Gift className="h-3.5 w-3.5 mr-1" />
                  {buttonState.text}
                </>
              )}
            </Button>
          </div>

          {isMonthlyPremiumOnly && (
            <p className="mt-2 text-[10px] text-center text-yellow-400/80">
              Free entry for S-Class members
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DrawsSection() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: nextDraws, isLoading } = useNextDraws();
  const enterDrawMutation = useEnterDraw();
  const [enteringDrawId, setEnteringDrawId] = useState<string | null>(null);

  const isPremium = user?.isPremium || false;

  const handleEnterDraw = (drawId: string) => {
    if (!user) {
      toast.error("Please sign in to enter draws");
      return;
    }
    
    setEnteringDrawId(drawId);
    enterDrawMutation.mutate(drawId, {
      onSuccess: () => {
        toast.success("You're in! Good luck!");
        setEnteringDrawId(null);
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to enter draw");
        setEnteringDrawId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h2 className="font-display font-bold text-lg text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text">
            PRIZE DRAWS
          </h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const weekly = nextDraws?.weekly as DrawData | null;
  const monthly = nextDraws?.monthly as DrawData | null;

  if (!weekly && !monthly) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h2 className="font-display font-bold text-lg text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text">
            PRIZE DRAWS
          </h2>
        </div>
        <Card className="border-muted bg-muted/20">
          <CardContent className="p-6 text-center">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No active draws at the moment</p>
            <Button 
              variant="link" 
              className="mt-2 text-primary"
              onClick={() => setLocation('/draws')}
            >
              View Past Draws
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h2 className="font-display font-bold text-lg text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 bg-clip-text">
            PRIZE DRAWS
          </h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs text-muted-foreground hover:text-white"
          onClick={() => setLocation('/draws')}
          data-testid="link-view-all-draws"
        >
          View All <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DrawCard 
          draw={weekly} 
          type="weekly" 
          isPremium={isPremium}
          onEnter={handleEnterDraw}
          isEntering={enteringDrawId === weekly?.id}
        />
        <DrawCard 
          draw={monthly} 
          type="monthly" 
          isPremium={isPremium}
          onEnter={handleEnterDraw}
          isEntering={enteringDrawId === monthly?.id}
        />
      </div>
    </motion.div>
  );
}
