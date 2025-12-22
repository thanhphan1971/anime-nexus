import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Crown } from "lucide-react";
import { useTopCollectors } from "@/lib/api";

export function TopCollectorsSection() {
  const [, setLocation] = useLocation();
  const { data: topCollectors, isLoading } = useTopCollectors();

  if (isLoading || !topCollectors || topCollectors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-400" />
        <h2 className="font-display font-bold text-lg">Top Collectors This Week</h2>
      </div>

      <Card className="bg-card/50 border-white/10">
        <CardContent className="p-3 space-y-2">
          {topCollectors.slice(0, 5).map((collector: any) => (
            <div
              key={collector.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              onClick={() => setLocation(`/@${collector.handle?.replace('@', '')}`)}
              data-testid={`top-collector-${collector.id}`}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={collector.avatar} />
                <AvatarFallback>{collector.name?.[0] || '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">{collector.name}</span>
                  {collector.isPremium && (
                    <Crown className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{collector.handle}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-primary">{collector.uniqueCardCount}</span>
                <p className="text-[10px] text-muted-foreground">unique cards</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
