import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { 
  Trophy, Gift, Clock, Users, Sparkles, Crown, Star, 
  Ticket, Timer, ChevronRight, Award, Zap, Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";

interface Draw {
  id: string;
  name: string;
  description: string;
  cadence: string;
  status: string;
  startAt: string;
  endAt: string;
  drawAt: string;
  prizePool: any[];
  entryRules: any;
  bannerImage?: string;
  isFeatured: boolean;
}

interface Prize {
  id: string;
  name: string;
  description: string;
  type: string;
  rarity: string;
  value: number;
  iconUrl?: string;
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
    <div className="flex gap-2 sm:gap-4">
      {[
        { value: timeLeft.days, label: 'Days' },
        { value: timeLeft.hours, label: 'Hrs' },
        { value: timeLeft.minutes, label: 'Min' },
        { value: timeLeft.seconds, label: 'Sec' },
      ].map((item, index) => (
        <div key={index} className="text-center">
          <div className="bg-black/60 border border-cyan-500/50 rounded-lg p-2 sm:p-3 min-w-[50px] sm:min-w-[60px]">
            <span className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
              {item.value.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs text-gray-400 mt-1">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function PrizeCard({ prize }: { prize: any }) {
  const rarityColors: Record<string, string> = {
    common: 'from-gray-500 to-gray-600',
    rare: 'from-blue-500 to-blue-600',
    epic: 'from-purple-500 to-purple-600',
    legendary: 'from-yellow-500 to-orange-500',
    mythic: 'from-pink-500 to-red-500',
  };

  const typeIcons: Record<string, any> = {
    card: <Sparkles className="h-6 w-6" />,
    tokens: <Zap className="h-6 w-6" />,
    premium_days: <Crown className="h-6 w-6" />,
    badge: <Award className="h-6 w-6" />,
    avatar_frame: <Star className="h-6 w-6" />,
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${rarityColors[prize.rarity] || rarityColors.common} p-[2px]`}
    >
      <div className="bg-black/80 rounded-xl p-4 h-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/10 rounded-lg">
            {typeIcons[prize.type] || <Gift className="h-6 w-6" />}
          </div>
          <div>
            <h4 className="font-bold text-white">{prize.name}</h4>
            <Badge variant="outline" className="text-xs capitalize">
              {prize.rarity}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-gray-400">{prize.description}</p>
        {prize.value > 0 && (
          <div className="mt-2 text-cyan-400 font-bold">
            {prize.type === 'tokens' ? `${prize.value} Tokens` : 
             prize.type === 'premium_days' ? `${prize.value} Days` : ''}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function WinnerCard({ winner }: { winner: Winner }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 hover:border-yellow-500/50 transition-all"
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-yellow-500">
          <AvatarImage src={winner.user.avatar} />
          <AvatarFallback>{winner.user.name[0]}</AvatarFallback>
        </Avatar>
        <Trophy className="absolute -bottom-1 -right-1 h-5 w-5 text-yellow-500 bg-black rounded-full p-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white truncate">{winner.user.name}</div>
        <div className="text-sm text-gray-400 truncate">{winner.user.handle}</div>
      </div>
      <div className="text-right">
        <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 mb-1">
          {winner.prize.name}
        </Badge>
        <div className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(winner.awardedAt), { addSuffix: true })}
        </div>
      </div>
    </motion.div>
  );
}

function FeaturedDrawBanner({ draw }: { draw: Draw }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const enterMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/draws/${draw.id}/enter`, { 
        method: 'POST',
        credentials: 'include' 
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Entry Confirmed!", description: "Good luck in the draw!" });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/draw-entries'] });
    },
    onError: (error: any) => {
      toast({ title: "Entry Failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 via-cyan-900/50 to-pink-900/50 border border-cyan-500/30"
    >
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
      
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold">
                <Sparkles className="h-3 w-3 mr-1" />
                FEATURED DRAW
              </Badge>
              <Badge variant="outline" className="capitalize">
                {draw.cadence}
              </Badge>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 font-display">
              {draw.name}
            </h2>
            <p className="text-gray-300 mb-4">{draw.description}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Draw: {format(new Date(draw.drawAt), 'MMM d, yyyy h:mm a')}</span>
              </div>
            </div>

            {draw.status === 'open' && user && (
              <Button 
                size="lg"
                onClick={() => enterMutation.mutate()}
                disabled={enterMutation.isPending}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-bold"
                data-testid="button-enter-draw"
              >
                <Ticket className="h-5 w-5 mr-2" />
                {enterMutation.isPending ? 'Entering...' : 'Enter Draw'}
              </Button>
            )}
            
            {draw.status === 'scheduled' && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                <Clock className="h-3 w-3 mr-1" />
                Opens {formatDistanceToNow(new Date(draw.startAt), { addSuffix: true })}
              </Badge>
            )}
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-2">Draw In</div>
            <CountdownTimer targetDate={draw.drawAt} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DrawsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("live");

  const { data: activeDraws = [], isLoading: drawsLoading } = useQuery({
    queryKey: ['/api/draws/active'],
    queryFn: async () => {
      const res = await fetch('/api/draws/active');
      if (!res.ok) throw new Error('Failed to fetch draws');
      return res.json();
    },
  });

  const { data: allDraws = [] } = useQuery({
    queryKey: ['/api/draws'],
    queryFn: async () => {
      const res = await fetch('/api/draws');
      if (!res.ok) throw new Error('Failed to fetch draws');
      return res.json();
    },
  });

  const { data: recentWinners = [] } = useQuery({
    queryKey: ['/api/draws/winners/recent'],
    queryFn: async () => {
      const res = await fetch('/api/draws/winners/recent?limit=20');
      if (!res.ok) throw new Error('Failed to fetch winners');
      return res.json();
    },
  });

  const { data: myEntries = [] } = useQuery({
    queryKey: ['/api/users/me/draw-entries'],
    queryFn: async () => {
      const res = await fetch('/api/users/me/draw-entries', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const featuredDraw = activeDraws.find((d: Draw) => d.isFeatured) || activeDraws[0];
  const completedDraws = allDraws.filter((d: Draw) => d.status === 'completed');

  const MOCK_PRIZES: Prize[] = [
    { id: '1', name: 'Legendary Card Pack', description: 'Contains 1 guaranteed legendary card', type: 'card', rarity: 'legendary', value: 0 },
    { id: '2', name: '5000 Tokens', description: 'Premium in-game currency', type: 'tokens', rarity: 'epic', value: 5000 },
    { id: '3', name: '30 Days Premium', description: 'Full S-Class membership access', type: 'premium_days', rarity: 'legendary', value: 30 },
    { id: '4', name: 'Exclusive Badge', description: 'Show off your winner status', type: 'badge', rarity: 'rare', value: 0 },
    { id: '5', name: 'Golden Avatar Frame', description: 'Limited edition frame', type: 'avatar_frame', rarity: 'mythic', value: 0 },
  ];

  const MOCK_WINNERS: Winner[] = recentWinners.length > 0 ? recentWinners : [
    {
      id: '1',
      userId: '1',
      prizeId: '1',
      drawId: '1',
      awardedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'NeoKai', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=neokai', handle: '@neokai' },
      prize: { name: 'Legendary Pack', type: 'card', rarity: 'legendary' },
    },
    {
      id: '2',
      userId: '2',
      prizeId: '2',
      drawId: '1',
      awardedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'pending',
      user: { name: 'Sakura', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sakura', handle: '@sakurablossom' },
      prize: { name: '5000 Tokens', type: 'tokens', rarity: 'epic' },
    },
    {
      id: '3',
      userId: '3',
      prizeId: '3',
      drawId: '2',
      awardedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'Shadow', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shadow', handle: '@shadowhunter' },
      prize: { name: '30 Days Premium', type: 'premium_days', rarity: 'legendary' },
    },
    {
      id: '4',
      userId: '4',
      prizeId: '4',
      drawId: '2',
      awardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'Ryu', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ryu', handle: '@ryumaster' },
      prize: { name: 'Epic Badge', type: 'badge', rarity: 'epic' },
    },
    {
      id: '5',
      userId: '5',
      prizeId: '5',
      drawId: '3',
      awardedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'Miko', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=miko', handle: '@mikochan' },
      prize: { name: 'Golden Frame', type: 'avatar_frame', rarity: 'mythic' },
    },
    {
      id: '6',
      userId: '6',
      prizeId: '1',
      drawId: '3',
      awardedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'Akira', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=akira', handle: '@akirax' },
      prize: { name: 'Legendary Pack', type: 'card', rarity: 'legendary' },
    },
    {
      id: '7',
      userId: '7',
      prizeId: '2',
      drawId: '4',
      awardedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      claimStatus: 'claimed',
      user: { name: 'Luna', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna', handle: '@lunamoon' },
      prize: { name: '5000 Tokens', type: 'tokens', rarity: 'epic' },
    },
  ];

  const MOCK_DRAWS: Draw[] = activeDraws.length > 0 ? activeDraws : [
    {
      id: '1',
      name: 'Weekly Legendary Draw',
      description: 'Win legendary cards and exclusive rewards! Every Sunday at 8 PM.',
      cadence: 'weekly',
      status: 'open',
      startAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      drawAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      prizePool: [],
      entryRules: {},
      isFeatured: true,
    },
    {
      id: '2',
      name: 'Monthly Mega Draw',
      description: 'The biggest prizes of the month! Premium membership, mega token bundles, and more.',
      cadence: 'monthly',
      status: 'scheduled',
      startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      drawAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      prizePool: [],
      entryRules: {},
      isFeatured: false,
    },
  ];

  const displayDraws = activeDraws.length > 0 ? activeDraws : MOCK_DRAWS;
  const displayFeatured = featuredDraw || MOCK_DRAWS[0];
  const rawWinners = recentWinners.length > 0 ? recentWinners : MOCK_WINNERS;
  const displayWinners = [...rawWinners].sort((a: Winner, b: Winner) => 
    new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime()
  );

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
      <div className="max-w-6xl mx-auto space-y-6">
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
              {myEntries.length} Entries
            </Badge>
          )}
        </div>

        {displayFeatured && (
          <FeaturedDrawBanner draw={displayFeatured} />
        )}

        {/* PERMANENT WINNERS SHOWCASE */}
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
            <ScrollArea className="h-[200px]">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 gap-2 bg-white/5 p-1">
            <TabsTrigger value="live" className="data-[state=active]:bg-cyan-500/20" data-testid="tab-live">
              <Zap className="h-4 w-4 mr-2" />
              Live Draws
            </TabsTrigger>
            <TabsTrigger value="prizes" className="data-[state=active]:bg-purple-500/20" data-testid="tab-prizes">
              <Gift className="h-4 w-4 mr-2" />
              Prize Catalog
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="mt-6">
            <div className="grid gap-4">
              {displayDraws.map((draw: Draw) => (
                <Card key={draw.id} className="bg-white/5 border-white/10 hover:border-cyan-500/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-white text-lg">{draw.name}</h3>
                          <Badge variant="outline" className="capitalize text-xs">
                            {draw.cadence}
                          </Badge>
                          {draw.status === 'open' ? (
                            <Badge className="bg-green-500/20 text-green-400">Open</Badge>
                          ) : (
                            <Badge variant="outline" className="text-yellow-400">Upcoming</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{draw.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Draw: {format(new Date(draw.drawAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <CountdownTimer targetDate={draw.drawAt} />
                        {draw.status === 'open' && user && (
                          <Button size="sm" className="bg-cyan-500 hover:bg-cyan-600">
                            <Ticket className="h-4 w-4 mr-1" />
                            Enter
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {displayDraws.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>No active draws at the moment</p>
                  <p className="text-sm">Check back soon for exciting prizes!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prizes" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MOCK_PRIZES.map((prize) => (
                <PrizeCard key={prize.id} prize={prize} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Crown className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-lg font-bold text-white">S-Class Members Get 3x Entries!</h3>
                <p className="text-gray-400 text-sm">Upgrade to premium for better odds in every draw</p>
              </div>
              <Button 
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold"
                data-testid="button-upgrade-premium"
              >
                Upgrade Now
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
