import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Phone, 
  Video, 
  Hash, 
  Users, 
  ArrowLeft,
  Crown,
  Trophy,
  Calendar,
  Vote,
  Palette,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  Megaphone,
  Star,
  Clock,
  ChevronRight,
  Tv
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const COMMUNITY_DATA: Record<string, any> = {
  c1: {
    name: "Attack on Titan HQ",
    description: "Dedicated to the Survey Corps. Shinzo wo Sasageyo!",
    image: "https://picsum.photos/seed/aot/400/200",
    members: 12500,
    online: 1243,
    category: "Shonen",
    channels: [
      { id: "general", name: "general", type: "chat", icon: Hash },
      { id: "spoilers", name: "spoilers", type: "spoilers", icon: AlertTriangle },
      { id: "fan-art", name: "fan-art", type: "fan-art", icon: Palette },
      { id: "theories", name: "theories", type: "theories", icon: Lightbulb },
      { id: "announcements", name: "announcements", type: "announcements", icon: Megaphone },
    ],
    events: [
      { id: "e1", title: "Final Season Watch Party", type: "watch_party", startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), attendees: 342 },
      { id: "e2", title: "Manga vs Anime Discussion", type: "discussion", startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), attendees: 156 },
    ],
    polls: [
      { id: "p1", question: "Best Titan Shifter?", options: ["Eren", "Reiner", "Annie", "Zeke"], votes: [423, 156, 289, 201], totalVotes: 1069 },
    ],
    leaderboard: [
      { name: "ErenFan99", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eren", messages: 2450, role: "moderator" },
      { name: "MikasaStan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mikasa", messages: 1890, role: "veteran" },
      { name: "ArminGenius", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=armin", messages: 1456, role: "veteran" },
      { name: "LeviAckerman", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=levi", messages: 1203, role: "member" },
      { name: "HanjiFan", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=hanji", messages: 980, role: "member" },
    ],
  },
  c2: {
    name: "One Piece Global",
    description: "The search for the One Piece starts here. Nakama forever!",
    image: "https://picsum.photos/seed/op/400/200",
    members: 45200,
    online: 3842,
    category: "Adventure",
    channels: [
      { id: "general", name: "general", type: "chat", icon: Hash },
      { id: "spoilers", name: "spoilers", type: "spoilers", icon: AlertTriangle },
      { id: "fan-art", name: "fan-art", type: "fan-art", icon: Palette },
      { id: "theories", name: "theories", type: "theories", icon: Lightbulb },
    ],
    events: [],
    polls: [
      { id: "p1", question: "Strongest Yonko?", options: ["Luffy", "Blackbeard", "Shanks", "Buggy"], votes: [892, 456, 678, 1204], totalVotes: 3230 },
    ],
    leaderboard: [
      { name: "LuffyKing", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=luffy", messages: 3200, role: "owner" },
      { name: "ZoroFanboy", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zoro", messages: 2100, role: "moderator" },
    ],
  },
};

const DEFAULT_COMMUNITY = {
  name: "Community",
  description: "Welcome to this community!",
  image: "https://picsum.photos/seed/default/400/200",
  members: 0,
  online: 0,
  category: "General",
  channels: [{ id: "general", name: "general", type: "chat", icon: Hash }],
  events: [],
  polls: [],
  leaderboard: [],
};

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  return `${hours}h`;
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner': return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50 text-xs"><Crown className="h-3 w-3 mr-1" />Owner</Badge>;
    case 'moderator': return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/50 text-xs">Mod</Badge>;
    case 'veteran': return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/50 text-xs"><Trophy className="h-3 w-3 mr-1" />Veteran</Badge>;
    default: return null;
  }
}

export default function CommunityDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = useState("general");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, user: "System", content: "Welcome! Please read the community rules.", time: "10:00 AM", system: true },
    { id: 2, user: "ErenFan99", content: "Did anyone see the latest episode??", time: "10:05 AM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=eren" },
    { id: 3, user: "MikasaStan", content: "The animation was insane!", time: "10:06 AM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mikasa" },
  ]);

  const community = COMMUNITY_DATA[id || ''] || DEFAULT_COMMUNITY;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    
    setMessages([
      ...messages,
      { 
        id: messages.length + 1, 
        user: user.name, 
        content: message, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avatar: user.avatar
      }
    ]);
    setMessage("");
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col md:flex-row gap-4 pb-20">
      {/* Sidebar - Channels & Info */}
      <div className="w-full md:w-72 flex-shrink-0 space-y-4">
        {/* Back Button & Community Header */}
        <Card className="bg-card/50 border-white/10 overflow-hidden">
          <div className="h-24 relative">
            <img src={community.image} alt={community.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute top-2 left-2 bg-black/50 hover:bg-black/70"
              onClick={() => setLocation('/communities')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-1">{community.name}</h2>
            <p className="text-xs text-muted-foreground mb-3">{community.description}</p>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                {community.online.toLocaleString()} Online
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" /> {community.members.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Channels */}
        <Card className="bg-card/50 border-white/10">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Channels</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {community.channels.map((channel: any) => {
              const Icon = channel.icon;
              return (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedChannel === channel.id 
                      ? 'bg-primary/20 text-primary' 
                      : 'hover:bg-white/5 text-muted-foreground'
                  }`}
                  data-testid={`channel-${channel.id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{channel.name}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs border-white/10">
            <Phone className="h-3 w-3 mr-1" /> Voice
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs border-white/10">
            <Video className="h-3 w-3 mr-1" /> Video
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-w-0">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-card/30 border border-white/10 rounded-xl overflow-hidden min-w-0">
          {/* Chat Header */}
          <div className="p-3 border-b border-white/10 flex items-center gap-3 bg-card/50">
            <Hash className="h-5 w-5 text-primary" />
            <span className="font-bold">{selectedChannel}</span>
            {selectedChannel === 'spoilers' && (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" /> Spoiler Zone
              </Badge>
            )}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg: any) => (
                msg.system ? (
                  <div key={msg.id} className="flex justify-center my-4">
                    <span className="bg-white/5 text-muted-foreground text-xs px-3 py-1 rounded-full">
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <div key={msg.id} className={`flex gap-3 ${msg.user === user?.name ? "flex-row-reverse" : ""}`}>
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={msg.avatar} />
                      <AvatarFallback>{msg.user[0]}</AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col max-w-[70%] ${msg.user === user?.name ? "items-end" : "items-start"}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-muted-foreground">{msg.user}</span>
                        <span className="text-[10px] text-muted-foreground/60">{msg.time}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-2xl text-sm ${
                        msg.user === user?.name 
                          ? "bg-primary text-primary-foreground rounded-tr-none" 
                          : "bg-white/10 rounded-tl-none"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 bg-card/50 border-t border-white/10">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Message #${selectedChannel}...`}
                className="bg-white/5 border-white/10 focus:border-primary text-sm"
                data-testid="input-chat-message"
              />
              <Button type="submit" size="icon" className="bg-primary hover:bg-primary/90" data-testid="button-send-message">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Right Sidebar - Events, Polls, Members */}
        <div className="w-full md:w-72 flex-shrink-0 space-y-4 hidden lg:block">
          <Tabs defaultValue="events" className="w-full">
            <TabsList className="w-full bg-card/50 border border-white/10 grid grid-cols-3">
              <TabsTrigger value="events" className="text-xs"><Calendar className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="polls" className="text-xs"><Vote className="h-3 w-3" /></TabsTrigger>
              <TabsTrigger value="members" className="text-xs"><Users className="h-3 w-3" /></TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="mt-3 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" /> Upcoming Events
              </h4>
              {community.events.length > 0 ? (
                community.events.map((event: any) => (
                  <Card key={event.id} className="bg-card/30 border-white/10 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {event.type === 'watch_party' && <Tv className="h-4 w-4 text-blue-400" />}
                      {event.type === 'discussion' && <MessageSquare className="h-4 w-4 text-green-400" />}
                      <span className="font-bold text-sm">{event.title}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTimeUntil(event.startTime)}
                      </span>
                      <span>{event.attendees} attending</span>
                    </div>
                    <Button size="sm" className="w-full mt-2 text-xs">Join</Button>
                  </Card>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No upcoming events</p>
              )}
            </TabsContent>

            <TabsContent value="polls" className="mt-3 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Vote className="h-4 w-4 text-purple-500" /> Active Polls
              </h4>
              {community.polls.map((poll: any) => (
                <Card key={poll.id} className="bg-card/30 border-white/10 p-3">
                  <p className="font-bold text-sm mb-3">{poll.question}</p>
                  <div className="space-y-2">
                    {poll.options.map((option: string, i: number) => {
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
                  <p className="text-xs text-muted-foreground mt-2">{poll.totalVotes} votes</p>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="members" className="mt-3 space-y-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" /> Top Members
              </h4>
              {community.leaderboard.map((member: any, index: number) => (
                <div key={member.name} className="flex items-center gap-3 p-2 rounded-lg bg-card/30">
                  <span className={`text-lg font-bold w-6 ${
                    index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-muted-foreground'
                  }`}>
                    #{index + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback>{member.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.messages} msgs</p>
                  </div>
                  {getRoleBadge(member.role)}
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
