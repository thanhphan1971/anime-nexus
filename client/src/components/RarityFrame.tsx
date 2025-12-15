import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type Rarity = "Common" | "Rare" | "Epic" | "Legendary" | "Mythic";

const rarityStyles: Record<Rarity, { border: string; glow: string; bg: string; text: string }> = {
  Common: {
    border: "border-gray-400",
    glow: "shadow-[0_0_15px_rgba(156,163,175,0.3)]",
    bg: "from-gray-500/20 to-gray-600/10",
    text: "text-gray-400",
  },
  Rare: {
    border: "border-blue-400",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.4)]",
    bg: "from-blue-500/20 to-blue-600/10",
    text: "text-blue-400",
  },
  Epic: {
    border: "border-purple-400",
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.5)]",
    bg: "from-purple-500/20 to-purple-600/10",
    text: "text-purple-400",
  },
  Legendary: {
    border: "border-yellow-400",
    glow: "shadow-[0_0_30px_rgba(250,204,21,0.5)]",
    bg: "from-yellow-500/20 to-amber-600/10",
    text: "text-yellow-400",
  },
  Mythic: {
    border: "border-red-400",
    glow: "shadow-[0_0_35px_rgba(248,113,113,0.6)]",
    bg: "from-red-500/20 via-orange-500/10 to-pink-600/10",
    text: "text-red-400",
  },
};

interface RarityFrameProps {
  rarity: Rarity;
  children: ReactNode;
  className?: string;
  animated?: boolean;
}

export function RarityFrame({ rarity, children, className = "", animated = true }: RarityFrameProps) {
  const prefersReducedMotion = useReducedMotion();
  const styles = rarityStyles[rarity];
  const shouldAnimate = animated && !prefersReducedMotion;
  
  return (
    <div 
      className={`
        relative rounded-xl border-2 overflow-hidden
        ${styles.border} ${styles.glow}
        bg-gradient-to-br ${styles.bg}
        ${className}
      `}
    >
      {shouldAnimate && (rarity === "Legendary" || rarity === "Mythic") && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: rarity === "Mythic" 
              ? "linear-gradient(45deg, transparent 40%, rgba(248,113,113,0.1) 50%, transparent 60%)"
              : "linear-gradient(45deg, transparent 40%, rgba(250,204,21,0.1) 50%, transparent 60%)",
            backgroundSize: "200% 200%",
          }}
          animate={{ backgroundPosition: ["0% 0%", "200% 200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}
      
      {children}
      
      <div className="absolute top-2 right-2">
        <RarityBadge rarity={rarity} />
      </div>
    </div>
  );
}

interface RarityBadgeProps {
  rarity: Rarity;
  size?: "sm" | "md" | "lg";
}

export function RarityBadge({ rarity, size = "sm" }: RarityBadgeProps) {
  const styles = rarityStyles[rarity];
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };
  
  return (
    <span 
      className={`
        font-bold uppercase tracking-wider rounded
        border ${styles.border} ${styles.text}
        bg-black/50 backdrop-blur-sm
        ${sizeClasses[size]}
      `}
    >
      {rarity}
    </span>
  );
}

export function getRarityColor(rarity: Rarity): string {
  return rarityStyles[rarity].text.replace("text-", "");
}
