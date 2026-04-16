import { useEffect, useState } from "react";
import { Check, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StampCelebrationProps {
  show: boolean;
  stampNumber: number;
  totalStamps?: number;
  restaurantName?: string;
  onComplete?: () => void;
}

export const StampCelebration = ({ show, stampNumber, totalStamps, restaurantName, onComplete }: StampCelebrationProps) => {
  const [phase, setPhase] = useState<"hidden" | "stamp" | "done">("hidden");

  useEffect(() => {
    if (show) {
      setPhase("stamp");
      const timer = setTimeout(() => {
        setPhase("done");
        onComplete?.();
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setPhase("hidden");
    }
  }, [show, onComplete]);

  if (phase === "hidden") return null;

  const remaining = totalStamps ? totalStamps - stampNumber : null;

  // Burst particles from center
  const particles = [...Array(12)].map((_, i) => ({
    id: i,
    angle: (i * 360) / 12,
    delay: i * 0.02,
    distance: 60 + Math.random() * 40,
    size: 10 + Math.random() * 6,
  }));

  return (
    <AnimatePresence>
      {phase === "stamp" && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/90 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />

          <div className="relative z-10 flex flex-col items-center px-6">
            {/* Glow pulse */}
            <motion.div
              className="absolute h-36 w-36 rounded-full bg-primary/20"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 2.5, 3], opacity: [0, 0.4, 0] }}
              transition={{ duration: 1, delay: 0.15, ease: "easeOut" }}
            />

            {/* Stamp circle with spring bounce */}
            <motion.div
              className="relative h-28 w-28 rounded-full gradient-primary flex items-center justify-center shadow-glow mb-6"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
            >
              {/* Rotating dashed border */}
              <motion.div
                className="absolute inset-2 rounded-full border-[3px] border-dashed border-primary-foreground/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              />
              {/* Check icon pops in */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 350, damping: 12, delay: 0.4 }}
              >
                <Check className="h-14 w-14 text-primary-foreground drop-shadow-lg" strokeWidth={3} />
              </motion.div>

              {/* Stamp number badge */}
              <motion.div
                className="absolute -bottom-1 -right-1 h-10 w-10 rounded-full bg-card border-[3px] border-background flex items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.5 }}
              >
                <span className="text-base font-bold text-foreground">{stampNumber}</span>
              </motion.div>
            </motion.div>

            {/* Burst particles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute"
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1.3, 0],
                    opacity: [0, 1, 0],
                    x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
                    y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
                  }}
                  transition={{ duration: 0.9, delay: 0.25 + p.delay, ease: "easeOut" }}
                >
                  {p.id % 3 === 0 ? (
                    <Star className="text-accent fill-current" style={{ width: p.size, height: p.size }} />
                  ) : (
                    <Sparkles className="text-primary" style={{ width: p.size, height: p.size }} />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Text */}
            <motion.h2
              className="text-2xl font-bold text-foreground mb-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              Stamp #{stampNumber} Collected! 🎉
            </motion.h2>

            {restaurantName && (
              <motion.p
                className="text-muted-foreground text-sm mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                at {restaurantName}
              </motion.p>
            )}

            {remaining !== null && remaining > 0 && (
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.9 }}
              >
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {remaining} more stamp{remaining > 1 ? "s" : ""} until reward!
                </span>
              </motion.div>
            )}

            {remaining === 0 && (
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.9 }}
              >
                <span className="text-sm font-medium text-primary">🎁 You've earned a reward!</span>
              </motion.div>
            )}

            {/* XP badge */}
            <motion.div
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">+10 XP</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StampCelebration;
