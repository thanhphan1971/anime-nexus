import { useState, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Heart, Info, Crown, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export default function FriendsPage() {
  const { user } = useAuth();
  const { data: allUsers, isLoading } = useUsers();
  const [, setLocation] = useLocation();
  
  const [cards, setCards] = useState<any[]>([]);
  const [swipeCount, setSwipeCount] = useState(0);
  const [history, setHistory] = useState<string[]>([]);

  const isPremium = user?.isPremium || false;
  const remainingSwipes = isPremium ? Infinity : Math.max(0, DAILY_SWIPE_LIMIT - swipeCount);
  const hasReachedLimit = !isPremium && swipeCount >= DAILY_SWIPE_LIMIT;

  useEffect(() => {
    if (user) {
      setSwipeCount(getDailySwipes(user.id));
    }
  }, [user]);

  useEffect(() => {
    if (allUsers && user) {
      const otherUsers = allUsers
        .filter((u: any) => u.id !== user.id && !u.isBanned)
        .map((u: any) => ({
          ...u,
          matchScore: Math.floor(Math.random() * 30) + 70,
        }));
      setCards(otherUsers);
    }
  }, [allUsers, user]);

  const activeIndex = cards.length - 1;

  const removeCard = (id: string, direction: "left" | "right") => {
    if (hasReachedLimit) {
      toast.error("Daily limit reached! Upgrade to S-Class for unlimited swipes.");
      return;
    }

    setHistory([...history, id]);
    setCards((prev) => prev.filter((card) => card.id !== id));
    
    if (user) {
      const newCount = incrementDailySwipes(user.id);
      setSwipeCount(newCount);
    }

    if (direction === "right") {
      toast.success("Connection request sent!");
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
    <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center max-w-md mx-auto relative pb-20">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-display font-bold neon-text">FIND NAKAMA</h2>
        <p className="text-muted-foreground text-sm">Swipe right to connect, left to skip</p>
        
        {/* Swipe Counter */}
        <div className="mt-3 flex items-center justify-center gap-2">
          {isPremium ? (
            <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50">
              <Crown className="h-3 w-3 mr-1" /> Unlimited Swipes
            </Badge>
          ) : (
            <Badge variant="outline" className={`${remainingSwipes <= 5 ? 'border-red-500/50 text-red-400' : 'border-white/20'}`}>
              {remainingSwipes} swipes remaining today
            </Badge>
          )}
        </div>
      </div>

      <div className="relative w-full aspect-[3/4] max-h-[500px]">
        <AnimatePresence>
          {hasReachedLimit ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/30 rounded-3xl border border-dashed border-yellow-500/30 p-8 text-center">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/30 rounded-3xl border border-dashed border-white/10 p-8 text-center">
              <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-bold mb-2">No more profiles</h3>
              <p className="text-muted-foreground mb-4">Check back later for more matches in your sector.</p>
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
            className="h-14 w-14 rounded-full bg-card border border-destructive/50 text-destructive hover:bg-destructive hover:text-white transition-colors shadow-lg"
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
            className="h-14 w-14 rounded-full bg-card border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white transition-colors shadow-lg"
            onClick={() => removeCard(cards[activeIndex].id, "right")}
            data-testid="button-connect"
          >
            <Heart size={28} fill="currentColor" />
          </Button>
        </div>
      )}
    </div>
  );
}
