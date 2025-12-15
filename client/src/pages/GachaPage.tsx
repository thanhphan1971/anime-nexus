import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Gift, Zap } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { PortalRing, PortalCharge } from "@/components/PortalRing";
import { CardReveal, CardBack } from "@/components/CardReveal";
import { RarityBadge, type Rarity } from "@/components/RarityFrame";

import card1 from "@assets/generated_images/legendary_anime_dragon_card.png";
import card2 from "@assets/generated_images/cyberpunk_assassin_card.png";
import card3 from "@assets/generated_images/magical_girl_ultimate_form_card.png";

interface GachaCard {
  id: number;
  name: string;
  character: string;
  anime: string;
  rarity: Rarity;
  image: string;
  power: number;
  element: string;
}

const DEMO_CARDS: GachaCard[] = [
  { id: 1, name: "Bahamut Zero", character: "Dragon King", anime: "Fracture Chronicles", rarity: "Legendary", image: card1, power: 9500, element: "Dragon" },
  { id: 2, name: "Neon Assassin", character: "Shadow", anime: "Cyber Realm", rarity: "Epic", image: card2, power: 7200, element: "Cyber" },
  { id: 3, name: "Starlight Goddess", character: "Lumina", anime: "Celestial Wars", rarity: "Mythic", image: card3, power: 9999, element: "Magic" },
];

type PullPhase = "idle" | "charging" | "reveal";

export default function GachaPage() {
  const [phase, setPhase] = useState<PullPhase>("idle");
  const [reward, setReward] = useState<GachaCard | null>(null);
  const [freeTokens, setFreeTokens] = useState(1);
  const prefersReducedMotion = useReducedMotion();

  const handlePull = () => {
    if (freeTokens <= 0 || phase !== "idle") return;
    
    setPhase("charging");
    setReward(null);
    
    const chargeDuration = prefersReducedMotion ? 200 : 800;
    
    setTimeout(() => {
      const randomCard = DEMO_CARDS[Math.floor(Math.random() * DEMO_CARDS.length)];
      setReward(randomCard);
      setPhase("reveal");
      setFreeTokens(prev => prev - 1);
    }, chargeDuration);
  };

  const handleCollect = () => {
    setPhase("idle");
    setReward(null);
  };

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-background to-background -z-10" />
      
      {/* Subtle grid pattern */}
      <div 
        className="absolute inset-0 -z-10 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Header */}
      <div className="text-center mb-8 z-10">
        <h1 className="text-3xl md:text-5xl font-display font-black mb-2">
          <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent">
            DAILY SUMMON
          </span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Step through the Fracture Portal to reveal rare collectibles
        </p>
        
        {/* Token Counter */}
        <div className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 text-yellow-400 px-4 py-2 rounded-full border border-yellow-500/20">
          <Gift className="h-4 w-4" />
          <span className="font-bold">{freeTokens}</span>
          <span className="text-yellow-300/70">Free Pull{freeTokens !== 1 ? 's' : ''} Available</span>
        </div>
      </div>

      {/* Summon Stage */}
      <div className="relative w-full max-w-md aspect-[3/4] flex items-center justify-center mb-8">
        
        {/* Background Portal Ring (always visible) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
          <PortalRing isActive={phase === "charging"} size={350} />
        </div>
        
        <AnimatePresence mode="wait">
          {/* Idle State - Card Back */}
          {phase === "idle" && !reward && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <CardBack 
                onClick={handlePull} 
                disabled={freeTokens <= 0}
              />
            </motion.div>
          )}

          {/* Charging State - Portal Animation */}
          {phase === "charging" && (
            <motion.div
              key="charging"
              className="flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.2 }}
            >
              <PortalCharge duration={prefersReducedMotion ? 200 : 800} />
              
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 0.8, times: [0, 0.3, 1] }}
                >
                  <Zap className="h-8 w-8 text-cyan-400 mx-auto animate-pulse" />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Reveal State - Card Flip */}
          {phase === "reveal" && reward && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <CardReveal card={reward} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <AnimatePresence>
        {phase === "reveal" && reward && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="text-center mb-2">
              <p className="text-sm text-muted-foreground">You obtained</p>
              <p className="text-lg font-bold text-white">{reward.name}</p>
              <RarityBadge rarity={reward.rarity} size="md" />
            </div>
            
            <Button 
              size="lg" 
              onClick={handleCollect}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 border-0"
            >
              Collect & Continue
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No tokens message */}
      {freeTokens <= 0 && phase === "idle" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted-foreground"
        >
          <p className="text-sm">No free pulls remaining today</p>
          <p className="text-xs mt-1">Come back tomorrow for more!</p>
        </motion.div>
      )}

      {/* Pool Info */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-center">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-white/5 rounded">Daily Pool</span>
          <span className="px-2 py-1 bg-white/5 rounded">Featured: Fracture Chronicles</span>
        </div>
      </div>
    </div>
  );
}
