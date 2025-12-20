import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, ChevronRight } from "lucide-react";
import { worldHook, worldLoreModal } from "@/content/homeCopy";

export function WorldHookSection() {
  const [showLoreModal, setShowLoreModal] = useState(false);

  return (
    <>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-display font-bold text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text">
          {worldHook.title}
        </h2>
        <p className="text-sm text-white/80 max-w-md mx-auto">
          {worldHook.subtitle}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <p className="text-xs text-muted-foreground">
            {worldHook.microline}
          </p>
          <Button
            variant="link"
            size="sm"
            className="text-xs text-cyan-400 hover:text-cyan-300 p-0 h-auto"
            onClick={() => setShowLoreModal(true)}
            data-testid="button-learn-world"
          >
            Learn the World
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
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
            data-testid="button-close-lore-modal"
          >
            Got it!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
