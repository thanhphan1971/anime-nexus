import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown } from "lucide-react";
import { useTopCollectors } from "@/lib/api";

export function TopCollectorsSection() {
  const [, setLocation] = useLocation();
  const { data: topCollectors, isLoading } = useTopCollectors();

  if (isLoading) {
    return null;
  }

  // Only show collectors with >= 10 unique cards
  const qualifiedCollectors = (topCollectors || []).filter(
    (c: any) => Number(c.uniqueCardCount) >= 10
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <h2 className="font-display font-bold text-sm">Top Collectors</h2>
      </div>

      {qualifiedCollectors.length === 0 ? (
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">
              No top collectors yet — be the first to reach 10 unique cards!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-2 space-y-1">
            {qualifiedCollectors.slice(0, 5).map((collector: any) => (
              <div
                key={collector.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => setLocation(`/@${collector.handle?.replace('@', '')}`)}
                data-testid={`top-collector-${collector.id}`}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={collector.avatar} />
                  <AvatarFallback className="text-sm bg-primary/20">{collector.name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{collector.name}</span>
                    {collector.isPremium && (
                      <Crown className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{collector.handle || `@${collector.name?.toLowerCase().replace(/\s+/g, '')}`}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-primary">{collector.uniqueCardCount}</span>
                  <div className="text-[10px] text-muted-foreground">unique cards</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
