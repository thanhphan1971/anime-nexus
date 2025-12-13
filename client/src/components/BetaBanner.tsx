import { AlertTriangle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const bannerDismissed = localStorage.getItem('beta-banner-dismissed');
    if (bannerDismissed) {
      setDismissed(true);
    }
    
    const lastResetAck = localStorage.getItem('last-reset-acknowledged');
    const currentResetId = localStorage.getItem('current-reset-id') || '1';
    
    if (lastResetAck !== currentResetId) {
      setShowWelcome(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('beta-banner-dismissed', 'true');
  };

  const handleWelcomeClose = () => {
    const currentResetId = localStorage.getItem('current-reset-id') || '1';
    localStorage.setItem('last-reset-acknowledged', currentResetId);
    setShowWelcome(false);
  };

  if (dismissed) return null;

  return (
    <>
      <div 
        className="bg-amber-500/20 border border-amber-500/50 text-amber-200 px-4 py-2 flex items-center justify-between gap-3"
        data-testid="beta-banner"
      >
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>Beta:</strong> Content may be reset before official launch. Your account will remain.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-amber-500/30 text-amber-200"
          onClick={handleDismiss}
          data-testid="button-dismiss-beta-banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
            data-testid="welcome-modal"
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to AniRealm Beta!</h2>
              <p className="text-muted-foreground">
                Thank you for joining our beta. As we prepare for official launch, some content may be reset. 
                Don't worry - <strong>your account and profile will be preserved</strong>.
              </p>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-200">
                Posts, stories, and card collections may be reset during beta. Your account, email, and profile settings will remain intact.
              </p>
            </div>

            <Button 
              className="w-full" 
              onClick={handleWelcomeClose}
              data-testid="button-acknowledge-welcome"
            >
              Got it, let's go!
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
