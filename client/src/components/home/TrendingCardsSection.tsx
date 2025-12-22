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

  // Dedupe cards by id
  const uniqueCards = Array.from(
    new Map(trendingCards.map((c: any) => [c.id, c])).values()
  ) as any[];

  return (
    <div className="m-0 p-0">
      <div className="flex items-center gap-1 mb-1">
        <TrendingUp className="h-4 w-4 text-orange-400 flex-shrink-0" />
        <span className="font-display font-bold text-sm leading-none">Trending This Week</span>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
        {uniqueCards.slice(0, 8).map((card: any) => (
          <div
            key={card.id}
            className="cursor-pointer hover:opacity-80 transition-opacity m-0 p-0"
            onClick={() => setLocation(`/cards?card=${card.id}`)}
            data-testid={`trending-card-${card.id}`}
          >
            <div className={`rounded overflow-hidden border m-0 p-0 ${rarityColors[card.rarity] || rarityColors.Common}`}>
              <div className="aspect-square bg-black/40 m-0 p-0">
                <img
                  src={card.image}
                  alt=""
                  className="w-full h-full object-cover block m-0 p-0"
                  loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="text-[8px] font-medium text-center truncate px-0.5 py-0.5 bg-black/60 text-white leading-none m-0">{card.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
