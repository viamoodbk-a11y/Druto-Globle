import { useEffect } from "react";
import { Check, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StampSuccessAnimationProps {
  isVisible: boolean;
  currentStamps: number;
  totalStamps: number;
  restaurantName: string;
  onComplete?: () => void;
  pendingLabel?: string;
}

export const StampSuccessAnimation = ({
  isVisible,
  currentStamps,
  totalStamps,
  restaurantName,
  onComplete,
  pendingLabel,
}: StampSuccessAnimationProps) => {
  useEffect(() => {
    if (isVisible) {
      const completeTimer = setTimeout(() => onComplete?.(), 3500);
      return () => clearTimeout(completeTimer);
    }
  }, [isVisible, onComplete]);

  const stampsRemaining = totalStamps - currentStamps;

  // Particle positions for burst effect
  const particles = [...Array(16)].map((_, i) => ({
    id: i,
    angle: (i * 360) / 16,
    delay: i * 0.03,
    distance: 100 + Math.random() * 60,
    size: 12 + Math.random() * 8,
    duration: 1.2 + Math.random() * 0.4,
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Burst particles */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {particles.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute"
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  scale: [0, 1.2, 0],
                  opacity: [0, 1, 0],
                  x: Math.cos((particle.angle * Math.PI) / 180) * particle.distance,
                  y: Math.sin((particle.angle * Math.PI) / 180) * particle.distance,
                }}
                transition={{ 
                  duration: particle.duration,
                  delay: 0.3 + particle.delay,
                  ease: "easeOut",
                }}
              >
                {particle.id % 2 === 0 ? (
                  <Sparkles 
                    className="text-primary" 
                    style={{ width: particle.size, height: particle.size }} 
                  />
                ) : (
                  <Star 
                    className="text-accent fill-current" 
                    style={{ width: particle.size, height: particle.size }} 
                  />
                )}
              </motion.div>
            ))}
          </div>

          {/* Floating ambient particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={`float-${i}`}
                className="absolute text-primary/40"
                style={{ left: `${10 + i * 11}%`, top: "100%" }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ 
                  y: -window.innerHeight - 100,
                  opacity: [0, 0.6, 0.6, 0],
                }}
                transition={{ 
                  duration: 2.5 + Math.random(),
                  delay: 0.5 + i * 0.15,
                  ease: "easeOut",
                }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
            ))}
          </div>

          {/* Main content */}
          <div className="relative text-center px-6 z-10">
            {/* Glow ring */}
            <motion.div
              className="absolute left-1/2 top-0 -translate-x-1/2 h-32 w-32 rounded-full bg-primary/20"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.5, 2.5, 3],
                opacity: [0, 0.4, 0],
              }}
              transition={{ 
                duration: 1.2,
                delay: 0.2,
                ease: "easeOut",
              }}
            />

            {/* Secondary glow */}
            <motion.div
              className="absolute left-1/2 top-0 -translate-x-1/2 h-32 w-32 rounded-full bg-primary/30"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [0.8, 1.8, 2.2],
                opacity: [0, 0.5, 0],
              }}
              transition={{ 
                duration: 1,
                delay: 0.35,
                ease: "easeOut",
              }}
            />

            {/* Stamp circle */}
            <motion.div
              className="mx-auto mb-8 relative"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
            >
              {/* Main stamp */}
              <motion.div 
                className="relative h-32 w-32 rounded-full gradient-primary flex items-center justify-center shadow-glow"
                animate={{ 
                  boxShadow: [
                    "0 0 20px hsl(var(--primary) / 0.3)",
                    "0 0 40px hsl(var(--primary) / 0.5)",
                    "0 0 25px hsl(var(--primary) / 0.3)",
                  ],
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: 2,
                  ease: "easeInOut",
                }}
              >
                <motion.div 
                  className="absolute inset-2 rounded-full border-4 border-dashed border-primary-foreground/30"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />
                {/* Delay the check icon until AFTER the progress bar animates */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 12,
                    delay: 1.8, // Wait for progress bar animation (1.2 delay + 0.6 duration)
                  }}
                >
                  <Check className="h-16 w-16 text-primary-foreground drop-shadow-lg" />
                </motion.div>
              </motion.div>

              {/* Stamp count badge */}
              <motion.div 
                className="absolute -bottom-2 -right-2 h-12 w-12 rounded-full bg-card border-4 border-background flex items-center justify-center shadow-lg"
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.6,
                }}
              >
                <span className="text-lg font-bold text-foreground">{currentStamps}</span>
              </motion.div>
            </motion.div>

            {/* Success text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.6,
                delay: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <motion.h1 
                className="text-3xl font-bold text-foreground mb-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              >
                {pendingLabel ? "Visit Recorded! 📝" : "Stamp Collected! 🎉"}
              </motion.h1>
              <motion.p 
                className="text-lg text-muted-foreground mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.9 }}
              >
                at {restaurantName}
              </motion.p>
              {pendingLabel && (
                <motion.div
                  className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-200 dark:border-amber-800"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.0 }}
                >
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{pendingLabel}</span>
                </motion.div>
              )}

              {/* Progress indicator */}
              <motion.div 
                className="max-w-xs mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 1 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-semibold text-foreground">
                    {currentStamps} / {totalStamps}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full gradient-primary rounded-full"
                    initial={{ width: `${((currentStamps - 1) / totalStamps) * 100}%` }}
                    animate={{ width: `${(currentStamps / totalStamps) * 100}%` }}
                    transition={{ 
                      duration: 0.8,
                      delay: 1.2,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                </div>
                <motion.p 
                  className="mt-4 text-sm text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 1.5 }}
                >
                  {stampsRemaining > 0 
                    ? `${stampsRemaining} more stamp${stampsRemaining > 1 ? 's' : ''} until your reward!`
                    : "🎁 You've earned a reward!"}
                </motion.p>
              </motion.div>

              {/* XP indicator */}
              <motion.div 
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                  delay: 1.8,
                }}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">+10 XP</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
