import { motion, type Variants } from "framer-motion";

export const CRYSTAL_SIGIL_URL =
  "https://qxbvfdbetukguyvivwsf.supabase.co/storage/v1/object/public/media/ui/mediauisigilscrystal-sigil.png.png";

type CrystalState = "dormant" | "active" | "charged";

interface CrystalSigilProps {
  size?: number;
  state?: CrystalState;
  onClick?: () => void;
  className?: string;
}

export function CrystalSigil({ 
  size = 64, 
  state = "dormant", 
  onClick,
  className = ""
}: CrystalSigilProps) {
  const getStateStyles = () => {
    switch (state) {
      case "dormant":
        return {
          opacity: 0.7,
          filter: "brightness(0.85) saturate(0.8)",
        };
      case "active":
        return {
          opacity: 1,
          filter: "brightness(1.05) saturate(1.1) drop-shadow(0 0 6px rgba(139, 92, 246, 0.7)) drop-shadow(0 0 12px rgba(139, 92, 246, 0.4))",
        };
      case "charged":
        return {
          opacity: 1,
          filter: "brightness(1.15) saturate(1.2) drop-shadow(0 0 8px rgba(139, 92, 246, 1)) drop-shadow(0 0 20px rgba(6, 182, 212, 0.8)) drop-shadow(0 0 35px rgba(139, 92, 246, 0.5))",
        };
      default:
        return {};
    }
  };

  const pulseVariants: Variants = {
    dormant: {
      scale: 1,
      transition: { duration: 0 }
    },
    active: {
      scale: [1, 1.03, 1],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    charged: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  const glowVariants: Variants = {
    dormant: {
      opacity: 0,
    },
    active: {
      opacity: [0.4, 0.7, 0.4],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    charged: {
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    }
  };

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.08 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      data-testid="crystal-sigil"
    >
      {(state === "active" || state === "charged") && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 1.5,
            height: size * 1.5,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: state === "charged" 
              ? "radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, rgba(6, 182, 212, 0.3) 40%, transparent 70%)"
              : "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(139, 92, 246, 0.1) 50%, transparent 70%)",
          }}
          variants={glowVariants}
          animate={state}
        />
      )}
      
      <motion.img
        src={CRYSTAL_SIGIL_URL}
        alt="Crystal Sigil"
        style={{
          width: size,
          height: size,
          objectFit: "contain",
          ...getStateStyles(),
        }}
        variants={pulseVariants}
        animate={state}
        draggable={false}
      />
    </motion.div>
  );
}
