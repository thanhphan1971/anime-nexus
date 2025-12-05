import { useState } from "react";
import { USERS } from "@/lib/mockData";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Heart, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FriendsPage() {
  const [cards, setCards] = useState(USERS);
  const [history, setHistory] = useState<string[]>([]);

  const activeIndex = cards.length - 1;

  const removeCard = (id: string, direction: "left" | "right") => {
    setHistory([...history, id]);
    setCards((prev) => prev.filter((card) => card.id !== id));
    console.log(`Swiped ${direction} on ${id}`);
  };

  const handleDragEnd = (event: any, info: PanInfo, id: string) => {
    if (info.offset.x > 100) {
      removeCard(id, "right");
    } else if (info.offset.x < -100) {
      removeCard(id, "left");
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col items-center justify-center max-w-md mx-auto relative">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-display font-bold neon-text">FIND NAKAMA</h2>
        <p className="text-muted-foreground text-sm">Swipe right to connect, left to skip</p>
      </div>

      <div className="relative w-full aspect-[3/4] max-h-[600px]">
        <AnimatePresence>
          {cards.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/30 rounded-3xl border border-dashed border-white/10 p-8 text-center">
                <h3 className="text-xl font-bold mb-2">No more profiles</h3>
                <p className="text-muted-foreground mb-4">Check back later for more matches in your sector.</p>
                <Button onClick={() => setCards(USERS)}>Reset Search</Button>
             </div>
          ) : (
            cards.map((user, index) => {
              const isTop = index === activeIndex;
              return (
                <motion.div
                  key={user.id}
                  className="absolute inset-0 cursor-grab active:cursor-grabbing"
                  style={{ zIndex: index }}
                  drag={isTop ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, info) => handleDragEnd(e, info, user.id)}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ 
                    scale: isTop ? 1 : 0.95 + (index * 0.01), 
                    opacity: 1,
                    y: isTop ? 0 : -10 * (cards.length - index)
                  }}
                  exit={{ x: Math.random() > 0.5 ? 500 : -500, opacity: 0, rotate: Math.random() > 0.5 ? 20 : -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="w-full h-full rounded-3xl overflow-hidden relative bg-card border border-white/10 shadow-2xl select-none">
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover pointer-events-none" />
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white pointer-events-none">
                      <div className="flex items-center justify-between mb-2">
                         <h2 className="text-3xl font-display font-black italic">{user.name}</h2>
                         <div className="bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">
                           {user.matchScore}% MATCH
                         </div>
                      </div>
                      
                      <p className="text-gray-200 text-sm mb-4 line-clamp-2">{user.bio}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {(user.animeInterests || []).map((tag: string) => (
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
      {cards.length > 0 && (
        <div className="flex items-center gap-6 mt-8 z-10">
          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full bg-card border border-destructive/50 text-destructive hover:bg-destructive hover:text-white transition-colors shadow-lg"
            onClick={() => removeCard(cards[activeIndex].id, "left")}
          >
            <X size={28} />
          </Button>
          
          <Button 
            size="icon" 
            className="h-10 w-10 rounded-full bg-card border border-white/20 text-white hover:bg-white/10 transition-colors shadow-lg"
          >
            <Info size={20} />
          </Button>

          <Button 
            size="icon" 
            className="h-14 w-14 rounded-full bg-card border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white transition-colors shadow-lg"
            onClick={() => removeCard(cards[activeIndex].id, "right")}
          >
            <Heart size={28} fill="currentColor" />
          </Button>
        </div>
      )}
    </div>
  );
}
