import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Star, Gift, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface SClassWelcomeModalProps {
  isOpen: boolean;
  onComplete: () => void;
  accessToken: string;
}

export function SClassWelcomeModal({ isOpen, onComplete, accessToken }: SClassWelcomeModalProps) {
  const [phase, setPhase] = useState<'welcome' | 'rewards' | 'complete'>('welcome');
  const queryClient = useQueryClient();

  const claimWelcomeReward = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sclass/claim-welcome-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to claim welcome reward');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      setPhase('complete');
    },
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="relative w-full max-w-md mx-4 overflow-hidden"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/30 via-yellow-500/10 to-transparent rounded-2xl blur-xl" />
          
          {/* Main Card */}
          <div className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-black border-2 border-yellow-500/50 rounded-2xl p-8 shadow-[0_0_60px_rgba(234,179,8,0.3)]">
            {/* Animated Crown */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-6"
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                >
                  <Crown className="h-20 w-20 text-yellow-400 fill-yellow-400/20" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-yellow-400/20 rounded-full blur-2xl"
                />
              </div>
            </motion.div>

            {phase === 'welcome' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <h1 className="text-3xl font-bold text-yellow-400">
                  Welcome to S-Class
                </h1>
                <p className="text-lg text-white/90 leading-relaxed">
                  Thank you for supporting AniRealm.
                </p>
                <p className="text-white/70">
                  Your membership strengthens the world and unlocks deeper access to events, rewards, and progression.
                </p>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <Button
                    onClick={() => setPhase('rewards')}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-14 text-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                    data-testid="button-view-rewards"
                  >
                    <Gift className="mr-2 h-5 w-5" />
                    View Your Rewards
                  </Button>
                </motion.div>
              </motion.div>
            )}

            {phase === 'rewards' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-2xl font-bold text-yellow-400 text-center">
                  Your S-Class Rewards
                </h2>

                <div className="space-y-4">
                  {/* Bonus Tokens */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4"
                  >
                    <div className="bg-yellow-500/20 p-3 rounded-lg">
                      <Zap className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-bold text-yellow-400 text-lg">+300 Bonus Tokens</p>
                      <p className="text-sm text-white/70">One-time welcome gift</p>
                    </div>
                  </motion.div>

                  {/* S-Class Badge */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4"
                  >
                    <div className="bg-yellow-500/20 p-3 rounded-lg">
                      <Star className="h-6 w-6 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div>
                      <p className="font-bold text-yellow-400 text-lg">Exclusive S-Class Badge</p>
                      <p className="text-sm text-white/70">Permanent profile distinction</p>
                    </div>
                  </motion.div>

                  {/* Instant Access */}
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4"
                  >
                    <div className="bg-yellow-500/20 p-3 rounded-lg">
                      <Sparkles className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-bold text-yellow-400 text-lg">Instant Premium Access</p>
                      <p className="text-sm text-white/70">All S-Class benefits active now</p>
                    </div>
                  </motion.div>
                </div>

                <Button
                  onClick={() => claimWelcomeReward.mutate()}
                  disabled={claimWelcomeReward.isPending}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-14 text-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                  data-testid="button-claim-rewards"
                >
                  {claimWelcomeReward.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                      </motion.div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Claim Rewards
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {phase === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: 3, duration: 0.5 }}
                >
                  <Sparkles className="h-16 w-16 text-yellow-400 mx-auto" />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-yellow-400">
                  Rewards Claimed!
                </h2>
                <p className="text-white/70">
                  Your S-Class journey begins now.
                </p>

                <Button
                  onClick={onComplete}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-14 text-lg shadow-[0_0_30px_rgba(234,179,8,0.4)]"
                  data-testid="button-enter-fracture"
                >
                  Enter the Fracture
                </Button>
              </motion.div>
            )}

            {/* Sparkle Effects */}
            <div className="absolute top-4 left-4">
              <motion.div
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0 }}
              >
                <Star className="h-3 w-3 text-yellow-400/50" />
              </motion.div>
            </div>
            <div className="absolute top-8 right-8">
              <motion.div
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, delay: 0.7 }}
              >
                <Star className="h-2 w-2 text-yellow-400/50" />
              </motion.div>
            </div>
            <div className="absolute bottom-12 left-6">
              <motion.div
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2, delay: 1.4 }}
              >
                <Star className="h-2 w-2 text-yellow-400/50" />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
