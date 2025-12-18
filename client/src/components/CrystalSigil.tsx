import { motion, type Variants } from "framer-motion";

export const CRYSTAL_SIGIL_URL =
  "https://qxbvfdbetukguyvivwsf.supabase.co/storage/v1/object/public/media/ui/mediauisigilscrystal-sigil.png";

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
          opacity: 0.5,
          filter: "brightness(0.7)",
          animation: "none",
        };
      case "active":
        return {
          opacity: 0.85,
          filter: "brightness(1) drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))",
        };
      case "charged":
        return {
          opacity: 1,
          filter: "brightness(1.1) drop-shadow(0 0 15px rgba(139, 92, 246, 0.8)) drop-shadow(0 0 30px rgba(6, 182, 212, 0.5))",
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
      opacity: [0.3, 0.5, 0.3],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut" as const
      }
    },
    charged: {
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 1.5,
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
          className="absolute inset-0 rounded-full"
          style={{
            background: state === "charged" 
              ? "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(6, 182, 212, 0.2) 50%, transparent 70%)"
              : "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 60%)",
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
