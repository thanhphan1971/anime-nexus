import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import {
  Trophy, Gift, Clock, Sparkles, Crown, Star, Calendar,
  Zap, CheckCircle2, Lock, ChevronRight, PartyPopper, Target, Flame
} from "lucide-react";
import { motion } from "framer-motion";
import { differenceInDays, differenceInHours } from "date-fns";

interface SeasonalEvent {
  id: string;
  name: string;
  slug: string;
  description: string;
  theme: string;
  bannerImage?: string;
  iconImage?: string;
  primaryColor: string;
  secondaryColor: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isFeatured: boolean;
  tokenMultiplier: number;
  challenges?: EventChallenge[];
  cards?: EventCardItem[];
}

interface EventCardItem {
  id: string;
  name: string;
  image: string;
  rarity: string;
  isExclusive?: boolean;
  dropRateBonus?: number;
}

interface EventChallenge {
  id: string;
  eventId: string;
  name: string;
  description: string;
  challengeType: string;
  targetType: string;
  targetValue: number;
  rewardType: string;
  rewardValue: number;
  rewardCardId?: string;
  rewardBadgeId?: string;
  isPremiumOnly: boolean;
  currentProgress?: number;
  isCompleted?: boolean;
  rewardClaimed?: boolean;
}

interface EventProgressData {
  eventProgress: {
    totalPoints: number;
    challengesCompleted: number;
    joinedAt?: string;
  };
  challenges: EventChallenge[];
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  handle: string;
  avatar: string;
  totalPoints: number;
  challengesCompleted: number;
}

function EventCountdown({ endDate }: { endDate: string }) {
  const end = new Date(endDate);
  const now = new Date();
  const daysLeft = differenceInDays(end, now);
  const hoursLeft = differenceInHours(end, now) % 24;

  if (daysLeft < 0) return <span className="text-muted-foreground">Event ended</span>;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4" />
      <span>
        {daysLeft > 0 ? `${daysLeft}d ` : ""}
        {hoursLeft}h remaining
      </span>
    </div>
  );
}

function ChallengeCard({
  challenge,
  isPremium,
  onClaim,
  isClaiming,
}: {
  challenge: EventChallenge;
  isPremium: boolean;
  onClaim: () => void;
  isClaiming: boolean;
}) {
  const progress = challenge.currentProgress || 0;
  const progressPercent = Math.min((progress / challenge.targetValue) * 100, 100);
  const isLocked = challenge.isPremiumOnly && !isPremium;

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "daily": return <Flame className="w-4 h-4 text-orange-400" />;
      case "weekly": return <Calendar className="w-4 h-4 text-blue-400" />;
      case "event_long": return <Target className="w-4 h-4 text-purple-400" />;
      case "milestone": return <Trophy className="w-4 h-4 text-yellow-400" />;
      default: return <Star className="w-4 h-4" />;
    }
  };

  const getRewardDisplay = () => {
    if (challenge.rewardType === "tokens") {
      return `${challenge.rewardValue} Tokens`;
    } else if (challenge.rewardType === "card") {
      return "Exclusive Card";
    } else if (challenge.rewardType === "badge") {
      return "Exclusive Badge";
    }
    return `${challenge.rewardValue} XP`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-4 rounded-lg border ${
        challenge.isCompleted
          ? "bg-green-500/10 border-green-500/30"
          : isLocked
          ? "bg-muted/30 border-muted"
          : "bg-card/50 border-border"
      }`}
    >
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Lock className="w-6 h-6" />
            <span className="text-sm font-medium">S-Class Only</span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getChallengeIcon(challenge.challengeType)}
            <Badge variant="outline" className="text-xs capitalize">
              {challenge.challengeType.replace("_", " ")}
            </Badge>
            {challenge.isPremiumOnly && (
              <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30">
                <Crown className="w-3 h-3 mr-1" />
                S-Class
              </Badge>
            )}
          </div>
          <h4 className="font-semibold text-sm" data-testid={`challenge-name-${challenge.id}`}>
            {challenge.name}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">{challenge.description}</p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {progress} / {challenge.targetValue}
              </span>
              <span className="text-primary font-medium">{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1 text-sm font-medium text-primary">
            <Gift className="w-4 h-4" />
            {getRewardDisplay()}
          </div>

          {challenge.isCompleted && !challenge.rewardClaimed && (
            <Button
              size="sm"
              onClick={onClaim}
              disabled={isClaiming}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              data-testid={`claim-challenge-${challenge.id}`}
            >
              {isClaiming ? "Claiming..." : "Claim"}
            </Button>
          )}

          {challenge.rewardClaimed && (
            <div className="flex items-center gap-1 text-green-500 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Claimed
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EventCard({ event, onClick }: { event: SeasonalEvent; onClick: () => void }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card
        className="overflow-hidden border-2 transition-all hover:border-primary/50"
        style={{ borderColor: event.primaryColor + "40" }}
        data-testid={`event-card-${event.slug}`}
      >
        {event.bannerImage ? (
          <div
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${event.bannerImage})` }}
          />
        ) : (
          <div
            className="h-32 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${event.primaryColor}, ${event.secondaryColor})`,
            }}
          >
            <PartyPopper className="w-12 h-12 text-white/80" />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {event.isFeatured && (
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {event.theme}
                </Badge>
              </div>
              <h3 className="font-bold text-lg">{event.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {event.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <EventCountdown endDate={event.endDate} />
            {event.tokenMultiplier > 1 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary">
                <Zap className="w-3 h-3 mr-1" />
                {event.tokenMultiplier}x Tokens
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EventDetailView({
  event,
  onBack,
}: {
  event: SeasonalEvent;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: eventProgress } = useQuery<EventProgressData>({
    queryKey: ["/api/events", event.id, "progress"],
    enabled: !!user,
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/events", event.id, "leaderboard"],
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/join`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Joined event!", description: "Start completing challenges to earn rewards." });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "progress"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const res = await apiRequest("POST", `/api/events/challenges/${challengeId}/claim`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reward claimed!", description: data.reward?.message });
      queryClient.invalidateQueries({ queryKey: ["/api/events", event.id, "progress"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isJoined = !!eventProgress?.eventProgress?.joinedAt;
  const challenges = eventProgress?.challenges || event.challenges || [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4" data-testid="back-to-events">
        <ChevronRight className="w-4 h-4 rotate-180 mr-2" />
        Back to Events
      </Button>

      {event.bannerImage ? (
        <div
          className="h-48 rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${event.bannerImage})` }}
        />
      ) : (
        <div
          className="h-48 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${event.primaryColor}, ${event.secondaryColor})`,
          }}
        >
          <PartyPopper className="w-16 h-16 text-white/80" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {event.isFeatured && (
              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                <Sparkles className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">{event.theme}</Badge>
          </div>
          <h1 className="text-3xl font-bold">{event.name}</h1>
          <p className="text-muted-foreground mt-2">{event.description}</p>
        </div>
        <div className="text-right">
          <EventCountdown endDate={event.endDate} />
          {event.tokenMultiplier > 1 && (
            <Badge variant="secondary" className="mt-2 bg-primary/20 text-primary">
              <Zap className="w-3 h-3 mr-1" />
              {event.tokenMultiplier}x Token Multiplier
            </Badge>
          )}
        </div>
      </div>

      {!isJoined && user && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6 text-center">
            <PartyPopper className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-bold mb-2">Join This Event</h3>
            <p className="text-muted-foreground mb-4">
              Participate in challenges and earn exclusive rewards!
            </p>
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className="bg-gradient-to-r from-primary to-purple-500"
              data-testid="join-event-button"
            >
              {joinMutation.isPending ? "Joining..." : "Join Event"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isJoined && eventProgress?.eventProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Progress</p>
                <p className="text-2xl font-bold">{eventProgress.eventProgress.totalPoints} pts</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Challenges Completed</p>
                <p className="text-2xl font-bold">
                  {eventProgress.eventProgress.challengesCompleted} / {challenges.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="challenges" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="challenges" data-testid="tab-challenges">
            Challenges
          </TabsTrigger>
          <TabsTrigger value="cards" data-testid="tab-cards">
            Event Cards
          </TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="mt-4">
          <div className="space-y-3">
            {challenges.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No challenges available yet.</p>
                </CardContent>
              </Card>
            ) : (
              challenges.map((challenge: EventChallenge) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isPremium={user?.isPremium || false}
                  onClaim={() => claimMutation.mutate(challenge.id)}
                  isClaiming={claimMutation.isPending}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="cards" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {event.cards && event.cards.length > 0 ? (
              event.cards.map((card: EventCardItem) => (
                <Card key={card.id} className="overflow-hidden" data-testid={`event-card-item-${card.id}`}>
                  <div className="aspect-[3/4] relative">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    {card.isExclusive && (
                      <Badge className="absolute top-2 right-2 bg-purple-500">
                        <Star className="w-3 h-3 mr-1" />
                        Exclusive
                      </Badge>
                    )}
                    {card.dropRateBonus && card.dropRateBonus > 0 && (
                      <Badge className="absolute bottom-2 right-2 bg-green-500">
                        +{card.dropRateBonus}% Drop
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm truncate">{card.name}</p>
                    <p className="text-xs text-muted-foreground">{card.rarity}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No event-exclusive cards available.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Top Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry: LeaderboardEntry, index: number) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        index === 0
                          ? "bg-yellow-500/10 border border-yellow-500/30"
                          : index === 1
                          ? "bg-slate-400/10 border border-slate-400/30"
                          : index === 2
                          ? "bg-orange-600/10 border border-orange-600/30"
                          : "bg-muted/30"
                      }`}
                      data-testid={`leaderboard-entry-${entry.rank}`}
                    >
                      <div className="w-8 text-center font-bold">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${entry.rank}`}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={entry.avatar} />
                        <AvatarFallback>{entry.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-semibold">{entry.username}</p>
                        <p className="text-xs text-muted-foreground">{entry.handle}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{entry.totalPoints} pts</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.challengesCompleted} challenges
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No participants yet. Be the first!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EventsPage() {
  const [selectedEvent, setSelectedEvent] = useState<SeasonalEvent | null>(null);

  const { data: events, isLoading } = useQuery<SeasonalEvent[]>({
    queryKey: ["/api/events"],
  });

  const { data: eventDetail } = useQuery<SeasonalEvent>({
    queryKey: ["/api/events", selectedEvent?.slug],
    enabled: !!selectedEvent?.slug,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="font-display tracking-widest animate-pulse">Loading Events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedEvent && eventDetail) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <EventDetailView
          event={eventDetail}
          onBack={() => setSelectedEvent(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <PartyPopper className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Seasonal Events</h1>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event: SeasonalEvent) => (
            <EventCard
              key={event.id}
              event={event}
              onClick={() => setSelectedEvent(event)}
            />
          ))}
        </div>
      ) : (
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-6 text-muted-foreground/50" />
            <h2 className="text-xl font-bold mb-2">No Active Events</h2>
            <p className="text-muted-foreground">
              Check back soon! Special seasonal events with exclusive rewards will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
