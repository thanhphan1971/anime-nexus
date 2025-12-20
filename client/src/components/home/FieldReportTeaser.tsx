import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Radio, Sparkles, ChevronRight } from "lucide-react";
import { fieldReport, getDailyTeaser, worldLoreModal } from "@/content/homeCopy";

export function FieldReportTeaser() {
  const [showLoreModal, setShowLoreModal] = useState(false);
  const dailyTeaser = getDailyTeaser();

  return (
    <>
      <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-cyan-950/40 via-slate-950/60 to-purple-950/40 rounded-lg border border-cyan-500/20">
        <div className="flex items-center gap-1.5 shrink-0">
          <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
            {fieldReport.label}
          </span>
        </div>
        <p className="flex-1 text-xs text-white/70 italic line-clamp-1">
          "{dailyTeaser}"
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-6 px-2 shrink-0"
          onClick={() => setShowLoreModal(true)}
          data-testid="button-read-more-lore"
        >
          Read more
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </Button>
      </div>

      <Dialog open={showLoreModal} onOpenChange={setShowLoreModal}>
        <DialogContent className="max-w-sm bg-gradient-to-b from-slate-900 to-black border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-xl text-cyan-400 flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Welcome to AniRealm
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {worldLoreModal.bullets.map((bullet, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" />
                <span className="text-sm">{bullet}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() => setShowLoreModal(false)}
            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500"
            data-testid="button-close-field-report-modal"
          >
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
