import { motion, useReducedMotion } from "framer-motion";
import { RarityFrame, RarityBadge, type Rarity } from "./RarityFrame";

interface CardData {
  id: string | number;
  name: string;
  character?: string;
  anime?: string;
  image: string;
  rarity: Rarity;
  power?: number;
  element?: string;
}

interface CardRevealProps {
  card: CardData;
  onComplete?: () => void;
}

export function CardReveal({ card, onComplete }: CardRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const flipDuration = prefersReducedMotion ? 0.1 : 0.4;
  const glowDelay = prefersReducedMotion ? 0 : 0.3;
  
  return (
    <motion.div
      className="relative perspective-1000"
      initial={{ rotateY: 180, scale: 0.8, opacity: 0 }}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }}
      transition={{ 
        duration: flipDuration, 
        ease: "easeOut",
        scale: { type: "spring", damping: 15, stiffness: 200 }
      }}
      onAnimationComplete={onComplete}
    >
      <RarityFrame rarity={card.rarity} className="w-72 md:w-80 aspect-[3/4]">
        <img 
          src={card.image} 
          alt={card.name} 
          className="w-full h-full object-cover"
        />
        
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4">
          <div className="flex justify-between items-center mb-1">
            <RarityBadge rarity={card.rarity} size="md" />
            {card.element && (
              <span className="text-xs font-mono uppercase text-muted-foreground">
                {card.element}
              </span>
            )}
          </div>
          <h2 className="text-xl font-display font-bold text-white">{card.name}</h2>
          {card.character && (
            <p className="text-sm text-muted-foreground">{card.character}</p>
          )}
          {card.power && (
            <p className="text-xs font-mono text-cyan-400 mt-1">{card.power} PWR</p>
          )}
        </div>
      </RarityFrame>
      
      {!prefersReducedMotion && (
        <motion.div
          className="absolute -inset-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.6, delay: glowDelay }}
        >
          <SparklesBurst rarity={card.rarity} />
        </motion.div>
      )}
    </motion.div>
  );
}

function SparklesBurst({ rarity }: { rarity: Rarity }) {
  const color = rarity === "Mythic" ? "#f87171" 
    : rarity === "Legendary" ? "#facc15"
    : rarity === "Epic" ? "#a855f7"
    : rarity === "Rare" ? "#3b82f6"
    : "#9ca3af";
  
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {[...Array(8)].map((_, i) => {
        const angle = (i * 45) * Math.PI / 180;
        const x1 = 50;
        const y1 = 50;
        const x2 = 50 + Math.cos(angle) * 45;
        const y2 = 50 + Math.sin(angle) * 45;
        
        return (
          <motion.line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0], 
              opacity: [0, 1, 0],
            }}
            transition={{ 
              duration: 0.5, 
              delay: i * 0.03,
              ease: "easeOut"
            }}
          />
        );
      })}
    </svg>
  );
}

interface CardBackProps {
  onClick?: () => void;
  disabled?: boolean;
}

export function CardBack({ onClick, disabled }: CardBackProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.div
      className={`
        w-64 h-80 rounded-xl cursor-pointer
        bg-gradient-to-br from-purple-900/50 via-gray-900 to-cyan-900/50
        border-2 border-white/10 
        flex items-center justify-center
        transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-400/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.3)]'}
      `}
      whileHover={!disabled && !prefersReducedMotion ? { scale: 1.02 } : {}}
      whileTap={!disabled && !prefersReducedMotion ? { scale: 0.98 } : {}}
      onClick={disabled ? undefined : onClick}
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-purple-400/30 flex items-center justify-center">
          <motion.div
            className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500"
            animate={!prefersReducedMotion ? { 
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <p className="font-display font-bold text-lg text-white/80">TAP TO SUMMON</p>
        <p className="text-xs text-muted-foreground mt-1">Reveal your card</p>
      </div>
      
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
        viewBox="0 0 100 100"
      >
        <pattern id="fracture" patternUnits="userSpaceOnUse" width="20" height="20">
          <path d="M0 10 L10 0 L20 10 L10 20 Z" fill="none" stroke="currentColor" strokeWidth="0.5"/>
        </pattern>
        <rect width="100" height="100" fill="url(#fracture)" />
      </svg>
    </motion.div>
  );
}
