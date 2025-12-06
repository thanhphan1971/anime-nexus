import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRightLeft, Coins, Filter, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";

// Reuse assets/placeholders
import card1 from "@assets/generated_images/legendary_anime_dragon_card.png";
import card2 from "@assets/generated_images/cyberpunk_assassin_card.png";
import card3 from "@assets/generated_images/magical_girl_ultimate_form_card.png";

const MARKET_LISTINGS = [
  { 
    id: 101, 
    seller: "CyberRogue", 
    card: { name: "Neon Assassin", rarity: "SSR", image: card2, type: "Cyber" }, 
    price: "500 Tokens", 
    type: "sale",
    status: "active"
  },
  { 
    id: 102, 
    seller: "MechaAce", 
    card: { name: "Starlight Goddess", rarity: "UR", image: card3, type: "Magic" }, 
    request: "Looking for Dragons", 
    type: "trade",
    status: "active"
  },
  { 
    id: 103, 
    seller: "NeoKai", 
    card: { name: "Bahamut Zero", rarity: "UR", image: card1, type: "Dragon" }, 
    price: "2500 Tokens", 
    type: "sale",
    status: "active"
  },
];

export default function MarketplacePage() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold neon-text mb-2">CARD MARKETPLACE</h1>
          <p className="text-muted-foreground">Trade your duplicates or spend tokens to complete your deck.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto bg-card/50 p-1 rounded-lg border border-white/10">
           <div className="flex items-center px-3 gap-2 text-yellow-400 font-bold border-r border-white/10">
             <Coins className="h-4 w-4" /> 1,250
           </div>
           <Button variant="ghost" size="sm" className="h-8">Add Funds</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search cards, sellers, or tags..." className="pl-9 bg-card/40 border-white/10" />
        </div>
        <Button variant="outline" className="border-white/10">
          <Filter className="h-4 w-4 mr-2" /> Filter
        </Button>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="w-full bg-card/50 border border-white/10 p-1 mb-6">
          <TabsTrigger value="browse" className="flex-1">Browse Listings</TabsTrigger>
          <TabsTrigger value="my-listings" className="flex-1">My Listings</TabsTrigger>
          <TabsTrigger value="offers" className="flex-1">Incoming Offers (2)</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MARKET_LISTINGS.map((listing) => (
              <Card key={listing.id} className="bg-card/40 border-white/10 overflow-hidden group hover:border-primary/50 transition-all">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img src={listing.card.image} alt={listing.card.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-2 right-2">
                    <Badge className={`
                      ${listing.card.rarity === 'UR' ? 'bg-yellow-500 text-black' : 'bg-purple-500 text-white'}
                      font-bold shadow-lg
                    `}>
                      {listing.card.rarity}
                    </Badge>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                    <h3 className="font-display font-bold text-lg text-white">{listing.card.name}</h3>
                    <p className="text-xs text-white/70 font-mono uppercase">{listing.card.type}</p>
                  </div>
                </div>
                
                <CardContent className="p-4 bg-black/20">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4 text-green-400" />
                      Seller: <span className="text-foreground font-bold hover:underline cursor-pointer">{listing.seller}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    {listing.type === 'sale' ? (
                      <span className="text-yellow-400 font-bold flex items-center gap-2">
                        <Coins className="h-4 w-4" /> {listing.price}
                      </span>
                    ) : (
                      <span className="text-blue-400 font-bold flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" /> {listing.request}
                      </span>
                    )}
                  </div>
                </CardContent>
                
                <CardFooter className="p-4 pt-0">
                  <Button className="w-full bg-primary hover:bg-primary/90 font-bold">
                    {listing.type === 'sale' ? 'Buy Now' : 'Make Offer'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="offers">
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-card/20">
            <ArrowRightLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Trade Requests</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You have 2 pending trade offers for your "Bahamut Zero".
            </p>
            <Button className="mt-4">View Details</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
