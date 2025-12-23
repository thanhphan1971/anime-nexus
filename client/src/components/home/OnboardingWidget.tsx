import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Gift, Share2, X, ChevronRight } from "lucide-react";
import { useOnboardingStatus, useDismissOnboarding } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";

interface OnboardingStep {
  id: string;
  label: string;
  completed: boolean;
  optional?: boolean;
  action?: () => void;
  icon: React.ReactNode;
}

export function OnboardingWidget() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: status, isLoading } = useOnboardingStatus();
  const dismissMutation = useDismissOnboarding();
  const [locallyDismissed, setLocallyDismissed] = useState(false);

  if (!user || isLoading) return null;
  
  if (!status) return null;

  // If server says completed (dismissed), don't show anything
  if (status.completed) return null;
  
  // Local dismissal for immediate UI feedback while mutation runs
  if (locallyDismissed) return null;

  // Check if required steps are complete (step 1 + 2)
  const stepsComplete = status.steps.claimFreeSummon && status.steps.earnFirstBadge;

  const steps: OnboardingStep[] = [
    {
      id: "summon",
      label: "Claim your free summon",
      completed: status.steps.claimFreeSummon,
      icon: <Gift className="h-4 w-4" />,
      action: () => setLocation("/cards"),
    },
    {
      id: "badge",
      label: "Earn your first badge",
      completed: status.steps.earnFirstBadge,
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: "share",
      label: "Share your first pull",
      completed: status.steps.shareFirstPull,
      optional: true,
      icon: <Share2 className="h-4 w-4" />,
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const requiredSteps = steps.filter(s => !s.optional);
  const requiredCompleted = requiredSteps.filter(s => s.completed).length;

  const handleDismiss = () => {
    setLocallyDismissed(true);
    dismissMutation.mutate();
  };

  // Show completion banner if steps are complete but not yet dismissed
  if (stepsComplete) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-4 border-green-500/30 bg-gradient-to-r from-green-950/30 to-emerald-950/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-green-400" />
                  </div>
                  <span className="text-sm text-green-400 font-medium">
                    Onboarding complete ✓ Welcome to the realm.
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-white"
                  data-testid="button-dismiss-onboarding"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="mb-4 border-purple-500/30 bg-gradient-to-br from-purple-950/40 via-slate-950/80 to-indigo-950/40 overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 blur-3xl rounded-full" />
        <CardContent className="p-4 relative z-10">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Welcome to Aurelith
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Complete your first steps to enter the realm.
            </p>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  step.completed 
                    ? "bg-green-500/10" 
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  step.completed 
                    ? "bg-green-500/20 text-green-400" 
                    : "bg-purple-500/20 text-purple-400"
                }`}>
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                
                <div className="flex-1 flex items-center gap-2">
                  {step.icon}
                  <span className={`text-sm ${
                    step.completed ? "text-green-400 line-through opacity-70" : "text-white"
                  }`}>
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded-full">
                      optional
                    </span>
                  )}
                </div>

                {!step.completed && step.action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={step.action}
                    className="h-7 px-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                    data-testid={`button-onboarding-${step.id}`}
                  >
                    Go <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{requiredCompleted}/{requiredSteps.length} required steps completed</span>
              <div className="flex gap-1">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`h-1.5 w-4 rounded-full ${
                      step.completed ? "bg-green-500" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
