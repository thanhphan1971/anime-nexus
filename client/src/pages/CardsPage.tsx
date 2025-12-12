import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Coins, Sparkles, Layers, ShoppingBag, ArrowRightLeft, Filter, Search, ShieldCheck, Gift, Star, Crown, Loader2, Book } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useUserCards, useSummonCards, useMarketListings, usePurchaseListing } from "@/lib/api";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CardsPage() {
  const { user, refreshUser } = useAuth();
  const { data: userCards, isLoading: cardsLoading } = useUserCards(user?.id);
  const { data: marketListings, isLoading: marketLoading } = useMarketListings();
  const summonCards = useSummonCards();
  const purchaseListing = usePurchaseListing();
  const [, setLocation] = useLocation();
  const [reward, setReward] = useState<any>(null);

  const handleSummon = async () => {
    if (!user || user.tokens < 100) {
      toast.error("Insufficient tokens! Need 100 tokens to summon.");
      return;
    }

    try {
      const result = await summonCards.mutateAsync();
      setReward(result.cards);
      await refreshUser();
      toast.success(`Summoned ${result.cards.length} card(s)!`);
    } catch (error: any) {
      toast.error(error.message || "Summon failed");
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/30 p-4 rounded-xl border border-white/10 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-display font-bold neon-text">CARDS HUB</h1>
          <p className="text-xs text-muted-foreground">Summon rare anime cards, build your collection, and trade with others</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button 
            size="lg" 
            onClick={() => setLocation("/cards/catalog")} 
            data-testid="button-view-catalog"
            className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all hover:scale-105 animate-pulse"
          >
            <Book className="h-5 w-5 mr-2" /> View Catalog
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-bold text-sm" data-testid="text-tokens">
            <Coins className="h-4 w-4" /> {user?.tokens || 0}
          </div>
          {user?.isPremium && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-bold text-sm">
              <Crown className="h-4 w-4" /> S-Class
            </div>
          )}
        </div>
      </div>

      {/* S-Class Banner */}
      {!user?.isPremium && (
        <div className="bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-transparent p-3 rounded-lg border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-yellow-400" />
            <p className="text-sm font-medium"><span className="text-yellow-400 font-bold">Upgrade to S-Class</span> for 2x pulls + Luck Boost.</p>
          </div>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setLocation("/sclass")}>View Perks</Button>
        </div>
      )}

      <Tabs defaultValue="summon" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 mb-6 grid grid-cols-4">
          <TabsTrigger value="summon"><Sparkles className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Summon</span></TabsTrigger>
          <TabsTrigger value="collection"><Layers className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Collection</span></TabsTrigger>
          <TabsTrigger value="market"><ShoppingBag className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Market</span></TabsTrigger>
          <TabsTrigger value="offers"><ArrowRightLeft className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Offers</span></TabsTrigger>
        </TabsList>

        {/* SUMMON TAB */}
        <TabsContent value="summon" className="space-y-6">
          {/* Rules & Info Section */}
          {!reward && !summonCards.isPending && (
            <div className="bg-gradient-to-r from-purple-500/10 via-primary/10 to-cyan-500/10 border border-white/10 rounded-xl p-4 mb-4">
              <h3 className="font-display font-bold text-lg text-primary mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> How Summoning Works
              </h3>
              <div className="text-sm space-y-3">
                <p className="text-muted-foreground">
                  Spend <strong className="text-yellow-400">100 Tokens</strong> to summon a random anime card. 
                  The system will randomly select a card from one of the 5 rarity categories below. 
                  Higher rarities are harder to get but more valuable!
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="font-bold text-white">What You Win:</p>
                    <p className="text-muted-foreground"><strong className="text-white">Free Users:</strong> 1 random card per summon</p>
                    <p className="text-muted-foreground"><strong className="text-yellow-400">S-Class Members:</strong> 2 random cards + higher luck for rare drops</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-bold text-white">Card Rarities:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs border-gray-500 text-gray-400">Common</Badge>
                      <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">Rare</Badge>
                      <Badge variant="outline" className="text-xs border-purple-500 text-purple-400">Epic</Badge>
                      <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-400">Legendary</Badge>
                      <Badge variant="outline" className="text-xs border-pink-500 text-pink-400">Mythic</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-muted-foreground">
                <strong className="text-white">What can you do with cards?</strong> Collect them, trade with other players in the Market, or sell for tokens. Rare cards are worth more!
              </div>
            </div>
          )}

          <div className="min-h-[400px] flex flex-col items-center justify-center relative">
          <AnimatePresence mode="wait">
            {!reward && !summonCards.isPending && (
              <div className="text-center space-y-6">
                <div className="relative w-64 h-80 mx-auto bg-card border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group" onClick={handleSummon} data-testid="button-summon">
                  <div className="text-center">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground group-hover:text-primary animate-pulse" />
                    <p className="font-display font-bold text-xl">SUMMON NOW</p>
                    <p className="text-xs text-muted-foreground mt-2">Cost: 100 Tokens</p>
                    <p className="text-xs text-muted-foreground">{user?.isPremium ? "2x S-Class Pull" : "Single Pull"}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Tap the card to spend tokens and summon a random anime card!
                </p>
              </div>
            )}

            {summonCards.isPending && (
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
          </div>
        </TabsContent>

        {/* COLLECTION TAB */}
        <TabsContent value="collection" className="space-y-6">
          <div className="text-center pb-4 border-b border-white/10 mb-4">
            <p className="text-sm text-muted-foreground">View all the anime cards you've collected through summoning and trading</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {["All", "UR", "SSR", "SR", "R", "N"].map(filter => (
              <Badge key={filter} variant="outline" className="cursor-pointer hover:bg-primary hover:text-white">
                {filter}
              </Badge>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cardsLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userCards && userCards.length > 0 ? (
              userCards.map((userCard: any) => (
                <Card key={userCard.id} className="bg-card/40 border-white/10 overflow-hidden hover:border-primary/50 transition-all group cursor-pointer">
                  <div className="relative aspect-[3/4]">
                    <img src={userCard.card.image} className="w-full h-full object-cover" />
                    <Badge className="absolute top-2 right-2 bg-black/60 backdrop-blur-md border-white/10">{userCard.card.rarity}</Badge>
                  </div>
                  <CardFooter className="p-2 text-xs font-bold justify-center">
                    {userCard.card.name}
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cards yet. Try summoning some!</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* MARKET TAB */}
        <TabsContent value="market" className="space-y-6">
          <div className="text-center pb-4 border-b border-white/10 mb-4">
            <p className="text-sm text-muted-foreground">Buy and sell cards with other players using your tokens</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search market..." className="pl-9 bg-card/40" />
            </div>
            <Button variant="outline"><Filter className="h-4 w-4" /></Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {marketLoading ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : marketListings && marketListings.length > 0 ? (
              marketListings.map((listing: any) => (
                <Card key={listing.id} className="flex overflow-hidden bg-card/40 border-white/10">
                  <div className="w-24 relative">
                    <img src={listing.card?.image} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-sm">{listing.card?.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-green-400" /> {listing.seller?.name || 'Unknown'}
                      </div>
                    </div>
                    <div className="flex justify-between items-end">
                      <Badge variant="secondary" className="text-xs">
                        {listing.price} Tokens
                      </Badge>
                      <Button 
                        size="sm" 
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            await purchaseListing.mutateAsync(listing.id);
                            toast.success("Card purchased!");
                            await refreshUser();
                          } catch (error: any) {
                            toast.error(error.message || "Purchase failed");
                          }
                        }}
                        disabled={purchaseListing.isPending}
                      >
                        Buy
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No listings yet. Be the first to sell!</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* OFFERS TAB */}
        <TabsContent value="offers">
          <div className="text-center pb-4 border-b border-white/10 mb-4">
            <p className="text-sm text-muted-foreground">View and manage trade offers from other players</p>
          </div>
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
