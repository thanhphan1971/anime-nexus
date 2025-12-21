import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Search, 
  Crown, 
  Trophy, 
  Calendar, 
  MessageSquare, 
  Flame, 
  Sparkles, 
  Star,
  Clock,
  TrendingUp,
  Vote,
  Palette,
  Tv,
  Target,
  ChevronRight,
  Heart
} from "lucide-react";

const COMMUNITIES = [
  {
    id: "c1",
    name: "Attack on Titan HQ",
    members: "12.5k",
    active: 1243,
    category: "Shonen",
    description: "Dedicated to the Survey Corps. Shinzo wo Sasageyo!",
    image: "https://picsum.photos/seed/aot/400/200",
    tags: ["Theories", "Manga", "Anime"],
    isHot: true,
  },
  {
    id: "c2",
    name: "One Piece Global",
    members: "45.2k",
    active: 3842,
    category: "Adventure",
    description: "The search for the One Piece starts here. Nakama forever!",
    image: "https://picsum.photos/seed/op/400/200",
    tags: ["Spoilers", "Art", "Cosplay"],
    isHot: true,
  },
  {
    id: "c3",
    name: "Jujutsu Kaisen Sorcerers",
    members: "28k",
    active: 2100,
    category: "Supernatural",
    description: "Domain Expansion: Infinite Chat. Discuss the latest chapters.",
    image: "https://picsum.photos/seed/jjk/400/200",
    tags: ["Leaks", "Power Scaling"],
    isHot: false,
  },
  {
    id: "c4",
    name: "Ghibli Cozy Corner",
    members: "8.9k",
    active: 450,
    category: "Slice of Life",
    description: "Relaxing vibes, lofi beats, and appreciation for Miyazaki's art.",
    image: "https://picsum.photos/seed/ghibli/400/200",
    tags: ["Art", "Music", "Vibes"],
    isHot: false,
  },
];

const UPCOMING_EVENTS = [
  {
    id: "e1",
    communityId: "c1",
    communityName: "Attack on Titan HQ",
    title: "Final Season Watch Party",
    type: "watch_party",
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    attendees: 342,
    image: "https://picsum.photos/seed/aot-event/300/150",
  },
  {
    id: "e2",
    communityId: "c2",
    communityName: "One Piece Global",
    title: "Chapter 1100+ Discussion",
    type: "discussion",
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    attendees: 891,
    image: "https://picsum.photos/seed/op-event/300/150",
  },
  {
    id: "e3",
    communityId: "c3",
    communityName: "JJK Sorcerers",
    title: "Power Scaling Tournament",
    type: "tournament",
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    attendees: 156,
    image: "https://picsum.photos/seed/jjk-event/300/150",
  },
];

const ACTIVE_POLLS = [
  {
    id: "p1",
    communityName: "Attack on Titan HQ",
    question: "Best Titan Shifter?",
    options: ["Eren", "Reiner", "Annie", "Zeke"],
    votes: [423, 156, 289, 201],
    totalVotes: 1069,
  },
  {
    id: "p2",
    communityName: "One Piece Global",
    question: "Strongest Yonko?",
    options: ["Luffy", "Blackbeard", "Shanks", "Buggy"],
    votes: [892, 456, 678, 1204],
    totalVotes: 3230,
  },
];

const WEEKLY_CHALLENGES = [
  {
    id: "ch1",
    communityName: "Ghibli Cozy Corner",
    title: "Draw Your Favorite Ghibli Scene",
    type: "art",
    reward: 500,
    participants: 89,
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    image: "https://picsum.photos/seed/ghibli-challenge/300/150",
  },
  {
    id: "ch2",
    communityName: "JJK Sorcerers",
    title: "Create Your Own Cursed Technique",
    type: "writing",
    reward: 300,
    participants: 156,
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    image: "https://picsum.photos/seed/jjk-challenge/300/150",
  },
];

const TOP_CONTRIBUTORS = [
  { name: "NarutoFan99", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=naruto", tokens: 12500, rank: 1 },
  { name: "SakuraMaster", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sakura", tokens: 9800, rank: 2 },
  { name: "GojoSimp", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=gojo", tokens: 8200, rank: 3 },
  { name: "LuffyKing", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=luffy", tokens: 7500, rank: 4 },
  { name: "ErenYeager", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eren", tokens: 6900, rank: 5 },
];

const CATEGORIES = [
  { name: "Trending", emoji: "🔥" },
  { name: "New", emoji: "✨" },
  { name: "Shonen", emoji: "⚔️" },
  { name: "Romance", emoji: "💖" },
  { name: "Mecha", emoji: "🤖" },
  { name: "Isekai", emoji: "🌀" },
];

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

export default function CommunitiesPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Trending");

  const filteredCommunities = COMMUNITIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text mb-2">COMMUNITIES</h1>
          <p className="text-foreground/80">Join a room. Find your squad. Discuss the latest arcs.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search communities..." 
              className="bg-card/50 border-white/10 pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-communities"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <Badge 
            key={cat.name} 
            variant={selectedCategory === cat.name ? "default" : "secondary"}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors whitespace-nowrap ${
              selectedCategory === cat.name 
                ? 'bg-primary text-white' 
                : 'hover:bg-primary/20'
            }`}
            onClick={() => setSelectedCategory(cat.name)}
            data-testid={`category-${cat.name.toLowerCase()}`}
          >
            {cat.emoji} {cat.name}
          </Badge>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="communities" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 grid grid-cols-4">
          <TabsTrigger value="communities" className="text-xs md:text-sm" data-testid="tab-communities">
            <Users className="h-4 w-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Communities</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs md:text-sm" data-testid="tab-events">
            <Calendar className="h-4 w-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs md:text-sm" data-testid="tab-challenges">
            <Trophy className="h-4 w-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Challenges</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs md:text-sm" data-testid="tab-leaderboard">
            <Crown className="h-4 w-4 mr-1 md:mr-2" /> <span className="hidden md:inline">Leaderboard</span>
          </TabsTrigger>
        </TabsList>

        {/* COMMUNITIES TAB */}
        <TabsContent value="communities" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Community List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" /> Hot Communities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCommunities.map((community) => (
                  <Card 
                    key={community.id} 
                    className="bg-card/40 backdrop-blur-sm border-white/5 overflow-hidden hover:border-primary/50 transition-all group cursor-pointer"
                    onClick={() => setLocation(`/community/${community.id}`)}
                    data-testid={`community-card-${community.id}`}
                  >
                    <div className="h-28 w-full bg-muted relative">
                      <img src={community.image} alt={community.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute top-3 right-3 flex gap-2">
                        {community.isHot && (
                          <Badge className="bg-orange-500/80 text-white border-0">
                            <Flame className="h-3 w-3 mr-1" /> Hot
                          </Badge>
                        )}
                        <Badge className="bg-black/60 backdrop-blur-md border-white/10">
                          {community.category}
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="text-white font-bold text-lg group-hover:text-primary transition-colors">{community.name}</h3>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{community.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-green-400">
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> 
                            {community.active.toLocaleString()} Online
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3 w-3" /> {community.members}
                          </span>
                        </div>
                        <Button size="sm" className="bg-primary/20 hover:bg-primary text-primary hover:text-white text-xs">
                          Join <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Sidebar - Active Polls */}
            <div className="space-y-6">
              <Card className="bg-card/50 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Vote className="h-5 w-5 text-purple-500" /> Active Polls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ACTIVE_POLLS.map((poll) => (
                    <div key={poll.id} className="border border-white/10 rounded-lg p-3 hover:border-primary/30 transition-colors">
                      <p className="text-xs text-muted-foreground mb-1">{poll.communityName}</p>
                      <p className="font-bold text-sm mb-3">{poll.question}</p>
                      <div className="space-y-2">
                        {poll.options.map((option, i) => {
                          const percentage = Math.round((poll.votes[i] / poll.totalVotes) * 100);
                          return (
                            <div key={option} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>{option}</span>
                                <span className="text-muted-foreground">{percentage}%</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{poll.totalVotes.toLocaleString()} votes</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* EVENTS TAB */}
        <TabsContent value="events" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" /> Upcoming Events
              </h3>
              <Button variant="outline" size="sm" className="border-primary/50 text-primary">
                Create Event
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {UPCOMING_EVENTS.map((event) => (
                <Card key={event.id} className="bg-card/50 border-white/10 overflow-hidden hover:border-primary/30 transition-colors" data-testid={`event-card-${event.id}`}>
                  <div className="h-32 relative">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <Badge className="absolute top-3 right-3 bg-blue-500/80 border-0">
                      {event.type === 'watch_party' && <Tv className="h-3 w-3 mr-1" />}
                      {event.type === 'discussion' && <MessageSquare className="h-3 w-3 mr-1" />}
                      {event.type === 'tournament' && <Trophy className="h-3 w-3 mr-1" />}
                      {event.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-primary mb-1">{event.communityName}</p>
                    <h4 className="font-bold mb-2">{event.title}</h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Starts in {formatTimeUntil(event.startTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {event.attendees} attending
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button className="w-full" size="sm">
                      Join Event
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Past Events */}
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4 text-muted-foreground">Past Events</h3>
              <p className="text-muted-foreground text-sm">No past events to show.</p>
            </div>
          </div>
        </TabsContent>

        {/* CHALLENGES TAB */}
        <TabsContent value="challenges" className="mt-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" /> Weekly Challenges
              </h3>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-500">
                <Star className="h-3 w-3 mr-1" /> Earn tokens by participating!
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {WEEKLY_CHALLENGES.map((challenge) => (
                <Card key={challenge.id} className="bg-card/50 border-white/10 overflow-hidden" data-testid={`challenge-card-${challenge.id}`}>
                  <div className="h-40 relative">
                    <img src={challenge.image} alt={challenge.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <Badge className="absolute top-3 left-3 bg-purple-500/80 border-0">
                      {challenge.type === 'art' && <Palette className="h-3 w-3 mr-1" />}
                      {challenge.type === 'writing' && <MessageSquare className="h-3 w-3 mr-1" />}
                      {challenge.type}
                    </Badge>
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-xs text-primary mb-1">{challenge.communityName}</p>
                      <h4 className="font-bold text-lg text-white">{challenge.title}</h4>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                          <Star className="h-4 w-4" /> {challenge.reward} tokens
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Ends in {formatTimeUntil(challenge.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {challenge.participants} participants
                      </span>
                      <Button size="sm" className="bg-gradient-to-r from-purple-500 to-pink-500">
                        Submit Entry
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Challenge Rules */}
            <Card className="bg-card/30 border-white/10 p-6">
              <h4 className="font-bold mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" /> How Challenges Work
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span> Pick a challenge that matches your skills
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span> Create and submit your entry before the deadline
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span> Community members vote on submissions
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span> Winners receive token rewards and special badges!
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>

        {/* LEADERBOARD TAB */}
        <TabsContent value="leaderboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Contributors */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" /> Top Contributors
                </CardTitle>
                <CardDescription>Most active community members this week</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {TOP_CONTRIBUTORS.map((user, index) => (
                  <div 
                    key={user.name} 
                    className={`flex items-center gap-4 p-3 rounded-lg ${
                      index === 0 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                      index === 1 ? 'bg-gray-400/10 border border-gray-400/30' :
                      index === 2 ? 'bg-orange-600/10 border border-orange-600/30' :
                      'bg-white/5'
                    }`}
                    data-testid={`leaderboard-user-${index}`}
                  >
                    <div className={`text-2xl font-bold w-8 ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-600' :
                      'text-muted-foreground'
                    }`}>
                      #{user.rank}
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-primary/30">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">Community Legend</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-500 font-bold">{user.tokens.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">tokens earned</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Roles Info */}
            <Card className="bg-card/50 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-500" /> Community Roles
                </CardTitle>
                <CardDescription>Earn roles by contributing to communities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <Crown className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="font-bold text-yellow-500">Owner</p>
                    <p className="text-xs text-muted-foreground">Created the community. Full admin powers.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <Target className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-bold text-blue-500">Moderator</p>
                    <p className="text-xs text-muted-foreground">Trusted to manage content and members.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <Trophy className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-bold text-purple-500">Veteran</p>
                    <p className="text-xs text-muted-foreground">Active member with 1000+ messages.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-bold text-green-500">Member</p>
                    <p className="text-xs text-muted-foreground">Welcome! Start participating to level up.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
