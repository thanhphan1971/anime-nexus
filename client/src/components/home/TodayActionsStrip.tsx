import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Dices, PenLine, ChevronRight } from "lucide-react";
import { todayActions } from "@/content/homeCopy";

const iconMap: Record<string, React.ElementType> = {
  gift: Gift,
  dice: Dices,
  pen: PenLine,
};

export function TodayActionsStrip() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-3">
      <div className="text-center">
        <h3 className="text-sm font-bold text-white">{todayActions.header}</h3>
        <p className="text-xs text-muted-foreground">{todayActions.subheader}</p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {todayActions.actions.map((action, i) => {
          const IconComponent = iconMap[action.icon] || Gift;
          return (
            <Card 
              key={i}
              className="bg-white/5 border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all cursor-pointer group"
              onClick={() => setLocation(action.route)}
              data-testid={`card-action-${action.icon}`}
            >
              <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center group-hover:from-cyan-500/30 group-hover:to-purple-500/30 transition-colors">
                  <IconComponent className="h-5 w-5 text-cyan-400" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white leading-tight">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight hidden sm:block">{action.body}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 px-2 text-[10px] text-cyan-400 hover:bg-cyan-500/20 group-hover:text-cyan-300"
                >
                  {action.ctaLabel}
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
