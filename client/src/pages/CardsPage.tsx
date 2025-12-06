import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Coins, Sparkles, Layers, ShoppingBag, ArrowRightLeft, Filter, Search, ShieldCheck, Gift, Star, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Mock Data & Assets
import card1 from "@assets/generated_images/legendary_anime_dragon_card.png";
import card2 from "@assets/generated_images/cyberpunk_assassin_card.png";
import card3 from "@assets/generated_images/magical_girl_ultimate_form_card.png";

const MY_CARDS = [
  { id: 1, name: "Bahamut Zero", rarity: "UR", image: card1, type: "Dragon", series: "Legends" },
  { id: 2, name: "Neon Assassin", rarity: "SSR", image: card2, type: "Cyber", series: "Neon City" },
  { id: 3, name: "Starlight Goddess", rarity: "UR", image: card3, type: "Magic", series: "Cosmic" },
  { id: 4, name: "Basic Slime", rarity: "N", image: "https://picsum.photos/seed/slime/300/400", type: "Monster", series: "Starter" },
  { id: 5, name: "Village Guard", rarity: "R", image: "https://picsum.photos/seed/guard/300/400", type: "Human", series: "Starter" },
];

const MARKET_LISTINGS = [
  { id: 101, seller: "CyberRogue", card: { name: "Neon Assassin", rarity: "SSR", image: card2, type: "Cyber" }, price: "500", type: "sale" },
  { id: 102, seller: "MechaAce", card: { name: "Starlight Goddess", rarity: "UR", image: card3, type: "Magic" }, request: "Looking for Dragons", type: "trade" },
];

export default function CardsPage() {
  const [tokens] = useState(120);
  const [pullsLeft] = useState(1);
  const [isPulling, setIsPulling] = useState(false);
  const [reward, setReward] = useState<any>(null);

  const handleSummon = () => {
    setIsPulling(true);
    setTimeout(() => {
      setReward(MY_CARDS[0]); // Mock reward
      setIsPulling(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 p-4 rounded-xl border border-white/10 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-display font-bold neon-text">CARDS HUB</h1>
          <p className="text-xs text-muted-foreground">Collect, Trade, and Battle</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-bold text-sm">
            <Coins className="h-4 w-4" /> {tokens}
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-sm">
            <Sparkles className="h-4 w-4" /> {pullsLeft}/5 Daily
          </div>
        </div>
      </div>

      {/* S-Class Banner */}
      <div className="bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-transparent p-3 rounded-lg border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-yellow-400" />
          <p className="text-sm font-medium"><span className="text-yellow-400 font-bold">Upgrade to S-Class</span> for 5 pulls/day + Luck Boost.</p>
        </div>
        <Button size="sm" variant="secondary" className="h-7 text-xs">View Perks</Button>
      </div>

      <Tabs defaultValue="summon" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 mb-6 grid grid-cols-4">
          <TabsTrigger value="summon"><Sparkles className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Summon</span></TabsTrigger>
          <TabsTrigger value="collection"><Layers className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Collection</span></TabsTrigger>
          <TabsTrigger value="market"><ShoppingBag className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Market</span></TabsTrigger>
          <TabsTrigger value="offers"><ArrowRightLeft className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Offers</span></TabsTrigger>
        </TabsList>

        {/* SUMMON TAB */}
        <TabsContent value="summon" className="min-h-[500px] flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {!reward && !isPulling && (
              <div className="text-center space-y-6">
                <div className="relative w-64 h-80 mx-auto bg-card border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group" onClick={handleSummon}>
                  <div className="text-center">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground group-hover:text-primary animate-pulse" />
                    <p className="font-display font-bold text-xl">SUMMON NOW</p>
                    <p className="text-xs text-muted-foreground mt-2">Standard Drop Rates Apply</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Use your daily token to manifest a digital spirit from the AniRealm.
                </p>
              </div>
            )}

            {isPulling && (
              <motion.div
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1.5, rotate: 360 }}
                exit={{ scale: 2, opacity: 0 }}
                className="flex items-center justify-center"
              >
                <div className="w-40 h-40 rounded-full border-4 border-primary border-t-transparent animate-spin blur-sm" />
              </motion.div>
            )}

            {reward && (
              <motion.div
                initial={{ scale: 0, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <div className="relative w-72 aspect-[3/4] mx-auto rounded-xl overflow-hidden border-4 border-yellow-500 shadow-[0_0_50px_hsl(45,100%,50%,0.5)]">
                  <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/80 p-4 text-white">
                     <Badge className="bg-yellow-500 text-black mb-2">{reward.rarity}</Badge>
                     <h2 className="text-xl font-bold">{reward.name}</h2>
                  </div>
                </div>
                <Button size="lg" onClick={() => setReward(null)} className="w-full max-w-xs">
                  Add to Collection
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* COLLECTION TAB */}
        <TabsContent value="collection" className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["All", "UR", "SSR", "SR", "R", "N"].map(filter => (
              <Badge key={filter} variant="outline" className="cursor-pointer hover:bg-primary hover:text-white">
                {filter}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {MY_CARDS.map(card => (
              <Card key={card.id} className="bg-card/40 border-white/10 overflow-hidden hover:border-primary/50 transition-all group cursor-pointer">
                <div className="relative aspect-[3/4]">
                  <img src={card.image} className="w-full h-full object-cover" />
                  <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border-white/10">{card.rarity}</Badge>
                </div>
                <CardFooter className="p-2 text-xs font-bold justify-center">
                  {card.name}
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* MARKET TAB */}
        <TabsContent value="market" className="space-y-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search market..." className="pl-9 bg-card/40" />
            </div>
            <Button variant="outline"><Filter className="h-4 w-4" /></Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MARKET_LISTINGS.map(listing => (
              <Card key={listing.id} className="flex overflow-hidden bg-card/40 border-white/10">
                <div className="w-24 relative">
                  <img src={listing.card.image} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm">{listing.card.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3 text-green-400" /> {listing.seller}
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <Badge variant="secondary" className="text-xs">
                      {listing.type === 'sale' ? `${listing.price} Tokens` : listing.request}
                    </Badge>
                    <Button size="sm" className="h-7 text-xs">
                      {listing.type === 'sale' ? 'Buy' : 'Trade'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* OFFERS TAB */}
        <TabsContent value="offers">
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-card/20">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Active Offers</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              You don't have any incoming trade requests or active offers right now.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
