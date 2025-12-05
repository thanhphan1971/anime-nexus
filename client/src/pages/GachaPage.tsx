import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Gift, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Assets will be imported once generated, using placeholders for now
import card1 from "@assets/generated_images/legendary_anime_dragon_card.png";
import card2 from "@assets/generated_images/cyberpunk_assassin_card.png";
import card3 from "@assets/generated_images/magical_girl_ultimate_form_card.png";

const CARDS = [
  { id: 1, name: "Bahamut Zero", rarity: "UR", image: card1, type: "Dragon" },
  { id: 2, name: "Neon Assassin", rarity: "SSR", image: card2, type: "Cyber" },
  { id: 3, name: "Starlight Goddess", rarity: "UR", image: card3, type: "Magic" },
];

export default function GachaPage() {
  const [isPulling, setIsPulling] = useState(false);
  const [reward, setReward] = useState<typeof CARDS[0] | null>(null);

  const handlePull = () => {
    setIsPulling(true);
    setReward(null);
    
    // Simulate animation delay
    setTimeout(() => {
      const randomCard = CARDS[Math.floor(Math.random() * CARDS.length)];
      setReward(randomCard);
      setIsPulling(false);
    }, 2000);
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />

      <div className="text-center mb-8 z-10">
        <h1 className="text-4xl md:text-6xl font-display font-black neon-text mb-4">DAILY SUMMON</h1>
        <p className="text-muted-foreground text-lg">Use your daily token to summon rare collectibles.</p>
        <div className="mt-4 inline-flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-4 py-2 rounded-full border border-yellow-500/20">
          <Gift className="h-4 w-4" /> <span>1 Free Token Available</span>
        </div>
      </div>

      <div className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center mb-8">
        <AnimatePresence mode="wait">
          {!reward && !isPulling && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="w-64 h-80 bg-card border-2 border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-500 group"
              onClick={handlePull}
            >
              <div className="text-center">
                <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors animate-pulse" />
                <p className="font-display font-bold text-xl">TAP TO SUMMON</p>
              </div>
            </motion.div>
          )}

          {isPulling && (
            <motion.div
              key="summoning"
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1.5, rotate: 360 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-40 h-40 rounded-full border-4 border-primary border-t-transparent animate-spin blur-sm" />
              <div className="absolute w-32 h-32 rounded-full bg-primary/50 blur-xl animate-pulse" />
            </motion.div>
          )}

          {reward && (
            <motion.div
              key="reward"
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 12 }}
              className="relative w-72 md:w-80 aspect-[3/4] rounded-xl overflow-hidden border-4 border-yellow-500 shadow-[0_0_50px_hsl(45,100%,50%,0.5)]"
            >
              <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 text-white">
                 <div className="flex justify-between items-center mb-2">
                   <Badge className="bg-yellow-500 text-black font-bold">{reward.rarity}</Badge>
                   <span className="text-xs font-mono uppercase opacity-80">{reward.type}</span>
                 </div>
                 <h2 className="text-2xl font-display font-bold">{reward.name}</h2>
              </div>
              
              {/* Particle Effects */}
              <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {reward && (
        <Button size="lg" onClick={() => setReward(null)} className="animate-in fade-in slide-in-from-bottom-4">
          Collect & Summon Again
        </Button>
      )}
    </div>
  );
}
