import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Heart, Info, Crown, Loader2, RefreshCw, Users, Sparkles, Trash2, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/lib/api";
import { useLocation } from "wouter";
import { toast } from "sonner";

const DAILY_SWIPE_LIMIT = 20;

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}

function getDailySwipes(userId: string): number {
  const key = `swipes_${userId}_${getTodayKey()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}

function incrementDailySwipes(userId: string): number {
  const key = `swipes_${userId}_${getTodayKey()}`;
  const current = getDailySwipes(userId);
  const newCount = current + 1;
  localStorage.setItem(key, newCount.toString());
  return newCount;
}

function getConnections(userId: string): string[] {
  const key = `connections_${userId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function addConnection(userId: string, connectedUserId: string) {
  const connections = getConnections(userId);
  if (!connections.includes(connectedUserId)) {
    connections.push(connectedUserId);
    localStorage.setItem(`connections_${userId}`, JSON.stringify(connections));
  }
}

function removeConnection(userId: string, connectedUserId: string) {
  const connections = getConnections(userId);
  const updated = connections.filter((id: string) => id !== connectedUserId);
  localStorage.setItem(`connections_${userId}`, JSON.stringify(updated));
}

export default function FriendsPage() {
  const { user } = useAuth();
  const { data: allUsers, isLoading } = useUsers();
  const [, setLocation] = useLocation();
  
  const [cards, setCards] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const isPremium = user?.isPremium || false;
  const remainingSwipes = isPremium ? Infinity : Math.max(0, DAILY_SWIPE_LIMIT - swipeCount);
  const hasReachedLimit = !isPremium && swipeCount >= DAILY_SWIPE_LIMIT;

  useEffect(() => {
    if (user) {
      setSwipeCount(getDailySwipes(user.id));
      const connectionIds = getConnections(user.id);
      if (allUsers) {
        const connectedUsers = allUsers.filter((u: any) => connectionIds.includes(u.id));
        setConnections(connectedUsers);
      }
    }
  }, [user, allUsers]);

  useEffect(() => {
    if (allUsers && user) {
      const connectionIds = getConnections(user.id);
      const otherUsers = allUsers
        .filter((u: any) => u.id !== user.id && !u.isBanned && !connectionIds.includes(u.id) && !skippedIds.includes(u.id))
        .map((u: any) => ({
          ...u,
          matchScore: Math.floor(Math.random() * 30) + 70,
        }));
      setCards(otherUsers);
    }
  }, [allUsers, user, skippedIds]);

  const activeIndex = cards.length - 1;

  const removeCard = (id: string, direction: "left" | "right") => {
    if (hasReachedLimit) {
      toast.error("Daily limit reached! Upgrade to S-Class for unlimited swipes.");
      return;
    }

    setCards((prev) => prev.filter((card) => card.id !== id));
    
    if (user) {
      const newCount = incrementDailySwipes(user.id);
      setSwipeCount(newCount);
      
      if (direction === "right") {
        addConnection(user.id, id);
        const connectedUser = allUsers?.find((u: any) => u.id === id);
        if (connectedUser) {
          setConnections(prev => [...prev, connectedUser]);
        }
        toast.success("Connection request sent!");
      } else {
        setSkippedIds(prev => [...prev, id]);
      }
    }
  };

  const handleDragEnd = (event: any, info: PanInfo, id: string) => {
    if (hasReachedLimit) return;
    
    if (info.offset.x > 100) {
      removeCard(id, "right");
    } else if (info.offset.x < -100) {
      removeCard(id, "left");
    }
  };

  if (isLoading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Page Header */}
      <div className="text-center pb-4 mb-4">
        <h1 className="text-2xl font-display font-bold neon-text">FIND FRIENDS</h1>
        <p className="text-sm text-muted-foreground">Swipe to discover anime fans with similar interests and make new connections</p>
      </div>

      <Tabs defaultValue="discover" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 mb-6 grid grid-cols-2">
          <TabsTrigger value="discover" data-testid="tab-discover">
            <Sparkles className="h-4 w-4 mr-2" /> Discover
          </TabsTrigger>
          <TabsTrigger value="connections" data-testid="tab-connections">
            <Users className="h-4 w-4 mr-2" /> Connections ({connections.length})
          </TabsTrigger>
        </TabsList>

        {/* DISCOVER TAB */}
        <TabsContent value="discover">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto relative">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-display font-bold neon-text">FIND NAKAMA</h2>
              <p className="text-muted-foreground text-sm">Swipe right to connect, left to skip</p>
              
              {/* Swipe Counter - Made more visible */}
              <div className="mt-4 flex items-center justify-center gap-2">
                {isPremium ? (
                  <div className="px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 font-bold text-sm flex items-center gap-2">
                    <Crown className="h-4 w-4" /> Unlimited Swipes
                  </div>
                ) : (
                  <div className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${
                    remainingSwipes <= 5 
                      ? 'bg-red-500/20 border border-red-500/50 text-red-400' 
                      : 'bg-primary/20 border border-primary/50 text-primary'
                  }`}>
                    <Heart className="h-4 w-4" /> {remainingSwipes} swipes remaining today
                  </div>
                )}
              </div>
            </div>

            <div className="relative w-full aspect-[3/4] max-h-[450px]">
              <AnimatePresence>
                {hasReachedLimit ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 rounded-3xl border-2 border-dashed border-yellow-500/50 p-8 text-center">
                    <Crown className="h-16 w-16 text-yellow-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Daily Limit Reached!</h3>
                    <p className="text-muted-foreground mb-4">
                      You've used all 20 swipes for today. Come back tomorrow or upgrade to S-Class for unlimited matching!
                    </p>
                    <Button 
                      onClick={() => setLocation("/sclass")}
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold"
                      data-testid="button-upgrade-sclass"
                    >
                      <Crown className="h-4 w-4 mr-2" /> Upgrade to S-Class
                    </Button>
                  </div>
                ) : cards.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 rounded-3xl border-2 border-dashed border-white/20 p-8 text-center">
                    <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-bold mb-2">You've seen everyone!</h3>
                    <p className="text-muted-foreground mb-4">No new profiles right now. Reset to discover new connections, or check back later for new members.</p>
                    <Button 
                      onClick={() => {
                        if (user) {
                          localStorage.removeItem(`connections_${user.id}`);
                          setConnections([]);
                        }
                        setSkippedIds([]);
                        toast.success("Profile pool refreshed!");
                      }}
                      variant="outline"
                      className="border-primary/50 text-primary hover:bg-primary/10"
                      data-testid="button-reset-profiles"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" /> Start Fresh
                    </Button>
                  </div>
                ) : (
                  cards.map((cardUser, index) => {
                    const isTop = index === activeIndex;
                    return (
                      <motion.div
                        key={cardUser.id}
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        style={{ zIndex: index }}
                        drag={isTop && !hasReachedLimit ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={(e, info) => handleDragEnd(e, info, cardUser.id)}
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ 
                          scale: isTop ? 1 : 0.95 + (index * 0.01), 
                          opacity: 1,
                          y: isTop ? 0 : -10 * (cards.length - index)
                        }}
                        exit={{ x: Math.random() > 0.5 ? 500 : -500, opacity: 0, rotate: Math.random() > 0.5 ? 20 : -20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        data-testid={`card-user-${cardUser.id}`}
                      >
                        <div className="w-full h-full rounded-3xl overflow-hidden relative bg-card border border-white/10 shadow-2xl select-none">
                          <img src={cardUser.avatar} alt={cardUser.name} className="w-full h-full object-cover pointer-events-none" />
                          
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                          
                          {/* Premium Badge */}
                          {cardUser.isPremium && (
                            <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Crown className="h-3 w-3" /> S-Class
                            </div>
                          )}
                          
                          {/* Content */}
                          <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                            <div className="flex items-center justify-between mb-2">
                              <h2 className="text-3xl font-display font-black italic">{cardUser.name}</h2>
                              <div className="bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">
                                {cardUser.matchScore}% MATCH
                              </div>
                            </div>
                            
                            <p className="text-gray-200 text-sm mb-4 line-clamp-2">{cardUser.bio || "No bio yet"}</p>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                              {(cardUser.animeInterests || []).slice(0, 4).map((tag: string) => (
                                <Badge key={tag} variant="outline" className="bg-white/10 border-white/20 text-xs text-white">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            {cards.length > 0 && !hasReachedLimit && (
              <div className="flex items-center gap-6 mt-8 z-10">
                <Button 
                  size="icon" 
                  className="h-14 w-14 rounded-full bg-card border-2 border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                  onClick={() => removeCard(cards[activeIndex].id, "left")}
                  data-testid="button-skip"
                >
                  <X size={28} />
                </Button>
                
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full bg-card border border-white/20 text-white hover:bg-white/10 transition-colors shadow-lg"
                  data-testid="button-info"
                >
                  <Info size={20} />
                </Button>

                <Button 
                  size="icon" 
                  className="h-14 w-14 rounded-full bg-card border-2 border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white transition-colors shadow-lg"
                  onClick={() => removeCard(cards[activeIndex].id, "right")}
                  data-testid="button-connect"
                >
                  <Heart size={28} fill="currentColor" />
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* CONNECTIONS TAB */}
        <TabsContent value="connections">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-display font-bold neon-text">YOUR CONNECTIONS</h2>
              <p className="text-muted-foreground text-sm">People you've connected with</p>
            </div>

            {connections.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl bg-card/30">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No connections yet</h3>
                <p className="text-muted-foreground max-w-md mx-auto text-sm mb-4">
                  Start swiping right on profiles you'd like to connect with!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.map((connection: any) => (
                  <Card 
                    key={connection.id} 
                    className="bg-card/50 border-white/10 hover:border-primary/50 transition-colors cursor-pointer" 
                    data-testid={`connection-${connection.id}`}
                    onClick={() => {
                      setSelectedProfile(connection);
                      setShowProfileModal(true);
                    }}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/30">
                        <AvatarImage src={connection.avatar} />
                        <AvatarFallback>{connection.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold">{connection.name}</h3>
                          {connection.isPremium && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{connection.handle}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{connection.bio}</p>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                          Message
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                          onClick={() => {
                            if (user) {
                              removeConnection(user.id, connection.id);
                              setConnections(prev => prev.filter(c => c.id !== connection.id));
                              toast.success(`Removed ${connection.name} from connections`);
                            }
                          }}
                          data-testid={`button-remove-${connection.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Profile Detail Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="bg-card border-white/10 max-w-md p-0 overflow-hidden">
          {selectedProfile && (
            <>
              {/* Profile Header Image */}
              <div className="relative h-64 w-full">
                <img 
                  src={selectedProfile.avatar} 
                  alt={selectedProfile.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                
                {selectedProfile.isPremium && (
                  <div className="absolute top-4 right-4 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                    <Crown className="h-4 w-4" /> S-Class
                  </div>
                )}
              </div>

              {/* Profile Content */}
              <div className="p-6 -mt-12 relative">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-display font-bold">{selectedProfile.name}</h2>
                  {selectedProfile.isPremium && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                
                <p className="text-primary text-sm mb-4">{selectedProfile.handle}</p>
                
                {/* Bio */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">About</h3>
                  <p className="text-foreground">{selectedProfile.bio || "No bio yet"}</p>
                </div>

                {/* Anime Interests */}
                {selectedProfile.animeInterests && selectedProfile.animeInterests.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Favorite Anime</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.animeInterests.map((anime: string) => (
                        <Badge key={anime} variant="outline" className="bg-primary/10 border-primary/30 text-primary">
                          {anime}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Member Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Member since 2024</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button className="flex-1 bg-primary hover:bg-primary/90">
                    Send Message
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      if (user) {
                        removeConnection(user.id, selectedProfile.id);
                        setConnections(prev => prev.filter(c => c.id !== selectedProfile.id));
                        setShowProfileModal(false);
                        toast.success(`Removed ${selectedProfile.name} from connections`);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
