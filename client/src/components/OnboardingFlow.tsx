import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const slides = [
  {
    title: "Aurelith",
    text: "Once, the world was whole — held together by a force called the Continuum.",
    gradient: "from-purple-900/60 via-indigo-900/40 to-slate-900/60",
  },
  {
    title: "Balance",
    text: "It regulated time, matter, memory, and life. People believed balance meant survival.",
    gradient: "from-blue-900/60 via-cyan-900/40 to-slate-900/60",
  },
  {
    title: "The Fracture",
    text: "Then the Continuum shattered. Reality split. Cities collapsed. History broke into fragments.",
    gradient: "from-red-900/60 via-orange-900/40 to-slate-900/60",
  },
  {
    title: "The Shards",
    text: "What remained wasn't peace — it was adaptation. Survivors changed… or disappeared.",
    gradient: "from-amber-900/60 via-yellow-900/40 to-slate-900/60",
  },
  {
    title: "Your Arrival",
    text: "Tribes rose from the ruins, each with its own truth. You are here to summon, collect, and uncover what really happened.",
    gradient: "from-emerald-900/60 via-teal-900/40 to-slate-900/60",
    isFinal: true,
  },
];

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const slide = slides[currentSlide];
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === slides.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setDirection(1);
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} transition-all duration-700`} />
      
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(https://qxbvfdbetukguyvivwsf.supabase.co/storage/v1/object/public/media/ui/aurelith_bg_v1.1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(4px)',
        }}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-end p-4">
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="text-white/70 hover:text-white hover:bg-white/10"
            data-testid="button-skip-onboarding"
          >
            Skip
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
              className="text-center max-w-md mx-auto"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="mb-8"
              >
                <Sparkles className="w-12 h-12 mx-auto text-primary mb-4 animate-pulse" />
              </motion.div>
              
              <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-6 tracking-wider">
                {slide.title}
              </h1>
              
              <p className="text-lg md:text-xl text-white/90 leading-relaxed font-light">
                {slide.text}
              </p>

              {slide.isFinal && (
                <p className="mt-8 text-sm text-white/50 italic">
                  Lore fragments unlock as you play.
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 justify-center mb-4">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide 
                  ? "w-8 bg-primary" 
                  : "w-2 bg-white/30"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between items-center px-6 pb-8">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={isFirst}
            className={`text-white hover:bg-white/10 ${isFirst ? 'invisible' : ''}`}
            data-testid="button-back-onboarding"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </Button>

          <Button
            onClick={goNext}
            className={`${
              isLast 
                ? "bg-primary hover:bg-primary/90 text-white px-8" 
                : "bg-white/20 hover:bg-white/30 text-white"
            }`}
            data-testid={isLast ? "button-enter-aurelith" : "button-continue-onboarding"}
          >
            {isLast ? (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Enter Aurelith
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
