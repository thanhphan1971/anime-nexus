import { motion, useReducedMotion } from "framer-motion";

interface PortalRingProps {
  isActive?: boolean;
  size?: number;
  className?: string;
}

export function PortalRing({ isActive = false, size = 200, className = "" }: PortalRingProps) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        style={{ filter: isActive ? 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.6))' : 'none' }}
      >
        <defs>
          <linearGradient id="portalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="portalGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EC4899" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        
        <motion.circle
          cx="100"
          cy="100"
          r="90"
          fill="none"
          stroke="url(#portalGradient)"
          strokeWidth="2"
          strokeDasharray="20 10"
          animate={isActive && !prefersReducedMotion ? { rotate: 360 } : {}}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "center" }}
        />
        
        <motion.circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#portalGradient2)"
          strokeWidth="1.5"
          strokeDasharray="15 8"
          animate={isActive && !prefersReducedMotion ? { rotate: -360 } : {}}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "center" }}
        />
        
        <motion.circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="url(#portalGradient)"
          strokeWidth="1"
          opacity={0.5}
          animate={isActive && !prefersReducedMotion ? { rotate: 360 } : {}}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "center" }}
        />
        
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <motion.circle
            key={i}
            cx={100 + 85 * Math.cos((angle * Math.PI) / 180)}
            cy={100 + 85 * Math.sin((angle * Math.PI) / 180)}
            r="3"
            fill={i % 2 === 0 ? "#8B5CF6" : "#06B6D4"}
            animate={isActive && !prefersReducedMotion ? { 
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8]
            } : {}}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </svg>
      
      {isActive && (
        <motion.div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          }}
          animate={!prefersReducedMotion ? { 
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5]
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

export function PortalCharge({ onComplete, duration = 800 }: { onComplete?: () => void; duration?: number }) {
  const prefersReducedMotion = useReducedMotion();
  
  return (
    <motion.div 
      className="relative"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1.2, opacity: 1 }}
      transition={{ duration: duration / 1000, ease: "easeOut" }}
      onAnimationComplete={onComplete}
    >
      <PortalRing isActive size={250} />
      
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: duration / 1000, times: [0, 0.5, 1] }}
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-cyan-400 to-pink-500 blur-xl" />
        </motion.div>
      )}
    </motion.div>
  );
}
