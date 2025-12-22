import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useTrendingCards } from "@/lib/api";

const rarityColors: Record<string, string> = {
  Common: "border-gray-500/50 bg-gray-500/10",
  Rare: "border-blue-500/50 bg-blue-500/10",
  Epic: "border-purple-500/50 bg-purple-500/10",
  Legendary: "border-yellow-500/50 bg-yellow-500/10",
  Mythic: "border-pink-500/50 bg-pink-500/10",
};

export function TrendingCardsSection() {
  const [, setLocation] = useLocation();
  const { data: trendingCards, isLoading } = useTrendingCards();

  if (isLoading || !trendingCards || trendingCards.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-orange-400" />
        <h2 className="font-display font-bold text-lg">Trending This Week</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {trendingCards.slice(0, 8).map((card: any) => (
          <div
            key={card.id}
            className={`flex-shrink-0 w-24 cursor-pointer transition-transform hover:scale-105`}
            onClick={() => setLocation(`/cards?card=${card.id}`)}
            data-testid={`trending-card-${card.id}`}
          >
            <Card className={`overflow-hidden ${rarityColors[card.rarity] || rarityColors.Common}`}>
              <CardContent className="p-0">
                <div className="aspect-[3/4] relative">
                  <img
                    src={card.image}
                    alt={card.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[10px] font-medium text-white truncate">{card.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
